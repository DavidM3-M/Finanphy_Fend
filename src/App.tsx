// src/App.tsx
import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

import ProtectedLayout from "./components/ProtectedLayout";
import PrivateRoute from "./components/PrivateRoute";

import Dashboard from "./pages/Dashboard";
import Facturacion from "./pages/Facturacion";
import ReportPage from "./pages/ReportPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span>Cargando sesión…</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Ruta raíz: decide entre login o dashboard */}
      <Route
        path="/"
        element={
          token
            ? <Navigate to="/app/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* Páginas públicas */}
      <Route
        path="/login"
        element={
          token
            ? <Navigate to="/app/dashboard" replace />
            : <Login />
        }
      />
      <Route
        path="/register"
        element={
          token
            ? <Navigate to="/app/dashboard" replace />
            : <Register />
        }
      />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Rutas protegidas bajo /app */}
      <Route
        path="/app/*"
        element={
          <PrivateRoute>
            <ProtectedLayout />
          </PrivateRoute>
        }
      >
        {/* Subrutas de la sección privada */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="facturacion" element={<Facturacion />} />
        <Route path="reportes" element={<ReportPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}