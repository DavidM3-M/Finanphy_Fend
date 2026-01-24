import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FormEvent,
  useMemo,
} from "react";
import { useProducts, Product } from "../../context/ProductsContext";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ProductsView.tsx
 * - Añadido soporte drag & drop para la carga de imagen en el formulario.
 * - Mantiene fallback a input file y campo imageUrl.
 */

interface FormState {
  name: string;
  sku: string;
  price: string | number;
  cost: string | number;
  stock: string | number;
  description: string;
  category: string;
  imageUrl: string; // campo opcional para URL externa
}

const getApiBase = () => {
  const raw = process.env.REACT_APP_API_URL || "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};

const parseResponseSafely = async (res: Response) => {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await res.json().catch(async () => await res.text().catch(() => null));
  }
  return await res.text().catch(() => null);
};

const INLINE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#fff"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" fill="#973c00" font-size="14">Sin imagen</text></svg>`,
  );

const ACCEPTED_TYPES = /^image\/(jpeg|png|webp)$/i;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ProductsView: React.FC = () => {
  const { products, loading, error, loadProducts } = useProducts();

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
  const [dragActive, setDragActive] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const objectUrlRef = useRef<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadProducts().catch((err) => console.error("loadProducts error", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  // Manage previewUrl and object URL lifecycle without premature revocation
  useEffect(() => {
    setImgLoaded(false);
    setImageError(null);

    if (localImageFile) {
      if (objectUrlRef.current) {
        try {
          URL.revokeObjectURL(objectUrlRef.current);
        } catch (e) {}
        objectUrlRef.current = null;
      }
      const url = URL.createObjectURL(localImageFile);
      objectUrlRef.current = url;
      setPreviewUrl(url);
      return;
    }

    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch (e) {}
      objectUrlRef.current = null;
    }
    setPreviewUrl(form.imageUrl || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localImageFile, form.imageUrl]);

  // revoke on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        try {
          URL.revokeObjectURL(objectUrlRef.current);
        } catch (e) {}
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const filtered = useMemo(() => {
    const term = filter.toLowerCase();
    return products.filter((p) => {
      return (
        (p.name || "").toString().toLowerCase().includes(term) ||
        (p.sku || "").toString().toLowerCase().includes(term)
      );
    });
  }, [products, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page]
  );

  const getProductsData = () =>
    filtered.map((p) => ({
      Nombre: p.name,
      SKU: p.sku,
      Precio: (p as any).price,
      Costo: (p as any).cost,
      Stock: (p as any).stock,
      Descripción: (p as any).description ?? "",
      Categoría: (p as any).category ?? "",
      Imagen: (p as any).imageUrl ?? "",
    }));

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
      price: (p as any).price ?? "",
      cost: (p as any).cost ?? "",
      stock: (p as any).stock ?? 0,
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

  const handleImageSelectFile = (file: File | null) => {
    setImageError(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.test(file.type)) {
      setImageError("Solo se permiten imágenes jpeg, png o webp.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setImageError(`El archivo supera el límite de ${Math.round(MAX_SIZE / (1024 * 1024))} MB.`);
      return;
    }
    setLocalImageFile(file);
    setForm((f) => ({ ...f, imageUrl: "" })); // prefer archivo sobre URL
    console.log("selected local image file", file.name, file.size, file.type);
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleImageSelectFile(file);
  };

  // Drag & Drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // only clear when leaving the drop zone entirely
    if ((e as any).relatedTarget === null) setDragActive(false);
    else setDragActive(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0] || null;
    handleImageSelectFile(file);
  };

  const handleRemoveImage = () => {
    setLocalImageFile(null);
    setForm((f) => ({ ...f, imageUrl: "" }));
    setPreviewUrl(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendFormDataToApi = async (
    fd: FormData,
    method: "POST" | "PUT",
    path: string
  ) => {
    setUploading(true);
    try {
      const API_BASE = getApiBase();
      const fullUrl = API_BASE ? `${API_BASE}${path}` : path;

      const headers: Record<string, string> = {};
      const token = localStorage.getItem("token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(fullUrl, { method, body: fd, headers });
      console.log("submit response", method, fullUrl, res.status, res.statusText);

      const body = await parseResponseSafely(res);
      if (!res.ok) {
        console.error("submit failed body:", body);
        throw new Error(`Request failed ${res.status}`);
      }
      return body;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("name", String(form.name));
    fd.append("sku", String(form.sku));
    fd.append("price", String(form.price ?? ""));
    fd.append("cost", String(form.cost ?? ""));
    fd.append("stock", String(form.stock ?? "0"));
    fd.append("description", form.description ?? "");
    fd.append("category", form.category ?? "");

    if (localImageFile) fd.append("image", localImageFile);
    else if (form.imageUrl) fd.append("imageUrl", form.imageUrl);

    try {
      if (isEditing && selectedId) {
        const path = `/products/${selectedId}`;
        const body = await sendFormDataToApi(fd, "PUT", path);
        const returnedImage = body?.imageUrl ?? null;
        if (returnedImage) setPreviewUrl(`${returnedImage}?v=${Date.now()}`);
      } else {
        const path = `/products`;
        const body = await sendFormDataToApi(fd, "POST", path);
        const returnedImage = body?.imageUrl ?? null;
        if (returnedImage) setPreviewUrl(`${returnedImage}?v=${Date.now()}`);
      }

      await loadProducts();
      setShowPanel(false);
      setLocalImageFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      if (selectedId !== null) {
        const API_BASE = getApiBase();
        const fullUrl = API_BASE ? `${API_BASE}/products/${selectedId}` : `/products/${selectedId}`;
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(fullUrl, { method: "DELETE", headers });
        const body = await parseResponseSafely(res);
        if (!res.ok) {
          console.error("delete failed", res.status, body);
          throw new Error("delete failed");
        }
        await loadProducts();
        setShowPanel(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getTotalInventoryValue = () =>
    products.reduce((acc, product) => {
      const price = Number((product as any).price) || 0;
      const stock = Number((product as any).stock) || 0;
      return acc + price * stock;
    }, 0);

  return (
    <div className="relative p-6 bg-[#fffbeb]">
      <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        Valor total en inventario:
        <span style={{ color: "#27ae60", marginLeft: 8 }}>
          {getTotalInventoryValue().toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
          })}
        </span>
      </h3>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          onClick={() => {
            const csv = Papa.unparse(getProductsData());
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            saveAs(blob, "productos.csv");
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1.5 text-sm"
        >
          Exportar CSV
        </button>
        <button
          onClick={() => {
            const ws = XLSX.utils.json_to_sheet(getProductsData());
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Productos");
            XLSX.writeFile(wb, "productos.xlsx");
          }}
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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="h-36 bg-[#fef3c6] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {paginated.map((p) => {
              const productImageRaw = (p as any).imageUrl ?? null;
              const productImageSrc =
                productImageRaw && productImageRaw.startsWith("http")
                  ? productImageRaw
                  : productImageRaw
                  ? `${getApiBase() || ""}${productImageRaw}`
                  : null;

              return (
                <div
                  key={p.id}
                  onClick={() => openEdit(p)}
                  className="cursor-pointer bg-white rounded-2xl border border-[#fef3c6] shadow p-4 hover:shadow-lg transition flex flex-col justify-between h-full"
                >
                  {productImageSrc ? (
                    <div className="w-full h-36 relative rounded-xl mb-2 border border-[#fef3c6] overflow-hidden bg-white">
                      <img
                        key={productImageSrc}
                        src={productImageSrc}
                        alt={p.name}
                        loading="lazy"
                        onLoad={() => {
                          console.log("product image loaded", productImageSrc);
                          setImgLoaded(true);
                        }}
                        onError={(e) => {
                          const t = e.currentTarget as HTMLImageElement;
                          console.warn("product image failed to load:", t.src);
                          t.onerror = null;
                          // avoid loop: set to inline placeholder (no external dependency)
                          t.src = INLINE_PLACEHOLDER;
                          setImgLoaded(true);
                        }}
                        className={`w-full h-full object-cover rounded-xl transition-opacity duration-200 ${
                          imgLoaded ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {!imgLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white">
                          <div className="text-xs text-[#973c00]">Cargando imagen…</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-36 flex items-center justify-center rounded-xl mb-2 border border-dashed border-[#fef3c6] bg-white text-xs text-[#973c00]">
                      Sin imagen
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-[#973c00] text-base sm:text-lg">{p.name}</h3>
                    <p className="text-sm text-[#bb4d00] break-words">{p.sku}</p>
                  </div>

                  <div className="mt-1">
                    {(p as any).description && <p className="text-xs text-[#973c00] mt-1">{(p as any).description}</p>}
                    {(p as any).category && <p className="text-xs text-[#bb4d00]">{(p as any).category}</p>}
                  </div>

                  <div className="flex justify-between items_center mt-2 text-sm sm:text-base">
                    <span className="text-green-600 font-bold">${Number((p as any).price).toLocaleString("es-CO")}</span>
                    <span className="text-red-500 font-bold">${Number((p as any).cost).toLocaleString("es-CO")}</span>
                  </div>

                  <p className="text-xs text-[#973c00] mt-1">Stock: {(p as any).stock}</p>
                </div>
              );
            })}
          </div>

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
                <button onClick={() => setIsCollapsed((v) => !v)} className="text-sm text-[#973c00] px-2">
                  {isCollapsed ? "+" : "−"}
                </button>
                <button onClick={() => setShowPanel(false)} className="text-sm text-[#973c00] px-2">✕</button>
              </div>
            </div>

            {!isCollapsed && (
              <form onSubmit={handleSubmit} className="p-3 space-y-3 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Nombre</label>
                    <input name="name" type="text" value={form.name} onChange={handleChange} required className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Código</label>
                    <input name="sku" type="text" value={form.sku} onChange={handleChange} required className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Precio</label>
                    <input name="price" type="number" step="0.01" value={String(form.price)} onChange={handleChange} required className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Costo</label>
                    <input name="cost" type="number" step="0.01" value={String(form.cost)} onChange={handleChange} required className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Stock</label>
                    <input name="stock" type="number" value={String(form.stock)} onChange={handleChange} required className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-[#973c00]">Descripción</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={2} className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm" />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-[#973c00]">Categoría</label>
                  <input name="category" type="text" value={form.category} onChange={handleChange} className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm" />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs text-[#973c00]">Imagen</label>

                  {previewUrl ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={previewUrl}
                        alt="preview"
                        className="w-16 h-16 object-cover rounded border border-[#fef3c6]"
                        onLoad={() => {
                          console.log("preview image loaded", previewUrl);
                          setImgLoaded(true);
                        }}
                        onError={(e) => {
                          const t = e.currentTarget as HTMLImageElement;
                          console.warn("preview image failed to load:", t.src);
                          t.onerror = null;
                          t.src = INLINE_PLACEHOLDER;
                          setImgLoaded(true);
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex gap-2">
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                            <span className="px-2 py-1 bg-[#f3f4f6] rounded text-xs">Cambiar</span>
                          </label>
                          <button type="button" onClick={handleRemoveImage} className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs">Eliminar</button>
                        </div>
                        <input type="text" name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="O pega una URL" className="mt-1 w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragEnter={onDragEnter}
                        onDragLeave={onDragLeave}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                        className={`flex items-center justify-center border-2 ${
                          dragActive ? "border-dashed border-[#0ea5e9] bg-[#f1f5f9]" : "border-dashed border-[#fef3c6] bg-white"
                        } rounded p-3 gap-3 cursor-pointer`}
                        style={{ minHeight: 72 }}
                        aria-label="Arrastra y suelta una imagen aquí o haz clic para seleccionar"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                        <div className="text-xs text-[#973c00] text-center">
                          <div>Clica o arrastra una imagen aquí</div>
                          <div className="text-[11px] text-[#64748b]">jpeg/png/webp, hasta {Math.round(MAX_SIZE / (1024 * 1024))} MB</div>
                        </div>
                      </div>

                      <input type="text" name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="O pega una URL" className="w-full mt-2 px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm" />
                    </>
                  )}

                  {imageError && <p className="text-xs text-red-600 mt-1">{imageError}</p>}
                  {uploading && <p className="text-xs text-gray-500">Enviando...</p>}
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">
                    {isEditing ? "Guardar" : "Agregar"}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white py-1.5 px-3 rounded text-sm">
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