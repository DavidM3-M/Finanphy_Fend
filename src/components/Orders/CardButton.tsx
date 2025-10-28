import { useCart } from "context/CartContext";
import React from "react";


export default function CartButton() {
  const { items, toggleOpen } = useCart();
  const count = items.reduce((s, it) => s + it.quantity, 0);

  return (
    <button
      onClick={() => toggleOpen(true)}
      aria-label="Abrir carrito"
      className="relative px-3 py-1 bg-amber-500 text-white rounded inline-flex items-center gap-2"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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