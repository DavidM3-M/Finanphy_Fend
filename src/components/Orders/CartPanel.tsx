// src/components/CartPanel.tsx
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useCart } from "context/CartContext";

export default function CartPanel() {
  const { items, open, toggleOpen, updateQuantity, removeItem, createOrder, adding, companyId } = useCart();
  const [notes, setNotes] = useState("");
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (it.quantity || 0), 0);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return;
  }, [open]);

  // Focus management: focus close button when opens
  useEffect(() => {
    if (open && panelRef.current) {
      const closeBtn = panelRef.current.querySelector<HTMLButtonElement>("[data-cart-close]");
      closeBtn?.focus();
    }
  }, [open]);

  const handleSendOrder = async () => {
    try {
      // createOrder should return useful info: { order, orderCode } or order object
      const result: any = await createOrder({ description: notes });

      // intentar extraer código generado por frontend o devuelto por backend
      const code =
        result?.orderCode ??
        result?.order?.clientReference ??
        result?.order?.client_reference ??
        result?.order?.reference ??
        result?.order?.id ??
        result?.clientReference ??
        result?.data?.clientReference ??
        result?.data?.reference ??
        result?.data?.id ??
        null;

      // Mostrar toast claro y amable; si hay código lo incluimos en el mensaje
      if (code) {
        setOrderCode(String(code));
        toast.success(`Envío realizado — Código: ${String(code)}`, { duration: 6000 });
      } else {
        toast.success("Envío realizado", { duration: 4000 });
      }

      // limpiar UI y cerrar panel
      setNotes("");
      toggleOpen(false);

      // opcional: mostrar modal con el código (si quieres conservarlo)
      if (code) {
        setShowOrderModal(true);
      }
    } catch (err: any) {
      console.error("Error creando orden:", err);
      const msg = err?.response?.data?.message ?? err?.message ?? "Error enviando orden";
      toast.error(msg);
      // no cerrar el panel para permitir corrección
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => toggleOpen(false)}
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Panel del carrito"
        className={`
          fixed z-[70] right-4 top-16 bg-white shadow-lg rounded p-4
          transform transition-all duration-300 ease-out
          md:translate-x-0 md:w-96

          /* Mobile: bottom sheet style */
          left-0 right-0 bottom-0 top-auto rounded-t-xl
          md:top-16 md:bottom-auto md:left-auto md:right-4 md:rounded-lg
          max-h-[85vh] overflow-auto
        `}
        style={{
          width: window.innerWidth < 768 ? "100%" : undefined,
          margin: window.innerWidth < 768 ? 0 : undefined,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-lg">Carrito</h4>
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-500 mr-2 hidden md:block">{items.length} artículo(s)</div>
            <button
              data-cart-close
              onClick={() => toggleOpen(false)}
              className="px-3 py-1 rounded-md text-sm bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              Cerrar
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-gray-500 py-8 text-center">Carrito vacío</div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.productId} className="flex items-center gap-3">
                <img
                  src={it.image || "/images/placeholder-product.png"}
                  alt={it.name}
                  className="w-14 h-14 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{it.name}</div>
                  <div className="text-xs text-gray-500">${Number(it.price).toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(it.productId, Math.max(1, it.quantity - 1))}
                    className="p-2 rounded-md bg-slate-100 hover:bg-slate-200 focus:outline-none"
                    aria-label={`Disminuir cantidad de ${it.name}`}
                  >
                    −
                  </button>

                  <div className="px-2 text-sm">{it.quantity}</div>

                  <button
                    onClick={() => updateQuantity(it.productId, it.quantity + 1)}
                    className="p-2 rounded-md bg-slate-100 hover:bg-slate-200 focus:outline-none"
                    aria-label={`Aumentar cantidad de ${it.name}`}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => removeItem(it.productId)}
                  className="ml-2 text-red-500 text-xs px-2 py-1 rounded hover:bg-red-50 focus:outline-none"
                  aria-label={`Eliminar ${it.name}`}
                >
                  Eliminar
                </button>
              </div>
            ))}

            <div className="border-t pt-3">
              <label className="text-xs text-gray-500">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mt-1 p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                rows={3}
                placeholder="Instrucciones para la orden"
              />

              <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-3 gap-3">
                <div>
                  <div className="text-sm text-gray-500">Subtotal</div>
                  <div className="font-semibold">${subtotal.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1">Empresa: {companyId ?? "—"}</div>
                </div>

                <div className="flex flex-col w-full md:w-auto">
                  <button
                    onClick={handleSendOrder}
                    disabled={adding}
                    className="w-full md:w-auto px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    {adding ? "Enviando..." : "Enviar orden"}
                  </button>

                  <button
                    onClick={() => toggleOpen(false)}
                    className="mt-2 md:mt-3 w-full md:w-auto px-3 py-2 bg-slate-100 rounded text-sm hover:bg-slate-200 focus:outline-none"
                  >
                    Seguir comprando
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Modal con código de orden (opcional) */}
      {showOrderModal && orderCode && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Orden creada</h3>
            <p className="text-sm text-slate-600 mb-4">Código de la orden:</p>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="rounded-md bg-slate-100 px-3 py-2 text-sm font-mono break-all">{orderCode}</div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(orderCode);
                  toast.success("Copiado al portapapeles");
                }}
                className="px-3 py-2 bg-amber-500 text-white rounded"
              >
                Copiar
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setOrderCode(null);
                }}
                className="px-3 py-2 rounded bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}