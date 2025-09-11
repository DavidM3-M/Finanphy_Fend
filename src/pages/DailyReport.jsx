import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const DailyReport = ({ reports }) => {
  const [activeDay, setActiveDay] = useState(null);
  const sortedReports = [...reports].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="grid grid-cols-1 gap-4">
      {sortedReports.map((report) => {
        const isActive = activeDay === report.date;

        return (
          <div
            key={report.date}
            onClick={() => setActiveDay(isActive ? null : report.date)}
            className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{report.date}</h2>
              <span
                className={`inline-block transform transition-transform duration-300 ${
                  isActive ? 'rotate-90' : 'rotate-0'
                }`}
              >
                ▶
              </span>
            </div>

            <p className={`text-sm font-medium ${report.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Balance: ${report.balance.toFixed(2)}
            </p>

            <div
              className={`transition-all duration-300 ease-in-out ${
                isActive ? 'opacity-100 scale-100 max-h-[1000px]' : 'opacity-0 scale-95 max-h-0 overflow-hidden'
              }`}
            >
              <div className="mt-4 space-y-2">
                <p className="text-sm text-slate-700">Ingresos: ${report.incomesTotal.toFixed(2)}</p>
                <p className="text-sm text-slate-700">Gastos: ${report.expensesTotal.toFixed(2)}</p>

                <div className="w-full h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={report.transactions}>
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={true}
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
  );
};

export default DailyReport;