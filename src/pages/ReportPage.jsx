import { useEffect, useState } from 'react';
import DailyReport from './DailyReport';
import axios from 'axios';
import dayjs from 'dayjs';

const ReportPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [incomesRes, expensesRes] = await Promise.all([
        axios.get('https://finanphy.onrender.com/incomes'),
        axios.get('https://finanphy.onrender.com/expenses')
      ]);

      const incomes = incomesRes.data;
      const expenses = expensesRes.data;

      const groupedByDate = {};

      incomes.forEach((income) => {
        const date = dayjs(income.exitDate || income.dueDate).format('YYYY-MM-DD');
        const amount = Number(income.amount) || 0;

        if (!groupedByDate[date]) {
          groupedByDate[date] = {
            date,
            incomesTotal: 0,
            expensesTotal: 0,
            transactions: []
          };
        }

        groupedByDate[date].incomesTotal += amount;
        groupedByDate[date].transactions.push({
          time: '08:00',
          amount,
          type: 'income',
          supplier: income.supplier || 'Sin proveedor'
        });
      });

      expenses.forEach((expense) => {
        const date = dayjs(expense.dueDate).format('YYYY-MM-DD');
        const amount = Number(expense.amount) || 0;

        if (!groupedByDate[date]) {
          groupedByDate[date] = {
            date,
            incomesTotal: 0,
            expensesTotal: 0,
            transactions: []
          };
        }

        groupedByDate[date].expensesTotal += amount;
        groupedByDate[date].transactions.push({
          time: '14:30',
          amount: -amount,
          type: 'expense',
          supplier: expense.supplier || 'Sin proveedor'
        });
      });

      const finalReports = Object.values(groupedByDate).map((report) => ({
        ...report,
        balance: report.incomesTotal - report.expensesTotal
      }));

      setReports(finalReports);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">📊 Reportes Financieros Diarios</h1>

      {loading ? (
        <div className="text-center text-slate-500">Cargando datos...</div>
      ) : (
        <DailyReport reports={reports} />
      )}
    </div>
  );
};

export default ReportPage;