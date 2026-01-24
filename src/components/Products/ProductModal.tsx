import { Product } from "context/ProductsContext";
import React, { useEffect, useState } from "react";
import api from "services/api";
import { OrderItemPayload } from "types";


interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: OrderItemPayload) => void;
}

export default function ProductModal({ isOpen, onClose, onAdd }: Props) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.get("/products").then(res => setProducts(res.data));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
      <div className="bg-white p-6 rounded-lg w-full max-w-xl shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-[#973c00]">🛒 Seleccionar producto</h2>
        <ul className="space-y-3 max-h-80 overflow-y-auto">
          {products.map(product => (
            <li key={product.id} className="border p-3 rounded flex justify-between items-center">
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-gray-500">Stock: {product.stock}</p>
              </div>
              <button
                onClick={() => onAdd({ productId: product.id, quantity: 1 })}
                className="bg-[#fe9a00] text-white px-3 py-1 rounded text-sm"
              >
                Agregar
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-600 hover:underline"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}