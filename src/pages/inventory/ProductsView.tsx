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
  description: string;
  category: string;
  imageUrl: string;
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
  const [page, setPage] = useState(0);
  const pageSize = 9;

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
    description: "",
    category: "",
    imageUrl: "",
  });

  const [localImageFile, setLocalImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // load initially and log result
    const load = async () => {
      await loadProducts();
      console.log("products loaded (initial)", products.map(p => ({ id: p.id, imageUrl: (p as any).imageUrl })));
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadProducts]);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  useEffect(() => {
    if (!localImageFile) {
      setPreviewUrl(form.imageUrl || null);
      return;
    }
    const url = URL.createObjectURL(localImageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localImageFile, form.imageUrl]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page]
  );

  const getProductsData = () =>
    filtered.map((p) => ({
      Nombre: p.name,
      SKU: p.sku,
      Precio: p.price,
      Costo: p.cost,
      Stock: p.stock,
      Descripción: (p as any).description ?? "",
      Categoría: (p as any).category ?? "",
      Imagen: (p as any).imageUrl ?? "",
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

  const openNew = () => {
    setForm({
      name: "",
      sku: "",
      price: "",
      cost: "",
      stock: "",
      description: "",
      category: "",
      imageUrl: "",
    });
    setLocalImageFile(null);
    setPreviewUrl(null);
    setIsEditing(false);
    setSelectedId(null);
    setIsCollapsed(false);
    setShowPanel(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      sku: p.sku,
      price: String((p as any).price ?? ""),
      cost: String((p as any).cost ?? ""),
      stock: String((p as any).stock ?? "0"),
      description: (p as any).description ?? "",
      category: (p as any).category ?? "",
      imageUrl: (p as any).imageUrl ?? "",
    });
    setLocalImageFile(null);
    setPreviewUrl((p as any).imageUrl ?? null);
    setIsEditing(true);
    setSelectedId(p.id);
    setIsCollapsed(false);
    setShowPanel(true);
  };

  // Upload helper: posts file to /api/upload and expects: { url: string }
  const uploadFile = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      console.log("uploadFile response", res.status, json);
      if (!res.ok) throw new Error("Upload failed");
      if (!json || !json.url) throw new Error("No url returned from upload");
      return json.url as string;
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setLocalImageFile(file);
    console.log("selected local image file", file.name, file.size, file.type);
  };

  const handleRemoveImage = () => {
    setLocalImageFile(null);
    setForm((f) => ({ ...f, imageUrl: "" }));
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // if there's a local file, upload first and update form.imageUrl
    if (localImageFile) {
      try {
        const url = await uploadFile(localImageFile);
        console.log("uploaded url", url);
        setForm((f) => ({ ...f, imageUrl: url }));
      } catch (err) {
        console.error("Image upload failed", err);
        // optionally show user feedback; proceed without updating image
      }
    }

    const payload = {
      name: form.name,
      sku: form.sku,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      stock: parseInt(form.stock || "0", 10),
      description: form.description,
      category: form.category,
      imageUrl: form.imageUrl,
    };

    console.log("payload before submit", payload);

    if (isEditing && selectedId !== null) {
      await editProduct(selectedId, payload);
    } else {
      await addProduct(payload);
    }

    // force reload products to ensure list has updated imageUrl
    await loadProducts();
    console.log("products reloaded after submit", products.map(p => ({ id: p.id, imageUrl: (p as any).imageUrl })));

    setShowPanel(false);
    setLocalImageFile(null);
    setPreviewUrl(null);
  };

  const handleDelete = async () => {
    if (selectedId !== null) {
      await removeProduct(selectedId);
      await loadProducts();
      setShowPanel(false);
    }
  };

  const getTotalInventoryValue = () => {
    return products.reduce((acc, product) => {
      const price = Number((product as any).price) || 0;
      const stock = Number((product as any).stock) || 0;
      return acc + price * stock;
    }, 0);
  };

  return (
    <div className="relative p-6 bg-[#fffbeb]">
      <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        📦 Valor total en inventario:{" "}
        <span style={{ color: "#27ae60" }}>
          {getTotalInventoryValue().toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
          })}
        </span>
      </h3>

      {/* Export + Filtro + Nuevo */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          onClick={exportProductsCSV}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1.5 text-sm"
        >
          Exportar CSV
        </button>
        <button
          onClick={exportProductsExcel}
          className="bg-green-500 hover:bg-green-600 text-white rounded px-3 py-1.5 text-sm"
        >
          Exportar Excel
        </button>
        <input
          type="text"
          placeholder="Buscar por nombre o SKU…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-3 py-1.5 border border-[#fef3c6] rounded-lg bg-white text-sm"
        />
        <button
          onClick={openNew}
          className="bg-[#fe9a00] hover:bg-[#e17100] text-white rounded-full w-10 h-10 flex items-center justify-center text-lg"
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
                {(p as any).imageUrl ? (
                  <img
                    src={(p as any).imageUrl}
                    alt={p.name}
                    loading="lazy"
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      t.onerror = null;
                      t.src = "/images/product-placeholder.png";
                    }}
                    className="w-full h-36 object-cover rounded-xl mb-2 border border-[#fef3c6]"
                  />
                ) : (
                  <div className="w-full h-36 flex items-center justify-center rounded-xl mb-2 border border-dashed border-[#fef3c6] bg-white text-xs text-[#973c00]">
                    Sin imagen
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-[#973c00] text-base sm:text-lg">
                    {p.name}
                  </h3>
                  <p className="text-sm text-[#bb4d00] break-words">{p.sku}</p>
                </div>

                <div className="mt-1">
                  {(p as any).description && (
                    <p className="text-xs text-[#973c00] mt-1">{(p as any).description}</p>
                  )}
                  {(p as any).category && (
                    <p className="text-xs text-[#bb4d00]">{(p as any).category}</p>
                  )}
                </div>

                <div className="flex justify-between items-center mt-2 text-sm sm:text-base">
                  <span className="text-green-600 font-bold">
                    ${Number((p as any).price).toLocaleString("es-CO")}
                  </span>
                  <span className="text-red-500 font-bold">
                    ${Number((p as any).cost).toLocaleString("es-CO")}
                  </span>
                </div>

                <p className="text-xs text-[#973c00] mt-1">Stock: {(p as any).stock}</p>
              </div>
            ))}
          </div>

          {/* Controles de paginación */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
              className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
            >
              Anterior
            </button>
            <span className="text-sm">
              Página {page + 1} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={page + 1 >= totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {/* Panel flotante compacto */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="fixed bottom-6 right-6 max-w-sm w-full sm:w-96 bg-[#fffbeb] border border-[#fef3c6] shadow-lg rounded-2xl overflow-hidden z-50"
          >
            <div className="flex justify-between items-center bg-[#fef3c6] px-3 py-1.5">
              <h4 className="text-xs font-semibold text-[#973c00]">
                {isEditing ? "Editar producto" : "Nuevo producto"}
              </h4>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setIsCollapsed((v) => !v)}
                  className="text-sm text-[#973c00] px-2"
                >
                  {isCollapsed ? "+" : "−"}
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-sm text-[#973c00] px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <form
                onSubmit={handleSubmit}
                className="p-3 space-y-3 max-h-[80vh] overflow-y-auto"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Nombre</label>
                    <input
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">SKU</label>
                    <input
                      name="sku"
                      type="text"
                      value={form.sku}
                      onChange={handleChange}
                      required
                      className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Precio</label>
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={handleChange}
                      required
                      className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Costo</label>
                    <input
                      name="cost"
                      type="number"
                      step="0.01"
                      value={form.cost}
                      onChange={handleChange}
                      required
                      className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Stock</label>
                    <input
                      name="stock"
                      type="number"
                      value={form.stock}
                      onChange={handleChange}
                      required
                      className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-[#973c00]">Descripción</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-[#973c00]">Categoría</label>
                  <input
                    name="category"
                    type="text"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-[#973c00]">Imagen</label>

                  {previewUrl ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={previewUrl}
                        alt="preview"
                        className="w-16 h-16 object-cover rounded border border-[#fef3c6]"
                        onError={(e) => {
                          const t = e.currentTarget as HTMLImageElement;
                          t.onerror = null;
                          t.src = "/images/product-placeholder.png";
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex gap-2">
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageSelect}
                              className="hidden"
                            />
                            <span className="px-2 py-1 bg-[#f3f4f6] rounded text-xs">Cambiar</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs"
                          >
                            Eliminar
                          </button>
                        </div>
                        <input
                          type="text"
                          name="imageUrl"
                          value={form.imageUrl}
                          onChange={handleChange}
                          placeholder="O pega una URL"
                          className="mt-1 w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="w-full text-sm"
                      />
                      <input
                        type="text"
                        name="imageUrl"
                        value={form.imageUrl}
                        onChange={handleChange}
                        placeholder="O pega una URL"
                        className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm"
                      />
                    </div>
                  )}

                  {uploading && <p className="text-xs text-gray-500">Subiendo imagen...</p>}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm"
                  >
                    {isEditing ? "Guardar" : "Agregar"}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="bg-red-500 hover:bg-red-600 text-white py-1.5 px-3 rounded text-sm"
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