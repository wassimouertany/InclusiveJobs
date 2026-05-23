import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./app/ToastContext";
import ProtectedRoute from "./app/ProtectedRoute";
import BackofficeLayout from "./layout/BackofficeLayout";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import UsersPage from "./features/users/UsersPage";
import JobsPage from "./features/jobs/JobsPage";
import ApplicationsPage from "./features/applications/ApplicationsPage";
import EmployersPage from "./features/employers/EmployersPage";
import SettingsPage from "./features/settings/SettingsPage";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<BackofficeLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="employers" element={<EmployersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ToastProvider>
  );
}
