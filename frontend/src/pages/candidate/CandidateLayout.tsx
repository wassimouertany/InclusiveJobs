import { Outlet } from "react-router-dom";
import {
  CandidateDashboardProvider,
  useCandidateDashboard,
} from "./CandidateDashboardContext";
import CandidateJobDetail from "./CandidateJobDetail";
import DashboardSubNav from "./DashboardSubNav";

function CandidateLayoutShell() {
  const { selectedJob } = useCandidateDashboard();

  return (
    <div className="min-h-screen bg-bg-page py-6">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <DashboardSubNav />
        <div>{selectedJob ? <CandidateJobDetail /> : <Outlet />}</div>
      </div>
    </div>
  );
}

export default function CandidateLayout() {
  return (
    <CandidateDashboardProvider>
      <CandidateLayoutShell />
    </CandidateDashboardProvider>
  );
}
