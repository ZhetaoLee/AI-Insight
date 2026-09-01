import { NavLink, Outlet } from "react-router-dom";

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: isActive ? "var(--color-accent)" : "var(--color-muted-1)",
});

export function AppLayout() {
  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          maxWidth: 920,
          margin: "0 auto",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-heading)" }}>
          AI Productivity Insights
        </span>
        <nav style={{ display: "flex", gap: 24 }}>
          <NavLink to="/dashboard" style={navLinkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/survey" style={navLinkStyle}>
            Submit Survey
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
