// src/components/CartButton.tsx
import React, { useEffect, useState } from "react";
import { useCart } from "context/CartContext";

declare global {
  interface Window { __CartButtonMounted?: boolean; }
}

export default function CartButton() {
  const { items, toggleOpen } = useCart();
  const count = Array.isArray(items) ? items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    // Marca la primera instancia como primaria
    if (!window.__CartButtonMounted) {
      window.__CartButtonMounted = true;
      setIsPrimary(true);
    } else {
      setIsPrimary(false);
    }
    // cleanup: si el botón se desmonta, permitir que otra lo reemplace
    return () => {
      if (isPrimary) {
        window.__CartButtonMounted = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isPrimary) return null;

  return (
    <button
      onClick={() => toggleOpen(true)}
      aria-label="Abrir carrito"
      className="relative px-3 py-1 bg-amber-500 text-white rounded inline-flex items-center gap-2 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
      type="button"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>

      <span className="text-sm">Carrito</span>

      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 rounded-full w-5 h-5 text-xs flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}