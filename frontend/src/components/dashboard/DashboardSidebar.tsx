import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Survey", to: "/survey" },
];

export function DashboardSidebar() {
  return (
    <aside className="dashboard-sidebar" aria-label="Primary navigation">
      <div className="sidebar-brand">
        <div className="brand-mark">A</div>
        <div className="brand-name">AI Insights</div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        <div className="sidebar-nav-label">Workspace</div>
        {NAV_ITEMS.map((item) => {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <span className="nav-dot" />
              <span className="nav-item-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
