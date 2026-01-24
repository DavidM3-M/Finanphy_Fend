// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
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
  Area,
  CartesianGrid,
} from "recharts";

/* Hook reutilizable: useResumen */
function useResumen() {
  const { company } = useAuth();
  const companyId = company?.id;
  const [resumen, setResumen] = useState({
    ingresos: 0,
    gastos: 0,
    balance: 0,
    transacciones: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchResumen = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [incomesRes, expensesRes] = await Promise.all([
        api.get("/incomes", { params: { page: 1, limit: 15, ...(companyId ? { companyId } : {}) }, signal }),
        api.get("/expenses", { params: { page: 1, limit: 15, ...(companyId ? { companyId } : {}) }, signal }),
      ]);

      const incomesData = Array.isArray(incomesRes?.data?.data)
        ? incomesRes.data.data
        : Array.isArray(incomesRes?.data)
        ? incomesRes.data
        : [];
      const expensesData = Array.isArray(expensesRes?.data?.data)
        ? expensesRes.data.data
        : Array.isArray(expensesRes?.data)
        ? expensesRes.data
        : [];

      const ingresos = incomesData.reduce(
        (acc, item) => acc + Number.parseFloat(item.amount || 0),
        0
      );
      const gastos = expensesData.reduce(
        (acc, item) => acc + Number.parseFloat(item.amount || 0),
        0
      );
      const balance = ingresos - gastos;

      const normalizeDate = (d) => {
        const dt = new Date(d);
        return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
      };

      const pickCategory = (obj) =>
        obj.category || obj.categoria || obj.categoryName || obj.category_name || "Sin categoría";

      const todosRaw = [
        ...incomesData.map((i) => ({
          id: i.id ?? null,
          fecha: normalizeDate(i.exitDate || i.dueDate || i.createdAt || null),
          descripcion: i.supplier || i.description || "Ingreso sin proveedor",
          monto: Number.parseFloat(i.amount || 0),
          tipo: "Ingreso",
          categoria: pickCategory(i),
        })),
        ...expensesData.map((e) => ({
          id: e.id ?? null,
          fecha: normalizeDate(e.dueDate || e.date || e.createdAt || null),
          descripcion: e.supplier || e.description || "Gasto sin proveedor",
          monto: Number.parseFloat(e.amount || 0),
          tipo: "Gasto",
          categoria: pickCategory(e),
        })),
      ];

      const todos = todosRaw
        .filter((t) => t.fecha)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 200);

      setResumen({ ingresos, gastos, balance, transacciones: todos });
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return;
      setError(err.response?.data?.message || "Error al cargar el dashboard");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchResumen(controller.signal);
    return () => controller.abort();
  }, [fetchResumen]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    fetchResumen(controller.signal);
  }, [fetchResumen]);

  return { resumen, loading, error, refetch };
}

/* Utils */
const useCurrency = (locale = "es-CO") =>
  React.useMemo(() => new Intl.NumberFormat(locale), [locale]);

function deterministicKey(item, index) {
  if (item.id) return item.id;
  return `${item.tipo}-${item.fecha}-${Math.round(item.monto)}-${index}`;
}

/* Small components */
function StatCard({ title, value, statusClass, hint }) {
  return (
    <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-6">
      <h3 className="text-sm text-[#973c00]">{title}</h3>
      <p className={`text-2xl font-bold mt-2 ${statusClass}`}>${value}</p>
      {hint && <p className="text-sm text-red-500 mt-2">{hint}</p>}
    </div>
  );
}

/* Tooltip deduplicado */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const seen = new Set();
  const unique = [];
  for (const p of payload) {
    if (!p || !p.name) continue;
    const norm = String(p.name).trim().toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      unique.push({ ...p, displayName: norm.charAt(0).toUpperCase() + norm.slice(1) });
    }
  }
  if (!unique.length) return null;
  const totalPayload = payload.reduce((s, x) => s + (x.value || 0), 0) || 1;
  return (
    <div className="bg-white p-2 rounded-md shadow text-sm border" style={{ borderColor: "#fde68a" }}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {unique.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div style={{ width: 10, height: 10, background: p.color, borderRadius: 2 }} />
          <div>{p.displayName}: <strong>${new Intl.NumberFormat("es-CO").format(p.value)}</strong> ({((p.value / totalPayload) * 100).toFixed(1)}%)</div>
        </div>
      ))}
    </div>
  );
}

/* Paleta */
const BASE_COLORS = [
  "#06b6d4", "#06b6a4", "#8b5cf6", "#f97316", "#f43f5e", "#84cc16",
  "#0ea5e9", "#a3e635", "#fb923c", "#ef4444",
];

export default function Dashboard() {
  const { resumen, loading, error, refetch } = useResumen();
  const currencyFormatter = useCurrency();
  const [pieMode, setPieMode] = useState("gastos"); // 'gastos' | 'ingresos'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const TOP_N = 6;

  /* Datos lineales agrupados por día */
  const datosLineales = useMemo(() => {
    const agrupado = {};
    resumen.transacciones.forEach((t) => {
      const d = new Date(t.fecha);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("es-CO");
      if (!agrupado[key]) agrupado[key] = { fechaKey: key, fechaLabel: label, ingresos: 0, gastos: 0 };
      agrupado[key][t.tipo === "Ingreso" ? "ingresos" : "gastos"] += Number(t.monto || 0);
    });
    return Object.values(agrupado)
      .sort((a, b) => new Date(a.fechaKey) - new Date(b.fechaKey))
      .map((it) => ({ fecha: it.fechaLabel, ingresos: Number(it.ingresos || 0), gastos: Number(it.gastos || 0) }));
  }, [resumen.transacciones]);

  /* Cálculos derivados para el resumen del periodo */
  const totalIngresos = datosLineales.reduce((acc, d) => acc + d.ingresos, 0);
  const totalGastos = datosLineales.reduce((acc, d) => acc + d.gastos, 0);
  const totalBalance = totalIngresos - totalGastos;
  const diasActivos = datosLineales.length;

  /* Pie por categoría */
  const { datosPastelPorCategoria, coloresPorCategoria, totalSelected } = useMemo(() => {
    const map = new Map();
    resumen.transacciones.forEach((t) => {
      const isMatch = pieMode === "gastos" ? t.tipo === "Gasto" : t.tipo === "Ingreso";
      if (!isMatch) return;
      const cat = t.categoria || "Sin categoría";
      map.set(cat, (map.get(cat) || 0) + Number(t.monto || 0));
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    arr.sort((a, b) => b.value - a.value);
    const total = arr.reduce((s, r) => s + r.value, 0);
    const top = arr.slice(0, TOP_N);
    const others = arr.slice(TOP_N);
    const othersSum = others.reduce((s, r) => s + r.value, 0);
    const final = [...top];
    if (othersSum > 0) final.push({ name: "Otros", value: othersSum });
    const colores = final.map((_, i) => BASE_COLORS[i % BASE_COLORS.length]);
    return { datosPastelPorCategoria: final, coloresPorCategoria: colores, totalSelected: total };
  }, [resumen.transacciones, pieMode]);

  /* Eje Y "nice" */
  const yMaxNice = useMemo(() => {
    const maxVal = datosLineales.reduce((m, r) => Math.max(m, r.ingresos, r.gastos), 0);
    if (maxVal <= 0) return 1000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const step = magnitude / 2;
    return Math.ceil((maxVal * 1.12) / step) * step;
  }, [datosLineales]);

  /* Top categorías table (para el card que reemplaza "Últimas transacciones") */
  const topCategoriesTable = useMemo(() => {
    const rows = datosPastelPorCategoria.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      value: r.value,
      color: coloresPorCategoria[i],
      percent: totalSelected ? (r.value / totalSelected) * 100 : 0,
    }));
    return rows;
  }, [datosPastelPorCategoria, coloresPorCategoria, totalSelected]);

  /* Transacciones filtradas por categoría seleccionada (muestra lista compacta cuando hay selección) */
  const transactionsForSelectedCategory = useMemo(() => {
    if (!selectedCategory) return [];
    if (selectedCategory === "Otros") {
      const topNames = datosPastelPorCategoria.slice(0, TOP_N).map(d => d.name);
      return resumen.transacciones.filter(t => {
        const isMatch = pieMode === "gastos" ? t.tipo === "Gasto" : t.tipo === "Ingreso";
        return isMatch && !topNames.includes(t.categoria || "Sin categoría");
      });
    }
    return resumen.transacciones.filter(t => {
      const isMatch = pieMode === "gastos" ? t.tipo === "Gasto" : t.tipo === "Ingreso";
      return isMatch && (t.categoria || "Sin categoría") === selectedCategory;
    });
  }, [selectedCategory, resumen.transacciones, datosPastelPorCategoria, pieMode]);

  /* Compact bar visual helper (percentage width) */
  const percentWidth = (p) => `${Math.max(4, Math.round(p))}%`;

  if (loading && resumen.transacciones.length === 0) {
    return (
      <div className="min-h-screen bg-[#fffbeb]">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
          <div className="h-28 bg-white rounded-2xl border border-[#fef3c6] p-6 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-24 bg-white rounded-2xl border p-6 animate-pulse" />
            <div className="h-24 bg-white rounded-2xl border p-6 animate-pulse" />
            <div className="h-24 bg-white rounded-2xl border p-6 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffbeb]">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 text-red-600 p-4 flex items-center justify-between">
            <div>{error}</div>
            <button onClick={refetch} className="ml-4 px-3 py-1 bg-red-600 text-white rounded-md text-sm">Reintentar</button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-8">
          <h1 className="text-4xl font-bold text-[#973c00]">Dashboard</h1>
          <p className="text-lg text-[#bb4d00] mt-1">Resumen general de la empresa</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Ingresos Totales" value={currencyFormatter.format(resumen.ingresos)} statusClass="text-green-600" />
          <StatCard title="Gastos Totales" value={currencyFormatter.format(resumen.gastos)} statusClass="text-red-600" />
          <StatCard
            title="Balance Actual"
            value={currencyFormatter.format(resumen.balance)}
            statusClass={resumen.balance >= 0 ? "text-green-600" : "text-red-600"}
            hint={resumen.balance < 0 ? "⚠️ El balance está en negativo. Revisa tus gastos." : null}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LINE CHART */}
          <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-6">
            <h3 className="text-xl font-semibold text-[#973c00] mb-4">Evolución de ingresos y gastos</h3>
            <div className="w-full h-72" style={{ boxSizing: "border-box", overflow: "hidden" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datosLineales} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f7f7f7" />
                  <XAxis dataKey="fecha" tick={{ fill: "#973c00", fontSize: 12 }} tickLine={false} interval="preserveStartEnd" minTickGap={8} height={40} />
                  <YAxis tick={{ fill: "#973c00", fontSize: 12 }} tickLine={false} width={70} domain={[0, yMaxNice]} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ color: "#973c00" }} />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#16a34a" strokeWidth={2} fill="url(#gradIngresos)" fillOpacity={1} dot={{ r: 3 }} activeDot={{ r: 6 }} isAnimationActive animationDuration={600} />
                  <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#dc2626" strokeWidth={2} fill="url(#gradGastos)" fillOpacity={1} dot={{ r: 3 }} activeDot={{ r: 6 }} isAnimationActive animationDuration={600} />
                  <Line type="monotone" dataKey="ingresos" stroke="#16a34a" strokeWidth={2} dot={false} legendType="none" />
                  <Line type="monotone" dataKey="gastos" stroke="#dc2626" strokeWidth={2} dot={false} legendType="none" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Resumen del periodo (debajo de la gráfica) */}
            <div className="mt-6 bg-[#fff8e1] rounded-xl p-4 border border-[#fef3c6] text-[#973c00]">
              <h4 className="text-lg font-semibold mb-2">Resumen del periodo</h4>
              <ul className="text-sm space-y-1">
                <li>Total ingresos: <strong>${currencyFormatter.format(totalIngresos)}</strong></li>
                <li>Total gastos: <strong>${currencyFormatter.format(totalGastos)}</strong></li>
                <li>Balance neto: <strong className={totalBalance >= 0 ? "text-green-600" : "text-red-600"}>${currencyFormatter.format(totalBalance)}</strong></li>
                <li>Días activos: <strong>{diasActivos}</strong></li>
              </ul>
            </div>
          </div>

          {/* PIE por categoría (Top categorías) */}
          <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[#973c00]">Top categorías</h3>
              <div className="flex items-center gap-2">
                <button
                  className={`px-3 py-1 rounded-md text-sm ${pieMode === "gastos" ? "bg-[#fde68a] text-[#973c00]" : "bg-white border"}`}
                  onClick={() => { setPieMode("gastos"); setSelectedCategory(null); }}
                >
                  Gastos
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm ${pieMode === "ingresos" ? "bg-[#d1fae5] text-[#065f46]" : "bg-white border"}`}
                  onClick={() => { setPieMode("ingresos"); setSelectedCategory(null); }}
                >
                  Ingresos
                </button>
              </div>
            </div>

            <div className="w-full h-72 flex items-center justify-center" style={{ overflow: "hidden" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosPastelPorCategoria}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={46}
                    paddingAngle={6}
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    onClick={(d) => setSelectedCategory(d.name)}
                  >
                    {datosPastelPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={coloresPorCategoria[index % coloresPorCategoria.length]} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              {topCategoriesTable.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-4 bg-white p-2 rounded-md border">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 10, height: 10, background: row.color, borderRadius: 3 }} />
                    <div className="text-sm text-[#973c00] font-medium">{row.name}</div>
                  </div>

                  <div className="flex-1 mx-4">
                    <div className="w-full bg-[#f3f4f6] h-2 rounded overflow-hidden">
                      <div style={{ width: percentWidth(row.percent), background: row.color, height: "100%" }} />
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm">${currencyFormatter.format(row.value)}</div>
                    <div className="text-xs text-gray-500">{row.percent.toFixed(1)}%</div>
                    <button
                      onClick={() => setSelectedCategory(row.name)}
                      className="mt-1 text-xs px-2 py-1 bg-[#fef3c6] rounded-md text-[#973c00]"
                    >
                      Ver transacciones
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD: transacciones filtradas por categoría seleccionada (si aplica) */}
        {selectedCategory && (
          <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[#973c00]">Transacciones: {selectedCategory}</h3>
              <button onClick={() => setSelectedCategory(null)} className="text-sm px-3 py-1 bg-white border rounded-md">Cerrar</button>
            </div>

            <div className="w-full overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#fef3c6]">
                    <th className="py-2 text-[#973c00]">Fecha</th>
                    <th className="text-[#973c00]">Descripción</th>
                    <th className="text-[#973c00]">Monto</th>
                    <th className="text-[#973c00]">Tipo</th>
                    <th className="text-[#973c00]">Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsForSelectedCategory.slice(0, 100).map((t, i) => (
                    <tr key={deterministicKey(t, i)} className="border-b last:border-none border-[#fef3c6]">
                      <td className="py-2">{new Date(t.fecha).toLocaleDateString("es-CO")}</td>
                      <td>{t.descripcion}</td>
                      <td className={`font-semibold ${t.tipo === "Ingreso" ? "text-green-600" : "text-red-600"}`}>
                        ${currencyFormatter.format(t.monto)}
                      </td>
                      <td className={`font-medium ${t.tipo === "Ingreso" ? "text-green-500" : "text-red-500"}`}>
                        {t.tipo}
                      </td>
                      <td className="text-sm text-[#444]">{t.categoria}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}