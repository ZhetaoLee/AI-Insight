import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { SurveyPage } from "./pages/SurveyPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/survey" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/survey" element={<SurveyPage />} />
      </Route>
    </Routes>
  );
}
