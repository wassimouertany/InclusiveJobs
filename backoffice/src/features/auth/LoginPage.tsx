import { Sparkles, Shield, BarChart3 } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { useBoStore } from "../../store/useBoStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useBoStore();

  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="bo-login-page">
      <section className="bo-login-hero" aria-hidden={false}>
        <div className="bo-brand-icon" style={{ width: "3rem", height: "3rem" }}>
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="bo-kicker" style={{ color: "rgba(255,255,255,0.75)", marginTop: "1.5rem" }}>
          InclusiveJobs
        </p>
        <h1>Inclusive hiring, managed with clarity.</h1>
        <p style={{ opacity: 0.9, maxWidth: "36ch", lineHeight: 1.6, fontSize: "1.05rem" }}>
          Admin workspace for talent, employers, and accessibility-first recruitment workflows.
        </p>
        <ul style={{ listStyle: "none", padding: 0, marginTop: "2rem", display: "grid", gap: "1rem" }}>
          <li style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Shield className="w-5 h-5 opacity-90" />
            <span>Demo mode — no backend required</span>
          </li>
          <li style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <BarChart3 className="w-5 h-5 opacity-90" />
            <span>Rich analytics & inclusion insights</span>
          </li>
        </ul>
      </section>

      <section className="bo-login-form-wrap">
        <div className="bo-card bo-login-card">
          <p className="bo-kicker">Sign in</p>
          <h2 className="bo-title" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Admin backoffice
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--bo-muted)", marginBottom: "1.75rem" }}>
            Use demo credentials to explore the interface.
          </p>
          <label className="block text-sm" style={{ marginBottom: "1rem" }}>
            <span style={{ color: "var(--bo-muted)", fontWeight: 600 }}>Email</span>
            <input
              className="bo-search mt-1"
              style={{ maxWidth: "100%" }}
              defaultValue="admin@inclusivejobs.demo"
              readOnly
              aria-readonly
            />
          </label>
          <label className="block text-sm" style={{ marginBottom: "1.5rem" }}>
            <span style={{ color: "var(--bo-muted)", fontWeight: 600 }}>Password</span>
            <input
              className="bo-search mt-1"
              style={{ maxWidth: "100%" }}
              type="password"
              defaultValue="demo1234"
              readOnly
              aria-readonly
            />
          </label>
          <Button
            className="w-full"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => {
              login();
              navigate("/");
            }}
          >
            Enter demo workspace
          </Button>
        </div>
      </section>
    </div>
  );
}
