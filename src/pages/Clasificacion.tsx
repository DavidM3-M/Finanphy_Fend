// src/pages/Clasificacion.tsx
import React, { useState, useEffect, FormEvent, useMemo } from "react";
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

/* Meses en español */
const MONTH_NAMES_ES = [
  "enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre",
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
  try { const raw = localStorage.getItem(LOCAL_DESC_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function saveLocalDescription(id: number | string, text: string) {
  try { const map = readLocalDescriptions(); if (text && String(text).trim().length) map[String(id)] = String(text).trim(); else delete map[String(id)]; localStorage.setItem(LOCAL_DESC_KEY, JSON.stringify(map)); } catch {}
}
function getLocalDescription(id: number | string): string | undefined {
  try { const map = readLocalDescriptions(); return map[String(id)]; } catch { return undefined; }
}
function removeLocalDescription(id: number | string) {
  try { const map = readLocalDescriptions(); delete map[String(id)]; localStorage.setItem(LOCAL_DESC_KEY, JSON.stringify(map)); } catch {}
}

/* Mappers */
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
    category: i.category ?? undefined,
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
const DEFAULT_CATEGORY: { ingreso: string; gasto: string } = { ingreso: "Ingreso", gasto: "Gasto" };

const Clasificacion: React.FC = () => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "ingreso" | "gasto">("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [form, setForm] = useState<FormState>({ amount: 0, tipo: "ingreso", supplier: "", entryDate: "", category: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [selected, setSelected] = useState<Movimiento | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: number; tipo: "ingreso" | "gasto" } | null>(null);

  /* timeline oculto por defecto */
  const [timelineOpen, setTimelineOpen] = useState<boolean>(false);

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
    if (!form.entryDate) { alert("Debes escoger una fecha"); return; }
    const categoryToSend = form.category?.trim() || (form.tipo === "ingreso" ? DEFAULT_CATEGORY.ingreso : DEFAULT_CATEGORY.gasto);
    if (categoryToSend.length < 1 || categoryToSend.length > 80) { alert("La categoría debe tener entre 1 y 80 caracteres"); return; }
    const payload: MovimientoPayload = { amount: Number(form.amount), category: categoryToSend, dueDate: new Date(form.entryDate).toISOString() };
    try {
      let res: any = null;
      if (isEditing && editingId != null) {
        if (form.tipo === "ingreso") res = await updateIncome(editingId, payload); else res = await updateExpense(editingId, payload);
      } else {
        if (form.tipo === "ingreso") res = await createIncome(payload); else res = await createExpense(payload);
      }
      if (form.tipo === "ingreso") {
        const returnedId = res?.data?.id ?? res?.id ?? (isEditing ? editingId : null);
        if (returnedId != null) saveLocalDescription(returnedId, form.supplier);
      }
      setForm({ amount: 0, tipo: "ingreso", supplier: "", entryDate: "", category: "" });
      setIsEditing(false);
      setEditingId(null);
      setShowForm(false);
      const [inRes, exRes] = await Promise.all([getIncomes(), getExpenses()]);
      const ingresos = Array.isArray(inRes.data) ? inRes.data.map(mapToIngreso) : [];
      const gastos = Array.isArray(exRes.data) ? exRes.data.map(mapToGasto) : [];
      setMovimientos([...ingresos, ...gastos]);
    } catch (err: any) {
      console.error("Error guardando movimiento:", err.response?.data || err.message || err);
    }
  };

  const cancelEdit = () => {
    setForm({ amount: 0, tipo: "ingreso", supplier: "", entryDate: "", category: "" });
    setIsEditing(false);
    setEditingId(null);
  };

  const clearFilters = () => {
    setFiltroTipo("todos");
    setFiltroCategoria("todos");
    setDateFrom("");
    setDateTo("");
  };

  /* Solicitar eliminación: cierra detalle para evitar stacking issues y abre confirm */
  const requestDelete = (id: number, tipo: "ingreso" | "gasto") => {
    setSelected(null); // cerrar detalle para que no quede debajo del overlay
    setToDelete({ id, tipo });
  };

  /* Confirmar eliminación: cerrar UI inmediatamente y luego ejecutar eliminación */
  const confirmDelete = async () => {
    if (!toDelete) return;
    const pending = toDelete;
    setToDelete(null); // quitar overlay inmediatamente
    setSelected(null);

    try {
      if (pending.tipo === "ingreso") {
        await deleteIncome(pending.id);
        removeLocalDescription(pending.id);
      } else {
        await deleteExpense(pending.id);
      }
      const [inRes, exRes] = await Promise.all([getIncomes(), getExpenses()]);
      const ingresos = Array.isArray(inRes.data) ? inRes.data.map(mapToIngreso) : [];
      const gastos = Array.isArray(exRes.data) ? exRes.data.map(mapToGasto) : [];
      setMovimientos([...ingresos, ...gastos]);
    } catch (err) {
      console.error("Error eliminando:", err);
    }
  };

  const movimientosFiltrados = movimientos
    .filter((m) => filtroTipo === "todos" || m.tipo === filtroTipo)
    .filter((m) => !dateFrom || m.entryDate >= dateFrom)
    .filter((m) => !dateTo || m.entryDate <= dateTo)
    .filter((m) => filtroCategoria === "todos" || (m.category ?? "").trim() === filtroCategoria);

  const grupos = movimientosFiltrados.reduce<Record<string, Movimiento[]>>((acc, mov) => {
    const key = (mov.entryDate || "").slice(0, 7);
    (acc[key] ||= []).push(mov);
    return acc;
  }, {});

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
      category: selected.category ?? (selected.tipo === "ingreso" ? DEFAULT_CATEGORY.ingreso : DEFAULT_CATEGORY.gasto),
    });
    setIsEditing(true);
    setEditingId(selected.id);
    setSelected(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onCardClick = (mov: Movimiento) => setSelected(mov);

  const mesActualKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const claveMes = dateFrom || dateTo || filtroCategoria !== "todos" || filtroTipo !== "todos" ? null : mesActualKey;
  const gruposFiltrados = claveMes ? Object.entries(grupos).filter(([mesKey]) => mesKey === claveMes) : Object.entries(grupos);

  const timelineItems = [...movimientos]
    .filter((m) => filtroTipo === "todos" || m.tipo === filtroTipo)
    .filter((m) => !dateFrom || m.entryDate >= dateFrom)
    .filter((m) => !dateTo || m.entryDate <= dateTo)
    .filter((m) => filtroCategoria === "todos" || (m.category ?? "").trim() === filtroCategoria)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  /* Layout control */
  const TIMELINE_OPEN_WIDTH = 360;
  const TIMELINE_COLLAPSED_WIDTH = 0;
  const gridTemplateColumns = timelineOpen ? `minmax(0, 1fr) ${TIMELINE_OPEN_WIDTH}px` : `minmax(0, 1fr) ${TIMELINE_COLLAPSED_WIDTH}px`;

  return (
    <div style={{ gridTemplateColumns, transition: "grid-template-columns 420ms cubic-bezier(.22,.1,.22,1)" }} className="max-w-7xl mx-auto py-10 px-6 grid gap-8" role="main">
      {/* Main */}
      <div>
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900">Clasificación de Movimientos</h1>
            <p className="mt-1 text-sm text-slate-500">Revisa, filtra y edita ingresos y gastos</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowForm((s) => !s)}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-full shadow-sm focus:outline-none"
            >
              {showForm ? "Ocultar Formulario" : "Nuevo Movimiento"}
            </button>

            {/* Botón timeline: mantiene tamaño (w-36) y cambia color según estado */}
            <button
              onClick={() => setTimelineOpen((s) => !s)}
              title={timelineOpen ? "Ocultar línea de tiempo" : "Mostrar línea de tiempo"}
              className={`w-36 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full shadow-sm text-sm transition-colors
                ${timelineOpen ? "bg-amber-500 text-white border border-amber-500" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"}`}
            >
              Timeline
            </button>
          </div>
        </header>

        {/* Form reorganizado: dos columnas, campos agrupados, etiquetas claras */}
        <AnimatePresence initial={false}>
          {showForm && (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden p-6 rounded-2xl border border-slate-100 mb-6 bg-white shadow-md"
            >
              <h2 className="text-lg font-semibold text-slate-800 mb-4">{isEditing ? "Editar movimiento" : "Nuevo movimiento"}</h2>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Columna 1: Monto + Tipo */}
                <div className="space-y-3">
                  <label className="text-xs text-slate-600">Monto</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.amount || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border p-3 rounded-lg bg-slate-50"
                    required
                  />

                  <label className="text-xs text-slate-600">Tipo</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setForm((p) => ({ ...p, tipo: "ingreso" }))} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${form.tipo === "ingreso" ? "bg-green-600 text-white" : "bg-white border"}`}>
                      Ingreso
                    </button>
                    <button type="button" onClick={() => setForm((p) => ({ ...p, tipo: "gasto" }))} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${form.tipo === "gasto" ? "bg-red-600 text-white" : "bg-white border"}`}>
                      Gasto
                    </button>
                  </div>
                </div>

                {/* Columna 2: Proveedor + Fecha */}
                <div className="space-y-3 lg:col-span-2">
                  <label className="text-xs text-slate-600">Proveedor / Descripción</label>
                  <input
                    type="text"
                    placeholder="Ej: Pago cliente X / Factura 123"
                    value={form.supplier}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
                    className="w-full border p-3 rounded-lg bg-white"
                    required
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600">Fecha</label>
                      <input
                        type="date"
                        value={form.entryDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, entryDate: e.target.value }))}
                        className="w-full border p-3 rounded-lg bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">Categoría</label>
                      <div className="relative">
                        <input
                          list="category-suggestions"
                          placeholder="Selecciona o escribe"
                          value={form.category}
                          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                          className="w-full border p-3 rounded-lg bg-white"
                        />
                        <datalist id="category-suggestions">
                          {categoryOptions.filter((c) => c !== "todos").map((opt) => <option key={opt} value={opt} />)}
                        </datalist>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Puedes elegir una existente o escribir una nueva.</div>
                    </div>
                  </div>
                </div>

                {/* Columna 4: Acciones */}
                <div className="flex flex-col justify-between items-stretch gap-3">
                  <div>
                    <div className="text-xs text-slate-600 mb-2">Resumen</div>
                    <div className="text-sm text-slate-700 mb-3">
                      <div>Monto: <strong>{form.amount ? `$ ${Number(form.amount).toLocaleString()}` : "—"}</strong></div>
                      <div>Tipo: <strong>{form.tipo}</strong></div>
                      <div>Fecha: <strong>{form.entryDate || "—"}</strong></div>
                      <div>Categoría: <strong>{form.category || (form.tipo === "ingreso" ? DEFAULT_CATEGORY.ingreso : DEFAULT_CATEGORY.gasto)}</strong></div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {isEditing && <button type="button" onClick={cancelEdit} className="flex-1 px-4 py-2 rounded-lg bg-slate-100">Cancelar</button>}
                    <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-amber-500 text-white shadow-sm">{isEditing ? "Guardar" : "Crear"}</button>
                  </div>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="p-4 rounded-xl border border-slate-100 mb-6 bg-gradient-to-b from-white to-slate-50">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
                <label className="text-sm text-slate-600">Tipo</label>
                <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as any)} className="ml-2 outline-none text-sm">
                  <option value="todos">Todos</option>
                  <option value="ingreso">Ingresos</option>
                  <option value="gasto">Gastos</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
                <label className="text-sm text-slate-600">Categoría</label>
                <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="ml-2 outline-none text-sm">
                  {categoryOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt === "todos" ? "Todas" : opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
                <label className="text-sm text-slate-600">Desde</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="ml-2 text-sm outline-none" />
              </div>

              <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
                <label className="text-sm text-slate-600">Hasta</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="ml-2 text-sm outline-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={clearFilters} className="text-sm px-3 py-2 rounded-lg bg-white border hover:bg-slate-50 shadow-sm">Limpiar filtros</button>
              <div className="text-sm text-slate-500 hidden md:block">Mostrando <strong className="text-slate-700">{movimientosFiltrados.length}</strong> resultados</div>
            </div>
          </div>
        </div>

        {/* Listado por mes */}
        <div>
          {gruposFiltrados.length === 0 && <p className="text-center text-slate-400 py-10">No hay movimientos</p>}
          {gruposFiltrados.map(([mesKey, items]) => {
            const [year, month] = mesKey.split("-");
            const monthIndex = Number(month) - 1;
            const monthLabel = MONTH_NAMES_ES[monthIndex] ?? mesKey;

            // Orden descendente por entryDate
            const ingresos = items
              .filter((it) => it.tipo === "ingreso")
              .sort((a, b) => (b.entryDate || "").localeCompare(a.entryDate || ""));

            const gastos = items
              .filter((it) => it.tipo === "gasto")
              .sort((a, b) => (b.entryDate || "").localeCompare(a.entryDate || ""));

            const showIngresosColumn = filtroTipo === "todos" || filtroTipo === "ingreso";
            const showGastosColumn = filtroTipo === "todos" || filtroTipo === "gasto";

            return (
              <section key={mesKey} className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">{monthLabel} {year}</h3>

                <div className={`grid gap-4 ${showIngresosColumn && showGastosColumn ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
                  {showIngresosColumn && (
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-green-700">Ingresos</h4>
                        <div className="text-xs text-slate-500">{ingresos.length} items</div>
                      </div>

                      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {ingresos.length === 0 && <div className="text-sm text-slate-400">No hay ingresos</div>}
                        {ingresos.map((mov) => (
                          <div key={mov.id} className="p-3 rounded-lg bg-slate-50">
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{mov.supplier}</div>
                                <div className="text-xs text-slate-500 mt-1">Fecha: {formatDateYMD(mov.entryDate)}</div>
                                <div className="mt-2"><span className="inline-block text-xs bg-white border rounded-full px-2 py-1 text-slate-700">Categoría: <strong>{mov.category ?? DEFAULT_CATEGORY.ingreso}</strong></span></div>
                              </div>

                              <div className="text-right flex flex-col items-end gap-2">
                                <div className="text-sm font-semibold text-green-600">+ ${mov.amount.toLocaleString()}</div>
                                <div className="text-xs text-slate-400">{formatDateTime(mov.createdAt)}</div>

                                <div className="flex gap-2 mt-2">
                                  <button onClick={() => onCardClick(mov)} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Ver</button>
                                  <button onClick={() => { setForm({ amount: mov.amount, tipo: mov.tipo, supplier: mov.supplier === "—" ? "" : mov.supplier, entryDate: mov.entryDate, category: mov.category ?? "" }); setIsEditing(true); setEditingId(mov.id); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Editar</button>
                                  <button onClick={() => requestDelete(mov.id, mov.tipo)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Eliminar</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showGastosColumn && (
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-red-700">Gastos</h4>
                        <div className="text-xs text-slate-500">{gastos.length} items</div>
                      </div>

                      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {gastos.length === 0 && <div className="text-sm text-slate-400">No hay gastos</div>}
                        {gastos.map((mov) => (
                          <div key={mov.id} className="p-3 rounded-lg bg-slate-50">
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{mov.supplier}</div>
                                <div className="text-xs text-slate-500 mt-1">Fecha: {formatDateYMD(mov.entryDate)}</div>
                                <div className="mt-2"><span className="inline-block text-xs bg-white border rounded-full px-2 py-1 text-slate-700">Categoría: <strong>{mov.category ?? DEFAULT_CATEGORY.gasto}</strong></span></div>
                              </div>

                              <div className="text-right flex flex-col items-end gap-2">
                                <div className="text-sm font-semibold text-red-600">- ${mov.amount.toLocaleString()}</div>
                                <div className="text-xs text-slate-400">{formatDateTime(mov.createdAt)}</div>

                                <div className="flex gap-2 mt-2">
                                  <button onClick={() => onCardClick(mov)} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Ver</button>
                                  <button onClick={() => { setForm({ amount: mov.amount, tipo: mov.tipo, supplier: mov.supplier === "—" ? "" : mov.supplier, entryDate: mov.entryDate, category: mov.category ?? "" }); setIsEditing(true); setEditingId(mov.id); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Editar</button>
                                  <button onClick={() => requestDelete(mov.id, mov.tipo)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Eliminar</button>
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
      </div>

      {/* Timeline panel */}
      <motion.aside
        initial={false}
        animate={{ width: timelineOpen ? TIMELINE_OPEN_WIDTH : TIMELINE_COLLAPSED_WIDTH }}
        transition={{ type: "spring", stiffness: 160, damping: 24 }}
        className="relative border-l border-slate-100 bg-slate-50 flex flex-col"
        style={{ minHeight: 0, overflow: "hidden" }}
      >
        {timelineOpen && (
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold">Línea de tiempo</h3>
            <p className="text-xs text-slate-500">Eventos recientes</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {timelineOpen && (
            <motion.div
              key="timeline-content"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.26 }}
              className="p-4 overflow-y-auto flex-1 max-h-[80vh] pr-3"
              style={{ scrollbarGutter: "stable" }}
            >
              {timelineItems.length === 0 && <div className="text-slate-500">Sin eventos</div>}
              <div className="space-y-4">
                {timelineItems.map((t) => (
                  <div key={t.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${t.tipo === "ingreso" ? "bg-green-600" : "bg-red-600"}`} />
                      <div className="w-px flex-1 bg-slate-200 mt-2" />
                    </div>

                    <div className="flex-1 bg-white p-3 rounded-lg border shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{t.supplier}</div>
                          <div className="text-xs text-slate-500">{formatDateYMD(t.entryDate)}</div>
                          <div className="text-xs text-slate-500 mt-1">Categoría: <strong className="text-slate-700">{t.category ?? (t.tipo === "ingreso" ? DEFAULT_CATEGORY.ingreso : DEFAULT_CATEGORY.gasto)}</strong></div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${t.tipo === "ingreso" ? "text-green-600" : "text-red-600"}`}>{t.tipo === "ingreso" ? "+" : "-"} ${t.amount.toLocaleString()}</div>
                          <div className="text-xs text-slate-400">{formatDateTime(t.createdAt)}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button onClick={() => onCardClick(t)} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Ver</button>
                        <button onClick={() => { setForm({ amount: t.amount, tipo: t.tipo, supplier: t.supplier === "—" ? "" : t.supplier, entryDate: t.entryDate, category: t.category ?? "" }); setIsEditing(true); setEditingId(t.id); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Editar</button>
                        <button onClick={() => requestDelete(t.id, t.tipo)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* Modales */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
              <h4 className="text-lg font-semibold mb-3">Detalle</h4>
              <p className="mb-2"><strong>Proveedor:</strong> {selected.supplier}</p>
              <p className="mb-2"><strong>Monto:</strong> ${selected.amount.toLocaleString()}</p>
              <p className="mb-2"><strong>Categoría:</strong> {selected.category ?? (selected.tipo === "ingreso" ? DEFAULT_CATEGORY.ingreso : DEFAULT_CATEGORY.gasto)}</p>
              <p className="mb-3 text-sm text-slate-500"><strong>Fecha entrada:</strong> {formatDateYMD(selected.entryDate)}</p>
              <div className="flex gap-3 justify-end">
                <button onClick={handleModalEdit} className="bg-amber-500 text-white px-4 py-2 rounded-lg">Editar</button>
                <button onClick={handleModalDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg">Eliminar</button>
                <button onClick={closeModal} className="bg-slate-100 px-4 py-2 rounded-lg">Cerrar</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete modal: backdrop y modal juntos con z-index controlado */}
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
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="relative bg-white p-6 rounded-lg shadow-lg z-10 w-full max-w-sm"
            >
              <h4 className="text-lg font-semibold mb-2">Confirmar eliminación</h4>
              <p className="mb-4">¿Deseas eliminar este evento? Esta acción no se puede deshacer.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setToDelete(null)} className="px-3 py-2 rounded bg-slate-100">Cancelar</button>
                <button onClick={confirmDelete} className="px-3 py-2 rounded bg-red-600 text-white">Eliminar</button>
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
function formatDateYMD(ymd: string) { return ymd ? ymd.split("-").reverse().join("/") : "—"; }
function formatDateTime(iso?: string) { if (!iso) return "—"; try { const d = new Date(iso); return d.toLocaleString(); } catch { return iso; } }