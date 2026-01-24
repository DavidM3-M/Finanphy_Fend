import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Contextos
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProductsProvider } from "./context/ProductsContext";

// Carrito (solo para catálogo público)
import { CartProvider } from "./context/CartContext";               // ajusta ruta si necesario


// Páginas públicas
import Login        from "./pages/auth/Login";
import Register     from "./pages/auth/Register";
import Unauthorized from "./components/ui/Unauthorized";
import NotFound     from "./components/ui/NotFound";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Layouts y protección
import ProtectedLayout from "./components/ProtectedLayout";
import PrivateRoute    from "./components/PrivateRoute";
import LoadingSpinner  from "./components/ui/LoadingSpinner";

// Páginas privadas
import Dashboard     from "./pages/Dashboard";
import Facturacion   from "./pages/Facturacion";
import Clasificacion from "./pages/Clasificacion";
import DailyReports  from "./pages/DailyReports";
import ProductsView  from "./pages/inventory/ProductsView";
import Orders        from "./pages/Orders/Orders";
import CompanyCatalog from "./pages/CompanyCatalog";
import CartPanel from "components/Orders/CartPanel";
import ResetPassword from "pages/auth/ResetPassword";
import Calendar from "./pages/Calendar";
import Customers from "./pages/Customers";


// Wrapper para catálogo público (envuelve solo la rama pública con CartProvider)
function PublicCatalogWrapper() {
  const { companyId } = useParams();

  if (!companyId) {
    return <div className="p-8 text-center text-red-600 font-bold">Empresa no especificada</div>;
  }

  return (
    <CartProvider>
      <div className="min-h-screen bg-[#fffbeb]">

        {/* Provider de productos + catálogo público */}
        <ProductsProvider companyId={companyId} publicMode>
          <CompanyCatalog />
        </ProductsProvider>

        {/* Panel del carrito (deslizable) */}
        <CartPanel />
      </div>
    </CartProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { token, isLoading, company } = useAuth();

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
          token ? <Navigate to="/app/dashboard" replace /> : <Navigate to="/auth/login" replace />
        }
      />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/register" element={<Register />} />
      <Route path="/catalogo/:companyId" element={<PublicCatalogWrapper />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />


      {/* Redirección explícita para /app */}
      <Route
        path="/app"
        element={
          token ? <Navigate to="/app/dashboard" replace /> : <Navigate to="/auth/login" replace />
        }
      />

      {/* Rutas protegidas bajo /app */}
      <Route
        path="/app/*"
        element={
          <PrivateRoute>
            {company?.id ? (
              <ProductsProvider companyId={company.id}>
                <ProtectedLayout />
              </ProductsProvider>
            ) : (
              <LoadingSpinner />
            )}
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="facturacion" element={<Facturacion />} />
        <Route path="clasificacion" element={<Clasificacion />} />
        <Route path="reportes" element={<DailyReports />} />
        <Route path="calendario" element={<Calendar />} />
        <Route path="clientes" element={<Customers />} />
        <Route path="orders" element={<Orders />} />
        <Route path="inventario" element={<ProductsView />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Catch-all global */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}