import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Issue from "./pages/Issue.jsx";
import Revoke from "./pages/Revoke.jsx";
import Verify from "./pages/Verify.jsx";
import { WalletProvider } from "./lib/WalletProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Navigate to="/verify" replace />} />
            <Route path="verify" element={<Verify />} />
            <Route path="issue" element={<Issue />} />
            <Route path="revoke" element={<Revoke />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/verify" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  </StrictMode>
);
