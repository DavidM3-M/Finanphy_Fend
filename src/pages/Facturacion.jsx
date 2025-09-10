import React, { useEffect, useState } from "react";
import api from "../services/api";

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
});

const Facturacion = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Campos del formulario
  const [nuevaFactura, setNuevaFactura] = useState({
    descripcion: "",
    monto: "",
    fecha: "",
  });

  // Obtener facturas
  const fetchFacturas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/incomes");
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setFacturas(data);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacturas();
  }, []);

  // Manejo de formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevaFactura((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/incomes", {
        descripcion: nuevaFactura.descripcion,
        monto: Number(nuevaFactura.monto),
        fecha: nuevaFactura.fecha,
      });
      setModalOpen(false);
      setNuevaFactura({ descripcion: "", monto: "", fecha: "" });
      fetchFacturas();
    } catch (err) {
      console.error(err);
      alert("Error al crear factura");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Facturación</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          + Nueva Factura
        </button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Cargando facturas...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full text-left">
            <thead className="bg-slate-200 text-slate-700">
              <tr>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Monto</th>
                <th className="px-4 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {facturas.length > 0 ? (
                facturas.map((factura, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-2">{factura.descripcion}</td>
                    <td className="px-4 py-2 text-green-600 font-semibold">
                      {formatoCOP.format(factura.monto)}
                    </td>
                    <td className="px-4 py-2">
                      {new Date(factura.fecha).toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="3"
                    className="text-center px-4 py-4 text-slate-500"
                  >
                    No hay facturas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de creación */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Nueva Factura</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Descripción</label>
                <input
                  type="text"
                  name="descripcion"
                  value={nuevaFactura.descripcion}
                  onChange={handleChange}
                  className="w-full p-2 border rounded mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Monto</label>
                <input
                  type="number"
                  name="monto"
                  value={nuevaFactura.monto}
                  onChange={handleChange}
                  className="w-full p-2 border rounded mt-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Fecha</label>
                <input
                  type="date"
                  name="fecha"
                  value={nuevaFactura.fecha}
                  onChange={handleChange}
                  className="w-full p-2 border rounded mt-1"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-200 hover:bg-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Facturacion;
