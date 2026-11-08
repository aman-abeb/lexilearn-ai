"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AccountRole } from "@/lib/contracts";
import { apiRequest } from "@/lib/client/api";
import { useAuth } from "./auth-provider";

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  role: AccountRole;
  createdAt: string;
  updatedAt: string;
};

type Overview = {
  users: ManagedUser[];
  counts: { users: number; admins: number; courses: number; lectures: number };
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    return apiRequest<Overview>("/api/admin/overview")
      .then(setOverview)
      .catch((reason: unknown) => {
        setOverview(null);
        setError(reason instanceof Error ? reason.message : "The admin dashboard could not be opened.");
      });
  }, []);

  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [user?.role, load]);

  const run = useCallback(async (id: string, action: () => Promise<void>) => {
    setPendingId(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That change did not finish. Please try again.");
    } finally {
      setPendingId(null);
    }
  }, [load]);

  if (user?.role !== "admin") {
    return <section className="form-panel" aria-labelledby="admin-denied">
      <h1 id="admin-denied">Admins only</h1>
      <p className="page-subtitle">Your account can open lectures. Managing people and the library is limited to admins.</p>
      <Link href="/dashboard" className="button button-secondary">Back to lectures</Link>
    </section>;
  }

  return <>
    <div className="page-heading">
      <p className="eyebrow">ADMIN</p>
      <h1>People and the library</h1>
      <p className="page-subtitle">See who has signed in, choose who can manage the workspace, and end a session when someone should sign in again.</p>
    </div>
    {error ? <div className="error-panel" role="alert"><p>{error}</p></div> : null}
    {!overview && !error ? <p className="field-help">Opening the admin dashboard…</p> : null}
    {overview ? <>
      <div className="admin-stats">
        <article className="admin-stat"><p className="section-kicker">PEOPLE</p><strong>{overview.counts.users}</strong><span>Signed-in accounts</span></article>
        <article className="admin-stat"><p className="section-kicker">ADMINS</p><strong>{overview.counts.admins}</strong><span>Can manage this page</span></article>
        <article className="admin-stat"><p className="section-kicker">LIBRARY</p><strong>{overview.counts.lectures}</strong><span>{overview.counts.courses} {overview.counts.courses === 1 ? "course" : "courses"}</span></article>
      </div>
      <section className="form-panel" aria-labelledby="people-heading">
        <h2 id="people-heading">Accounts</h2>
        {overview.users.length === 0 ? <p className="field-help">No accounts yet.</p> : <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th scope="col">Person</th><th scope="col">Role</th><th scope="col">Joined</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            {overview.users.map((person) => {
              const busy = pendingId === person.id;
              const mine = person.id === user.id;
              return <tr key={person.id}>
                <td>
                  <div className="account-identity">
                    {person.picture ? <img className="account-avatar" src={person.picture} alt="" width={36} height={36} referrerPolicy="no-referrer" /> : null}
                    <div>
                      <p><strong>{person.name}</strong>{mine ? " · You" : ""}</p>
                      <p className="field-help">{person.email}</p>
                    </div>
                  </div>
                </td>
                <td>{person.role === "admin" ? "Admin" : "Student"}</td>
                <td>{formatWhen(person.createdAt)}<span className="field-help">Updated {formatWhen(person.updatedAt)}</span></td>
                <td>
                  <div className="admin-actions">
                    <button type="button" className="button button-secondary button-small" disabled={busy} onClick={() => void run(person.id, () => apiRequest(`/api/admin/users/${encodeURIComponent(person.id)}`, { method: "PATCH", body: JSON.stringify({ role: person.role === "admin" ? "student" : "admin" }) }))}>{person.role === "admin" ? "Make student" : "Make admin"}</button>
                    <button type="button" className="button button-secondary button-small" disabled={busy || mine} onClick={() => void run(person.id, () => apiRequest(`/api/admin/users/${encodeURIComponent(person.id)}/revoke`, { method: "POST" }))}>End session</button>
                    <button type="button" className="button button-secondary button-small" disabled={busy || mine} onClick={() => {
                      if (!window.confirm(`Remove ${person.name} from LexiLearn? Their saved preferences and progress on the account will be deleted.`)) return;
                      void run(person.id, () => apiRequest(`/api/admin/users/${encodeURIComponent(person.id)}`, { method: "DELETE" }));
                    }}>Remove</button>
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table></div>}
        <p className="source-note">The first Google account becomes an admin. Add more admin emails in ADMIN_EMAILS. Courses and lectures stay in the shared library on this server.</p>
      </section>
    </> : null}
  </>;
}
