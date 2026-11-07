import type { Collection } from "mongodb";
import type { AccountUser, PreferenceArrangement, ReadingPreferences } from "@/lib/contracts";
import { DEFAULT_READING_PREFERENCES } from "@/lib/contracts";
import { acceptProgressStore, parseProgressStore, type ReadingProgressStore } from "@/lib/client/reading-progress";
import { preferenceSyncBody, safeActiveArrangementId, safeArrangements, safePreferences } from "@/lib/preferences";
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
  sessionVersion: number;
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
    },
    preferences: safePreferences(doc.preferences),
    arrangements,
    activeArrangementId: safeActiveArrangementId(doc.activeArrangementId, arrangements),
    progress: parseProgressStore(doc.progress),
    sessionVersion: Number.isInteger(doc.sessionVersion) ? doc.sessionVersion : 1,
    created,
  };
}

export async function upsertGoogleUser(identity: GoogleIdentity): Promise<StoredAccount> {
  return withDatabase(async () => {
    const collection = await users();
    const now = new Date().toISOString();
    const existing = await collection.findOne({ googleSub: identity.sub });
    if (!existing) {
      const created: UserDocument = {
        googleSub: identity.sub,
        email: identity.email,
        name: identity.name,
        picture: identity.picture,
        preferences: { ...DEFAULT_READING_PREFERENCES },
        arrangements: [],
        activeArrangementId: null,
        progress: {},
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
    await collection.updateOne({ googleSub: identity.sub }, {
      $set: { email: identity.email, name: identity.name, picture: identity.picture, updatedAt: now },
    });
    return toAccount({ ...existing, email: identity.email, name: identity.name, picture: identity.picture }, false);
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
