/* eslint-disable react-perf/jsx-no-jsx-as-prop */
import { Routes, Route, Navigate } from "react-router-dom";

import HistoricalBrowser from "./HistoricalBrowser";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HistoricalBrowser />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
