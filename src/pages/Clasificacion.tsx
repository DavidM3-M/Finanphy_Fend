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
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
] as const;

// Categorías de gastos
const CATEGORIA_GASTOS = {
  50: "Gastos Generales",
  51: "Servicios Públicos",
  52: "Alquiler",
  53: "Suministros de Oficina",
  54: "Transporte",
  55: "Alimentación",
  56: "Mantenimiento",
  57: "Marketing",
  58: "Seguros",
  59: "Otros Gastos"
} as const;

// Tipo de dominio
export interface Movimiento {
  id: number;
  amount: number;
  supplier: string;
  entryDate: string;    // "YYYY-MM-DD"
  createdAt: string;    // ISO timestamp
  companyId?: string;
  category?: number;    // Añadimos la categoría
  tipo: "ingreso" | "gasto";
}

// Mapea DTO de API a Movimiento
function mapToIngreso(i: any): Movimiento {
  return {
    id: i.id,
    amount: parseFloat(i.amount),
    supplier: i.supplier ?? i.description ?? "—",
    entryDate: i.dueDate.slice(0, 10),  // usamos dueDate para la fecha "pura"
    createdAt: i.createdAt,
    category: i.category,
    tipo: "ingreso",
  };
}

function mapToGasto(e: any): Movimiento {
  return {
    id: e.id,
    amount: parseFloat(e.amount),
    supplier: e.supplier ?? e.description ?? "—",
    entryDate: e.dueDate.slice(0, 10),
    createdAt: e.createdAt,
    category: e.category,
    tipo: "gasto",
  };
}

// Categorías por defecto
const DEFAULT_CATEGORY = { ingreso: 10, gasto: 50 } as const;

const Clasificacion: React.FC = () => {
  // estado principal
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<"todos"|"ingreso"|"gasto">("todos");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Nuevos filtros para clasificación de gastos
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroId, setFiltroId] = useState("");

  // formulario
  const [form, setForm] = useState({
    amount: 0,
    tipo: "ingreso" as "ingreso"|"gasto",
    supplier: "",
    entryDate: "",
    category: DEFAULT_CATEGORY.ingreso as number,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number|null>(null);

  // modal de detalles
  const [selected, setSelected] = useState<Movimiento|null>(null);
  const [showForm, setShowForm] = useState(true);

  // carga inicial con mapToIngreso/mapToGasto
  useEffect(() => {
    const fetchMovs = async () => {
      try {
        const [inRes, exRes] = await Promise.all([getIncomes(), getExpenses()]);
        const ingresos = inRes.data.map(mapToIngreso);
        const gastos   = exRes.data.map(mapToGasto);
        setMovimientos([...ingresos, ...gastos]);
      } catch (err) {
        console.error("Error cargando movimientos:", err);
      }
    };
    fetchMovs();
  }, []);

  // Actualizar categoría por defecto cuando cambia el tipo
  useEffect(() => {
    setForm(f => ({
      ...f,
      category: DEFAULT_CATEGORY[f.tipo] as number
    }));
  }, [form.tipo]);

  // crear o actualizar movimiento
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.entryDate) {
      alert("Debes escoger una fecha");
      return;
    }
    const payload: MovimientoPayload = {
      amount: form.amount,
      category: form.category,
      supplier: form.supplier,
      exitDate: form.entryDate,
      dueDate: form.entryDate,
    };
    try {
      if (isEditing && editingId != null) {
        form.tipo === "ingreso"
          ? await updateIncome(editingId, payload)
          : await updateExpense(editingId, payload);
      } else {
        form.tipo === "ingreso"
          ? await createIncome(payload)
          : await createExpense(payload);
      }
      setForm({ 
        amount: 0, 
        tipo: "ingreso", 
        supplier: "", 
        entryDate: "",
        category: DEFAULT_CATEGORY.ingreso as number
      });
      setIsEditing(false);
      setEditingId(null);

      // refrescar lista
      const [inRes, exRes] = await Promise.all([getIncomes(), getExpenses()]);
      const ingresos = inRes.data.map(mapToIngreso);
      const gastos   = exRes.data.map(mapToGasto);
      setMovimientos([...ingresos, ...gastos]);
    } catch (err) {
      console.error("Error guardando movimiento:", err);
    }
  };

  const cancelEdit = () => {
    setForm({ 
      amount: 0, 
      tipo: "ingreso", 
      supplier: "", 
      entryDate: "",
      category: DEFAULT_CATEGORY.ingreso as number
    });
    setIsEditing(false);
    setEditingId(null);
  };

  // filtros mejorados
  const movimientosFiltrados = movimientos
    .filter(m => filtroTipo === "todos" || m.tipo === filtroTipo)
    .filter(m => !filtroEmpresa || m.companyId?.includes(filtroEmpresa))
    .filter(m => !dateFrom || m.entryDate >= dateFrom)
    .filter(m => !dateTo   || m.entryDate <= dateTo)
    // Nuevos filtros
    .filter(m => !filtroCategoria || m.category?.toString() === filtroCategoria)
    .filter(m => !filtroNombre || m.supplier.toLowerCase().includes(filtroNombre.toLowerCase()))
    .filter(m => !filtroId || m.id.toString().includes(filtroId));

  // agrupar por mes "YYYY-MM"
  const grupos = movimientosFiltrados.reduce<Record<string,Movimiento[]>>((acc, mov) => {
    const key = mov.entryDate.slice(0,7);
    (acc[key] ||= []).push(mov);
    return acc;
  }, {});

  // modal handlers
  const closeModal = () => setSelected(null);

  const handleModalDelete = async () => {
    if (!selected) return;
    try {
      selected.tipo === "ingreso"
        ? await deleteIncome(selected.id)
        : await deleteExpense(selected.id);
      closeModal();
      // refrescar lista
      const [inRes, exRes] = await Promise.all([getIncomes(), getExpenses()]);
      setMovimientos([
        ...inRes.data.map(mapToIngreso),
        ...exRes.data.map(mapToGasto),
      ]);
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
      category: selected.category || DEFAULT_CATEGORY[selected.tipo] as number,
    });
    setIsEditing(true);
    setEditingId(selected.id);
    closeModal();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onCardClick = (mov: Movimiento) => setSelected(mov);

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setDateFrom("");
    setDateTo("");
    setFiltroTipo("todos");
    setFiltroEmpresa("");
    setFiltroCategoria("");
    setFiltroNombre("");
    setFiltroId("");
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 bg-neutral-50">
      <h1 className="text-3xl font-bold text-center mb-8">
        Clasificación de Movimientos
      </h1>

      {/* toggle formulario */}
      <div className="text-center mb-4">
        <button
          onClick={() => setShowForm(v => !v)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-full"
        >
          {showForm ? "Ocultar Formulario" : "Nuevo Movimiento"}
        </button>
      </div>

      {/* formulario */}
      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-white p-6 rounded-lg shadow mb-8"
          >
            <h2 className="text-xl font-semibold mb-4">
              {isEditing ? "Editar movimiento" : "Nuevo movimiento"}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Monto"
                value={form.amount || ""}
                onChange={e =>
                  setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))
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
                    onChange={() => setForm(f => ({ ...f, tipo: "ingreso" }))}
                  />{" "}
                  Ingreso
                </label>
                <label>
                  <input
                    type="radio"
                    value="gasto"
                    checked={form.tipo === "gasto"}
                    onChange={() => setForm(f => ({ ...f, tipo: "gasto" }))}
                  />{" "}
                  Gasto
                </label>
              </div>
              
              {/* Selector de categoría */}
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: Number(e.target.value) }))}
                className="border p-2 rounded"
                required
              >
                {form.tipo === "gasto" ? (
                  Object.entries(CATEGORIA_GASTOS).map(([id, nombre]) => (
                    <option key={id} value={id}>{nombre}</option>
                  ))
                ) : (
                  <option value={10}>Ingresos</option>
                )}
              </select>
              
              <input
                type="text"
                placeholder="Proveedor / Descripción"
                value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                className="border p-2 rounded"
                required
              />
              <input
                type="date"
                value={form.entryDate}
                onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))}
                className="border p-2 rounded col-span-2"
                required
              />
            </div>
            <div className="mt-4 flex gap-4">
              <button className="bg-amber-500 text-white px-4 py-2 rounded">
                {isEditing ? "Guardar" : "Crear"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  Cancelar
                </button>
              )}
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* filtros mejorados */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        
        {/* Primera fila de filtros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha desde:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha hasta:</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo:</label>
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value as any)}
              className="w-full border p-2 rounded"
            >
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="gasto">Gastos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Empresa (ID):</label>
            <input
              type="text"
              placeholder="ID de empresa"
              value={filtroEmpresa}
              onChange={e => setFiltroEmpresa(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>
        
        {/* Segunda fila de filtros - específicos para clasificación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Categoría de gasto:</label>
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">Todas las categorías</option>
              {Object.entries(CATEGORIA_GASTOS).map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre/Descripción:</label>
            <input
              type="text"
              placeholder="Buscar por nombre"
              value={filtroNombre}
              onChange={e => setFiltroNombre(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ID del gasto:</label>
            <input
              type="text"
              placeholder="Buscar por ID"
              value={filtroId}
              onChange={e => setFiltroId(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>
        
        {/* Botón para limpiar filtros */}
        <div className="flex justify-end">
          <button
            onClick={limpiarFiltros}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Resumen de resultados */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-blue-700">
          Mostrando {movimientosFiltrados.length} movimiento(s) de {movimientos.length} total
        </p>
      </div>

      {/* línea de tiempo agrupada */}
      {Object.entries(grupos).map(([mesKey, items]) => {
        const [yyyy, mm] = mesKey.split("-");
        const mesNombre = MONTH_NAMES_ES[Number(mm) - 1];
        return (
          <div key={mesKey} className="mb-12 w-full">
            <h2 className="text-2xl font-bold text-center mb-6 border-b-2 border-amber-200 pb-2">
              {mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)} {yyyy}
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
                    .map(mov => (
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
                          className={`absolute left-1/2 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 ${
                            mov.tipo === "ingreso" ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <div className="flex w-full">
                          <div className="w-1/2 flex justify-end pr-[1cm]">
                            {mov.tipo === "gasto" && <Card mov={mov} />}
                          </div>
                          <div className="w-1/2 flex justify-start pl-[1cm]">
                            {mov.tipo === "ingreso" && <Card mov={mov} />}
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

      {/* Mensaje cuando no hay resultados */}
      {movimientosFiltrados.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No se encontraron movimientos con los filtros aplicados
          </p>
        </div>
      )}

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
              className="bg-white p-6 rounded-2xl shadow-lg max-w-md w-full"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h3 className="text-xl font-semibold mb-4">
                Detalles del Movimiento
              </h3>
              <p className="mb-2">
                <strong>ID:</strong> {selected.id}
              </p>
              <p className="mb-2">
                <strong>Tipo:</strong> {selected.tipo}
              </p>
              <p className="mb-2">
                <strong>Categoría:</strong>{" "}
                {selected.tipo === "gasto" && selected.category 
                  ? CATEGORIA_GASTOS[selected.category as keyof typeof CATEGORIA_GASTOS] || `Categoría ${selected.category}`
                  : "Ingreso"
                }
              </p>
              <p className="mb-2">
                <strong>Fecha:</strong>{" "}
                {selected.entryDate.split("-").reverse().join("/")}
              </p>
              <p className="mb-2">
                <strong>Hora:</strong>{" "}
                {new Date(selected.createdAt).toLocaleTimeString()}
              </p>
              <p className="mb-2">
                <strong>Monto:</strong> ${selected.amount.toLocaleString()}
              </p>
              <p className="mb-4">
                <strong>Descripción:</strong> {selected.supplier}
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={handleModalEdit}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-full"
                >
                  Editar
                </button>
                <button
                  onClick={handleModalDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-full"
                >
                  Eliminar
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-full"
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