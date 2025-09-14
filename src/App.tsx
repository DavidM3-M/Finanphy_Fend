// src/App.tsx
import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login        from "./pages/auth/Login";
import Register     from "./pages/auth/Register";
import Unauthorized from "./pages/Unauthorized";
import NotFound     from "./pages/NotFound";

import ProtectedLayout from "./components/ProtectedLayout";
import PrivateRoute    from "./components/PrivateRoute";
import LoadingSpinner  from "./components/LoadingSpinner";

import Dashboard     from "./pages/Dashboard";
import Facturacion   from "./pages/Facturacion";
import Clasificacion from "./pages/Clasificacion";
import ReportPage    from "./pages/ReportPage";

// Importamos el contexto y la vista de inventario
import { ProductsProvider } from "./context/ProductsContext";
import ProductsView        from "./pages/inventory/ProductsView";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fffbeb]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          token
            ? <Navigate to="/app/dashboard" replace />
            : <Navigate to="/auth/login" replace />
        }
      />

      <Route
        path="/auth/login"
        element={token ? <Navigate to="/app/dashboard" replace /> : <Login />}
      />
      <Route
        path="/auth/register"
        element={token ? <Navigate to="/app/dashboard" replace /> : <Register />}
      />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        path="/app/dashboard"
        element={
          <PrivateRoute>
            <ProtectedLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="facturacion" element={<Facturacion />} />
        <Route path="reportes"     element={<ReportPage />} />
        <Route path="clasificacion" element={<Clasificacion />} />

        {/* Nueva ruta de inventario */}
        <Route
          path="inventario"
          element={
            <ProductsProvider>
              <ProductsView />
            </ProductsProvider>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}