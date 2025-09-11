import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Facturacion from "./pages/Facturacion";
import ReportPage from "./pages/ReportPage"; // Asegúrate de que el archivo se llame así

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/facturacion" element={<Facturacion />} />
        <Route path="/reportes" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}

export default App;


