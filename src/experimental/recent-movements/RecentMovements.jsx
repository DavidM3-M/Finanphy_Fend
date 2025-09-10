// src/experimental/recent-movements/RecentMovements.jsx
import React, { useState, useEffect } from "react";
// import { getRecentMovements } from "../../services/movements"; // lo activamos luego

const RecentMovements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovements = async () => {
      setLoading(true);
      setError(null);

      try {
        // 🔹 Mock temporal (luego reemplazamos por la API real)
        const mockData = [
          {
            id: 1,
            type: "Ingreso",
            description: "Venta producto X",
            amount: 16000,
            date: "2025-09-01",
          },
          {
            id: 2,
            type: "Gasto",
            description: "Pago proveedor",
            amount: -5000,
            date: "2025-09-02",
          },
          {
            id: 3,
            type: "Producto",
            description: "Nuevo producto agregado: Impresora",
            amount: null,
            date: "2025-09-03",
          },
        ];

        // const data = await getRecentMovements(5); // 👉 cuando el backend esté listo
        setMovements(mockData);
      } catch (err) {
        setError("No se pudieron cargar los movimientos recientes");
      } finally {
        setLoading(false);
      }
    };

    fetchMovements();
  }, []);

  return (
    <div className="bg-white shadow-md rounded-xl p-4 w-full">
      <h2 className="text-xl font-bold text-gray-700 mb-4">
        Movimientos Recientes
      </h2>

      {loading && <p className="text-gray-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && movements.length === 0 && (
        <p className="text-gray-500">No hay movimientos registrados</p>
      )}

      <ul className="space-y-3">
        {movements.map((mov) => (
          <li
            key={mov.id}
            className="flex items-center justify-between border-b pb-2"
          >
            <div>
              <span
                className={`px-2 py-1 text-sm rounded-lg font-semibold ${
                  mov.type === "Ingreso"
                    ? "bg-green-100 text-green-700"
                    : mov.type === "Gasto"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {mov.type}
              </span>
              <p className="text-gray-800">{mov.description}</p>
              <p className="text-xs text-gray-500">{mov.date}</p>
            </div>
            {mov.amount !== null && (
              <p
                className={`font-bold ${
                  mov.amount > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {mov.amount > 0
                  ? `+ $${mov.amount.toLocaleString("es-CO")}`
                  : `- $${Math.abs(mov.amount).toLocaleString("es-CO")}`}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentMovements;

