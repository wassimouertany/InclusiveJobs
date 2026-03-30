import { useEffect, useState } from "react";
import { useNavigation } from "../context/NavigationContext";
import { AUTH_ROLE_KEY } from "../config/auth";
import RecruiterDashboard from "./RecruiterDashboard";
import { UserRole } from "../types";

export default function Dashboard() {
  const { navigate } = useNavigation();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem(AUTH_ROLE_KEY);
    if (!storedRole) {
      navigate("login");
      return;
    }
    if (storedRole === UserRole.CANDIDATE) {
      navigate("dashboard-candidate");
      return;
    }
    setRole(storedRole);
  }, [navigate]);

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        Loading...
      </div>
    );
  }

  return <RecruiterDashboard />;
}
