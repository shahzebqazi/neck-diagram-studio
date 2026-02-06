import { useState, type FormEvent } from "react";
import { Link, navigate, usePathname } from "../lib/router";
import { login } from "../lib/api";

const LoginPage = () => {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const isActive = (path: string) => pathname === path;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setStatus("error");
      setError("Enter your email and password to continue.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      await login(email.trim(), password, remember);
      navigate("/app");
    } catch (err) {
      setStatus("error");
      setError("Login failed. Check your credentials or try again later.");
    }
  };

  return (
    <div className="auth-page">
      <nav className="landing-nav auth-nav">
        <div className="landing-brand">
          <div className="landing-logo">NDS</div>
          <div>
            <div className="landing-title">Neck Diagram Studio</div>
            <div className="landing-subtitle">Excalidraw-inspired guitar layouts</div>
          </div>
        </div>
        <div className="landing-nav-links">
          <Link
            to="/"
            className={`landing-link${isActive("/") ? " is-active" : ""}`}
            aria-current={isActive("/") ? "page" : undefined}
          >
            Home
          </Link>
          <Link
            to="/demo"
            className={`landing-link${isActive("/demo") ? " is-active" : ""}`}
            aria-current={isActive("/demo") ? "page" : undefined}
          >
            Demo
          </Link>
          <a
            className="landing-link"
            href="https://neckdiagramstudio.com/docs"
            target="_blank"
            rel="noreferrer"
          >
            Docs
          </a>
          <Link
            to="/login"
            className={`landing-link${isActive("/login") ? " is-active" : ""}`}
            aria-current={isActive("/login") ? "page" : undefined}
          >
            Log In
          </Link>
        </div>
        <div className="landing-nav-cta">
          <Link to="/app" className="cta-button primary">
            Open Studio
          </Link>
        </div>
      </nav>

      <main className="auth-main">
        <div className="auth-grid">
          <section className="auth-copy">
            <div className="hero-pill">Account Access</div>
            <h1>Welcome back to your diagram workspace.</h1>
            <p>
              Sign in to sync projects, reopen your latest session, and keep diagrams available
              across devices.
            </p>
            <div className="auth-highlights">
              <div className="auth-highlight">Remember me keeps you signed in for 30 days.</div>
              <div className="auth-highlight">Auto-save and restore the latest project.</div>
              <div className="auth-highlight">Offline caching keeps your edits available.</div>
            </div>
          </section>

          <section className="auth-card">
            <h2>Log In</h2>
            <p className="muted">Use your studio account to pick up where you left off.</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </label>
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>Remember me for 30 days</span>
              </label>
              {status === "error" && error ? (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              ) : null}
              <button className="cta-button primary auth-submit" type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Signing In..." : "Sign In"}
              </button>
            </form>
            <div className="auth-foot">
              Need access? <a href="https://neckdiagramstudio.com/contact">Request an invite</a>.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
