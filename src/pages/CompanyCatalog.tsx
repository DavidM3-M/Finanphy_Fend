import React, { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { useProducts } from "../context/ProductsContext";
import { useCart } from "../context/CartContext";

/* ---------- Config (ajusta según tu infra) ---------- */
const INLINE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#fff"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" fill="#973c00" font-size="14">Sin imagen</text></svg>`
  );

const getApiBase = () => {
  const raw = process.env.REACT_APP_API_URL || "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};

// Ajusta si tus assets están en otro host (CDN/S3/CloudFront)
const ASSET_BASE = (() => {
  const apiBase = getApiBase();
  return apiBase ? `${apiBase}/uploads/` : "/uploads/";
})();

const PLACEHOLDER = INLINE_PLACEHOLDER;

/* ---------- Utilidades ---------- */
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, { method: "HEAD", mode: "cors", cache: "no-cache" });
    if (head.ok) {
      const ct = head.headers.get("content-type") || "";
      return ct.startsWith("image/");
    }
    const get = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
    if (!get.ok) return false;
    const ct = get.headers.get("content-type") || "";
    return ct.startsWith("image/");
  } catch (err) {
    console.warn("validateImageUrl error", url, err);
    return false;
  }
}

function buildImageCandidate(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw);
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${getApiBase()}${s}`;
  return `${ASSET_BASE}${s}`;
}

/* ---------- Componente (catálogo público) ---------- */
export default function CompanyCatalog() {
  const { products, loading, error, companyId } = useProducts();
  const { addItem } = useCart();
  const [lightbox, setLightbox] = useState<{ src: string; name?: string } | null>(null);

  // resolved map: productId -> valid URL or null (use placeholder)
  const [resolved, setResolved] = useState<Record<string, string | null>>({});

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
          if (!raw) {
            updates[id] = null;
            return;
          }
          const candidate = buildImageCandidate(String(raw));
          if (!candidate) {
            updates[id] = null;
            return;
          }
          // Validate candidate; if invalid try cache-bust; otherwise null
          const ok = await validateImageUrl(candidate);
          if (ok) { updates[id] = candidate; return; }
          const busted = `${candidate}${candidate.includes("?") ? "&" : "?"}_t=${Date.now()}`;
          const ok2 = await validateImageUrl(busted);
          updates[id] = ok2 ? busted : null;
        })
      );
      if (mounted) setResolved((prev) => ({ ...prev, ...updates }));
    })();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  if (!companyId || typeof companyId !== "string") {
    console.warn("⚠️ companyId aún no está listo:", companyId);
    return (
      <div className="p-6 text-center text-gray-500">
        Cargando empresa...
      </div>
    );
  }

  const url = `https://finanphy.vercel.app/catalogo/${companyId}`;

  const priceFormat = (value: number | string | undefined) => {
    const num = typeof value === "number" ? value : Number(value || 0);
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-[#fef3c6] bg-[#fffbeb]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ffb900] rounded-lg">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-[#973c00] text-2xl font-bold">Finanphy</h2>
              <p className="text-[#bb4d00] text-xs font-medium">Catálogo público</p>
            </div>
          </div>

          <div className="text-sm text-gray-700">
            <p className="text-right">Compartir:</p>
            <a className="text-[#ffb900] underline break-all" href={url} target="_blank" rel="noreferrer">{url}</a>
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="p-6">
        {loading ? (
          <p className="text-center text-gray-500">Cargando productos...</p>
        ) : error ? (
          <p className="text-center text-red-500">Error: {error}</p>
        ) : products.length === 0 ? (
          <p className="text-center text-gray-500">Esta empresa no tiene productos públicos</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p: any) => {
              const id = String(p.id);
              const raw = p.imageUrl || p.image || (Array.isArray(p.images) ? p.images[0] : null) || p.media?.[0]?.url || null;
              const resolvedUrl = resolved[id] ?? null;
              const img = resolvedUrl ?? (raw && (String(raw).startsWith("http://") || String(raw).startsWith("https://")) ? String(raw) : null) ?? PLACEHOLDER;
              const alt = p.name ? `Imagen de ${p.name}` : "Imagen de producto";

              return (
                <article key={id} className="border rounded-lg overflow-hidden shadow-sm bg-white">
                  <div className="w-full h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img
                      src={img}
                      alt={alt}
                      loading="lazy"
                      crossOrigin="anonymous"
                      onClick={() => { if (img !== PLACEHOLDER) setLightbox({ src: img, name: p.name }); }}
                      onError={(e) => {
                        const t = e.currentTarget as HTMLImageElement;
                        console.warn("Imagen catálogo fallida:", t.src, "productId:", id);
                        t.onerror = null;
                        try {
                          const src = t.src || "";
                          t.src = src.includes("?") ? `${src}&_t=${Date.now()}` : `${src}?_t=${Date.now()}`;
                        } catch {
                          t.src = PLACEHOLDER;
                        }
                        setTimeout(() => { if (t.src && t.src !== PLACEHOLDER && !t.complete) t.src = PLACEHOLDER; }, 1500);
                      }}
                      className="w-full h-full object-cover cursor-zoom-in"
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-sm text-slate-900 truncate">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">SKU: {p.sku ?? "—"}</p>

                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <div className="text-green-700 font-bold text-lg">${priceFormat(p.price)}</div>
                        <div className="text-xs text-gray-500">Disponibles: {p.stock ?? 0}</div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addItem(p, 1);
                          }}
                          className="px-3 py-1 rounded-md bg-[#ffb900] text-white text-xs"
                        >
                          Añadir
                        </button>
                      </div>
                    </div>

                    {p.description && (
                      <p className="mt-3 text-xs text-slate-600 line-clamp-3">{p.description}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox modal */}
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
    </>
  );
}