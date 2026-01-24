// src/pages/DailyReports.tsx

import React, { useEffect, useMemo, useState } from "react";
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

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ---------- Tipos ---------- */
export interface Transaction {
  time: string;
  amount: number;
  type: "income" | "expense";
  supplier: string;
}

export interface DailyReportData {
  date: string;
  formattedDate?: string;
  transactions: Transaction[];
  transactionsWithTime?: { timePart: string; amount: number }[];
  incomesTotal: number;
  expensesTotal: number;
  balance: number;
}

type TxWithDate = Transaction & { datePart: string };

/* ---------- Utilidades ---------- */
const currency = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(
    n
  );

const shortDate = (iso: string) => {
  try {
    return format(parseISO(iso), "EEE, dd MMM yyyy", { locale: es });
  } catch {
    return iso;
  }
};

/* ---------- Subcomponentes locales (sin archivos extra) ---------- */

function FiltersBar({
  filterDate,
  filterMonth,
  filterYear,
  onDate,
  onMonth,
  onYear,
  onClear,
  onExportCSV,
  onExportXLS,
  exporting,
}: {
  filterDate: string;
  filterMonth: string;
  filterYear: string;
  onDate: (v: string) => void;
  onMonth: (v: string) => void;
  onYear: (v: string) => void;
  onClear: () => void;
  onExportCSV: () => Promise<void> | void;
  onExportXLS: () => Promise<void> | void;
  exporting: boolean;
}) {
  return (
    <div className="sticky top-4 z-40 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">Fecha</label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => onDate(e.target.value)}
          className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label="Filtrar por fecha exacta"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">Mes</label>
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => onMonth(e.target.value)}
          className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label="Filtrar por mes"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">Año</label>
        <input
          type="number"
          min={2000}
          max={2100}
          placeholder="YYYY"
          className="border rounded px-2 py-1 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={filterYear}
          onChange={(e) => onYear(e.target.value)}
          aria-label="Filtrar por año"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onClear}
          className="text-sm px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
          title="Limpiar filtros"
        >
          ✕ Limpiar
        </button>

        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 text-sm px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300"
          title="Exportar resumen CSV"
        >
          {exporting ? "Exportando..." : "Exportar CSV"}
        </button>

        <button
          onClick={onExportXLS}
          className="flex items-center gap-2 text-sm px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-300"
          title="Exportar resumen Excel"
        >
          {exporting ? "Exportando..." : "Exportar XLSX"}
        </button>
      </div>
    </div>
  );
}

function Chip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const base = "px-2 py-0.5 rounded-full text-sm font-medium inline-flex items-center gap-2";
  if (tone === "positive")
    return (
      <span className={`${base} bg-green-50 text-green-700 border border-green-100`}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M5 12l5 5L20 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{label}</span> <span className="text-xs text-gray-600">{value}</span>
      </span>
    );
  if (tone === "negative")
    return (
      <span className={`${base} bg-red-50 text-red-700 border border-red-100`}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{label}</span> <span className="text-xs text-gray-600">{value}</span>
      </span>
    );
  return (
    <span className={`${base} bg-gray-50 text-gray-800 border border-gray-100`}>
      <span>{label}</span> <span className="text-xs text-gray-600">{value}</span>
    </span>
  );
}

function ReportCard({
  r,
  isOpen,
  isSelected,
  onToggle,
  onSelect,
}: {
  r: DailyReportData & { formattedDate?: string; transactionsWithTime?: { timePart: string; amount: number }[] };
  isOpen: boolean;
  isSelected: boolean;
  onToggle: (date: string) => void;
  onSelect: (date: string) => void;
}) {
  return (
    <article
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(r.date);
        }
      }}
      className={`bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
        isSelected ? "ring-2 ring-blue-400" : ""
      }`}
      aria-labelledby={`title-${r.date}`}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id={`sel-${r.date}`}
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(r.date)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4"
              aria-checked={isSelected}
            />
            <div>
              <h3 id={`title-${r.date}`} className="text-base font-semibold text-gray-800">
                {r.formattedDate ?? shortDate(r.date)}
              </h3>
              <div className="text-xs text-gray-500">{r.date}</div>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Chip label="Ingresos" value={currency(r.incomesTotal)} tone="positive" />
          <Chip label="Gastos" value={currency(r.expensesTotal)} tone="negative" />
          <div className="px-2">
            <span className={`text-sm font-medium ${r.balance >= 0 ? "text-green-700" : "text-red-700"}`}>
              {currency(r.balance)}
            </span>
          </div>

          <button
            aria-expanded={isOpen}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(r.date);
            }}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200`}
            title={isOpen ? "Colapsar" : "Expandir"}
          >
            <svg
              className={`w-4 h-4 transform transition-transform duration-150 ${isOpen ? "rotate-90" : "rotate-0"}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <polyline points="9 18 15 12 9 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4"
          >
            <div className="flex gap-4 mb-3 text-sm">
              <div className="flex-1 text-gray-700">Ingresos: <span className="font-medium">{currency(r.incomesTotal)}</span></div>
              <div className="flex-1 text-gray-700">Gastos: <span className="font-medium">{currency(r.expensesTotal)}</span></div>
              <div className={`flex-1 ${r.balance >= 0 ? "text-green-700" : "text-red-700"}`}>Balance: <span className="font-medium">{currency(r.balance)}</span></div>
            </div>

            <div className="bg-gray-50 rounded-md p-3 h-56">
              {r.transactionsWithTime && r.transactionsWithTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={r.transactionsWithTime}>
                    <XAxis
                      dataKey="timePart"
                      tick={{ fontSize: 10, fill: "#475569" }}
                      height={48}
                      tickFormatter={(t) => t}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#475569" }} />
                    <Tooltip formatter={(v: number) => currency(Number(v))} />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={false}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">Sin transacciones para este día</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

/* ---------- Componente principal ---------- */

const DailyReports: React.FC = () => {
  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showFloatingChart, setShowFloatingChart] = useState(false);
  const [isCompCollapsed, setIsCompCollapsed] = useState(false);

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchAndGroup = async () => {
      try {
        const [inRes, exRes] = await Promise.all([
          getIncomes({ page: 1, limit: 100 }),
          getExpenses({ page: 1, limit: 100 }),
        ]);

        const safeParseAmount = (v: any) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };

        const incomes = Array.isArray(inRes.data?.data)
          ? inRes.data.data
          : Array.isArray(inRes.data)
          ? inRes.data
          : [];
        const expenses = Array.isArray(exRes.data?.data)
          ? exRes.data.data
          : Array.isArray(exRes.data)
          ? exRes.data
          : [];

        const allTx = [
          ...incomes.map((i: any) => ({
            time: i.createdAt,
            amount: safeParseAmount(i.amount),
            type: "income" as const,
            supplier: i.supplier ?? i.description ?? "—",
            datePart: String(i.entryDate ?? i.dueDate ?? i.createdAt ?? "").slice(0, 10)
          })),
          ...expenses.map((e: any) => ({
            time: e.createdAt,
            amount: safeParseAmount(e.amount),
            type: "expense" as const,
            supplier: e.supplier ?? e.description ?? "—",
            datePart: String(e.entryDate ?? e.dueDate ?? e.createdAt ?? "").slice(0, 10)
          })),
        ] as TxWithDate[];

        const grouped: Record<string, Transaction[]> = {};
        allTx.forEach((tx) => {
          if (!tx.datePart || tx.datePart.length < 4) return;
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
              .reduce((sum, t) => sum + (t.amount ?? 0), 0);
            const expensesTotal = txs
              .filter((t) => t.type === "expense")
              .reduce((sum, t) => sum + (t.amount ?? 0), 0);
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
      } catch (err) {
        console.error("Error fetching reports:", err);
        setReports([]);
      }
    };

    fetchAndGroup();
  }, []);

  const displayReports = useMemo(() => {
    return reports.map((r) => {
      let formattedDate = r.date;
      try {
        formattedDate = format(parseISO(r.date), "dd/MM/yyyy", { locale: es });
      } catch {}
      const transactionsWithTime =
        r.transactions
          .map((tx) => {
            let timePart = tx.time;
            try {
              timePart = format(parseISO(tx.time), "HH:mm:ss");
            } catch {}
            return { timePart, amount: tx.amount ?? 0 };
          })
          .sort((a, b) => (a.timePart < b.timePart ? -1 : 1)) ?? [];
      return { ...r, formattedDate, transactionsWithTime };
    });
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (filterDate) return displayReports.filter((r) => r.date === filterDate);
    if (filterMonth) return displayReports.filter((r) => r.date.startsWith(filterMonth));
    if (filterYear) return displayReports.filter((r) => r.date.slice(0, 4) === filterYear);
    return displayReports;
  }, [displayReports, filterDate, filterMonth, filterYear]);

  const compareData = useMemo(() => {
    if (selectedDates.length !== 2) return [];
    const [d1, d2] = selectedDates;
    const rep1 = displayReports.find((r) => r.date === d1);
    const rep2 = displayReports.find((r) => r.date === d2);
    if (!rep1 || !rep2) return [];

    const times = Array.from(
      new Set([
        ...((rep1.transactionsWithTime ?? []).map((t) => t.timePart) || []),
        ...((rep2.transactionsWithTime ?? []).map((t) => t.timePart) || []),
      ])
    ).sort();

    return times.map((t) => ({
      time: t,
      [d1]:
        (rep1.transactionsWithTime ?? []).find((x) => x.timePart === t)?.amount ??
        0,
      [d2]:
        (rep2.transactionsWithTime ?? []).find((x) => x.timePart === t)?.amount ??
        0,
    }));
  }, [selectedDates, displayReports]);

  const toggleDate = (date: string) => {
    setSelectedDates((prev) => {
      if (prev.includes(date)) return prev.filter((d) => d !== date);
      if (prev.length < 2) return [...prev, date];
      return prev;
    });
  };

  const clearFilters = () => {
    setFilterDate("");
    setFilterMonth("");
    setFilterYear("");
  };

  const getSummaryData = () =>
    filteredReports.map((r) => ({
      Fecha: r.formattedDate ?? r.date,
      Ingresos: r.incomesTotal ?? 0,
      Gastos: r.expensesTotal ?? 0,
      Balance: r.balance ?? 0,
    }));

  const exportSummaryCSV = async () => {
    try {
      setExporting(true);
      const csv = Papa.unparse(getSummaryData());
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "resumen.csv");
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    try {
      setExporting(true);
      const wb = XLSX.utils.book_new();
      const wsSum = XLSX.utils.json_to_sheet(getSummaryData());
      XLSX.utils.book_append_sheet(wb, wsSum, "Resumen");
      XLSX.writeFile(wb, "reportes.xlsx");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <FiltersBar
        filterDate={filterDate}
        filterMonth={filterMonth}
        filterYear={filterYear}
        onDate={(v) => {
          setFilterDate(v);
          setFilterMonth("");
          setFilterYear("");
        }}
        onMonth={(v) => {
          setFilterMonth(v);
          setFilterDate("");
          setFilterYear("");
        }}
        onYear={(v) => {
          setFilterYear(v);
          setFilterDate("");
          setFilterMonth("");
        }}
        onClear={clearFilters}
        onExportCSV={exportSummaryCSV}
        onExportXLS={exportExcel}
        exporting={exporting}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filteredReports.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg p-6 text-center text-gray-600 shadow-sm">
              No hay reportes para la selección actual.
            </div>
          ) : (
            filteredReports.map((r) => {
              const isOpen = expandedDate === r.date;
              const isSelected = selectedDates.includes(r.date);
              return (
                <ReportCard
                  key={r.date}
                  r={r}
                  isOpen={isOpen}
                  isSelected={isSelected}
                  onToggle={(date) => setExpandedDate((cur) => (cur === date ? null : date))}
                  onSelect={toggleDate}
                />
              );
            })
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28 bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Resumen rápido</h4>
            <div className="text-sm text-gray-600 space-y-2">
              <div>Reportes mostrados: <span className="font-medium">{filteredReports.length}</span></div>
              <div>Fechas seleccionadas: <span className="font-medium">{selectedDates.join(" — ") || "Ninguna"}</span></div>
              <div>Total Ingresos: <span className="font-medium">{currency(filteredReports.reduce((s, r) => s + (r.incomesTotal ?? 0), 0))}</span></div>
              <div>Total Gastos: <span className="font-medium">{currency(filteredReports.reduce((s, r) => s + (r.expensesTotal ?? 0), 0))}</span></div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                disabled={selectedDates.length !== 2}
                onClick={() => {
                  setIsCompCollapsed(false);
                  setShowFloatingChart((v) => !v);
                }}
                className={`flex-1 text-sm font-medium px-3 py-2 rounded-md ${showFloatingChart ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"} ${selectedDates.length !== 2 ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {showFloatingChart ? "Cerrar comparación" : "Ver comparación"}
              </button>

              <button
                onClick={() => {
                  setSelectedDates([]);
                  setShowFloatingChart(false);
                }}
                className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
              >
                Limpiar selección
              </button>
            </div>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showFloatingChart && selectedDates.length === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-6 right-6 w-96 bg-white shadow-xl rounded-lg overflow-hidden z-50"
            role="dialog"
            aria-modal="false"
          >
            <div className="flex justify-between items-center bg-gray-50 p-3 border-b border-gray-100">
              <h4 className="text-sm font-semibold">Comparación</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCompCollapsed((v) => !v)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  title="Colapsar"
                >
                  {isCompCollapsed ? "+" : "−"}
                </button>
                <button
                  onClick={() => setShowFloatingChart(false)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>

            {!isCompCollapsed && (
              <div className="h-64 p-3">
                {compareData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">No hay datos comparables</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={compareData}>
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#475569" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#475569" }} />
                      <Tooltip formatter={(v: number) => currency(Number(v))} labelFormatter={(l) => `Hora ${l}`} />
                      <Line
                        type="monotone"
                        dataKey={selectedDates[0]}
                        name={selectedDates[0]}
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey={selectedDates[1]}
                        name={selectedDates[1]}
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyReports;