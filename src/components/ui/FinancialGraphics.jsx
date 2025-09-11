import React from "react";
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

const GraficosFinancieros = ({ transacciones }) => {
  // Agrupar por fecha
  const agrupadoPorFecha = {};

  transacciones.forEach((t) => {
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

  const totalIngresos = datosLineales.reduce((acc, d) => acc + d.ingresos, 0);
  const totalGastos = datosLineales.reduce((acc, d) => acc + d.gastos, 0);

  const datosPastel = [
    { name: "Ingresos", value: totalIngresos },
    { name: "Gastos", value: totalGastos },
  ];

  const colores = ["#4ade80", "#f87171"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
      {/* Gráfico de líneas */}
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
            <Line type="monotone" dataKey="ingresos" stroke="#22c55e" strokeWidth={2} />
            <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de pastel 3D simulado */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Proporción de ingresos vs gastos</h3>
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
  );
};

export default GraficosFinancieros;