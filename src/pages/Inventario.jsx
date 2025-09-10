import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { NumericFormat } from "react-number-format";
import { Plus, Download, Edit, Trash2, X, Package, TrendingUp, AlertTriangle } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
});

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    cost: "",
    stock: "",
  });

  // --- API
  const fetchProductos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/products");
      setProductos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetch products:", err);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  // --- Filtros y paginación
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        String(p.name ?? "").toLowerCase().includes(q) ||
        String(p.sku ?? "").toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  const totalPages = Math.max(1, Math.ceil(productosFiltrados.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return productosFiltrados.slice(start, start + pageSize);
  }, [productosFiltrados, page]);

  // Estadísticas del inventario
  const stats = useMemo(() => {
    const totalProductos = productos.length;
    const stockBajo = productos.filter(p => Number(p.stock) <= 5).length;
    const valorTotal = productos.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);
    
    return {
      totalProductos,
      stockBajo,
      valorTotal
    };
  }, [productos]);

  // --- Modal
  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", sku: "", price: "", cost: "", stock: "" });
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name ?? "",
      sku: product.sku ?? "",
      price: product.price != null ? String(product.price) : "",
      cost: product.cost != null ? String(product.cost) : "",
      stock: product.stock != null ? String(product.stock) : "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm({ name: "", sku: "", price: "", cost: "", stock: "" });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  // --- Guardar producto
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.sku) {
      alert("Completa el nombre y el SKU.");
      return;
    }

    const payload = {
      name: form.name,
      sku: form.sku,
      price: form.price === "" ? 0 : Number(String(form.price)),
      cost: form.cost === "" ? 0 : Number(String(form.cost)),
      stock: form.stock === "" ? 0 : Number(form.stock),
    };

    try {
      if (editing && (editing.id || editing._id)) {
        const id = editing.id ?? editing._id;
        await api.put(`/products/${id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      await fetchProductos();
      closeModal();
    } catch (err) {
      console.error("Save product error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        "Error en la operación.";
      alert(msg);
    }
  };

  // --- Eliminar producto
  const handleDelete = async (product) => {
    const id = product.id ?? product._id;
    const ok = window.confirm(`Eliminar producto "${product.name}"?`);
    if (!ok) return;
    try {
      await api.delete(`/products/${id}`);
      await fetchProductos();
    } catch (err) {
      console.error("Delete product error:", err);
      alert("No se pudo eliminar el producto.");
    }
  };

  // --- Exportar CSV
  const exportCSV = () => {
    const header = "sku,name,price,cost,stock\n";
    const rows = productosFiltrados
      .map((p) =>
        [
          `"${p.sku ?? ""}"`,
          `"${(p.name ?? "").replace(/"/g, '""')}"`,
          p.price ?? 0,
          p.cost ?? 0,
          p.stock ?? 0,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventario.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      {/* Header Profesional */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Inventario</h1>
              <p className="text-slate-300 text-lg mt-1">
                Gestión completa de productos y control de stock
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-medium">Total Productos</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalProductos}</p>
                </div>
                <Package className="w-8 h-8 text-blue-300" />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-medium">Stock Bajo</p>
                  <p className="text-3xl font-bold mt-1 text-orange-300">{stats.stockBajo}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-300" />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-medium">Valor Total</p>
                  <p className="text-2xl font-bold mt-1 text-green-300">
                    {currencyFormatter.format(stats.valorTotal)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Controles */}
          <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setPage(1);
                    }}
                    className="pl-4 pr-12 py-3 w-80 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                             shadow-sm transition-all duration-200"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                    🔍
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white 
                           rounded-xl hover:bg-slate-700 transition-all duration-200 
                           shadow-lg hover:shadow-xl font-medium"
                >
                  <Download className="w-5 h-5" />
                  Exportar CSV
                </button>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r 
                           from-blue-600 to-blue-700 text-white rounded-xl 
                           hover:from-blue-700 hover:to-blue-800 transition-all 
                           duration-200 shadow-lg hover:shadow-xl font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Producto
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="m-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
            </div>
          )}

          {/* Tabla */}
          {loading ? (
            <div className="text-center py-16 text-slate-500">
              <div className="inline-flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                Cargando productos...
              </div>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium mb-2">No hay productos</h3>
              <p>Comienza agregando tu primer producto al inventario.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-8 py-4 text-left font-semibold text-slate-700">Producto</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">SKU</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Stock</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Precio</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">Costo</th>
                      <th className="px-8 py-4 text-right font-semibold text-slate-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginated.map((p, index) => {
                      const key = p.id ?? p._id ?? p.sku;
                      const isLowStock = Number(p.stock) <= 5;
                      
                      return (
                        <tr
                          key={key}
                          className="hover:bg-slate-50 transition-colors duration-150"
                        >
                          <td className="px-8 py-5">
                            <div className="font-medium text-slate-900">{p.name}</div>
                          </td>
                          <td className="px-6 py-5">
                            <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono text-slate-700">
                              {p.sku}
                            </code>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${isLowStock ? "text-red-600" : "text-slate-900"}`}>
                                {p.stock}
                              </span>
                              {isLowStock && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                  Stock Bajo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 font-medium text-slate-900">
                            {currencyFormatter.format(Number(p.price) || 0)}
                          </td>
                          <td className="px-6 py-5 text-slate-600">
                            {currencyFormatter.format(Number(p.cost) || 0)}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(p)}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-amber-500 
                                         text-white rounded-lg hover:bg-amber-600 transition-colors 
                                         text-sm font-medium shadow-sm"
                              >
                                <Edit className="w-4 h-4" />
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-red-500 
                                         text-white rounded-lg hover:bg-red-600 transition-colors 
                                         text-sm font-medium shadow-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Mostrando {Math.min((page - 1) * pageSize + 1, productosFiltrados.length)} -{" "}
                    {Math.min(page * pageSize, productosFiltrados.length)} de {productosFiltrados.length} productos
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg border border-slate-300 
                               disabled:opacity-50 hover:bg-slate-100 transition-colors 
                               font-medium text-slate-700"
                    >
                      Anterior
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const num = i + 1;
                      return (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            page === num
                              ? "bg-blue-600 text-white shadow-md"
                              : "hover:bg-slate-100 text-slate-700 border border-slate-300"
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-lg border border-slate-300 
                               disabled:opacity-50 hover:bg-slate-100 transition-colors 
                               font-medium text-slate-700"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editing ? "Editar Producto" : "Nuevo Producto"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSave} className="px-8 py-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nombre del Producto
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                             transition-all duration-200"
                    placeholder="Ingresa el nombre del producto"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    SKU
                  </label>
                  <input
                    name="sku"
                    value={form.sku}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                             transition-all duration-200 font-mono"
                    placeholder="SKU-001"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Stock
                  </label>
                  <input
                    name="stock"
                    value={form.stock}
                    onChange={handleFormChange}
                    type="number"
                    min="0"
                    className="w-full p-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                             transition-all duration-200"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Precio de Venta (COP)
                  </label>
                  <NumericFormat
                    value={form.price}
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="$"
                    allowNegative={false}
                    onValueChange={(values) =>
                      setForm((s) => ({ ...s, price: values.value }))
                    }
                    className="w-full p-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                             transition-all duration-200"
                    placeholder="$0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Costo (COP)
                  </label>
                  <NumericFormat
                    value={form.cost}
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="$"
                    allowNegative={false}
                    onValueChange={(values) =>
                      setForm((s) => ({ ...s, cost: values.value }))
                    }
                    className="w-full p-3 border border-slate-300 rounded-xl 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                             transition-all duration-200"
                    placeholder="$0"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 
                           transition-colors font-medium text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 
                           to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 
                           transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                >
                  {editing ? "Actualizar Producto" : "Crear Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}