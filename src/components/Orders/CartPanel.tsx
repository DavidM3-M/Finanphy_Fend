import React, { useState } from "react";
import { useCart } from "context/CartContext";

export default function CartPanel() {
  const { items, open, toggleOpen, updateQuantity, removeItem, createOrder, adding, companyId } = useCart();
  const [notes, setNotes] = useState("");
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);

  const handleSendOrder = async () => {
    try {
      // createOrder en el contexto ya construye el payload { companyId, items: [{ productId, quantity }] }
      await createOrder({ description: notes });
      // feedback simple — adapta a tu modal/UX
      alert("Orden enviada correctamente");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error enviando orden");
    }
  };

  return (
    <aside
      aria-hidden={!open}
      className={`fixed right-4 top-16 w-96 bg-white shadow-lg rounded p-4 z-50 transform transition-transform ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold">Carrito</h4>
        <button onClick={() => toggleOpen(false)} className="text-sm">Cerrar</button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500">Carrito vacío</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.productId} className="flex items-center gap-3">
              <img src={it.image || "/images/placeholder-product.png"} alt={it.name} className="w-12 h-12 object-cover rounded" />
              <div className="flex-1">
                <div className="text-sm font-medium">{it.name}</div>
                <div className="text-xs text-gray-500">${it.price.toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(it.productId, it.quantity - 1)} className="px-2">-</button>
                <span>{it.quantity}</span>
                <button onClick={() => updateQuantity(it.productId, it.quantity + 1)} className="px-2">+</button>
              </div>
              <button onClick={() => removeItem(it.productId)} className="text-red-500 text-xs ml-2">Eliminar</button>
            </div>
          ))}

          <div className="border-t pt-3">
            <label className="text-xs text-gray-500">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" rows={2} />

            <div className="flex justify-between items-center mt-3">
              <div>
                <div className="text-sm text-gray-500">Subtotal</div>
                <div className="font-semibold">${subtotal.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Empresa: {companyId ?? "—"}</div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSendOrder}
                  disabled={adding}
                  className="px-3 py-1 bg-emerald-600 text-white rounded text-sm"
                >
                  {adding ? "Enviando..." : "Enviar orden"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}