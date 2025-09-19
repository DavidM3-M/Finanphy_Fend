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
import DailyReports  from "./pages/DailyReports";

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
      {/* Públicas */}
      <Route
        path="/"
        element={
          token
            ? <Navigate to="/app" replace />
            : <Navigate to="/auth/login" replace />
        }
      />
      <Route
        path="/auth/login"
        element={token ? <Navigate to="/app" replace /> : <Login />}
      />
      <Route
        path="/auth/register"
        element={token ? <Navigate to="/app" replace /> : <Register />}
      />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protegidas bajo /app */}
      <Route
        path="/app/*"
        element={
          <PrivateRoute>
            <ProtectedLayout />
          </PrivateRoute>
        }
      >
        {/* /app → Dashboard */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Secciones */}
        <Route path="facturacion"   element={<Facturacion />} />
        <Route path="inventario"    element={
          <ProductsProvider>
            <ProductsView />
          </ProductsProvider>
        }/>
        <Route path="clasificacion" element={<Clasificacion />} />

        {/* <-- Aquí */}
        <Route path="reportes" element={<DailyReports />} />

        {/* Catch-all dentro de /app */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Catch-all global */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}