// src/pages/CompanyCatalog.tsx
import React, { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useProducts } from "../context/ProductsContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import { Product } from "../types";

/* Placeholder inline SVG */
const INLINE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#fff"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" fill="#973c00" font-size="14">Sin imagen</text></svg>`
  );
const PLACEHOLDER = INLINE_PLACEHOLDER;

const getApiBase = () => {
  const raw = process.env.REACT_APP_API_URL || "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};
const ASSET_BASE = (() => {
  const apiBase = getApiBase();
  return apiBase ? `${apiBase}/uploads/` : "/uploads/";
})();

/* simple GET-based image check */
async function isImageUrl(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });
    if (!resp.ok) return false;
    const ct = resp.headers.get("content-type") || "";
    return ct.startsWith("image/");
  } catch {
    return false;
  }
}

function buildImageCandidate(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return `${getApiBase()}${s}`;
  return `${ASSET_BASE}${s}`;
}

export default function CompanyCatalog() {
  const { products, loading, error, companyId } = useProducts();
  // useCart provides toggleOpen, items and addItem
  const { addItem, items, toggleOpen } = useCart();
  const [resolved, setResolved] = useState<Record<string, string | null>>({});
  const [companyInfo, setCompanyInfo] = useState<{ tradeName?: string; companyEmail?: string; companyPhone?: string } | null>(null);
  const [query, setQuery] = useState("");
  const [lightbox, setLightbox] = useState<{ src: string; name?: string } | null>(null);

  // fetch explicit company info
  useEffect(() => {
    let mounted = true;
    if (!companyId) return;
    (async () => {
      try {
        const res = await api.get(`/companies/${companyId}`);
        if (!mounted) return;
        const d = res.data ?? res;
        setCompanyInfo({
          tradeName: d.tradeName ?? d.data?.tradeName,
          companyEmail: d.companyEmail ?? d.data?.companyEmail,
          companyPhone: d.companyPhone ?? d.data?.companyPhone,
        });
      } catch (err) {
        console.warn("No se pudo obtener company info:", err);
      }
    })();
    return () => { mounted = false; };
  }, [companyId]);

  // resolve images in background
  useEffect(() => {
    let mounted = true;
    if (!products || products.length === 0) return;

    (async () => {
      const updates: Record<string, string | null> = {};
      await Promise.all(
        products.map(async (p: any) => {
          const id = String(p.id);
          if (resolved[id] !== undefined) return;
          const raw = p.imageUrl || p.image || (Array.isArray(p.images) ? p.images[0] : null) || p.media?.[0]?.url || null;
          if (!raw) { updates[id] = null; return; }
          const candidate = buildImageCandidate(String(raw));
          if (!candidate) { updates[id] = null; return; }
          if (await isImageUrl(candidate)) { updates[id] = candidate; return; }
          try {
            const busted = `${candidate}${candidate.includes("?") ? "&" : "?"}_t=${Date.now()}`;
            if (await isImageUrl(busted)) { updates[id] = busted; return; }
          } catch {}
          updates[id] = null;
        })
      );
      if (mounted) setResolved((prev) => ({ ...prev, ...updates }));
    })();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  if (!companyId || typeof companyId !== "string") {
    return <div className="p-6 text-center text-gray-500">Cargando empresa...</div>;
  }

  const shareUrl = `https://finanphy.vercel.app/catalogo/${companyId}`;

  const handleAdd = (p: Product) => {
    const productForCart = { ...p, companyId: p.companyId ?? companyId } as Product & { companyId: string };
    addItem(productForCart, 1);
    toast.success?.(`${p.name} añadido al carrito`);
  };

  const filtered = products?.filter((p: any) =>
    p.name.toLowerCase().includes(query.toLowerCase()) || String(p.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const totalCount = Array.isArray(items) ? items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;

  return (
    <main className="min-h-screen bg-[#fffbeb] p-6">
      <Toaster position="top-right" />

      <header className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#ffb900] rounded-lg"><LayoutDashboard className="w-7 h-7 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{companyInfo?.tradeName ?? "Catálogo"}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Contacto: <span className="font-medium text-slate-700">{companyInfo?.companyPhone ?? "—"}</span>
              {" · "}
              Email: {companyInfo?.companyEmail ? (<a className="text-emerald-600 underline" href={`mailto:${companyInfo.companyEmail}`}>{companyInfo.companyEmail}</a>) : (<span className="text-slate-500">—</span>)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full md:w-64 px-3 py-2 rounded border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
            aria-label="Buscar productos"
          />
          <div className="ml-4 text-sm text-slate-700 hidden md:block">
            Artículos en carrito: <span className="font-semibold">{totalCount}</span>
          </div>

          {/* ÚNICO botón de carrito local y determinista */}
          <div>
            <button
              type="button"
              onClick={() => toggleOpen(true)}
              aria-label="Abrir carrito"
              className="relative px-3 py-1 bg-amber-500 text-white rounded inline-flex items-center gap-2 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>

              <span className="text-sm">Carrito</span>

              {totalCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {totalCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <section>
        {loading ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <article key={i} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse p-4">
                <div className="w-full h-44 bg-gray-100 rounded mb-4" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="flex justify-between items-center">
                  <div className="h-8 bg-gray-100 rounded w-24" />
                  <div className="h-8 bg-gray-100 rounded w-20" />
                </div>
              </article>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">Error: {String(error)}</div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No hay productos públicos</div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p: any) => {
              const id = String(p.id);
              const raw = p.imageUrl || p.image || (Array.isArray(p.images) ? p.images[0] : null) || p.media?.[0]?.url || null;
              const resolvedUrl = resolved[id];
              const isAbsoluteRaw = raw && /^https?:\/\//i.test(String(raw));
              const img = resolvedUrl !== undefined ? (resolvedUrl ?? PLACEHOLDER) : isAbsoluteRaw ? String(raw) : PLACEHOLDER;
              const alt = p.name ? `Imagen de ${p.name}` : "Imagen de producto";

              return (
                <article key={id} className="bg-white rounded-lg shadow-sm overflow-hidden transform transition hover:shadow-md hover:-translate-y-1 group">
                  <div className="relative w-full h-44 overflow-hidden bg-gray-50">
                    <img
                      src={img}
                      alt={alt}
                      loading="lazy"
                      crossOrigin="anonymous"
                      onClick={() => { if (img !== PLACEHOLDER) setLightbox({ src: img, name: p.name }); }}
                      onError={(e) => {
                        const t = e.currentTarget as HTMLImageElement;
                        t.onerror = null;
                        try {
                          const src = t.src || "";
                          t.src = src.includes("?") ? `${src}&_t=${Date.now()}` : `${src}?_t=${Date.now()}`;
                        } catch {
                          t.src = PLACEHOLDER;
                        }
                        setTimeout(() => { if (t.src && t.src !== PLACEHOLDER && !t.complete) t.src = PLACEHOLDER; }, 1500);
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                    />

                    {p.stock === 0 && <span className="absolute top-3 right-3 px-2 py-0.5 text-xs rounded-full bg-slate-400 text-white">Agotado</span>}
                    {p.isActive === false && <span className="absolute top-3 left-3 px-2 py-0.5 text-xs rounded-full bg-amber-500 text-white">Privado</span>}
                    {p.createdAt && (Date.now() - new Date(p.createdAt).getTime() < 1000 * 60 * 60 * 24 * 30) && (
                      <span className="absolute bottom-3 left-3 px-2 py-0.5 text-xs rounded-full bg-amber-500 text-white font-semibold">Nuevo</span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-medium text-slate-800 line-clamp-2">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{String(p.description ?? "").slice(0, 120)}</p>

                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-emerald-600">${priceFormat(p.price)}</div>
                        {p.cost && <div className="text-xs line-through text-slate-400">${priceFormat(p.cost)}</div>}
                      </div>

                      <div className="flex flex-col items-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAdd(p as Product); }}
                          disabled={!p.isActive || p.stock === 0}
                          className="px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm"
                          aria-label={`Añadir ${p.name} al carrito`}
                        >
                          Añadir
                        </button>
                        <div className="text-xs text-slate-400 mt-2">{p.stock != null ? `${p.stock} disponibles` : "—"}</div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-3xl w-full bg-white rounded-lg overflow-hidden shadow-lg">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="text-sm font-medium">{lightbox.name ?? "Imagen"}</div>
              <button onClick={() => setLightbox(null)} className="text-sm px-3 py-1 rounded bg-slate-100">Cerrar</button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-auto">
              <img src={lightbox.src} alt={lightbox.name ?? "Imagen"} className="max-h-[75vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* helper local */
function priceFormat(value: number | string | undefined) {
  const num = typeof value === "number" ? value : Number(value || 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}