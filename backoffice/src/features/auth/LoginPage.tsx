import { useState } from "react";
import { Lock, Mail, ShieldCheck, BarChart3, Loader2 } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useBoStore } from "../../store/useBoStore";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useBoStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated && localStorage.getItem("bo_token")) return <Navigate to="/" replace />;

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/users/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        let errorMessage = "Invalid credentials";
        try {
          const data = await res.json();
          if (typeof data.detail === "string") {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map((d: { msg: string }) => d.msg).join(", ");
          }
        } catch {}
        throw new Error(errorMessage);
      }
      const data = await res.json();
      if (data.role !== "ADMIN") {
        throw new Error("Access restricted to administrators only.");
      }
      localStorage.setItem("bo_token", data.access_token);
      login();
      navigate("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === "object" && err !== null && "message" in err) {
        setError(String((err as { message: unknown }).message));
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bo-login-page">
      {/* Left hero panel */}
      <section className="bo-login-hero">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <div style={{ width: "3rem", height: "3rem", borderRadius: "0.875rem", overflow: "hidden", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0.25rem" }}>
            <img src="/logo.png" alt="InclusiveJobs" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem", color: "white", letterSpacing: "-0.01em" }}>
              InclusiveJobs
            </p>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Admin Backoffice
            </p>
          </div>
        </div>

        <h1 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: "1rem" }}>
          Inclusive hiring,<br />managed with<br />
          <span style={{ color: "rgba(255,255,255,0.7)" }}>clarity.</span>
        </h1>

        <p style={{ opacity: 0.85, maxWidth: "34ch", lineHeight: 1.65, fontSize: "1rem", marginBottom: "2rem" }}>
          Admin workspace for talent, employers, and accessibility-first recruitment workflows.
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.875rem" }}>
          {[
            { icon: ShieldCheck, text: "Secure JWT authentication" },
            { icon: BarChart3, text: "Rich analytics & inclusion insights" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.925rem" }}>
              <Icon style={{ width: "1.1rem", height: "1.1rem", opacity: 0.85, flexShrink: 0 }} />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Right form panel */}
      <section className="bo-login-form-wrap">
        <div className="bo-card bo-login-card">
          <p className="bo-kicker">Sign in</p>
          <h2 className="bo-title" style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>
            Admin backoffice
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--bo-muted)", marginBottom: "1.75rem" }}>
            Enter your administrator credentials to continue.
          </p>

          {/* Email */}
          <label className="block text-sm" style={{ marginBottom: "1rem" }}>
            <span style={{ color: "var(--bo-muted)", fontWeight: 600, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.4rem" }}>
              <Mail style={{ width: "0.85rem", height: "0.85rem" }} /> Email
            </span>
            <input
              className="bo-search"
              style={{ maxWidth: "100%", width: "100%" }}
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              disabled={loading}
              autoComplete="email"
            />
          </label>

          {/* Password */}
          <label className="block text-sm" style={{ marginBottom: "1.25rem" }}>
            <span style={{ color: "var(--bo-muted)", fontWeight: 600, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.4rem" }}>
              <Lock style={{ width: "0.85rem", height: "0.85rem" }} /> Password
            </span>
            <input
              className="bo-search"
              style={{ maxWidth: "100%", width: "100%" }}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              disabled={loading}
              autoComplete="current-password"
            />
          </label>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: "1rem",
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--bo-radius-sm)",
              background: "rgba(220, 38, 38, 0.08)",
              border: "1px solid rgba(220, 38, 38, 0.2)",
              color: "var(--bo-danger)",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            className="bo-btn bo-btn-primary"
            style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "0.5rem", height: "2.75rem", fontSize: "0.925rem", fontWeight: 700 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: "1rem", height: "1rem", animation: "spin 1s linear infinite" }} />
                Signing in...
              </>
            ) : (
              "Sign in to Admin"
            )}
          </button>

          <p style={{ marginTop: "1.25rem", fontSize: "0.78rem", color: "var(--bo-muted)", textAlign: "center", lineHeight: 1.6 }}>
            Only users with ADMIN role can access this workspace.
          </p>
        </div>
      </section>
    </div>
  );
}
