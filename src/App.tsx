import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";

// Contextos
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProductsProvider } from "./context/ProductsContext";

// Carrito (solo para catálogo público)
import { CartProvider } from "./context/CartContext";               // ajusta ruta si necesario
 // ajusta ruta si necesario

// Páginas públicas
import Login        from "./pages/auth/Login";
import Register     from "./pages/auth/Register";
import Unauthorized from "./components/ui/Unauthorized";
import NotFound     from "./components/ui/NotFound";

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
import CartButton from "components/Orders/CardButton";
import CartPanel from "components/Orders/CartPanel";


// Wrapper para catálogo público (envuelve solo la rama pública con CartProvider)
function PublicCatalogWrapper() {
  const { companyId } = useParams();

  if (!companyId) {
    return <div className="p-8 text-center text-red-600 font-bold">Empresa no especificada</div>;
  }

  return (
    <CartProvider>
      <div className="min-h-screen bg-[#fffbeb]">
        {/* Pequeño header local que muestra el botón del carrito */}
        <header className="p-4 flex justify-end border-b border-[#fef3c6] bg-white">
          <CartButton />
        </header>

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
        <Route path="orders" element={<Orders />} />
        <Route path="inventario" element={<ProductsView />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Catch-all global */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}