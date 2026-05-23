import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import { useBoStore } from "../store/useBoStore";

export default function BackofficeLayout() {
  const compactSidebar = useBoStore((s) => s.compactSidebar);

  return (
    <div className={`bo-shell ${compactSidebar ? "bo-shell-compact" : ""}`}>
      <Sidebar />
      <main className="bo-main">
        <div className="bo-demo-banner" role="status">
          <span aria-hidden>◆</span>
        </div>
        <div className="bo-main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
