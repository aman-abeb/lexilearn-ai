import type { Collection } from "mongodb";
import type { AccountRole, AccountUser, PreferenceArrangement, ReadingPreferences } from "@/lib/contracts";
import { DEFAULT_READING_PREFERENCES } from "@/lib/contracts";
import { acceptProgressStore, parseProgressStore, type ReadingProgressStore } from "@/lib/client/reading-progress";
import { preferenceSyncBody, safeActiveArrangementId, safeArrangements, safePreferences } from "@/lib/preferences";
import { deleteAccountBlock, revokeSessionBlock, roleAfterSignIn, roleChangeBlock, storedAccountRole } from "./auth/admin";
import type { GoogleIdentity } from "./auth/google";
import { googleProfilePicture } from "./auth/google";
import { readSessionToken, verifySession } from "./auth/session";
import { getDb } from "./db";
import { HttpError } from "./http";

type UserDocument = {
  googleSub: string;
  email: string;
  name: string;
  picture: string | null;
  preferences: ReadingPreferences;
  arrangements?: PreferenceArrangement[];
  activeArrangementId?: string | null;
  progress: ReadingProgressStore;
  role?: AccountRole;
  sessionVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  role: AccountRole;
  createdAt: string;
  updatedAt: string;
};

export type StoredAccount = {
  user: AccountUser;
  preferences: ReadingPreferences;
  arrangements: PreferenceArrangement[];
  activeArrangementId: string | null;
  progress: ReadingProgressStore;
  sessionVersion: number;
  created: boolean;
};

let indexesReady: Promise<void> | null = null;

async function users(): Promise<Collection<UserDocument>> {
  const collection = (await getDb()).collection<UserDocument>("users");
  if (!indexesReady) {
    indexesReady = collection.createIndex({ googleSub: 1 }, { unique: true }).then(() => undefined).catch((error: unknown) => {
      indexesReady = null;
      throw error;
    });
  }
  await indexesReady;
  return collection;
}

function isDuplicate(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000;
}

async function withDatabase<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("LexiLearn database failed:", error instanceof Error ? error.name : "UnknownError");
    throw new HttpError(503, "DATABASE_UNAVAILABLE", "The account database is unavailable. Your changes are still kept in this browser.");
  }
}

function toAccount(doc: UserDocument, created: boolean): StoredAccount {
  const arrangements = safeArrangements(doc.arrangements);
  return {
    user: {
      id: doc.googleSub,
      email: doc.email,
      name: doc.name,
      picture: googleProfilePicture(doc.picture),
      role: storedAccountRole(doc.email, doc.role),
    },
    preferences: safePreferences(doc.preferences),
    arrangements,
    activeArrangementId: safeActiveArrangementId(doc.activeArrangementId, arrangements),
    progress: parseProgressStore(doc.progress),
    sessionVersion: Number.isInteger(doc.sessionVersion) ? doc.sessionVersion : 1,
    created,
  };
}

async function chooseRole(collection: Collection<UserDocument>, email: string, googleSub: string | null, current: AccountRole | null): Promise<AccountRole> {
  const docs = await collection.find({}, { projection: { googleSub: 1, email: 1, role: 1 } }).toArray();
  const otherAdmins = docs.filter((doc) => doc.googleSub !== googleSub && storedAccountRole(doc.email, doc.role) === "admin").length;
  return roleAfterSignIn({ email, current, otherAdmins });
}

function managedUser(doc: UserDocument): ManagedUser {
  return {
    id: doc.googleSub,
    email: doc.email,
    name: doc.name,
    picture: googleProfilePicture(doc.picture),
    role: storedAccountRole(doc.email, doc.role),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function upsertGoogleUser(identity: GoogleIdentity): Promise<StoredAccount> {
  return withDatabase(async () => {
    const collection = await users();
    const now = new Date().toISOString();
    const existing = await collection.findOne({ googleSub: identity.sub });
    if (!existing) {
      const role = await chooseRole(collection, identity.email, null, null);
      const created: UserDocument = {
        googleSub: identity.sub,
        email: identity.email,
        name: identity.name,
        picture: identity.picture,
        preferences: { ...DEFAULT_READING_PREFERENCES },
        arrangements: [],
        activeArrangementId: null,
        progress: {},
        role,
        sessionVersion: 1,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await collection.insertOne(created);
        return toAccount(created, true);
      } catch (error) {
        if (!isDuplicate(error)) throw error;
        const raced = await collection.findOne({ googleSub: identity.sub });
        if (!raced) throw error;
        return toAccount(raced, false);
      }
    }
    const role = await chooseRole(collection, identity.email, identity.sub, existing.role === "admin" ? "admin" : "student");
    await collection.updateOne({ googleSub: identity.sub }, {
      $set: { email: identity.email, name: identity.name, picture: identity.picture, role, updatedAt: now },
    });
    return toAccount({ ...existing, email: identity.email, name: identity.name, picture: identity.picture, role }, false);
  });
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  return withDatabase(async () => {
    const docs = await (await users()).find({}).toArray();
    return docs.map(managedUser).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.email.localeCompare(b.email));
  });
}

export async function requireAdmin(request: Request): Promise<StoredAccount> {
  const account = await requireAccount(request);
  if (account.user.role !== "admin") throw new HttpError(403, "FORBIDDEN", "This page is only available to an admin.");
  return account;
}

export async function setUserRole(actorId: string, googleSub: string, nextRole: AccountRole): Promise<ManagedUser> {
  return withDatabase(async () => {
    const collection = await users();
    const docs = await collection.find({}).toArray();
    const target = docs.find((doc) => doc.googleSub === googleSub);
    if (!target) throw new HttpError(404, "NOT_FOUND", "That account is no longer here.");
    const people = docs.map(managedUser);
    const targetRole = storedAccountRole(target.email, target.role);
    const block = roleChangeBlock({
      targetEmail: target.email,
      targetRole,
      nextRole,
      adminCount: people.filter((person) => person.role === "admin").length,
    });
    if (block) throw new HttpError(409, "ADMIN_REQUIRED", block);
    if (actorId === googleSub && nextRole !== "admin") {
      throw new HttpError(409, "ADMIN_REQUIRED", "Ask another admin to change your own role.");
    }
    const updatedAt = new Date().toISOString();
    await collection.updateOne({ googleSub }, { $set: { role: nextRole, updatedAt } });
    return managedUser({ ...target, role: nextRole, updatedAt });
  });
}

export async function revokeUserSessions(actorId: string, googleSub: string): Promise<void> {
  const block = revokeSessionBlock(actorId, googleSub);
  if (block) throw new HttpError(409, "ADMIN_REQUIRED", block);
  await withDatabase(async () => {
    const result = await (await users()).updateOne({ googleSub }, { $inc: { sessionVersion: 1 } });
    if (result.matchedCount === 0) throw new HttpError(404, "NOT_FOUND", "That account is no longer here.");
  });
}

export async function deleteUser(actorId: string, googleSub: string): Promise<void> {
  await withDatabase(async () => {
    const collection = await users();
    const docs = await collection.find({}).toArray();
    const target = docs.find((doc) => doc.googleSub === googleSub);
    if (!target) throw new HttpError(404, "NOT_FOUND", "That account is no longer here.");
    const people = docs.map(managedUser);
    const block = deleteAccountBlock({
      actorId,
      targetId: googleSub,
      targetRole: storedAccountRole(target.email, target.role),
      adminCount: people.filter((person) => person.role === "admin").length,
    });
    if (block) throw new HttpError(409, "ADMIN_REQUIRED", block);
    await collection.deleteOne({ googleSub });
  });
}

export async function getAccount(googleSub: string): Promise<StoredAccount | null> {
  return withDatabase(async () => {
    const doc = await (await users()).findOne({ googleSub });
    return doc ? toAccount(doc, false) : null;
  });
}

export async function requireAccount(request: Request): Promise<StoredAccount> {
  const token = readSessionToken(request);
  if (!token) throw new HttpError(401, "UNAUTHORIZED", "Sign in to save changes to your account.");
  const claims = await verifySession(token);
  const account = await getAccount(claims.sub);
  if (!account || account.sessionVersion !== claims.sv) {
    throw new HttpError(401, "UNAUTHORIZED", "Your sign-in expired. Please sign in again.");
  }
  return account;
}

async function updateOwned(googleSub: string, sessionVersion: number, fields: Partial<UserDocument>): Promise<void> {
  const result = await (await users()).updateOne(
    { googleSub, sessionVersion },
    { $set: { ...fields, updatedAt: new Date().toISOString() } },
  );
  if (result.matchedCount === 0) {
    throw new HttpError(401, "UNAUTHORIZED", "Your sign-in expired. Please sign in again.");
  }
}

export async function savePreferences(googleSub: string, sessionVersion: number, input: unknown): Promise<void> {
  const record = input && typeof input === "object" ? input as { arrangements?: unknown; activeArrangementId?: unknown } : {};
  const body = preferenceSyncBody(input, record.arrangements, record.activeArrangementId);
  await withDatabase(() => updateOwned(googleSub, sessionVersion, {
    preferences: safePreferences(body),
    arrangements: body.arrangements,
    activeArrangementId: body.activeArrangementId,
  }));
}

export async function saveProgress(googleSub: string, sessionVersion: number, progress: unknown): Promise<ReadingProgressStore> {
  const stored = acceptProgressStore(progress);
  await withDatabase(() => updateOwned(googleSub, sessionVersion, { progress: stored }));
  return stored;
}

/** Bump the session only when this token is still current, so an old sign-out cannot end a newer one. */
export async function revokeSession(googleSub: string, sessionVersion: number): Promise<void> {
  await withDatabase(async () => {
    await (await users()).updateOne({ googleSub, sessionVersion }, { $inc: { sessionVersion: 1 } });
  });
}
