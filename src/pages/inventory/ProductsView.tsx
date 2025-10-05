// src/pages/inventory/ProductsView.tsx

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
  useMemo,
} from "react";
import { useProducts, Product } from "../../context/ProductsContext";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";

interface FormState {
  name: string;
  sku: string;
  price: string;
  cost: string;
  stock: string;
}

const ProductsView: React.FC = () => {
  const {
    products,
    loading,
    error,
    loadProducts,
    addProduct,
    editProduct,
    removeProduct,
  } = useProducts();

  // filtros y paginación
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 9;

  // estado del panel flotante
  const [showPanel, setShowPanel] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<Product["id"] | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    sku: "",
    price: "",
    cost: "",
    stock: "",
  });

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // reset página al cambiar filtro
  useEffect(() => {
    setPage(0);
  }, [filter]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const term = filter.toLowerCase();
        return (
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term)
        );
      }),
    [products, filter]
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page]
  );

  // preparar datos para export
  const getProductsData = () =>
    filtered.map((p) => ({
      Nombre: p.name,
      SKU: p.sku,
      Precio: p.price,
      Costo: p.cost,
      Stock: p.stock,
    }));

  const exportProductsCSV = () => {
    const csv = Papa.unparse(getProductsData());
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "productos.csv");
  };

  const exportProductsExcel = () => {
    const ws = XLSX.utils.json_to_sheet(getProductsData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "productos.xlsx");
  };

  // abrir panel para nuevo producto
  const openNew = () => {
    setForm({ name: "", sku: "", price: "", cost: "", stock: "" });
    setIsEditing(false);
    setSelectedId(null);
    setIsCollapsed(false);
    setShowPanel(true);
  };

  // abrir panel para editar
  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      sku: p.sku,
      price: p.price.toString(),
      cost: p.cost.toString(),
      stock: p.stock.toString(),
    });
    setIsEditing(true);
    setSelectedId(p.id);
    setIsCollapsed(false);
    setShowPanel(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      sku: form.sku,
      price: parseFloat(form.price),
      cost: parseFloat(form.cost),
      stock: parseInt(form.stock, 10),
    };
    if (isEditing && selectedId !== null) {
      await editProduct(selectedId, payload);
    } else {
      await addProduct(payload);
    }
    setShowPanel(false);
  };

  const handleDelete = async () => {
    if (selectedId !== null) {
      await removeProduct(selectedId);
      setShowPanel(false);
    }
  };

  const getTotalInventoryValue = () => {
  return products.reduce((acc, product) => {
    const price = Number(product.price) || 0;
    const stock = Number(product.stock) || 0;
    return acc + price * stock;
  }, 0);
};

  return (
    
    <div className="relative p-6 bg-[#fffbeb]">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
        📦 Valor total en inventario:{' '}
        <span style={{ color: '#27ae60' }}>
          {getTotalInventoryValue().toLocaleString('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
          })}
        </span>
      </h3>
      {/* Export + Filtro + Nuevo */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          onClick={exportProductsCSV}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2 text-sm"
        >
          Exportar CSV
        </button>
        <button
          onClick={exportProductsExcel}
          className="bg-green-500 hover:bg-green-600 text-white rounded px-4 py-2 text-sm"
        >
          Exportar Excel
        </button>
        <input
          type="text"
          placeholder="Buscar por nombre o SKU…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-[#fef3c6] rounded-lg bg-white"
        />
        <button
          onClick={openNew}
          className="bg-[#fe9a00] hover:bg-[#e17100] text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"
        >
          +
        </button>
      </div>

      {/* Lista paginada */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {Array.from({ length: pageSize }).map((_, i) => (
            <div
              key={i}
              className="h-36 bg-[#fef3c6] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {paginated.map((p) => (
              <div
                key={p.id}
                onClick={() => openEdit(p)}
                className="cursor-pointer bg-white rounded-2xl border border-[#fef3c6] shadow p-4 hover:shadow-lg transition flex flex-col justify-between h-full"
              >
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-[#973c00] text-base sm:text-lg">
                    {p.name}
                  </h3>
                  <p className="text-sm text-[#bb4d00] break-words">{p.sku}</p>
                </div>
                <div className="flex justify-between items-center mt-2 text-sm sm:text-base">
                  <span className="text-green-600 font-bold">
                    ${p.price.toLocaleString("es-CO")}
                  </span>
                  <span className="text-red-500 font-bold">
                    ${p.cost.toLocaleString("es-CO")}
                  </span>
                </div>
                <p className="text-xs text-[#973c00] mt-1">Stock: {p.stock}</p>
              </div>
            ))}
          </div>


          {/* Controles de paginación */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <span>
              Página {page + 1} de {totalPages || 1}
            </span>
            <button
              onClick={() =>
                setPage((p) => Math.min(p + 1, totalPages - 1))
              }
              disabled={page + 1 >= totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {/* Panel flotante con paleta y animación suave */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed bottom-6 right-6 w-80 bg-[#fffbeb] border border-[#fef3c6] shadow-lg rounded-2xl overflow-hidden z-50"
          >
            <div className="flex justify-between items-center bg-[#fef3c6] px-4 py-2">
              <h4 className="text-sm font-semibold text-[#973c00]">
                {isEditing ? "Editar producto" : "Nuevo producto"}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCollapsed((v) => !v)}
                  className="text-lg text-[#973c00]"
                >
                  {isCollapsed ? "+" : "−"}
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-sm text-[#973c00]"
                >
                  ✕
                </button>
              </div>
            </div>
            {!isCollapsed && (
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {[
                  { name: "name", label: "Nombre", type: "text" },
                  { name: "sku", label: "SKU", type: "text" },
                  {
                    name: "price",
                    label: "Precio",
                    type: "number",
                    step: "0.01",
                  },
                  {
                    name: "cost",
                    label: "Costo",
                    type: "number",
                    step: "0.01",
                  },
                  { name: "stock", label: "Stock", type: "number" },
                ].map((field) => (
                  <div key={field.name} className="space-y-1">
                    <label className="block text-sm text-[#973c00]">
                      {field.label}
                    </label>
                    <input
                      name={field.name}
                      type={field.type}
                      step={(field as any).step}
                      value={(form as any)[field.name]}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-[#fef3c6] rounded-lg bg-white"
                    />
                  </div>
                ))}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                  >
                    {isEditing ? "Guardar cambios" : "Agregar"}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductsView;