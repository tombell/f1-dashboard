import { Routes, Route, Navigate } from "react-router-dom";
import LiveDashboard from "./pages/LiveDashboard";
import HistoricalBrowser from "./pages/HistoricalBrowser";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LiveDashboard />} />
      <Route path="/historical" element={<HistoricalBrowser />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
