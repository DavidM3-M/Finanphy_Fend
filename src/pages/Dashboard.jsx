// src/pages/Dashboard.jsx
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

export default function Dashboard() {
  const [resumen, setResumen] = useState({
    ingresos: 0,
    gastos: 0,
    balance: 0,
    transacciones: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchResumen() {
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

      const todos = [
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

      setResumen({
        ingresos,
        gastos,
        balance,
        transacciones: todos,
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Error al cargar el dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResumen();
  }, []);

  // Preparar datos para LineChart
  const agrupado = {};
  resumen.transacciones.forEach((t) => {
    const fecha = new Date(t.fecha).toLocaleDateString("es-CO");
    if (!agrupado[fecha]) agrupado[fecha] = { fecha, ingresos: 0, gastos: 0 };
    agrupado[fecha][t.tipo === "Ingreso" ? "ingresos" : "gastos"] += t.monto;
  });
  const datosLineales = Object.values(agrupado).sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha)
  );

  // Datos para PieChart
  const datosPastel = [
    { name: "Ingresos", value: resumen.ingresos },
    { name: "Gastos", value: resumen.gastos },
  ];
  const colores = ["#4ade80", "#f87171"];

  return (
    <div className="min-h-screen bg-[#fffbeb]">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 text-red-600 p-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <svg
              className="animate-spin h-8 w-8 text-[#fe9a00]"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          </div>
        ) : (
          <>
            {/* Cabecera */}
            <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-8">
              <h1 className="text-4xl font-bold text-[#973c00]">
                Dashboard
              </h1>
              <p className="text-lg text-[#bb4d00] mt-1">
                Resumen general de la empresa
              </p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-6">
                <h3 className="text-sm text-[#973c00]">
                  Ingresos Totales
                </h3>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ${resumen.ingresos.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-6">
                <h3 className="text-sm text-[#973c00]">
                  Gastos Totales
                </h3>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  ${resumen.gastos.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-6">
                <h3 className="text-sm text-[#973c00]">
                  Balance Actual
                </h3>
                <p
                  className={`text-2xl font-bold mt-2 ${
                    resumen.balance >= 0
                      ? "text-green-600"
                      : "text-red-600"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-6">
                <h3 className="text-xl font-semibold text-[#973c00] mb-4">
                  Evolución de ingresos y gastos
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={datosLineales} margin={{ left: -20 }}>
                    <XAxis dataKey="fecha" tick={{ fill: "#973c00" }} />
                    <YAxis tick={{ fill: "#973c00" }} />
                    <Tooltip
                      formatter={(value) =>
                        `$${value.toLocaleString("es-CO")}`
                      }
                    />
                    <Legend wrapperStyle={{ color: "#973c00" }} />
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
              <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-6">
                <h3 className="text-xl font-semibold text-[#973c00] mb-4">
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

            {/* Tabla de transacciones */}
            {resumen.transacciones.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-6">
                <h3 className="text-xl font-semibold text-[#973c00] mb-4">
                  Últimas transacciones
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#fef3c6]">
                      <th className="py-2 text-[#973c00]">Fecha</th>
                      <th className="text-[#973c00]">Descripción</th>
                      <th className="text-[#973c00]">Monto</th>
                      <th className="text-[#973c00]">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.transacciones.map((t, i) => (
                      <tr
                        key={i}
                        className="border-b last:border-none border-[#fef3c6]"
                      >
                        <td className="py-2">
                          {new Date(t.fecha).toLocaleDateString("es-CO")}
                        </td>
                        <td>{t.descripcion}</td>
                        <td
                          className={`font-semibold ${
                            t.tipo === "Ingreso"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ${t.monto.toLocaleString("es-CO")}
                        </td>
                        <td
                          className={`font-medium ${
                            t.tipo === "Ingreso"
                              ? "text-green-500"
                              : "text-red-500"
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
}