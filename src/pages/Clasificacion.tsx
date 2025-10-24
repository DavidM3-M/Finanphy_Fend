// src/pages/Clasificacion.tsx

import React, { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/Card";
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

// Meses en español para encabezados de grupo
const MONTH_NAMES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

// Tipo de dominio
export interface Movimiento {
  id: number;
  amount: number;
  supplier: string;
  entryDate: string; // "YYYY-MM-DD"
  createdAt: string; // ISO timestamp
  companyId?: string;
  tipo: "ingreso" | "gasto";
}

// LocalStorage helpers para descripciones de ingresos
const LOCAL_DESC_KEY = "clasificacion:income_descriptions";

function readLocalDescriptions(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_DESC_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalDescription(id: number | string, text: string) {
  try {
    const map = readLocalDescriptions();
    if (text && String(text).trim().length) {
      map[String(id)] = String(text).trim();
    } else {
      delete map[String(id)];
    }
    localStorage.setItem(LOCAL_DESC_KEY, JSON.stringify(map));
  } catch {}
}

function getLocalDescription(id: number | string): string | undefined {
  try {
    const map = readLocalDescriptions();
    return map[String(id)];
  } catch {
    return undefined;
  }
}

function removeLocalDescription(id: number | string) {
  try {
    const map = readLocalDescriptions();
    delete map[String(id)];
    localStorage.setItem(LOCAL_DESC_KEY, JSON.stringify(map));
  } catch {}
}

// Mapea DTO de API a Movimiento (con fallback a localStorage para ingresos)
function mapToIngreso(i: any): Movimiento {
  const due = i?.dueDate ?? "";
  const apiSupplier = i?.supplier ?? i?.description ?? "";
  const localDesc = i?.id != null ? getLocalDescription(i.id) : undefined;
  const finalSupplier = (apiSupplier && String(apiSupplier).trim()) || localDesc || "—";
  return {
    id: Number(i.id),
    amount: Number.isFinite(Number(i.amount)) ? parseFloat(i.amount) : 0,
    supplier: finalSupplier,
    entryDate: typeof due === "string" ? due.slice(0, 10) : "",
    createdAt: i.createdAt ?? "",
    tipo: "ingreso",
  };
}

function mapToGasto(e: any): Movimiento {
  const due = e?.dueDate ?? "";
  return {
    id: Number(e.id),
    amount: Number.isFinite(Number(e.amount)) ? parseFloat(e.amount) : 0,
    supplier: e.supplier ?? e.description ?? "—",
    entryDate: typeof due === "string" ? due.slice(0, 10) : "",
    createdAt: e.createdAt ?? "",
    tipo: "gasto",
  };
}

// Categorías por defecto
const DEFAULT_CATEGORY = { ingreso: 10, gasto: 50 } as const;

const Clasificacion: React.FC = () => {
  // estado principal
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "ingreso" | "gasto">(
    "todos"
  );
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // formulario
  const [form, setForm] = useState({
    amount: 0,
    tipo: "ingreso" as "ingreso" | "gasto",
    supplier: "",
    entryDate: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // modal de detalles
  const [selected, setSelected] = useState<Movimiento | null>(null);
  // formulario compacto por defecto
  const [showForm, setShowForm] = useState(false);

  // carga inicial con mapToIngreso/mapToGasto
  useEffect(() => {
    const fetchMovs = async () => {
      try {
        const [inRes, exRes] = await Promise.all([getIncomes(), getExpenses()]);
        const ingresos = Array.isArray(inRes.data) ? inRes.data.map(mapToIngreso) : [];
        const gastos = Array.isArray(exRes.data) ? exRes.data.map(mapToGasto) : [];
        setMovimientos([...ingresos, ...gastos]);
      } catch (err) {
        console.error("Error cargando movimientos:", err);
      }
    };
    fetchMovs();
  }, []);

  // crear o actualizar movimiento
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
      let res: any = null;

      if (isEditing && editingId != null) {
        if (form.tipo === "ingreso") {
          res = await updateIncome(editingId, payload);
        } else {
          res = await updateExpense(editingId, payload);
        }
      } else {
        if (form.tipo === "ingreso") {
          res = await createIncome(payload);
        } else {
          res = await createExpense(payload);
        }
      }

      // Si es ingreso, persistir descripción en localStorage emparejada al id resultante
      if (form.tipo === "ingreso") {
        const returnedId =
          // prioridad: respuesta explícita con id
          res?.data?.id ?? res?.id ?? (isEditing ? editingId : null);
        if (returnedId != null) {
          saveLocalDescription(returnedId, form.supplier);
        }
      }

      // reset del formulario
      setForm({ amount: 0, tipo: "ingreso", supplier: "", entryDate: "" });
      setIsEditing(false);
      setEditingId(null);

      // compactar el formulario tras crear/actualizar
      setShowForm(false);

      // refrescar lista
      const [inRes, exRes] = await Promise.all([getIncomes(), getExpenses()]);
      const ingresos = Array.isArray(inRes.data) ? inRes.data.map(mapToIngreso) : [];
      const gastos = Array.isArray(exRes.data) ? exRes.data.map(mapToGasto) : [];
      setMovimientos([...ingresos, ...gastos]);
    } catch (err) {
      console.error("Error guardando movimiento:", err);
    }
  };

  const cancelEdit = () => {
    setForm({ amount: 0, tipo: "ingreso", supplier: "", entryDate: "" });
    setIsEditing(false);
    setEditingId(null);
  };

  // filtros
  const movimientosFiltrados = movimientos
    .filter((m) => filtroTipo === "todos" || m.tipo === filtroTipo)
    .filter((m) => !filtroEmpresa || m.companyId?.includes(filtroEmpresa))
    .filter((m) => !dateFrom || m.entryDate >= dateFrom)
    .filter((m) => !dateTo || m.entryDate <= dateTo);

  // agrupar por mes "YYYY-MM"
  const grupos = movimientosFiltrados.reduce<Record<string, Movimiento[]>>((acc, mov) => {
    const key = (mov.entryDate || "").slice(0, 7);
    (acc[key] ||= []).push(mov);
    return acc;
  }, {});

  // modal handlers
  const closeModal = () => setSelected(null);

  const handleModalDelete = async () => {
    if (!selected) return;
    try {
      if (selected.tipo === "ingreso") {
        await deleteIncome(selected.id);
        // limpiar descripción local si existía
        removeLocalDescription(selected.id);
      } else {
        await deleteExpense(selected.id);
      }
      closeModal();
      // refrescar lista
      const [inRes, exRes] = await Promise.all([getIncomes(), getExpenses()]);
      const ingresos = Array.isArray(inRes.data) ? inRes.data.map(mapToIngreso) : [];
      const gastos = Array.isArray(exRes.data) ? exRes.data.map(mapToGasto) : [];
      setMovimientos([...ingresos, ...gastos]);
    } catch (err) {
      console.error("Error eliminando movimiento:", err);
    }
  };

  const handleModalEdit = () => {
    if (!selected) return;
    setForm({
      amount: selected.amount,
      tipo: selected.tipo,
      supplier: selected.supplier === "—" ? "" : selected.supplier,
      entryDate: selected.entryDate,
    });
    setIsEditing(true);
    setEditingId(selected.id);
    closeModal();
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onCardClick = (mov: Movimiento) => setSelected(mov);

  const mesActualKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(
    2,
    "0"
  )}`;
  const claveMes = dateFrom || dateTo || filtroEmpresa ? null : mesActualKey;

  const gruposFiltrados = claveMes
    ? Object.entries(grupos).filter(([mesKey]) => mesKey === claveMes)
    : Object.entries(grupos);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Clasificación de Movimientos</h1>

      {/* toggle formulario */}
      <div className="text-center mb-4">
        <button
          onClick={() => {
            if (!showForm) {
              // abrir en modo limpio para nuevo movimiento
              setForm({ amount: 0, tipo: "ingreso", supplier: "", entryDate: "" });
              setIsEditing(false);
              setEditingId(null);
              setShowForm(true);
            } else {
              setShowForm(false);
            }
          }}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-full"
        >
          {showForm ? "Ocultar Formulario" : "Nuevo Movimiento"}
        </button>
      </div>

      {/* formulario (sin fondo blanco) */}
      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden p-6 rounded-lg border border-gray-200 mb-8 bg-transparent shadow-none"
          >
            <h2 className="text-xl font-semibold mb-4">
              {isEditing ? "Editar movimiento" : "Nuevo movimiento"}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Monto"
                value={form.amount || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))
                }
                className="border p-2 rounded"
                required
              />
              <div className="flex items-center gap-4">
                <label>
                  <input
                    type="radio"
                    value="ingreso"
                    checked={form.tipo === "ingreso"}
                    onChange={() => setForm((f) => ({ ...f, tipo: "ingreso" }))}
                  />{" "}
                  Ingreso
                </label>
                <label>
                  <input
                    type="radio"
                    value="gasto"
                    checked={form.tipo === "gasto"}
                    onChange={() => setForm((f) => ({ ...f, tipo: "gasto" }))}
                  />{" "}
                  Gasto
                </label>
              </div>
              <input
                type="text"
                placeholder="Proveedor / Descripción"
                value={form.supplier}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                className="border p-2 rounded"
                required
              />
              <input
                type="date"
                value={form.entryDate}
                onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
                className="border p-2 rounded"
                required
              />
            </div>
            <div className="mt-4 flex gap-4">
              <button className="bg-amber-500 text-white px-4 py-2 rounded">
                {isEditing ? "Guardar" : "Crear"}
              </button>
              {isEditing && (
                <button type="button" onClick={cancelEdit} className="bg-gray-300 px-4 py-2 rounded">
                  Cancelar
                </button>
              )}
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* filtros */}
      <div className="p-4 rounded-lg border border-gray-100 mb-8 bg-transparent shadow-none">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border p-2 rounded" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border p-2 rounded" />
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as any)} className="border p-2 rounded">
            <option value="todos">Todos</option>
            <option value="ingreso">Ingresos</option>
            <option value="gasto">Gastos</option>
          </select>
        </div>
      </div>

      {/* línea de tiempo agrupada */}
      {gruposFiltrados.map(([mesKey, items]) => {
        const [yyyy, mm] = mesKey.split("-");
        const mesNombre = MONTH_NAMES_ES[Number(mm) - 1] ?? mm;
        return (
          <div key={mesKey} className="mb-12 w-full">
            <h2 className="text-2xl font-bold text-center mb-6 border-b-2 border-amber-200 pb-2">
              {mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)} {yyyy}
            </h2>
            <div className="relative w-full min-h-[200px]">
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-amber-200 -translate-x-[49%]" />
              <div className="relative z-10 space-y-8 mt-6 max-h-[70vh] overflow-y-auto">
                <AnimatePresence>
                  {items
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((mov) => (
                      <motion.div
                        key={`${mov.id}-${mov.createdAt}`}
                        initial={{ opacity: 0, x: mov.tipo === "ingreso" ? 50 : -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: mov.tipo === "ingreso" ? 50 : -50 }}
                        transition={{ duration: 0.3 }}
                        className="relative w-full cursor-pointer"
                        onClick={() => onCardClick(mov)}
                      >
                        <div
                          className={`absolute left-1/2 top-1/2 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 ${
                            mov.tipo === "ingreso" ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <div className="flex w-full">
                          <div className="w-1/2 flex justify-end pr-[1cm]">
                            {mov.tipo === "gasto" && (
                              <div className="bg-transparent shadow-none">
                                <Card mov={mov} />
                              </div>
                            )}
                          </div>
                          <div className="w-1/2 flex justify-start pl-[1cm]">
                            {mov.tipo === "ingreso" && (
                              <div className="bg-transparent shadow-none">
                                <Card mov={mov} />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        );
      })}

      {/* modal de detalles */}
      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg max-w-md w-full" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <h3 className="text-xl font-semibold mb-4">Detalles del Movimiento</h3>
              <p className="mb-2">
                <strong>Fecha:</strong> {selected.entryDate.split("-").reverse().join("/")}
              </p>
              <p className="mb-2">
                <strong>Hora:</strong> {new Date(selected.createdAt).toLocaleTimeString()}
              </p>
              <p className="mb-4">
                <strong>Descripción:</strong> {selected.supplier}
              </p>
              <div className="flex justify-end gap-4">
                <button onClick={handleModalEdit} className="px-4 py-2 bg-yellow-500 text-white rounded-full">
                  Editar
                </button>
                <button onClick={handleModalDelete} className="px-4 py-2 bg-red-600 text-white rounded-full">
                  Eliminar
                </button>
                <button onClick={closeModal} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-full">
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