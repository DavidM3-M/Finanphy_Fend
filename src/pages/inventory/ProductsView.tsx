// src/pages/inventory/ProductsView.tsx

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useProducts, Product } from "../../context/ProductsContext";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<FormState>({
    name: "",
    sku: "",
    price: "",
    cost: "",
    stock: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<Product["id"] | null>(null);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleCardClick = (p: Product) => {
    setIsEditing(true);
    setSelectedId(p.id);
    setForm({
      name: p.name,
      sku: p.sku,
      price: p.price.toString(),
      cost: p.cost.toString(),
      stock: p.stock.toString(),
    });
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
    setForm({ name: "", sku: "", price: "", cost: "", stock: "" });
    setIsEditing(false);
    setSelectedId(null);
  };

  const handleCancel = () => {
    setForm({ name: "", sku: "", price: "", cost: "", stock: "" });
    setIsEditing(false);
    setSelectedId(null);
  };

  const handleDelete = async () => {
    if (selectedId !== null) {
      await removeProduct(selectedId);
      handleCancel();
    }
  };

  const filtered = products.filter(p => {
    const term = filter.toLowerCase();
    return p.name.toLowerCase().includes(term) ||
           p.sku.toLowerCase().includes(term);
  });

  // prepare data for export
  const getProductsData = () =>
    filtered.map(p => ({
      Nombre: p.name,
      SKU: p.sku,
      Precio: p.price,
      Costo: p.cost,
      Stock: p.stock,
    }));

  const exportProductsCSV = () => {
    const data = getProductsData();
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "productos.csv");
  };

  const exportProductsExcel = () => {
    const data = getProductsData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "productos.xlsx");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
      {/* Columna izquierda: export buttons + buscador + lista */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={exportProductsCSV}
            className="
              bg-blue-500 hover:bg-blue-600 text-white 
              rounded px-4 py-2 text-sm
            "
          >
            Exportar CSV
          </button>
          <button
            onClick={exportProductsExcel}
            className="
              bg-green-500 hover:bg-green-600 text-white 
              rounded px-4 py-2 text-sm
            "
          >
            Exportar Excel
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre o SKU…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="
            w-full px-4 py-2 border border-[#fef3c6]
            rounded-lg bg-[#fffbeb]
            focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685]
          "
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-36 bg-[#fef3c6] rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto">
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => handleCardClick(p)}
                className="
                  cursor-pointer bg-white rounded-2xl
                  border border-[#fef3c6] shadow p-4 space-y-1
                  hover:shadow-lg transition
                "
              >
                <h3 className="text-lg font-semibold text-[#973c00]">
                  {p.name}
                </h3>
                <p className="text-sm text-[#bb4d00]">{p.sku}</p>
                <div className="flex justify-between text-sm mt-2">
                  <span className="font-bold text-green-600">
                    ${p.price.toLocaleString("es-CO")}
                  </span>
                  <span className="font-bold text-red-500">
                    ${p.cost.toLocaleString("es-CO")}
                  </span>
                </div>
                <p className="text-xs text-[#973c00]">Stock: {p.stock}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Columna derecha: formulario */}
      <form
        onSubmit={handleSubmit}
        className="
          sticky top-6 bg-white p-6 rounded-2xl
          border border-[#fef3c6] shadow space-y-4
        "
      >
        <h2 className="text-lg font-semibold text-[#973c00]">
          {isEditing ? "Editar producto" : "Nuevo producto"}
        </h2>

        {[
          { name: "name", label: "Nombre", type: "text" },
          { name: "sku", label: "SKU", type: "text" },
          { name: "price", label: "Precio", type: "number", step: "0.01" },
          { name: "cost", label: "Costo", type: "number", step: "0.01" },
          { name: "stock", label: "Stock", type: "number" }
        ].map(field => (
          <div className="space-y-1" key={field.name}>
            <label className="block text-sm text-[#973c00]">{field.label}</label>
            <input
              name={field.name}
              type={field.type}
              step={field.step}
              value={(form as any)[field.name]}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb]"
            />
          </div>
        ))}

        <div className="flex gap-2">
          <button
            type="submit"
            className="
              flex-1 bg-[#fe9a00] hover:bg-[#e17100]
              text-white py-2 rounded-lg
            "
          >
            {isEditing ? "Guardar cambios" : "Agregar producto"}
          </button>

          {isEditing && (
            <>
              <button
                type="button"
                onClick={handleDelete}
                className="
                  bg-red-500 hover:bg-red-600 text-white
                  py-2 px-4 rounded-lg
                "
              >
                Eliminar
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="
                  flex-1 bg-[#fef3c6] hover:bg-[#fee685]
                  text-[#973c00] py-2 rounded-lg
                "
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProductsView;