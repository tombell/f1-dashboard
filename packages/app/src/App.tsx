import HistoricalBrowser from "@f1-dashboard/historical";
/* eslint-disable react-perf/jsx-no-jsx-as-prop */
import { Routes, Route, Navigate } from "react-router-dom";

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
