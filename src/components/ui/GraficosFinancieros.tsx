// src/components/ui/GraficosFinancieros.tsx

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

export interface GraficoTransaccion {
  fecha: string;         // ISO o dd/MM/yyyy
  monto: number;
  tipo: "Ingreso" | "Gasto";
}

interface GraficosProps {
  transacciones: GraficoTransaccion[];
}

const colores = ["#4ade80", "#f87171"];

const GraficosFinancieros: React.FC<GraficosProps> = ({ transacciones }) => {
  // Agrupar por fecha
  const agrupado: Record<
    string,
    { fecha: string; ingresos: number; gastos: number }
  > = {};

  transacciones.forEach((t) => {
    if (!agrupado[t.fecha]) {
      agrupado[t.fecha] = { fecha: t.fecha, ingresos: 0, gastos: 0 };
    }
    if (t.tipo === "Ingreso") agrupado[t.fecha].ingresos += t.monto;
    else agrupado[t.fecha].gastos += t.monto;
  });

  // Convertir a array y ordenar
  const datosLineales = Object.values(agrupado).sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  // Totales para pastel
  const totalIngresos = datosLineales.reduce((sum, d) => sum + d.ingresos, 0);
  const totalGastos   = datosLineales.reduce((sum, d) => sum + d.gastos, 0);

  const datosPastel = [
    { name: "Ingresos", value: totalIngresos },
    { name: "Gastos",   value: totalGastos },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
      {/* 1. Línea */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">
          Evolución de ingresos y gastos
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={datosLineales}>
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip formatter={(val: number) =>
              `$${val.toLocaleString("es-CO")}`} 
            />
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

      {/* 2. Pastel */}
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
              // <-- Usamos any para que TS no lo relacione con nuestro Props
              label={(entry: any) =>
                `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
            >
              {datosPastel.map((_, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={colores[idx % colores.length]}
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