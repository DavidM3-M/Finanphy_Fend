// src/pages/ReportPage.tsx
import React, { useEffect, useState } from "react";
import DailyReport from "./DailyReport";
import { getIncomes, getExpenses } from "../services/api";
import dayjs from "dayjs";

interface Transaction {
  time: string;
  amount: number;
  type: "income" | "expense";
  supplier: string;
}

interface DailyReportData {
  date: string;
  incomesTotal: number;
  expensesTotal: number;
  balance: number;
  transactions: Transaction[];
}

const ReportPage: React.FC = () => {
  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);

      try {
        const [incomesRes, expensesRes] = await Promise.all([
          getIncomes(),
          getExpenses(),
        ]);

        const incomes = incomesRes.data as any[];
        const expenses = expensesRes.data as any[];

        const groups: Record<string, DailyReportData> = {};

        // Procesar ingresos
        incomes.forEach((income) => {
          const date = dayjs(income.exitDate || income.dueDate).format("YYYY-MM-DD");
          const amount = Number(income.amount) || 0;
          const time = dayjs(income.exitDate || income.dueDate).format("HH:mm");

          if (!groups[date]) {
            groups[date] = {
              date,
              incomesTotal: 0,
              expensesTotal: 0,
              balance: 0,
              transactions: [],
            };
          }

          groups[date].incomesTotal += amount;
          groups[date].transactions.push({
            time,
            amount,
            type: "income",
            supplier: income.supplier || "Sin proveedor",
          });
        });

        // Procesar gastos
        expenses.forEach((expense) => {
          const date = dayjs(expense.dueDate).format("YYYY-MM-DD");
          const amount = Number(expense.amount) || 0;
          const time = dayjs(expense.dueDate).format("HH:mm");

          if (!groups[date]) {
            groups[date] = {
              date,
              incomesTotal: 0,
              expensesTotal: 0,
              balance: 0,
              transactions: [],
            };
          }

          groups[date].expensesTotal += amount;
          groups[date].transactions.push({
            time,
            amount: -amount,
            type: "expense",
            supplier: expense.supplier || "Sin proveedor",
          });
        });

        // Generar array final con balance y ordenar transacciones
        const finalReports = Object.values(groups)
          .map((group) => ({
            ...group,
            balance: group.incomesTotal - group.expensesTotal,
            transactions: group.transactions.sort((a, b) =>
              a.time.localeCompare(b.time)
            ),
          }))
          .sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix());

        setReports(finalReports);
      } catch (err: any) {
        console.error("Error al obtener reportes:", err);
        setError(err.message || "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">
        📊 Reportes Financieros Diarios
      </h1>

      {loading && (
        <div className="text-center text-slate-500">Cargando datos...</div>
      )}

      {error && (
        <div className="text-center text-red-500 mb-4">{error}</div>
      )}

      {!loading && !error && <DailyReport reports={reports} />}
    </div>
  );
};

export default ReportPage;