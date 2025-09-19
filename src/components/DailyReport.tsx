// src/pages/DailyReport.tsx

import React, {
  useState,
  useEffect,
  useMemo,
  ChangeEvent,
} from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getIncomes, getExpenses } from "../services/api";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

//
// Tipos
//
export interface Transaction {
  time: string;           // ISO timestamp
  amount: number;
  type: "income" | "expense";
  supplier: string;
}

export interface DailyReportData {
  date: string;           // YYYY-MM-DD
  incomesTotal: number;
  expensesTotal: number;
  balance: number;
  transactions: Transaction[];
}

interface Props { }

//
// Componente principal
//
const DailyReportPage: React.FC<Props> = () => {
  // estados de datos
  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filtros de pantalla
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [compareDays, setCompareDays] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [activeDay, setActiveDay] = useState<string | null>(null);

  //
  // 1️⃣ Fetch y agregación de datos
  //
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const [inRes, exRes] = await Promise.all([
          getIncomes(),
          getExpenses(),
        ]);

        // mapear a transactions con timestamp
        const allTxs: (Transaction & { datePart: string })[] = [
          ...inRes.data.map((i: any) => {
            const datePart = i.entryDate.slice(0, 10);
            return {
              time: i.createdAt,
              amount: parseFloat(i.amount),
              type: "income" as const,
              supplier: i.supplier ?? i.description ?? "—",
              datePart,
            };
          }),
          ...exRes.data.map((e: any) => {
            const datePart = e.entryDate.slice(0, 10);
            return {
              time: e.createdAt,
              amount: parseFloat(e.amount),
              type: "expense" as const,
              supplier: e.supplier ?? e.description ?? "—",
              datePart,
            };
          }),
        ];

        // agrupar por datePart
        const grouped: Record<string, Transaction[]> = {};
        allTxs.forEach((tx) => {
          (grouped[tx.datePart] ||= []).push(tx);
        });

        // construir array DailyReportData
        const dr: DailyReportData[] = Object.entries(grouped).map(
          ([date, txs]) => {
            const incomesTotal = txs
              .filter((t) => t.type === "income")
              .reduce((sum, t) => sum + t.amount, 0);
            const expensesTotal = txs
              .filter((t) => t.type === "expense")
              .reduce((sum, t) => sum + t.amount, 0);
            return {
              date,
              incomesTotal,
              expensesTotal,
              balance: incomesTotal - expensesTotal,
              transactions: txs,
            };
          }
        );

        // ordenar descendente por fecha
        dr.sort((a, b) => b.date.localeCompare(a.date));
        setReports(dr);
      } catch (e: any) {
        setError(e.message || "Error cargando reportes diarios");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  //
  // 2️⃣ Procesar para UI: datePart, formattedDate y timePart
  //
  const processed = useMemo(() => {
    return reports.map((r) => {
      const [year, month, day] = r.date.split("-");
      const formattedDate = `${day}/${month}/${year}`;
      const transactions = r.transactions.map((tx) => ({
        ...tx,
        timePart: tx.time.includes("T")
          ? tx.time.slice(11, 16)
          : tx.time,
      }));
      return { ...r, formattedDate, transactions };
    });
  }, [reports]);

  //
  // 3️⃣ Filtrado por rango
  //
  const filtered = useMemo(() => {
    return processed
      .filter((r) => {
        if (dateFrom && r.date < dateFrom) return false;
        if (dateTo && r.date > dateTo) return false;
        return true;
      });
  }, [processed, dateFrom, dateTo]);

  //
  // 4️⃣ Comparación de días
  //
  const toggleCompareDay = (date: string) => {
    setCompareDays((prev) =>
      prev.includes(date)
        ? prev.filter((d) => d !== date)
        : prev.length < 2
        ? [...prev, date]
        : [date]
    );
  };

  useEffect(() => {
    if (compareDays.length === 2) {
      setShowComparisonModal(true);
    }
  }, [compareDays]);

  const day1 = processed.find((r) => r.date === compareDays[0]);
  const day2 = processed.find((r) => r.date === compareDays[1]);

  //
  // 5️⃣ Render
  //
  if (loading) return <p className="p-4 text-center">Cargando...</p>;
  if (error) return <p className="p-4 text-center text-red-600">{error}</p>;

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">

      {/* Filtros por rango */}
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex flex-col">
          <label className="text-sm text-slate-600">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDateFrom(e.target.value)
            }
            className="p-2 border rounded-md"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-slate-600">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDateTo(e.target.value)
            }
            className="p-2 border rounded-md"
          />
        </div>
      </div>

      {/* Modal de comparación */}
      {showComparisonModal && day1 && day2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          onClick={() => {
            setShowComparisonModal(false);
            setCompareDays([]);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-center">
              Comparativa
            </h3>

            {/* Totales */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              {[day1, day2].map((d, i) => (
                <div key={i}>
                  <p>
                    <strong>{d.formattedDate}</strong>
                  </p>
                  <p>Ingresos: ${d.incomesTotal.toFixed(2)}</p>
                  <p>Gastos: ${d.expensesTotal.toFixed(2)}</p>
                  <p>Balance: ${d.balance.toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Gráficas lado a lado */}
            <div className="grid grid-cols-2 gap-4 h-64">
              {[day1, day2].map((d, i) => (
                <ResponsiveContainer key={i} width="100%" height="100%">
                  <LineChart data={d.transactions}>
                    <XAxis
                      dataKey="timePart"
                      type="category"
                      scale="point"
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      tick={{ fontSize: 10 }}
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke={i === 0 ? "#10b981" : "#ef4444"}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowComparisonModal(false);
                  setCompareDays([]);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listado y gráficas diarias */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.map((r) => {
          const isActive = activeDay === r.date;
          const isCompared = compareDays.includes(r.date);
          return (
            <div
              key={r.date}
              className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all duration-300 ${
                isCompared
                  ? "border-2 border-blue-500"
                  : "hover:shadow-lg hover:scale-[1.02]"
              }`}
              onClick={() =>
                setActiveDay(isActive ? null : r.date)
              }
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  {r.formattedDate}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompareDay(r.date);
                    }}
                    className="text-xs px-2 py-1 bg-blue-100 rounded hover:bg-blue-200"
                  >
                    {isCompared ? "Quitar" : "Comparar"}
                  </button>
                  <span
                    className={`inline-block transform transition-transform duration-300 ${
                      isActive ? "rotate-90" : "rotate-0"
                    }`}
                  >
                    ▶
                  </span>
                </div>
              </div>

              <p
                className={`text-sm font-medium ${
                  r.balance >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                Balance: ${r.balance.toFixed(2)}
              </p>

              <div
                className={`transition-all duration-300 ease-in-out ${
                  isActive
                    ? "opacity-100 scale-100 max-h-[1000px]"
                    : "opacity-0 scale-95 max-h-0 overflow-hidden"
                }`}
              >
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-slate-700">
                    Ingresos: ${r.incomesTotal.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-700">
                    Gastos: ${r.expensesTotal.toFixed(2)}
                  </p>
                  <div className="w-full h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={r.transactions}>
                        <XAxis
                          dataKey="timePart"
                          type="category"
                          scale="point"
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          tick={{ fontSize: 10 }}
                          height={60}
                        />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyReportPage;