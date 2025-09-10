import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Facturacion from "./pages/Facturacion";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/facturacion" element={<Facturacion />} />
      </Routes>
    </Router>
  );
}

export default App;


