// src/pages/Clasificacion.tsx

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
} from "react";
import {
  getIncomes,
  getExpenses,
  createIncome,
  createExpense,
  updateIncome,
  updateExpense,
  deleteIncome,
  deleteExpense,
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
  // datos y filtros
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "ingreso" | "gasto">("todos");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // nuevo/editar
  const [form, setForm] = useState<NuevoMovimiento>({
    amount: 0,
    tipo: "ingreso",
    supplier: "",
    entryDate: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // modal y toggle
  const [selected, setSelected] = useState<Movimiento | null>(null);
  const [showForm, setShowForm] = useState(true);

  // carga inicial
  const fetchMovimientos = async () => {
    try {
      const [inRes, exRes] = await Promise.all([getIncomes(), getExpenses()]);
      const ingresos = inRes.data.map((i: any) => ({
        id: i.id,
        amount: parseFloat(i.amount),
        supplier: i.supplier ?? i.description ?? "—",
        entryDate: i.entryDate.slice(0, 10),
        createdAt: i.createdAt,
        companyId: i.companyId,
        tipo: "ingreso" as const,
      }));
      const gastos = exRes.data.map((e: any) => ({
        id: e.id,
        amount: parseFloat(e.amount),
        supplier: e.supplier ?? e.description ?? "—",
        entryDate: e.entryDate.slice(0, 10),
        createdAt: e.createdAt,
        companyId: e.companyId,
        tipo: "gasto" as const,
      }));
      setMovimientos([...ingresos, ...gastos]);
    } catch (err) {
      console.error("Error cargando movimientos:", err);
    }
  };

  useEffect(() => {
    fetchMovimientos();
  }, []);

  // crear o actualizar
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.entryDate) {
      alert("Debes escoger una fecha");
      return;
    }
    const payload: MovimientoPayload = {
      amount: form.amount,
      category: DEFAULT_CATEGORY[form.tipo],
      supplier: form.supplier,
      exitDate: form.entryDate,
      dueDate: form.entryDate,
    };
    try {
      if (isEditing && editingId !== null) {
        if (form.tipo === "ingreso") {
          await updateIncome(editingId, payload);
        } else {
          await updateExpense(editingId, payload);
        }
      } else {
        if (form.tipo === "ingreso") {
          await createIncome(payload);
        } else {
          await createExpense(payload);
        }
      }
      setForm({ amount: 0, tipo: "ingreso", supplier: "", entryDate: "" });
      setIsEditing(false);
      setEditingId(null);
      fetchMovimientos();
    } catch (err) {
      console.error("Error guardando movimiento:", err);
    }
  };

  const cancelEdit = () => {
    setForm({ amount: 0, tipo: "ingreso", supplier: "", entryDate: "" });
    setIsEditing(false);
    setEditingId(null);
  };

  // filtrar incluyendo rango de fechas
  const movimientosFiltrados = movimientos
    .filter(m => {
      const tipoOK = filtroTipo === "todos" || m.tipo === filtroTipo;
      const empresaOK = !filtroEmpresa || m.companyId?.includes(filtroEmpresa);
      return tipoOK && empresaOK;
    })
    .filter(m => {
      if (dateFrom && m.entryDate < dateFrom) return false;
      if (dateTo && m.entryDate > dateTo) return false;
      return true;
    });

  // agrupar por mes
  const agruparPorMes = (items: Movimiento[]) => {
    const grupos: Record<string, Movimiento[]> = {};
    items.forEach(mov => {
      const mes = format(parseISO(mov.entryDate), "MMMM yyyy", { locale: es });
      (grupos[mes] ||= []).push(mov);
    });
    return grupos;
  };
  const grupos = agruparPorMes(movimientosFiltrados);

  // modal handlers
  const closeModal = () => setSelected(null);

  const handleModalDelete = async () => {
    if (!selected) return;
    try {
      if (selected.tipo === "ingreso") {
        await deleteIncome(selected.id);
      } else {
        await deleteExpense(selected.id);
      }
      closeModal();
      fetchMovimientos();
    } catch (err) {
      console.error("Error eliminando movimiento:", err);
    }
  };

  const handleModalEdit = () => {
    if (!selected) return;
    setForm({
      amount: selected.amount,
      tipo: selected.tipo,
      supplier: selected.supplier,
      entryDate: selected.entryDate,
    });
    setIsEditing(true);
    setEditingId(selected.id);
    closeModal();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onCardClick = (mov: Movimiento) => setSelected(mov);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 bg-neutral-50">
      <h1 className="text-3xl font-bold text-center mb-8">
        Clasificación de Movimientos
      </h1>

      {/* toggle form */}
      <div className="text-center mb-4">
        <button
          onClick={() => setShowForm(v => !v)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-full shadow-md transition"
        >
          {showForm ? "Ocultar Formulario" : "Nuevo Movimiento"}
        </button>
      </div>

      {/* formulario plegable */}
      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-white rounded-2xl border border-neutral-200 shadow-lg p-6 mb-8"
          >
            <h2 className="text-xl font-semibold mb-4">
              {isEditing ? "Editar Movimiento" : "Nuevo Movimiento"}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Monto"
                value={form.amount || ""}
                onChange={(e) =>
                  setForm(f => ({
                    ...f,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                className="border border-neutral-300 p-3 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                required
              />
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-1 text-green-600">
                  <input
                    type="radio"
                    value="ingreso"
                    checked={form.tipo === "ingreso"}
                    onChange={() =>
                      setForm(f => ({ ...f, tipo: "ingreso" }))
                    }
                  />
                  Ingreso
                </label>
                <label className="flex items-center gap-1 text-red-600">
                  <input
                    type="radio"
                    value="gasto"
                    checked={form.tipo === "gasto"}
                    onChange={() =>
                      setForm(f => ({ ...f, tipo: "gasto" }))
                    }
                  />
                  Gasto
                </label>
              </div>
              <input
                type="text"
                placeholder="Descripción"
                value={form.supplier}
                onChange={(e) =>
                  setForm(f => ({ ...f, supplier: e.target.value }))
                }
                className="border border-neutral-300 p-3 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                required
              />
              <input
                type="date"
                placeholder="Fecha"
                value={form.entryDate}
                onChange={(e) =>
                  setForm(f => ({ ...f, entryDate: e.target.value }))
                }
                className="border border-neutral-300 p-3 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                required
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full shadow-md transition-shadow hover:shadow-lg"
              >
                {isEditing ? "Guardar Cambios" : "Crear Movimiento"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-full shadow-sm transition-shadow hover:shadow"
                >
                  Cancelar
                </button>
              )}
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* filtros con rango de fechas */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg p-5 mb-8">
        <div className="flex gap-4 items-end mb-4 justify-center">
          <div className="flex flex-col">
            <label className="text-sm text-[#973c00]">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-neutral-300 p-3 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-[#973c00]">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border border-neutral-300 p-3 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value as any)}
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
            onChange={e => setFiltroEmpresa(e.target.value)}
            className="border border-neutral-300 p-3 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
          />
        </div>
      </div>

      {/* línea de tiempo */}
      {Object.entries(grupos).map(([mes, items]) => (
        <div key={mes} className="mb-12 w-full">
          <h2 className="text-2xl font-bold text-center mb-6 border-b-2 border-amber-200 pb-2">
            {mes}
          </h2>
          <div className="relative w-full min-h-[200px]">
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-amber-200 -translate-x-1/2" />
            <div className="relative z-10 space-y-8 mt-6 max-h-[70vh] overflow-y-auto">
              <AnimatePresence>
                {items
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )
                  .map(mov => {
                    const esIngreso = mov.tipo === "ingreso";
                    const fecha = parseISO(mov.entryDate);
                    return (
                      <motion.div
                        key={`${mov.id}-${mov.createdAt}`}
                        initial={{ opacity: 0, x: esIngreso ? 4 : -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: esIngreso ? 4 : -4 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full cursor-pointer"
                        onClick={() => onCardClick(mov)}
                      >
                        <div
                          className={`absolute left-1/2 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 ${
                            esIngreso ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <div className="flex w-full">
                          <div className="w-1/2 flex justify-end pr-[1cm]">
                            {!esIngreso && <Card mov={mov} fecha={fecha} />}
                          </div>
                          <div className="w-1/2 flex justify-start pl-[1cm]">
                            {esIngreso && <Card mov={mov} fecha={fecha} />}
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

      {/* modal de detalles */}
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
                  onClick={handleModalEdit}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full shadow-sm transition-shadow hover:shadow"
                >
                  Editar
                </button>
                <button
                  onClick={handleModalDelete}
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

// Tarjeta de movimiento
interface CardProps {
  mov: Movimiento;
  fecha: Date;
}
const Card: React.FC<CardProps> = ({ mov, fecha }) => (
  <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-md max-w-xs transition-shadow hover:shadow-lg">
    <p className="text-sm text-slate-500">
      {format(fecha, "dd/MM/yyyy", { locale: es })}
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