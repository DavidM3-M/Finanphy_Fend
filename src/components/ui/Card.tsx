// src/components/Card.tsx

import React from "react";

export interface Movimiento {
  id: number;
  amount: number;
  supplier: string;
  entryDate: string;   // YYYY-MM-DD
  createdAt: string;   // ISO timestamp
  tipo: "ingreso" | "gasto";
}

// convierte "YYYY-MM-DD" → "DD/MM/YYYY"
const formatEntrada = (ymd: string) => ymd.split("-").reverse().join("/");

interface CardProps {
  mov: Movimiento;
}

const Card: React.FC<CardProps> = ({ mov }) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-md max-w-xs transition-shadow hover:shadow-lg">
      <p className="text-sm text-slate-500">
        {formatEntrada(mov.entryDate)}
      </p>
      <h3
        className={`text-lg font-semibold ${
          mov.tipo === "ingreso" ? "text-green-600" : "text-red-600"
        }`}
      >
        {mov.tipo === "ingreso" ? "+" : "-"} ${mov.amount.toLocaleString()}
      </h3>
      <p className="text-slate-600 text-sm mt-1">{mov.supplier}</p>
    </div>
  );
};

export default Card;