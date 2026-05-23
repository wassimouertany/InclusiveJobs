import { Navigate, Outlet } from "react-router-dom";
import { useBoStore } from "../store/useBoStore";

export default function ProtectedRoute() {
  const isAuthenticated = useBoStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
