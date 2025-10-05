import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

// Contextos
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProductsProvider } from "./context/ProductsContext";

// Páginas públicas
import Login        from "./pages/auth/Login";
import Register     from "./pages/auth/Register";
import Unauthorized from "./components/Unauthorized";
import NotFound     from "./components/NotFound";

// Layouts y protección
import ProtectedLayout from "./components/ProtectedLayout";
import PrivateRoute    from "./components/PrivateRoute";
import LoadingSpinner  from "./components/LoadingSpinner";

// Páginas privadas
import Dashboard         from "./pages/Dashboard";
import Facturacion       from "./pages/Facturacion";
import Clasificacion     from "./pages/Clasificacion";
import DailyReports      from "./pages/DailyReports";
import ProductsView      from "./pages/inventory/ProductsView";
import Orders from "pages/Orders";

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
      {/* Rutas públicas */}
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
        element={
          isLoading
            ? <LoadingSpinner />
            : <Login />
        }
      />
      <Route
        path="/auth/register"
        element={
          isLoading
            ? <LoadingSpinner />
            : <Register />
        }
      />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Redirección explícita para /app */}
      <Route
        path="/app"
        element={
          token
            ? <Navigate to="/app/dashboard" replace />
            : <Navigate to="/auth/login" replace />
        }
      />

      {/* Rutas protegidas bajo /app */}
      <Route
        path="/app/*"
        element={
          <PrivateRoute>
            <ProtectedLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="facturacion" element={<Facturacion />} />
        <Route path="clasificacion" element={<Clasificacion />} />
        <Route path="reportes" element={<DailyReports />} />
        <Route path="orders" element={<Orders />} />
        <Route path="inventario" element={
          <ProductsProvider>
            <ProductsView />
          </ProductsProvider>
        } />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Catch-all global */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}