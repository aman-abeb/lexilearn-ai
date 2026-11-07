import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_READING_PREFERENCES } from "../src/lib/contracts";
import { acceptProgressStore } from "../src/lib/client/reading-progress";
import { safeArrangements, safePreferences } from "../src/lib/preferences";
import { preferenceSetupSchema, readingPreferencesSchema } from "../src/lib/validation";
import { accountFromGoogleClaims, googleClientIds, googleProfilePicture } from "../src/server/auth/google";
import { readSessionToken, sessionCookie, signSession, verifySession, wantsMobileToken } from "../src/server/auth/session";
import { HttpError } from "../src/server/http";

test("saved preferences gain a light appearance and stay inside the reader ranges", () => {
  assert.equal(safePreferences({ fontSize: 80, theme: "night", appearance: "dark" }).fontSize, 32);
  assert.equal(safePreferences({ theme: "night" }).appearance, "light");
  assert.equal(safePreferences({ appearance: "dark" }).theme, "paper");
  assert.deepEqual(safePreferences(null), DEFAULT_READING_PREFERENCES);
  assert.equal(readingPreferencesSchema.parse({ ...DEFAULT_READING_PREFERENCES, appearance: undefined }).appearance, "light");
  assert.equal(safePreferences({ wordSpacing: 4, paragraphSpacing: 0, fontFamily: "clear", fontWeight: "bold", theme: "yellow", readingGuide: true }).wordSpacing, 0.35);
  assert.equal(safePreferences({ fontFamily: "clear", theme: "blue" }).fontFamily, "clear");
  assert.equal(safePreferences({}).readingGuide, false);
  assert.equal(safePreferences({}).fontWeight, "regular");
  const legacy = readingPreferencesSchema.parse({
    fontSize: 20, lineHeight: 1.9, letterSpacing: 0.02, fontFamily: "sans", theme: "paper", focusMode: false,
  });
  assert.equal(legacy.wordSpacing, 0);
  assert.equal(legacy.paragraphSpacing, 1);
  assert.equal(legacy.readingGuide, false);
  assert.equal(legacy.readingWidth, "medium");
  assert.equal(safePreferences({ readingWidth: "narrow" }).readingWidth, "narrow");
  assert.equal(safePreferences({ readingWidth: "stretch" }).readingWidth, "medium");
  const crowded = Array.from({ length: 10 }, (_, index) => ({ id: `row-${index}`, name: index === 3 ? "   " : `Setup ${index}`, preferences: { fontSize: 18 } }));
  const arrangements = safeArrangements(crowded);
  assert.equal(arrangements.length, 8);
  assert.equal(arrangements[0].preferences.fontSize, 18);
  assert.equal(preferenceSetupSchema.parse({ ...DEFAULT_READING_PREFERENCES, arrangements, activeArrangementId: arrangements[0].id }).arrangements.length, 8);
});

test("reading progress rejects an unbounded account payload", () => {
  const tooMany = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [String(index), {}]));
  assert.throws(() => acceptProgressStore(tooMany), /100 lectures/);
  assert.throws(() => acceptProgressStore([]), /object/);
  assert.deepEqual(acceptProgressStore({ lecture: { lastSectionId: "section-1", completedSectionIds: [], reviewSectionIds: [], glossary: [] } }).lecture.lastSectionId, "section-1");
});

test("session tokens round-trip and ignore a short secret", async () => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "short";
  await assert.rejects(signSession({ sub: "student", sv: 1 }), (error: unknown) => error instanceof HttpError && error.code === "AUTH_NOT_CONFIGURED");
  process.env.AUTH_SECRET = "abcdefghijklmnopqrstuvwxyz123456";
  try {
    const token = await signSession({ sub: "student", sv: 2 });
    assert.deepEqual(await verifySession(token), { sub: "student", sv: 2 });
    await assert.rejects(verifySession(`${token}x`), (error: unknown) => error instanceof HttpError && error.status === 401);
    const cookie = sessionCookie(token);
    assert.match(cookie, /HttpOnly/);
    assert.equal(sessionCookie(null).includes("Max-Age=0"), true);
    const request = new Request("http://127.0.0.1/api/auth/session", { headers: { Cookie: cookie.split(";")[0] } });
    assert.equal(readSessionToken(request), token);
    const mobile = new Request("http://127.0.0.1/api/auth/google", { headers: { Authorization: `Bearer ${token}`, "X-LexiLearn-Client": "mobile" } });
    assert.equal(readSessionToken(mobile), token);
    assert.equal(wantsMobileToken(mobile), true);
    assert.throws(() => readSessionToken(new Request("http://127.0.0.1/api/auth/session", { headers: { Authorization: "Token nope" } })), (error: unknown) => error instanceof HttpError && error.status === 401);
  } finally {
    if (previous === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  }
});

test("google claims require a verified email and a google profile picture host", () => {
  assert.deepEqual(googleClientIds(" web-client ", " ios ,android, web-client "), ["web-client", "ios", "android"]);
  assert.equal(googleProfilePicture("https://lh3.googleusercontent.com/a/example"), "https://lh3.googleusercontent.com/a/example");
  assert.equal(googleProfilePicture("http://lh3.googleusercontent.com/a/example"), null);
  assert.equal(googleProfilePicture("https://example.com/a.png"), null);
  const account = accountFromGoogleClaims({
    sub: "google-subject",
    email: "Student@Example.com",
    email_verified: true,
    name: "Amina Student",
    picture: "https://lh3.googleusercontent.com/a/example",
  });
  assert.equal(account.email, "student@example.com");
  assert.equal(account.name, "Amina Student");
  assert.throws(() => accountFromGoogleClaims({ sub: "google-subject", email: "student@example.com", email_verified: false }), (error: unknown) => error instanceof HttpError && error.code === "GOOGLE_SIGN_IN_FAILED");
});
