// src/pages/Clasificacion.tsx

import React, { useState, useEffect, ChangeEvent } from "react";
import {
  getIncomes,
  getExpenses,
  createIncome,
  createExpense,
  MovimientoPayload,
} from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Movimiento {
  id: number;
  amount: number;
  supplier: string;
  entryDate: string;   // YYYY-MM-DD
  createdAt: string;   // ISO timestamp
  companyId?: string;
  tipo: "ingreso" | "gasto";
}

interface NuevoMovimiento {
  amount: number;
  tipo: "ingreso" | "gasto";
  supplier: string;
  entryDate: string;   // YYYY-MM-DD
}

const DEFAULT_CATEGORY: Record<"ingreso" | "gasto", number> = {
  ingreso: 10,
  gasto: 50,
};

const Clasificacion: React.FC = () => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [form, setForm] = useState<NuevoMovimiento>({
    amount: 0,
    tipo: "ingreso",
    supplier: "",
    entryDate: "",
  });
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "ingreso" | "gasto">(
    "todos"
  );
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [selected, setSelected] = useState<Movimiento | null>(null);

  // 1️⃣ Traer y mapear movimientos
  const fetchMovimientos = async () => {
    try {
      const [inRes, exRes] = await Promise.all([getIncomes(), getExpenses()]);

      const ingresos: Movimiento[] = inRes.data.map((i: any) => ({
        id: i.id,
        amount: parseFloat(i.amount),
        supplier: (i.supplier ?? i.description ?? "—") as string,
        entryDate: i.entryDate.slice(0, 10),
        createdAt: i.createdAt,
        companyId: i.companyId,
        tipo: "ingreso",
      }));

      const gastos: Movimiento[] = exRes.data.map((e: any) => ({
        id: e.id,
        amount: parseFloat(e.amount),
        supplier: (e.supplier ?? e.description ?? "—") as string,
        entryDate: e.entryDate.slice(0, 10),
        createdAt: e.createdAt,
        companyId: e.companyId,
        tipo: "gasto",
      }));

      setMovimientos([...ingresos, ...gastos]);
    } catch (err) {
      console.error("Error cargando movimientos:", err);
    }
  };

  // 2️⃣ Crear movimiento
  const crearMovimiento = async () => {
    if (!form.entryDate) return alert("Debes escoger una fecha");

    const payload: MovimientoPayload = {
      amount: form.amount,
      category: DEFAULT_CATEGORY[form.tipo],
      supplier: form.supplier,
      exitDate: form.entryDate,
      dueDate: form.entryDate,
    };

    try {
      await (form.tipo === "ingreso"
        ? createIncome(payload)
        : createExpense(payload));
      setForm({ amount: 0, tipo: "ingreso", supplier: "", entryDate: "" });
      await fetchMovimientos();
    } catch (err) {
      console.error("Error creando movimiento:", err);
    }
  };

  useEffect(() => {
    fetchMovimientos();
  }, []);

  // 3️⃣ Filtrar
  const movimientosFiltrados = movimientos.filter((m) => {
    const tipoOK = filtroTipo === "todos" || m.tipo === filtroTipo;
    const empresaOK = !filtroEmpresa || m.companyId?.includes(filtroEmpresa);
    return tipoOK && empresaOK;
  });

  // 4️⃣ Agrupar por mes
  const agruparPorMes = (items: Movimiento[]) => {
    const grupos: Record<string, Movimiento[]> = {};
    items.forEach((mov) => {
      const mes = format(parseISO(mov.entryDate), "MMMM yyyy", { locale: es });
      (grupos[mes] ||= []).push(mov);
    });
    return grupos;
  };
  const grupos = agruparPorMes(movimientosFiltrados);

  // Modal handlers
  const closeModal = () => setSelected(null);
  const handleDelete = () => {
    if (!selected) return;
    alert(`Eliminar ${selected.tipo} #${selected.id}`);
    closeModal();
    fetchMovimientos();
  };
  const handleEdit = () => {
    if (!selected) return;
    alert(`Editar ${selected.tipo} #${selected.id}`);
    closeModal();
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 bg-neutral-50">
      <h1 className="text-3xl font-bold text-center mb-8">
        Clasificación de Movimientos
      </h1>

      {/* Formulario Nuevo Movimiento */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Nuevo Movimiento</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            placeholder="Monto"
            value={form.amount || ""}
            onChange={(e) =>
              setForm({ ...form, amount: parseFloat(e.target.value) })
            }
            className="border border-neutral-300 p-3 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
          />

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-1 text-green-600">
              <input
                type="radio"
                value="ingreso"
                checked={form.tipo === "ingreso"}
                onChange={() => setForm({ ...form, tipo: "ingreso" })}
              />
              Ingreso
            </label>
            <label className="flex items-center gap-1 text-red-600">
              <input
                type="radio"
                value="gasto"
                checked={form.tipo === "gasto"}
                onChange={() => setForm({ ...form, tipo: "gasto" })}
              />
              Gasto
            </label>
          </div>

          <input
            type="text"
            placeholder="Descripción"
            value={form.supplier}
            onChange={(e) =>
              setForm({ ...form, supplier: e.target.value })
            }
            className="border border-neutral-300 p-3 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
          />

          <input
            type="date"
            placeholder="Fecha"
            value={form.entryDate}
            onChange={(e) =>
              setForm({ ...form, entryDate: e.target.value })
            }
            className="border border-neutral-300 p-3 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
          />
        </div>

        <button
          onClick={crearMovimiento}
          className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full shadow-md transition-shadow hover:shadow-lg"
        >
          Crear Movimiento
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg p-5 mb-8 flex gap-4 justify-center">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as any)}
          className="border border-neutral-300 p-3 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
        >
          <option value="todos">Todos</option>
          <option value="ingreso">Solo ingresos</option>
          <option value="gasto">Solo gastos</option>
        </select>

        <input
          type="text"
          placeholder="Filtrar por empresa (ID)"
          value={filtroEmpresa}
          onChange={(e) => setFiltroEmpresa(e.target.value)}
          className="border border-neutral-300 p-3 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
        />
      </div>

      {/* Línea de Tiempo */}
      {Object.entries(grupos).map(([mes, items]) => (
        <div key={mes} className="mb-12 w-full">
          <h2 className="text-2xl font-bold text-center mb-6 border-b-2 border-amber-200 pb-2">
            {mes}
          </h2>
          <div className="relative w-full min-h-[200px]">
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-amber-200 -translate-x-1/2" />
            <div className="relative z-10 space-y-8 mt-6">
              <AnimatePresence>
                {items
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )
                  .map((mov) => {
                    const esIngreso = mov.tipo === "ingreso";
                    const fecha = parseISO(mov.entryDate);

                    return (
                      <motion.div
                        key={`${mov.id}-${mov.createdAt}`}
                        initial={{ opacity: 0, x: esIngreso ? 4 : -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: esIngreso ? 4 : -4 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full"
                        onClick={() => setSelected(mov)}
                      >
                        <div
                          className={`absolute left-1/2 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 ${
                            esIngreso ? "bg-green-500" : "bg-red-500"
                          }`}
                        />

                        <div className="flex w-full">
                          <div className="w-1/2 flex justify-end pr-[1cm]">
                            {!esIngreso && (
                              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-md max-w-xs cursor-pointer transition-shadow hover:shadow-lg">
                                <p className="text-sm text-slate-500">
                                  {format(fecha, "dd/MM/yyyy", { locale: es })}
                                </p>
                                <h3
                                  className={`text-lg font-semibold ${
                                    esIngreso
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {esIngreso ? "+" : "-"} $
                                  {mov.amount.toLocaleString()}
                                </h3>
                                <p className="text-slate-600 text-sm mt-1">
                                  {mov.supplier}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="w-1/2 flex justify-start pl-[1cm]">
                            {esIngreso && (
                              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-md max-w-xs cursor-pointer transition-shadow hover:shadow-lg">
                                <p className="text-sm text-slate-500">
                                  {format(fecha, "dd/MM/yyyy", { locale: es })}
                                </p>
                                <h3 className="text-lg font-semibold text-green-600">
                                  + ${mov.amount.toLocaleString()}
                                </h3>
                                <p className="text-slate-600 text-sm mt-1">
                                  {mov.supplier}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ))}

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h3 className="text-xl font-semibold mb-4">
                Detalles del Movimiento
              </h3>
              <p className="mb-2">
                <strong>Fecha:</strong>{" "}
                {format(parseISO(selected.entryDate), "dd/MM/yyyy", {
                  locale: es,
                })}
              </p>
              <p className="mb-2">
                <strong>Hora:</strong>{" "}
                {format(parseISO(selected.createdAt), "HH:mm:ss")}
              </p>
              <p className="mb-4">
                <strong>Descripción:</strong> {selected.supplier}
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full shadow-sm transition-shadow hover:shadow"
                >
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-sm transition-shadow hover:shadow"
                >
                  Eliminar
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-full shadow-sm transition-shadow hover:shadow"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Clasificacion;