import { Navigate, Outlet } from "react-router-dom";
import { useBoStore } from "../store/useBoStore";

export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const isAuthenticated = useBoStore((s) => s.isAuthenticated);
  const token = localStorage.getItem("bo_token");
  if (!isAuthenticated || !token) return <Navigate to="/login" replace />;
  return children ? <>{children}</> : <Outlet />;
}
