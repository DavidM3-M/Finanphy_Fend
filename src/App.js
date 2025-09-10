import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Clasificacion from "./pages/Clasificacion";
import Facturacion from "./pages/Facturacion";
import Inventario from "./pages/Inventario";
import Clientes from "./pages/Clientes";

function App() {
  return (
    <Router>
      <div className="flex">
        {/* Menú lateral */}
        <Sidebar />

        {/* Contenido principal */}
        <main className="flex-1 p-6 bg-slate-100 min-h-screen">
          <Routes>
            {/* Redirección desde "/" hacia "/dashboard" */}
            <Route path="/" element={<Navigate to="/dashboard" />} />

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clasificacion" element={<Clasificacion />} />
            <Route path="/facturacion" element={<Facturacion />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/clientes" element={<Clientes />} />
              
            {/* Ruta 404 */}
            <Route path="*" element={<h2>Página no encontrada</h2>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
