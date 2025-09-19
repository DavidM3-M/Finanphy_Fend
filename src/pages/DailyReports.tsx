// src/pages/DailyReports.tsx

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { getIncomes, getExpenses } from "../services/api";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export interface Transaction {
  time: string;     // ISO timestamp
  amount: number;
  type: "income" | "expense";
  supplier: string;
}

export interface DailyReportData {
  date: string;                    // YYYY-MM-DD (dueDate)
  transactions: Transaction[];
  incomesTotal: number;
  expensesTotal: number;
  balance: number;
  formattedDate?: string;          // “dd/MM/yyyy”
  transactionsWithTime?: {         // para gráficas
    timePart: string;
    amount: number;
  }[];
}

const DailyReports: React.FC = () => {
  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // filtros
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");

  // comparación de hasta dos días
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showFloatingChart, setShowFloatingChart] = useState(false);
  const [isCompCollapsed, setIsCompCollapsed] = useState(false);

  // 1️⃣ Fetch y agrupación por dueDate
  useEffect(() => {
    const fetchAndGroup = async () => {
      const [inRes, exRes] = await Promise.all([
        getIncomes(),
        getExpenses(),
      ]);

      const allTx = [
        ...inRes.data.map((i: any) => ({
          time: i.createdAt,
          amount: parseFloat(i.amount),
          type: "income" as const,
          supplier: i.supplier ?? i.description ?? "—",
          datePart: i.dueDate.slice(0, 10),
        })),
        ...exRes.data.map((e: any) => ({
          time: e.createdAt,
          amount: parseFloat(e.amount),
          type: "expense" as const,
          supplier: e.supplier ?? e.description ?? "—",
          datePart: e.dueDate.slice(0, 10),
        })),
      ] as (Transaction & { datePart: string })[];

      const grouped: Record<string, Transaction[]> = {};
      allTx.forEach((tx) => {
        (grouped[tx.datePart] ||= []).push({
          time: tx.time,
          amount: tx.amount,
          type: tx.type,
          supplier: tx.supplier,
        });
      });

      const dr = Object.entries(grouped)
        .map(([date, txs]) => {
          const incomesTotal = txs
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);
          const expensesTotal = txs
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);
          return {
            date,
            transactions: txs,
            incomesTotal,
            expensesTotal,
            balance: incomesTotal - expensesTotal,
          } as DailyReportData;
        })
        .sort((a, b) => b.date.localeCompare(a.date));

      setReports(dr);
    };

    fetchAndGroup();
  }, []);

  // 2️⃣ Preprocesar para UI
  const displayReports = useMemo(() => {
    return reports.map((r) => {
      const formattedDate = format(parseISO(r.date), "dd/MM/yyyy", { locale: es });
      const transactionsWithTime = r.transactions
        .map((tx) => ({
          timePart: format(parseISO(tx.time), "HH:mm:ss"),
          amount: tx.amount,
        }))
        .sort((a, b) => (a.timePart < b.timePart ? -1 : 1));
      return { ...r, formattedDate, transactionsWithTime };
    });
  }, [reports]);

  // 3️⃣ Filtrar por fecha, mes o año
  const filteredReports = useMemo(() => {
    if (filterDate) {
      return displayReports.filter((r) => r.date === filterDate);
    }
    if (filterMonth) {
      // filterMonth = "YYYY-MM"
      return displayReports.filter((r) => r.date.startsWith(filterMonth));
    }
    if (filterYear) {
      // filterYear = "YYYY"
      return displayReports.filter((r) => r.date.slice(0, 4) === filterYear);
    }
    return displayReports;
  }, [displayReports, filterDate, filterMonth, filterYear]);

  // 4️⃣ Construir datos para comparar dos días
  const compareData = useMemo(() => {
    if (selectedDates.length !== 2) return [];
    const [d1, d2] = selectedDates;
    const rep1 = displayReports.find((r) => r.date === d1);
    const rep2 = displayReports.find((r) => r.date === d2);
    if (!rep1 || !rep2) return [];

    const times = Array.from(
      new Set([
        ...rep1.transactionsWithTime!.map((t) => t.timePart),
        ...rep2.transactionsWithTime!.map((t) => t.timePart),
      ])
    ).sort();

    return times.map((t) => ({
      time: t,
      [d1]: rep1.transactionsWithTime!.find((x) => x.timePart === t)?.amount ?? 0,
      [d2]: rep2.transactionsWithTime!.find((x) => x.timePart === t)?.amount ?? 0,
    }));
  }, [selectedDates, displayReports]);

  // alternar selección de fechas (máx 2)
  const toggleDate = (date: string) => {
    setSelectedDates((prev) => {
      if (prev.includes(date)) {
        return prev.filter((d) => d !== date);
      }
      if (prev.length < 2) {
        return [...prev, date];
      }
      return prev;
    });
  };

  // limpiar todos los filtros
  const clearFilters = () => {
    setFilterDate("");
    setFilterMonth("");
    setFilterYear("");
  };

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto relative">
      {/* 🔍 Controles de filtrado */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <label className="block text-sm mb-1">Fecha exacta</label>
          <input
            type="date"
            className="border rounded px-3 py-1"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setFilterMonth("");
              setFilterYear("");
            }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Mes</label>
          <input
            type="month"
            className="border rounded px-3 py-1"
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setFilterDate("");
              setFilterYear("");
            }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Año</label>
          <input
            type="number"
            min="2000"
            max="2100"
            placeholder="YYYY"
            className="border rounded px-3 py-1 w-24"
            value={filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value);
              setFilterDate("");
              setFilterMonth("");
            }}
          />
        </div>

        <button
          className="ml-auto bg-gray-200 hover:bg-gray-300 transition rounded-full px-4 py-1 text-sm font-medium"
          onClick={clearFilters}
        >
          ✕ Limpiar filtros
        </button>

        <button
          disabled={selectedDates.length !== 2}
          className={`ml-2 text-sm font-medium px-4 py-1 rounded ${
            showFloatingChart
              ? "bg-blue-600 text-white"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          } ${selectedDates.length !== 2 ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => {
            setIsCompCollapsed(false);
            setShowFloatingChart((v) => !v);
          }}
        >
          {showFloatingChart ? "Cerrar comparación" : "Ver comparación"}
        </button>
      </div>

      {/* 📅 Reportes diarios con checkbox */}
      {filteredReports.map((r) => {
        const isOpen = expandedDate === r.date;
        const isSelected = selectedDates.includes(r.date);
        return (
          <div
            key={r.date}
            className={`relative bg-white rounded-lg shadow-sm overflow-hidden ${
              isSelected ? "ring-2 ring-blue-500" : ""
            }`}
          >
            <header
              className="flex justify-between items-center p-4 cursor-pointer"
              onClick={() => setExpandedDate(isOpen ? null : r.date)}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleDate(r.date)}
                  className="h-4 w-4"
                />
                <h3 className="text-lg font-semibold">{r.formattedDate}</h3>
              </div>
              <span
                className={`transform transition-transform ${
                  isOpen ? "rotate-90" : "rotate-0"
                }`}
              >
                ▶
              </span>
            </header>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-4 pb-4"
                >
                  <div className="flex justify-between mb-4 text-sm">
                    <p>Ingresos: ${r.incomesTotal.toFixed(2)}</p>
                    <p>Gastos: ${r.expensesTotal.toFixed(2)}</p>
                    <p className={r.balance >= 0 ? "text-green-600" : "text-red-600"}>
                      Balance: ${r.balance.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%"> 
                      <LineChart data={r.transactionsWithTime}>
                        <XAxis
                          dataKey="timePart"
                          angle={-45}
                          textAnchor="end"
                          tick={{ fontSize: 10 }}
                          height={60}
                        />
                        <YAxis />
                        <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={false}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* 🗂️ Comparativa flotante / expandible */}
      <AnimatePresence>
        {showFloatingChart && selectedDates.length === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 right-6 w-96 bg-white shadow-lg rounded-lg overflow-hidden z-50"
          >
            {/* header con expand/minimize y close */}
            <div className="flex justify-between items-center bg-gray-100 p-3">
              <h4 className="text-sm font-semibold">
                Comparación {selectedDates[0]} vs {selectedDates[1]}
              </h4>
              <div className="flex gap-2">
                <button
                  className="text-lg leading-none px-2"
                  onClick={() => setIsCompCollapsed((v) => !v)}
                >
                  {isCompCollapsed ? "+" : "−"}
                </button>
                <button
                  className="text-sm px-2"
                  onClick={() => setShowFloatingChart(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* cuerpo de gráfica, colapsable */}
            {!isCompCollapsed && (
              <div className="h-64 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={compareData}>
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip
                      formatter={(v: number) => `$${v.toFixed(2)}`}
                      labelFormatter={(l) => `Hora ${l}`}
                    />
                    <Line
                      type="monotone"
                      dataKey={selectedDates[0]}
                      name={selectedDates[0]}
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey={selectedDates[1]}
                      name={selectedDates[1]}
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyReports;