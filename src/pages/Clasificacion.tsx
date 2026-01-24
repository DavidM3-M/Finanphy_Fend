import React, { useState, useEffect, FormEvent, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Transition } from "framer-motion";
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
import type { PaginatedMeta } from "../types";

/* Meses en español */
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
];

export interface Movimiento {
  id: number;
  amount: number;
  supplier: string;
  entryDate: string; // YYYY-MM-DD
  createdAt: string; // ISO
  tipo: "ingreso" | "gasto";
  category?: string;
}

/* LocalStorage helpers */
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
    if (text && String(text).trim().length)
      map[String(id)] = String(text).trim();
    else delete map[String(id)];
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

/* Mappers */
function mapToIngreso(i: any): Movimiento {
  // Prefer entryDate, fall back to dueDate for backward compatibility with older records
  const entry = i?.entryDate ?? i?.dueDate ?? "";
  const apiSupplier = i?.supplier ?? i?.description ?? "";
  const localDesc = i?.id != null ? getLocalDescription(i.id) : undefined;
  const finalSupplier =
    (apiSupplier && String(apiSupplier).trim()) || localDesc || "—";
  return {
    id: Number(i.id),
    amount: Number.isFinite(Number(i.amount)) ? parseFloat(i.amount) : 0,
    supplier: finalSupplier,
    entryDate: typeof entry === "string" ? entry.slice(0, 10) : "",
    createdAt: i.createdAt ?? "",
    tipo: "ingreso",
    category: i.category ?? undefined,
  };
}
function mapToGasto(e: any): Movimiento {
  // Prefer entryDate, fall back to dueDate for backward compatibility
  const entry = e?.entryDate ?? e?.dueDate ?? "";
  const rawAmount = Number(e?.amount);
  const amount = Number.isFinite(rawAmount) ? rawAmount : 0;

  return {
    id: Number(e.id),
    amount,
    supplier: e.supplier ?? e.description ?? "—",
    entryDate: typeof entry === "string" ? entry.slice(0, 10) : "",
    createdAt: e.createdAt ?? "",
    tipo: "gasto",
    category: e.category ?? undefined,
  };
}

/* Form state */
interface FormState {
  amount: number;
  tipo: "ingreso" | "gasto";
  supplier: string;
  entryDate: string;
  category: string;
}
const DEFAULT_CATEGORY: { ingreso: string; gasto: string } = {
  ingreso: "Ingreso",
  gasto: "Gasto",
};

/* Animated Timeline aside (anima el width del aside) */
function AnimatedTimeline({
  open,
  width = 360,
  children,
}: {
  open: boolean;
  width?: number;
  children?: React.ReactNode;
}) {
  const w = `${width}px`;
  const spring: Transition = {
    type: "spring",
    stiffness: 120,
    damping: 22,
    mass: 0.9,
    duration: 0.26,
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? w : "0px" }}
      transition={spring}
      className="border-l border-slate-100 bg-slate-50"
      style={{ minHeight: 0, overflow: "hidden" }}
      aria-hidden={!open}
    >
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="timeline-panel"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.22 }}
            className="h-full"
            style={{ height: "100%" }}
          >
            <div className="p-3 border-b">
              <h3 className="text-sm font-semibold">Línea de tiempo</h3>
              <p className="text-xs text-slate-500">Eventos recientes</p>
            </div>

            <div
              className="p-3 overflow-y-auto"
              style={{ maxHeight: "88vh", scrollbarGutter: "stable" }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

const Clasificacion: React.FC = () => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "ingreso" | "gasto">(
    "todos"
  );
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);

  const [form, setForm] = useState<FormState>({
    amount: 0,
    tipo: "ingreso",
    supplier: "",
    entryDate: "",
    category: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [selected, setSelected] = useState<Movimiento | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState<{
    id: number;
    tipo: "ingreso" | "gasto";
  } | null>(null);

  const [timelineOpen, setTimelineOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchMovs = async () => {
      try {
        const [inRes, exRes] = await Promise.all([
          getIncomes({ page, limit: pageSize }),
          getExpenses({ page, limit: pageSize }),
        ]);
        const ingresosRaw = Array.isArray(inRes.data?.data)
          ? inRes.data.data
          : Array.isArray(inRes.data)
          ? inRes.data
          : [];
        const gastosRaw = Array.isArray(exRes.data?.data)
          ? exRes.data.data
          : Array.isArray(exRes.data)
          ? exRes.data
          : [];
        const ingresos = ingresosRaw.map(mapToIngreso);
        const gastos = gastosRaw.map(mapToGasto);
        const total =
          (inRes.data?.meta?.total ?? ingresos.length) +
          (exRes.data?.meta?.total ?? gastos.length);
        const totalPages = Math.max(
          inRes.data?.meta?.totalPages ?? 1,
          exRes.data?.meta?.totalPages ?? 1
        );
        setMeta({ page, limit: pageSize, total, totalPages });
        setMovimientos([...ingresos, ...gastos]);
      } catch (err) {
        console.error("Error cargando movimientos:", err);
      }
    };
    fetchMovs();
  }, [page, pageSize]);

  const categoryOptions = useMemo(() => {
    const setCat = new Set<string>();
    movimientos.forEach((m) => {
      const c = (m.category || "").trim();
      if (c) setCat.add(c);
    });
    return ["todos", ...Array.from(setCat).sort((a, b) => a.localeCompare(b))];
  }, [movimientos]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.entryDate) {
      alert("Debes escoger una fecha");
      return;
    }
    const categoryToSend =
      form.category?.trim() ||
      (form.tipo === "ingreso"
        ? DEFAULT_CATEGORY.ingreso
        : DEFAULT_CATEGORY.gasto);
    if (categoryToSend.length < 1 || categoryToSend.length > 80) {
      alert("La categoría debe tener entre 1 y 80 caracteres");
      return;
    }

    // CORRECCIÓN: enviar entryDate y description en lugar de dueDate
    const payload: MovimientoPayload = {
      amount: Number(form.amount),
      category: categoryToSend,
      entryDate: form.entryDate, // YYYY-MM-DD (backend acepta date-only o ISO)
      description: form.supplier || undefined,
    };

    try {
      let res: any = null;
      if (isEditing && editingId != null) {
        if (form.tipo === "ingreso")
          res = await updateIncome(editingId, payload);
        else res = await updateExpense(editingId, payload);
      } else {
        if (form.tipo === "ingreso") res = await createIncome(payload);
        else res = await createExpense(payload);
      }
      if (form.tipo === "ingreso") {
        const returnedId =
          res?.data?.id ?? res?.id ?? (isEditing ? editingId : null);
        if (returnedId != null) saveLocalDescription(returnedId, form.supplier);
      }
      setForm({
        amount: 0,
        tipo: "ingreso",
        supplier: "",
        entryDate: "",
        category: "",
      });
      setIsEditing(false);
      setEditingId(null);
      setShowForm(false);
      const [inRes, exRes] = await Promise.all([
        getIncomes({ page, limit: pageSize }),
        getExpenses({ page, limit: pageSize }),
      ]);
      const ingresosRaw = Array.isArray(inRes.data?.data)
        ? inRes.data.data
        : Array.isArray(inRes.data)
        ? inRes.data
        : [];
      const gastosRaw = Array.isArray(exRes.data?.data)
        ? exRes.data.data
        : Array.isArray(exRes.data)
        ? exRes.data
        : [];
      const ingresos = ingresosRaw.map(mapToIngreso);
      const gastos = gastosRaw.map(mapToGasto);
      const total =
        (inRes.data?.meta?.total ?? ingresos.length) +
        (exRes.data?.meta?.total ?? gastos.length);
      const totalPages = Math.max(
        inRes.data?.meta?.totalPages ?? 1,
        exRes.data?.meta?.totalPages ?? 1
      );
      setMeta({ page, limit: pageSize, total, totalPages });
      setMovimientos([...ingresos, ...gastos]);
    } catch (err: any) {
      console.error(
        "Error guardando movimiento:",
        err.response?.data || err.message || err
      );
    }
  };

  const cancelEdit = () => {
    setForm({
      amount: 0,
      tipo: "ingreso",
      supplier: "",
      entryDate: "",
      category: "",
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const clearFilters = () => {
    setFiltroTipo("todos");
    setFiltroCategoria("todos");
    setDateFrom("");
    setDateTo("");
  };

  useEffect(() => {
    setPage(1);
  }, [filtroTipo, filtroCategoria, dateFrom, dateTo]);

  useEffect(() => {
    if (meta?.totalPages && page > meta.totalPages) {
      setPage(meta.totalPages);
    }
  }, [meta, page]);

  const requestDelete = (id: number, tipo: "ingreso" | "gasto") => {
    setSelected(null);
    setToDelete({ id, tipo });
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const pending = toDelete;
    setToDelete(null);
    setSelected(null);

    try {
      if (pending.tipo === "ingreso") {
        await deleteIncome(pending.id);
        removeLocalDescription(pending.id);
      } else {
        await deleteExpense(pending.id);
      }
      const [inRes, exRes] = await Promise.all([
        getIncomes({ page, limit: pageSize }),
        getExpenses({ page, limit: pageSize }),
      ]);
      const ingresosRaw = Array.isArray(inRes.data?.data)
        ? inRes.data.data
        : Array.isArray(inRes.data)
        ? inRes.data
        : [];
      const gastosRaw = Array.isArray(exRes.data?.data)
        ? exRes.data.data
        : Array.isArray(exRes.data)
        ? exRes.data
        : [];
      const ingresos = ingresosRaw.map(mapToIngreso);
      const gastos = gastosRaw.map(mapToGasto);
      const total =
        (inRes.data?.meta?.total ?? ingresos.length) +
        (exRes.data?.meta?.total ?? gastos.length);
      const totalPages = Math.max(
        inRes.data?.meta?.totalPages ?? 1,
        exRes.data?.meta?.totalPages ?? 1
      );
      setMeta({ page, limit: pageSize, total, totalPages });
      setMovimientos([...ingresos, ...gastos]);
    } catch (err) {
      console.error("Error eliminando:", err);
    }
  };

  const movimientosFiltrados = movimientos
    .filter((m) => filtroTipo === "todos" || m.tipo === filtroTipo)
    .filter((m) => !dateFrom || m.entryDate >= dateFrom)
    .filter((m) => !dateTo || m.entryDate <= dateTo)
    .filter(
      (m) =>
        filtroCategoria === "todos" ||
        (m.category ?? "").trim() === filtroCategoria
    );

  const grupos = movimientosFiltrados.reduce<Record<string, Movimiento[]>>(
    (acc, mov) => {
      const key = (mov.entryDate || "").slice(0, 7);
      (acc[key] ||= []).push(mov);
      return acc;
    },
    {}
  );

  const closeModal = () => setSelected(null);

  const handleModalDelete = async () => {
    if (!selected) return;
    requestDelete(selected.id, selected.tipo);
  };

  const handleModalEdit = () => {
    if (!selected) return;
    setForm({
      amount: selected.amount,
      tipo: selected.tipo,
      supplier: selected.supplier === "—" ? "" : selected.supplier,
      entryDate: selected.entryDate,
      category:
        selected.category ??
        (selected.tipo === "ingreso"
          ? DEFAULT_CATEGORY.ingreso
          : DEFAULT_CATEGORY.gasto),
    });
    setIsEditing(true);
    setEditingId(selected.id);
    setSelected(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onCardClick = (mov: Movimiento) => setSelected(mov);

  const mesActualKey = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;
  const claveMes =
    dateFrom || dateTo || filtroCategoria !== "todos" || filtroTipo !== "todos"
      ? null
      : mesActualKey;
  const gruposFiltrados = claveMes
    ? Object.entries(grupos).filter(([mesKey]) => mesKey === claveMes)
    : Object.entries(grupos);

  const timelineItems = [...movimientos]
    .filter((m) => filtroTipo === "todos" || m.tipo === filtroTipo)
    .filter((m) => !dateFrom || m.entryDate >= dateFrom)
    .filter((m) => !dateTo || m.entryDate <= dateTo)
    .filter(
      (m) =>
        filtroCategoria === "todos" ||
        (m.category ?? "").trim() === filtroCategoria
    )
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  /* Layout control: grid con columna principal min-w-0 y aside animado controlando su width */
  const TIMELINE_OPEN_WIDTH = 360;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: `minmax(0, 1fr) auto` }}
      >
        {/* Main column */}
        <main className="min-w-0">
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Clasificación de Movimientos
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Revisa, filtra y edita ingresos y gastos
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowForm((s) => !s)}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-full text-sm shadow-sm"
              >
                {showForm ? "Ocultar Form" : "Nuevo Movimiento"}
              </button>

              <button
                onClick={() => setTimelineOpen((s) => !s)}
                title={
                  timelineOpen
                    ? "Ocultar línea de tiempo"
                    : "Mostrar línea de tiempo"
                }
                className={`w-32 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full shadow-sm text-sm transition-colors
                  ${
                    timelineOpen
                      ? "bg-amber-500 text-white border border-amber-500"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
              >
                Timeline
              </button>
            </div>
          </header>

          {/* Form compacto */}
          <AnimatePresence initial={false}>
            {showForm && (
              <motion.form
                onSubmit={handleSubmit}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden p-4 rounded-xl border border-slate-100 mb-4 bg-white shadow-sm"
              >
                <h2 className="text-sm font-semibold text-slate-800 mb-3">
                  {isEditing ? "Editar movimiento" : "Nuevo movimiento"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-600">Monto</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={form.amount || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full border px-2 py-2 rounded-md bg-slate-50 text-sm"
                      required
                    />
                    <label className="text-xs text-slate-600">Tipo</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((p) => ({ ...p, tipo: "ingreso" }))
                        }
                        className={`flex-1 px-2 py-1 rounded-md text-sm ${
                          form.tipo === "ingreso"
                            ? "bg-green-600 text-white"
                            : "bg-white border text-slate-700"
                        }`}
                      >
                        Ingreso
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((p) => ({ ...p, tipo: "gasto" }))
                        }
                        className={`flex-1 px-2 py-1 rounded-md text-sm ${
                          form.tipo === "gasto"
                            ? "bg-red-600 text-white"
                            : "bg-white border text-slate-700"
                        }`}
                      >
                        Gasto
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-slate-600">
                      Proveedor / Descripción
                    </label>
                    <input
                      type="text"
                      placeholder="Pago cliente X / Factura 123"
                      value={form.supplier}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          supplier: e.target.value,
                        }))
                      }
                      className="w-full border px-2 py-2 rounded-md text-sm"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-600">Fecha</label>
                        <input
                          type="date"
                          value={form.entryDate}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              entryDate: e.target.value,
                            }))
                          }
                          className="w-full border px-2 py-2 rounded-md text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600">
                          Categoría
                        </label>
                        <input
                          list="category-suggestions"
                          placeholder="Selecciona o escribe"
                          value={form.category}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              category: e.target.value,
                            }))
                          }
                          className="w-full border px-2 py-2 rounded-md text-sm"
                        />
                        <datalist id="category-suggestions">
                          {categoryOptions
                            .filter((c) => c !== "todos")
                            .map((opt) => (
                              <option key={opt} value={opt} />
                            ))}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-2">
                    <div className="text-xs text-slate-600">Resumen</div>
                    <div className="text-sm text-slate-700">
                      <div>
                        Monto:{" "}
                        <strong>
                          {form.amount
                            ? `$ ${Number(form.amount).toLocaleString()}`
                            : "—"}
                        </strong>
                      </div>
                      <div>
                        Tipo: <strong>{form.tipo}</strong>
                      </div>
                      <div>
                        Fecha: <strong>{form.entryDate || "—"}</strong>
                      </div>
                      <div>
                        Categoría:{" "}
                        <strong>
                          {form.category ||
                            (form.tipo === "ingreso"
                              ? DEFAULT_CATEGORY.ingreso
                              : DEFAULT_CATEGORY.gasto)}
                        </strong>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex-1 px-3 py-1 rounded-md bg-slate-100 text-sm"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 px-3 py-1 rounded-md bg-amber-500 text-white text-sm"
                      >
                        {isEditing ? "Guardar" : "Crear"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* filtros compactos */}
          <div className="p-2 rounded-lg mb-4 bg-white border border-slate-100 shadow-sm">
            <div
              className="flex items-center gap-2 flex-wrap"
              style={{ alignItems: "center", minWidth: 0 }}
              role="toolbar"
            >
              <div
                className="flex items-center gap-1 bg-slate-50 p-1 rounded-md text-sm"
                style={{ minWidth: 0 }}
              >
                <button
                  onClick={() => setFiltroTipo("todos")}
                  className={`px-2 py-1 rounded-md ${
                    filtroTipo === "todos"
                      ? "bg-amber-500 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroTipo("ingreso")}
                  className={`px-2 py-1 rounded-md ${
                    filtroTipo === "ingreso"
                      ? "bg-green-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Ingresos
                </button>
                <button
                  onClick={() => setFiltroTipo("gasto")}
                  className={`px-2 py-1 rounded-md ${
                    filtroTipo === "gasto"
                      ? "bg-red-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Gastos
                </button>
              </div>

              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="appearance-none bg-slate-50 px-2 py-1 rounded-md text-sm border border-slate-100"
                style={{ minWidth: 140 }}
                aria-label="Filtrar por categoría"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "todos" ? "Todas categorías" : opt}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1" style={{ minWidth: 0 }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2 py-1 rounded-md text-sm border border-slate-100 bg-white"
                  title="Desde"
                  style={{ minWidth: 110 }}
                />
                <span className="text-xs text-slate-400">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2 py-1 rounded-md text-sm border border-slate-100 bg-white"
                  title="Hasta"
                  style={{ minWidth: 110 }}
                />
              </div>

              <div
                className="text-xs text-slate-500 ml-2 hidden sm:block"
                style={{ whiteSpace: "nowrap" }}
              >
                Resultados:{" "}
                <strong className="text-slate-700">
                  {movimientosFiltrados.length}
                </strong>
              </div>

              <div style={{ marginLeft: "auto", minWidth: 0 }}>
                <button
                  onClick={clearFilters}
                  className="text-sm px-3 py-1.5 rounded-md bg-amber-500 text-white shadow-sm hover:bg-amber-600"
                  title="Limpiar filtros"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>

          {meta && (
            <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
              <span>
                Página {page} de {meta.totalPages} · Total {meta.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* listado */}
          <div>
            {gruposFiltrados.length === 0 && (
              <p className="text-center text-slate-400 py-8">
                No hay movimientos
              </p>
            )}
            {gruposFiltrados.map(([mesKey, items]) => {
              const [year, month] = mesKey.split("-");
              const monthIndex = Number(month) - 1;
              const monthLabel = MONTH_NAMES_ES[monthIndex] ?? mesKey;

              const ingresos = items
                .filter((it) => it.tipo === "ingreso")
                .sort((a, b) =>
                  (b.entryDate || "").localeCompare(a.entryDate || "")
                );
              const gastos = items
                .filter((it) => it.tipo === "gasto")
                .sort((a, b) =>
                  (b.entryDate || "").localeCompare(a.entryDate || "")
                );

              const showIngresosColumn =
                filtroTipo === "todos" || filtroTipo === "ingreso";
              const showGastosColumn =
                filtroTipo === "todos" || filtroTipo === "gasto";

              return (
                <section key={mesKey} className="mb-6">
                  <h3 className="text-base font-semibold mb-3 text-slate-800">
                    {monthLabel} {year}
                  </h3>

                  <div
                    className={`grid gap-3 ${
                      showIngresosColumn && showGastosColumn
                        ? "md:grid-cols-2"
                        : "md:grid-cols-1"
                    }`}
                  >
                    {showIngresosColumn && (
                      <div className="bg-white rounded-lg p-3 shadow-sm border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-green-700">
                            Ingresos
                          </h4>
                          <div className="text-xs text-slate-500">
                            {ingresos.length} items
                          </div>
                        </div>

                        <div className="space-y-2 max-h-[56vh] overflow-y-auto pr-2">
                          {ingresos.length === 0 && (
                            <div className="text-sm text-slate-400">
                              No hay ingresos
                            </div>
                          )}
                          {ingresos.map((mov) => (
                            <div
                              key={mov.id}
                              className="p-2 rounded-md bg-slate-50"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {mov.supplier}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    Fecha: {formatDateYMD(mov.entryDate)}
                                  </div>
                                  <div className="mt-1 text-xs">
                                    <span className="inline-block bg-white border rounded-full px-2 py-0.5 text-slate-700">
                                      Categoría:{" "}
                                      <strong>
                                        {mov.category ??
                                          DEFAULT_CATEGORY.ingreso}
                                      </strong>
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right flex flex-col items-end gap-1">
                                  <div className="text-sm font-semibold text-green-600">
                                    + ${mov.amount.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {formatDateTime(mov.createdAt)}
                                  </div>

                                  <div className="flex gap-1 mt-1">
                                    <button
                                      onClick={() => onCardClick(mov)}
                                      className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded"
                                    >
                                      Ver
                                    </button>
                                    <button
                                      onClick={() => {
                                        setForm({
                                          amount: mov.amount,
                                          tipo: mov.tipo,
                                          supplier:
                                            mov.supplier === "—"
                                              ? ""
                                              : mov.supplier,
                                          entryDate: mov.entryDate,
                                          category: mov.category ?? "",
                                        });
                                        setIsEditing(true);
                                        setEditingId(mov.id);
                                        setShowForm(true);
                                        window.scrollTo({
                                          top: 0,
                                          behavior: "smooth",
                                        });
                                      }}
                                      className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() =>
                                        requestDelete(mov.id, mov.tipo)
                                      }
                                      className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {showGastosColumn && (
                      <div className="bg-white rounded-lg p-3 shadow-sm border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-red-700">
                            Gastos
                          </h4>
                          <div className="text-xs text-slate-500">
                            {gastos.length} items
                          </div>
                        </div>

                        <div className="space-y-2 max-h-[56vh] overflow-y-auto pr-2">
                          {gastos.length === 0 && (
                            <div className="text-sm text-slate-400">
                              No hay gastos
                            </div>
                          )}
                          {gastos.map((mov) => (
                            <div
                              key={mov.id}
                              className="p-2 rounded-md bg-slate-50"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {mov.supplier}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    Fecha: {formatDateYMD(mov.entryDate)}
                                  </div>
                                  <div className="mt-1 text-xs">
                                    <span className="inline-block bg-white border rounded-full px-2 py-0.5 text-slate-700">
                                      Categoría:{" "}
                                      <strong>
                                        {mov.category ?? DEFAULT_CATEGORY.gasto}
                                      </strong>
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right flex flex-col items-end gap-1">
                                  <div className="text-sm font-semibold text-red-600">
                                    - ${mov.amount.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {formatDateTime(mov.createdAt)}
                                  </div>

                                  <div className="flex gap-1 mt-1">
                                    <button
                                      onClick={() => onCardClick(mov)}
                                      className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded"
                                    >
                                      Ver
                                    </button>
                                    <button
                                      onClick={() => {
                                        setForm({
                                          amount: mov.amount,
                                          tipo: mov.tipo,
                                          supplier:
                                            mov.supplier === "—"
                                              ? ""
                                              : mov.supplier,
                                          entryDate: mov.entryDate,
                                          category: mov.category ?? "",
                                        });
                                        setIsEditing(true);
                                        setEditingId(mov.id);
                                        setShowForm(true);
                                        window.scrollTo({
                                          top: 0,
                                          behavior: "smooth",
                                        });
                                      }}
                                      className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() =>
                                        requestDelete(mov.id, mov.tipo)
                                      }
                                      className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </main>

        {/* Animated timeline aside */}
        <AnimatedTimeline open={timelineOpen} width={TIMELINE_OPEN_WIDTH}>
          {timelineItems.length === 0 ? (
            <div className="text-slate-500">Sin eventos</div>
          ) : (
            <div className="space-y-3">
              {timelineItems.map((t) => (
                <div key={t.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        t.tipo === "ingreso" ? "bg-green-600" : "bg-red-600"
                      }`}
                    />
                    <div className="w-px flex-1 bg-slate-200 mt-2" />
                  </div>

                  <div className="flex-1 bg-white p-2 rounded-md border shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {t.supplier}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateYMD(t.entryDate)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Categoría:{" "}
                          <strong className="text-slate-700">
                            {t.category ??
                              (t.tipo === "ingreso"
                                ? DEFAULT_CATEGORY.ingreso
                                : DEFAULT_CATEGORY.gasto)}
                          </strong>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-semibold ${
                            t.tipo === "ingreso"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {t.tipo === "ingreso" ? "+" : "-"} $
                          {t.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatDateTime(t.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex gap-1">
                      <button
                        onClick={() => onCardClick(t)}
                        className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => {
                          setForm({
                            amount: t.amount,
                            tipo: t.tipo,
                            supplier: t.supplier === "—" ? "" : t.supplier,
                            entryDate: t.entryDate,
                            category: t.category ?? "",
                          });
                          setIsEditing(true);
                          setEditingId(t.id);
                          setShowForm(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => requestDelete(t.id, t.tipo)}
                        className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatedTimeline>
      </div>

      {/* Modales */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="bg-white p-5 rounded-lg shadow-xl w-full max-w-md">
              <h4 className="text-lg font-semibold mb-2">Detalle</h4>
              <p className="mb-1">
                <strong>Proveedor:</strong> {selected.supplier}
              </p>
              <p className="mb-1">
                <strong>Monto:</strong> ${selected.amount.toLocaleString()}
              </p>
              <p className="mb-1">
                <strong>Categoría:</strong>{" "}
                {selected.category ??
                  (selected.tipo === "ingreso"
                    ? DEFAULT_CATEGORY.ingreso
                    : DEFAULT_CATEGORY.gasto)}
              </p>
              <p className="mb-3 text-sm text-slate-500">
                <strong>Fecha entrada:</strong>{" "}
                {formatDateYMD(selected.entryDate)}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleModalEdit}
                  className="bg-amber-500 text-white px-3 py-1.5 rounded-md text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={handleModalDelete}
                  className="bg-red-500 text-white px-3 py-1.5 rounded-md text-sm"
                >
                  Eliminar
                </button>
                <button
                  onClick={closeModal}
                  className="bg-slate-100 px-3 py-1.5 rounded-md text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete modal */}
      <AnimatePresence>
        {toDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 100, damping: 18 }}
              className="relative bg-white p-4 rounded-lg shadow-lg z-10 w-full max-w-sm"
            >
              <h4 className="text-lg font-semibold mb-2">
                Confirmar eliminación
              </h4>
              <p className="mb-3 text-sm text-slate-600">
                ¿Deseas eliminar este evento? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setToDelete(null)}
                  className="px-3 py-1 rounded-md bg-slate-100 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-3 py-1 rounded-md bg-red-600 text-white text-sm"
                >
                  Eliminar
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

/* Helpers */
function formatDateYMD(ymd: string) {
  return ymd ? ymd.split("-").reverse().join("/") : "—";
}
function formatDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
