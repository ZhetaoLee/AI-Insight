import { Outlet } from "react-router-dom";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import "./AppLayout.css";

export function AppLayout() {
  return (
    <div className="app-shell">
      <div className="app-frame">
        <DashboardSidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
