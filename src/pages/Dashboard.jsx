import React, { useEffect, useState } from "react";
import api from "../services/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

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
      const [incomesRes, expensesRes] = await Promise.all([
        api.get("/incomes"),
        api.get("/expenses"),
      ]);

      const ingresos = incomesRes.data.reduce(
        (acc, item) => acc + parseFloat(item.amount || 0),
        0
      );
      const gastos = expensesRes.data.reduce(
        (acc, item) => acc + parseFloat(item.amount || 0),
        0
      );
      const balance = ingresos - gastos;

      const transacciones = [
        ...incomesRes.data.map((i) => ({
          fecha: i.exitDate || i.dueDate,
          descripcion: i.supplier || "Ingreso sin proveedor",
          monto: parseFloat(i.amount || 0),
          tipo: "Ingreso",
        })),
        ...expensesRes.data.map((e) => ({
          fecha: e.dueDate,
          descripcion: e.supplier || "Gasto sin proveedor",
          monto: parseFloat(e.amount || 0),
          tipo: "Gasto",
        })),
      ]
        .filter((t) => t.fecha)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 10);

      setResumen({ ingresos, gastos, balance, transacciones });
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumen();
  }, []);

  // Preparar datos para gráficos
  const agrupadoPorFecha = {};
  resumen.transacciones.forEach((t) => {
    const fecha = new Date(t.fecha).toLocaleDateString("es-CO");
    if (!agrupadoPorFecha[fecha]) {
      agrupadoPorFecha[fecha] = { fecha, ingresos: 0, gastos: 0 };
    }
    if (t.tipo === "Ingreso") {
      agrupadoPorFecha[fecha].ingresos += t.monto;
    } else {
      agrupadoPorFecha[fecha].gastos += t.monto;
    }
  });

  const datosLineales = Object.values(agrupadoPorFecha).sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha)
  );

  const datosPastel = [
    { name: "Ingresos", value: resumen.ingresos },
    { name: "Gastos", value: resumen.gastos },
  ];
  const colores = ["#4ade80", "#f87171"];

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
          <>
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
                <p
                  className={`text-2xl font-bold ${
                    resumen.balance >= 0 ? "text-indigo-600" : "text-red-500"
                  }`}
                >
                  ${resumen.balance.toLocaleString("es-CO")}
                </p>
                {resumen.balance < 0 && (
                  <p className="text-sm text-red-500 mt-2">
                    ⚠️ El balance está en negativo. Revisa tus gastos.
                  </p>
                )}
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">
                  Evolución de ingresos y gastos
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={datosLineales}>
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString("es-CO")}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ingresos"
                      stroke="#22c55e"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="gastos"
                      stroke="#ef4444"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">
                  Proporción de ingresos vs gastos
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={datosPastel}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={40}
                      paddingAngle={5}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {datosPastel.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={colores[index % colores.length]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Últimas transacciones al final */}
            {!loading && resumen.transacciones.length > 0 && (
  <div className="bg-white rounded-lg shadow p-6 mb-10">
    <h3 className="text-xl font-semibold mb-4">Últimas transacciones</h3>
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
            <td
              className={`font-semibold ${
                t.tipo === "Ingreso" ? "text-green-600" : "text-red-600"
              }`}
            >
              ${t.monto.toLocaleString("es-CO")}
            </td>
            <td
              className={`font-medium ${
                t.tipo === "Ingreso" ? "text-green-500" : "text-red-500"
              }`}
            >
              {t.tipo}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;