import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useNavigation } from "../context/NavigationContext";
import { useAuthStore } from "../config/auth";
import { UserRole } from "../types";

export default function Dashboard() {
  const { navigate } = useNavigation();
  const storedRole = useAuthStore((s) => s.role);

  useEffect(() => {
    if (!storedRole) {
      navigate("login");
      return;
    }
    if (storedRole === UserRole.CANDIDATE) {
      navigate("dashboard-candidate-home");
    }
  }, [navigate, storedRole]);

  if (!storedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        Loading...
      </div>
    );
  }

  if (storedRole === UserRole.CANDIDATE) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        Loading...
      </div>
    );
  }

  if (storedRole === UserRole.COMPANY) {
    return <Navigate to="/dashboard/recruiter/jobs" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      Unsupported role.
    </div>
  );
}
