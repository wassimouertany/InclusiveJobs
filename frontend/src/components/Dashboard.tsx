import { useEffect, useState } from "react";
import { useNavigation } from "../context/NavigationContext";
import { useAuthStore } from "../config/auth";
import RecruiterDashboard from "./RecruiterDashboard";
import { UserRole } from "../types";

export default function Dashboard() {
  const { navigate } = useNavigation();
  const [role, setRole] = useState<string | null>(null);
  const storedRole = useAuthStore((s) => s.role);

  useEffect(() => {
    if (!storedRole) {
      navigate("login");
      return;
    }
    if (storedRole === UserRole.CANDIDATE) {
      navigate("dashboard-candidate-home");
      return;
    }
    setRole(storedRole);
  }, [navigate, storedRole]);

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        Loading...
      </div>
    );
  }

  return <RecruiterDashboard />;
}
