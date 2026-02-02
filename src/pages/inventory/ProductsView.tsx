import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FormEvent,
  useMemo,
} from "react";
import { useProducts, Product } from "../../context/ProductsContext";
import { useAuth } from "../../context/AuthContext";
import { getProducts as fetchProductsPage, getTotalInventoryValue as fetchTotalInventoryValue } from "../../services/products";
import api from "../../services/api";
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
  entryDate: string; // ISO or datetime-local value
  expiresAt: string; // ISO or datetime-local value
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
  const { products, loading, error, loadProducts, meta } = useProducts();

  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const { company } = useAuth();

  // Normaliza producto desde la respuesta del API a la interfaz `Product` usada en este contexto
  const normalizeProduct = (raw: any): Product => ({
    id: raw.id,
    name: raw.name ?? "",
    sku: raw.sku ?? "",
    price: Number((raw as any).price) || 0,
    cost: Number((raw as any).cost) || 0,
    stock: Number((raw as any).stock) || 0,
    description: raw.description ?? undefined,
    category: raw.category ?? undefined,
    imageUrl: raw.imageUrl ?? undefined,
    entryDate: raw.entryDate ?? undefined,
    expiresAt: raw.expiresAt ?? undefined,
  });

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
    entryDate: "",
    expiresAt: "",
  });

  const [localImageFile, setLocalImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [duplicateSku, setDuplicateSku] = useState<{ name: string } | null>(null);
  const [duplicateName, setDuplicateName] = useState<string | null>(null);
  const [formAlert, setFormAlert] = useState<{
    level: "error" | "warning" | "info";
    message: string;
  } | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [cachedFd, setCachedFd] = useState<FormData | null>(null);
  const skuTimerRef = React.useRef<number | null>(null as unknown as number | null);
  const nameTimerRef = React.useRef<number | null>(null as unknown as number | null);

  // cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      if (skuTimerRef.current) window.clearTimeout(skuTimerRef.current);
      if (nameTimerRef.current) window.clearTimeout(nameTimerRef.current);
    };
  }, []);

  const objectUrlRef = useRef<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAllMatching = async (term: string) => {
      setSearching(true);
      setSearchResults([]);
      try {
        const perPage = 100; // server limit
        let p = 1;
        const maxPages = 10; // safety cap: 10 * 100 = 1000 results
        const acc: Product[] = [];
        while (p <= maxPages) {
          const res = await fetchProductsPage({ page: p, limit: perPage, search: term, companyId: company?.id });
          const data = Array.isArray(res?.data) ? res.data.map(normalizeProduct) : [];
          acc.push(...data);
          const totalPages = res?.meta?.totalPages ?? 1;
          if (p >= totalPages) break;
          p += 1;
        }
        if (!cancelled) setSearchResults(acc);
      } catch (err) {
        console.error("fetchAllMatching error", err);
      } finally {
        if (!cancelled) setSearching(false);
      }
    };

    // If there's an active filter, fetch matching pages (respecting limit<=100)
    if (filter && filter.trim() !== "") {
      setPage(1);
      fetchAllMatching(filter.trim());
    } else {
      // regular server-driven pagination
      loadProducts({ page, limit: pageSize, search: undefined, companyId: company?.id }).catch((err) =>
        console.error("loadProducts error", err)
      );
      // clear any previous searchResults
      setSearchResults([]);
    }

    return () => {
      cancelled = true;
    };
  }, [loadProducts, page, pageSize, filter, company?.id]);

  useEffect(() => {
    if (meta?.totalPages && page > meta.totalPages) {
      setPage(meta.totalPages);
    }
  }, [meta, page]);

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

  // Detectar SKU duplicado y nombre duplicado en el catálogo (excluye el producto en edición)
  useEffect(() => {
    const skuRaw = (form.sku ?? "").toString().trim();
    if (!skuRaw) {
      setDuplicateSku(null);
    } else {
      const sku = skuRaw.toLowerCase();
      const found = products.find((p) => (p.sku ?? "").toString().toLowerCase() === sku);
      if (!found || (isEditing && selectedId && found.id === selectedId)) setDuplicateSku(null);
      else setDuplicateSku({ name: found.name });
    }

    const nameRaw = (form.name ?? "").toString().trim();
    if (!nameRaw) {
      setDuplicateName(null);
    } else {
      const nameLower = nameRaw.toLowerCase();
      const foundName = products.find((p) => (p.name ?? "").toString().toLowerCase() === nameLower);
      if (!foundName || (isEditing && selectedId && foundName.id === selectedId)) setDuplicateName(null);
      else setDuplicateName(foundName.name);
    }
  }, [form.sku, form.name, products, isEditing, selectedId]);

  // Server-side quick check for SKU (used onBlur)
  const checkSkuServer = async (skuRaw?: string): Promise<string | null> => {
    const skuVal = (skuRaw ?? form.sku ?? "").toString().trim();
    if (!skuVal) {
      setDuplicateSku(null);
      return null;
    }
    try {
      const res = await api.get("/products", { params: { search: skuVal, limit: 10 } });
      const list: Product[] = res.data?.data ?? [];
      const found = list.find((p) => (p.sku ?? "").toString().toLowerCase() === skuVal.toLowerCase());
      if (!found) {
        setDuplicateSku(null);
        return null;
      }
      if (isEditing && selectedId && found.id === selectedId) {
        setDuplicateSku(null);
        return null;
      }
      setDuplicateSku({ name: found.name });
      return found.name;
    } catch (err) {
      console.warn("Error comprobando SKU en servidor:", err);
      return null;
    }
  };

  // Server-side quick check for Name (used onBlur)
  const checkNameServer = async (nameRaw?: string): Promise<string | null> => {
    const nameVal = (nameRaw ?? form.name ?? "").toString().trim();
    if (!nameVal) {
      setDuplicateName(null);
      return null;
    }
    try {
      const res = await api.get("/products", { params: { search: nameVal, limit: 10 } });
      const list: Product[] = res.data?.data ?? [];
      const found = list.find((p) => (p.name ?? "").toString().toLowerCase() === nameVal.toLowerCase());
      if (!found) {
        setDuplicateName(null);
        return null;
      }
      if (isEditing && selectedId && found.id === selectedId) {
        setDuplicateName(null);
        return null;
      }
      setDuplicateName(found.name);
      return found.name;
    } catch (err) {
      console.warn("Error comprobando nombre en servidor:", err);
      return null;
    }
  };

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

    // Debounced server-side checks for sku/name to give fast feedback while typing
    if (name === "sku") {
      if (skuTimerRef.current) window.clearTimeout(skuTimerRef.current);
      skuTimerRef.current = window.setTimeout(async () => {
        // only check if there's some value
        if ((value ?? "").toString().trim() !== "") {
          await checkSkuServer(value.toString());
        } else {
          setDuplicateSku(null);
        }
        skuTimerRef.current = null;
      }, 500);
    }

    if (name === "name") {
      if (nameTimerRef.current) window.clearTimeout(nameTimerRef.current);
      nameTimerRef.current = window.setTimeout(async () => {
        if ((value ?? "").toString().trim() !== "") {
          await checkNameServer(value.toString());
        } else {
          setDuplicateName(null);
        }
        nameTimerRef.current = null;
      }, 500);
    }
  };

  const filtered = useMemo(() => {
    const term = filter.toLowerCase();
    const source = term ? searchResults : products;
    if (!term) return source;
    return source.filter((p) => {
      const name = (p.name || "").toString().toLowerCase();
      const sku = (p.sku || "").toString().toLowerCase();
      const categoryVal = ((p as any).category || "").toString().toLowerCase();
      return name.includes(term) || sku.includes(term) || categoryVal.includes(term);
    });
  }, [products, searchResults, filter]);

  // If there's a filter active we paginate client-side over the filtered results
  const totalPages = filter
    ? Math.max(1, Math.ceil(filtered.length / pageSize))
    : meta?.totalPages ?? Math.max(1, Math.ceil(filtered.length / pageSize));

  const paginated = filter
    ? filtered.slice((page - 1) * pageSize, page * pageSize)
    : meta
    ? products
    : filtered.slice((page - 1) * pageSize, page * pageSize);

  const getProductsData = () =>
    filtered.map((p) => ({
      Nombre: p.name,
      SKU: p.sku,
      Precio: (p as any).price,
      Costo: (p as any).cost,
      Stock: (p as any).stock,
      FechaEntrada: (p as any).entryDate ?? "",
      FechaExpiracion: (p as any).expiresAt ?? "",
      Descripción: (p as any).description ?? "",
      Categoría: (p as any).category ?? "",
      Imagen: (p as any).imageUrl ?? "",
    }));

  // Fetch all matching products from the API, paginated with limit <= 100
  const fetchAllProducts = async (term?: string) => {
    const perPage = 100;
    const maxPages = 10; // safety cap: 1000 items max
    let p = 1;
    const acc: Product[] = [];
    while (p <= maxPages) {
      const res = await fetchProductsPage({ page: p, limit: perPage, search: term, companyId: company?.id });
      const data = Array.isArray(res?.data) ? res.data.map(normalizeProduct) : [];
      acc.push(...data);
      const totalPages = res?.meta?.totalPages ?? 1;
      if (p >= totalPages) break;
      p += 1;
    }
    return acc;
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
      entryDate: "",
      expiresAt: "",
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
      entryDate: (p as any).entryDate ? new Date((p as any).entryDate).toISOString().slice(0,16) : "",
      expiresAt: (p as any).expiresAt ? new Date((p as any).expiresAt).toISOString().slice(0,16) : "",
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
    // Final server-side guard to avoid race conditions
    // Final server-side guard to avoid race conditions (SKU)
    try {
      const skuName = await checkSkuServer();
      if (skuName) {
        setFormAlert({ level: "error", message: `El SKU "${form.sku}" ya existe en el producto: ${skuName}. Por favor usa un SKU diferente.` });
        return;
      }
    } catch (err) {
      // if server check fails, fallback to local detection
      if (duplicateSku) {
        setFormAlert({ level: "error", message: `El SKU "${form.sku}" ya existe en el producto: ${duplicateSku.name}. Por favor usa un SKU diferente.` });
        return;
      }
    }

    // build FormData now so we can cache it if name confirmation is required
    const fd = new FormData();
    fd.append("name", String(form.name));
    fd.append("sku", String(form.sku));
    fd.append("price", String(form.price ?? ""));
    fd.append("cost", String(form.cost ?? ""));
    fd.append("stock", String(form.stock ?? "0"));
    if (form.entryDate) {
      // form.entryDate stored as datetime-local (YYYY-MM-DDTHH:mm) — convert to ISO
      try {
        const iso = new Date(form.entryDate).toISOString();
        fd.append("entryDate", iso);
      } catch (e) {
        fd.append("entryDate", String(form.entryDate));
      }
    }
    if (form.expiresAt) {
      try {
        const iso2 = new Date(form.expiresAt).toISOString();
        fd.append("expiresAt", iso2);
      } catch (e) {
        fd.append("expiresAt", String(form.expiresAt));
      }
    }
    fd.append("description", form.description ?? "");
    fd.append("category", form.category ?? "");

    if (localImageFile) fd.append("image", localImageFile);
    else if (form.imageUrl) fd.append("imageUrl", form.imageUrl);
    // Check name on server and, if exists, show in-panel warning with actions
    try {
      const nameFound = await checkNameServer();
      if (nameFound) {
        // cache FormData and show a warning alert with Confirm/Cancel
        setCachedFd(fd);
        setAwaitingConfirm(true);
        setFormAlert({ level: "warning", message: `El nombre "${form.name}" ya existe en el catálogo (producto: ${nameFound}). ¿Deseas continuar de todos modos?` });
        return;
      }
    } catch (err) {
      // ignore server name check errors (we'll rely on client-side warning)
    }

    // proceed with actual submit
    await submitWithFd(fd);
  };

  const submitWithFd = async (fd: FormData | null) => {
    if (!fd) return;
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

        await loadProducts({ page, limit: pageSize, search: filter || undefined, companyId: company?.id });
        await refreshServerTotal();
      setShowPanel(false);
      setLocalImageFile(null);
      setPreviewUrl(null);
      setFormAlert(null);
      setAwaitingConfirm(false);
      setCachedFd(null);
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
        await loadProducts({ page, limit: pageSize, search: filter || undefined, companyId: company?.id });
        await refreshServerTotal();
        setShowPanel(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Local fallback calculation (used when server total isn't available)
  const calcLocalTotal = () =>
    products.reduce((acc, product) => {
      const price = Number((product as any).price) || 0;
      const stock = Number((product as any).stock) || 0;
      return acc + price * stock;
    }, 0);

  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [serverTotalError, setServerTotalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadTotal = async () => {
      try {
        const total = await fetchTotalInventoryValue(company?.id);
        if (!cancelled) {
          setServerTotal(typeof total === "number" ? total : Number(total) || 0);
          setServerTotalError(null);
        }
      } catch (err: any) {
        console.warn("fetchTotalInventoryValue failed", err);
        if (!cancelled) {
          setServerTotal(null);
          // surface permission errors separately
          const status = err?.response?.status;
          if (status === 403 || status === 401) setServerTotalError("No autorizado para ver el total global");
          else setServerTotalError(null);
        }
      }
    };
    loadTotal();
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  const refreshServerTotal = async () => {
    try {
      const total = await fetchTotalInventoryValue(company?.id);
      setServerTotal(typeof total === "number" ? total : Number(total) || 0);
      setServerTotalError(null);
    } catch (err: any) {
      console.warn("refreshServerTotal failed", err);
      setServerTotal(null);
      const status = err?.response?.status;
      if (status === 403 || status === 401) setServerTotalError("No autorizado para ver el total global");
      else setServerTotalError(null);
    }
  };

  return (
    <div className="relative p-6 bg-[#fffbeb]">
      <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        Valor total en inventario:
        <span style={{ color: "#27ae60", marginLeft: 8 }}>
          {(serverTotal !== null ? serverTotal : calcLocalTotal()).toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
          })}
        </span>
        {serverTotalError && <span style={{ color: "#c2410c", marginLeft: 12, fontSize: 12 }}>{serverTotalError}</span>}
      </h3>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          onClick={async () => {
            try {
              setSearching(true);
              // quick head request to estimate total and ask confirmation for large exports
              const head = await fetchProductsPage({ page: 1, limit: 100, search: filter || undefined, companyId: company?.id });
              const totalPagesHead = head?.meta?.totalPages ?? 1;
              const estimatedTotal = totalPagesHead * 100;
              if (estimatedTotal > 700) {
                const ok = window.confirm(`Se van a exportar aproximadamente ${estimatedTotal} productos. Esto puede tardar y generar un archivo grande. ¿Deseas continuar?`);
                if (!ok) {
                  setSearching(false);
                  return;
                }
              }

              const all = await fetchAllProducts(filter || undefined);
              const csv = Papa.unparse(
                all.map((p) => ({
                  Nombre: p.name,
                  SKU: p.sku,
                  Precio: (p as any).price,
                  Costo: (p as any).cost,
                  Stock: (p as any).stock,
                  Descripción: (p as any).description ?? "",
                  Categoría: (p as any).category ?? "",
                  Imagen: (p as any).imageUrl ?? "",
                }))
              );
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              saveAs(blob, "productos.csv");
            } catch (err) {
              console.error("Export CSV failed", err);
            } finally {
              setSearching(false);
            }
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1.5 text-sm"
        >
          Exportar CSV
        </button>
        <button
          onClick={async () => {
            try {
              setSearching(true);
              // quick head request to estimate total and ask confirmation for large exports
              const head = await fetchProductsPage({ page: 1, limit: 100, search: filter || undefined, companyId: company?.id });
              const totalPagesHead = head?.meta?.totalPages ?? 1;
              const estimatedTotal = totalPagesHead * 100;
              if (estimatedTotal > 700) {
                const ok = window.confirm(`Se van a exportar aproximadamente ${estimatedTotal} productos. Esto puede tardar y generar un archivo grande. ¿Deseas continuar?`);
                if (!ok) {
                  setSearching(false);
                  return;
                }
              }

              const all = await fetchAllProducts(filter || undefined);
              const ws = XLSX.utils.json_to_sheet(
                all.map((p) => ({
                  Nombre: p.name,
                  SKU: p.sku,
                  Precio: (p as any).price,
                  Costo: (p as any).cost,
                  Stock: (p as any).stock,
                  Descripción: (p as any).description ?? "",
                  Categoría: (p as any).category ?? "",
                  Imagen: (p as any).imageUrl ?? "",
                }))
              );
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Productos");
              XLSX.writeFile(wb, "productos.xlsx");
            } catch (err) {
              console.error("Export Excel failed", err);
            } finally {
              setSearching(false);
            }
          }}
          className="bg-green-500 hover:bg-green-600 text-white rounded px-3 py-1.5 text-sm"
        >
          Exportar Excel
        </button>
        <input
          type="text"
          placeholder="Buscar por nombre o SKU…"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
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
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
            >
              Anterior
            </button>
            <span className="text-sm">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
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
                {formAlert && (
                  <div className={`p-3 rounded border ${formAlert.level === "error" ? "bg-red-50 border-red-100 text-red-800" : "bg-amber-50 border-amber-100 text-amber-800"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm">{formAlert.message}</div>
                      <div className="flex items-center gap-2">
                        {formAlert.level === "warning" && awaitingConfirm ? (
                          <>
                            <button type="button" onClick={() => { setFormAlert(null); setAwaitingConfirm(false); setCachedFd(null); }} className="px-2 py-1 bg-white border rounded text-sm">Cancelar</button>
                            <button type="button" onClick={async () => { await submitWithFd(cachedFd); }} className="px-3 py-1 bg-amber-600 text-white rounded text-sm">Continuar</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setFormAlert(null)} className="px-2 py-1 bg-white border rounded text-sm">Cerrar</button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Nombre</label>
                    <input name="name" type="text" value={form.name} onChange={handleChange} required className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm" />
                    {duplicateName && (
                      <div className="mt-1 text-xs text-amber-800 bg-amber-50 border border-amber-100 p-2 rounded">
                        Nombre duplicado: ya existe el producto «{duplicateName}». Esta es solo una advertencia.
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Código</label>
                    <input name="sku" type="text" value={form.sku} onChange={handleChange} required className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm" />
                    {duplicateSku && (
                      <div className="mt-1 text-xs text-red-700 bg-red-50 border border-red-100 p-2 rounded">
                        SKU duplicado: ya existe en el producto «{duplicateSku.name}».
                      </div>
                    )}
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

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Fecha de entrada</label>
                    <input
                      name="entryDate"
                      type="datetime-local"
                      value={form.entryDate}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-[#973c00]">Fecha de expiración</label>
                    <input
                      name="expiresAt"
                      type="datetime-local"
                      value={form.expiresAt}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-[#fef3c6] rounded bg-white text-sm"
                    />
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
                  <button type="submit" disabled={uploading || !!duplicateSku || formAlert?.level === "error"} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm">
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