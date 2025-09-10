import React, { useEffect, useState } from "react";
import api from "../services/api";
import RecentMovements from "../experimental/recent-movements/RecentMovements";


const Dashboard = () => {
  const [resumen, setResumen] = useState({
    ingresos: 0,
    gastos: 0,
    balance: 0,
    transacciones: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchResumen = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/dashboard"); // ENDPOINT a definir por tu backend
      setResumen({
        ingresos: res.data.ingresos || 0,
        gastos: res.data.gastos || 0,
        balance: res.data.balance || 0,
        transacciones: res.data.transacciones || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumen();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-slate-800 text-white py-10 px-8">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="text-slate-300 text-lg mt-1">
          Resumen general de la empresa
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">
        {error && (
          <div className="mb-6 p-4 rounded bg-red-50 text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-500">Cargando...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="p-6 bg-white rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Ingresos Totales</h3>
              <p className="text-2xl font-bold text-green-600">
                ${resumen.ingresos.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Gastos Totales</h3>
              <p className="text-2xl font-bold text-red-600">
                ${resumen.gastos.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow">
              <h3 className="text-gray-500 text-sm">Balance Actual</h3>
              <p className="text-2xl font-bold text-indigo-600">
                ${resumen.balance.toLocaleString("es-CO")}
              </p>
            </div>
          </div>
        )}

        {/* Tabla de últimas transacciones */}
        {!loading && resumen.transacciones.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">
              Últimas transacciones
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Fecha</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {resumen.transacciones.map((t, i) => (
                  <tr key={i} className="border-b last:border-none">
                    <td className="py-2">
                      {new Date(t.fecha).toLocaleDateString("es-CO")}
                    </td>
                    <td>{t.descripcion}</td>
                    <td>{t.monto.toLocaleString("es-CO")}</td>
                    <td>{t.tipo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Widget de Movimientos Recientes */}
<div className="mt-10">
  <RecentMovements />
</div>

      </div>
    </div>
  );
};

export default Dashboard;
