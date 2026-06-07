import { Routes, Route, Navigate } from "react-router-dom";

import HistoricalBrowser from "./pages/HistoricalBrowser";
import LiveDashboard from "./pages/LiveDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LiveDashboard />} />
      <Route path="/historical" element={<HistoricalBrowser />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
