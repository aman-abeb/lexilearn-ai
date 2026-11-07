import Link from "next/link";

export default function AuthPage() {
  return <section className="auth-card" aria-labelledby="auth-heading">
    <p className="eyebrow">SIGN IN</p>
    <h1 id="auth-heading">Welcome back.</h1>
    <p className="page-subtitle">This is a demo sign-in. It opens your dashboard directly, with no Google account or client ID.</p>
    <Link href="/dashboard" className="button button-primary auth-continue">Sign in with Google</Link>
  </section>;
}
