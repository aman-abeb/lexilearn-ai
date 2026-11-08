import { MongoClient, type Db } from "mongodb";
import { HttpError } from "./http";

const globalForMongo = globalThis as unknown as { lexilearnMongo?: MongoClient };

export function mongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

/** Use the database named in the URI. When the URI has none, accounts live in `lexilearn`. */
export function databaseNameFromUri(uri: string): string {
  const configured = process.env.MONGODB_DB?.trim();
  if (configured) return configured;
  try {
    const normalized = uri.replace(/^mongodb\+srv:/i, "https:").replace(/^mongodb:/i, "http:");
    const name = decodeURIComponent(new URL(normalized).pathname.replace(/^\/+/, "").split("/")[0] ?? "");
    if (name) return name;
  } catch {
    // A URI the URL parser cannot read still falls back to the app database.
  }
  return "lexilearn";
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new HttpError(503, "MONGODB_NOT_CONFIGURED", "Add MONGODB_URI to save accounts, preferences, and progress.");
  }
  try {
    if (!globalForMongo.lexilearnMongo) {
      globalForMongo.lexilearnMongo = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    }
    await globalForMongo.lexilearnMongo.connect();
    return globalForMongo.lexilearnMongo.db(databaseNameFromUri(uri));
  } catch (error) {
    globalForMongo.lexilearnMongo = undefined;
    if (error instanceof HttpError) throw error;
    console.error("LexiLearn database failed:", error instanceof Error ? error.name : "UnknownError");
    throw new HttpError(503, "DATABASE_UNAVAILABLE", "The account database is unavailable. Your changes are still kept in this browser.");
  }
}
