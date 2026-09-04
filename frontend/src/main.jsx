import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Issue from "./pages/Issue.jsx";
import Verify from "./pages/Verify.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/verify" replace />} />
          <Route path="issue" element={<Issue />} />
          <Route path="verify" element={<Verify />} />
          <Route path="*" element={<Navigate to="/verify" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
