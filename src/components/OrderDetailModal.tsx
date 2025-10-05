import React from "react";
import { Order } from "../types";

interface Props {
  order: Order | null;
  onClose: () => void;
}

// Extensión local del tipo para evitar error TS
interface ExtendedOrder extends Order {
  description?: string;
}

export default function OrderDetailModal({ order, onClose }: Props) {
  if (!order) return null;

  const extendedOrder = order as ExtendedOrder;

  const total = order.items.reduce((sum, item) => {
    const subtotal = parseFloat(item.unitPrice) * item.quantity;
    return sum + subtotal;
  }, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-xl transform transition-all duration-300 scale-100 translate-y-0 animate-fade-in">
        <h2 className="text-xl font-bold mb-6 text-[#973c00]">📄 Detalle de orden</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* 🛒 Productos */}
          <div>
            <h3 className="font-semibold mb-2">🛒 Productos</h3>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {order.items.map(item => (
                <li key={item.id} className="border p-3 rounded">
                  <p className="font-semibold">{item.product.name}</p>
                  <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                  <p className="text-sm text-gray-600">Precio unitario: COP {item.unitPrice}</p>
                  <p className="text-sm text-gray-600">
                    Subtotal: COP {(parseFloat(item.unitPrice) * item.quantity).toLocaleString("es-CO")}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* 📌 Detalles adicionales */}
          <div className="bg-yellow-50 p-4 rounded-lg shadow-inner">
            <div className="space-y-2 mb-4">
              <p><strong>Código:</strong> {order.orderCode}</p>
              <p><strong>Estado:</strong> {order.status}</p>
              <p><strong>Fecha:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
              <p><strong>Cliente:</strong> {order.user?.firstName} {order.user?.lastName}</p>
              <p><strong>Empresa:</strong> {order.company.tradeName}</p>
              {extendedOrder.description && (
                <p><strong>Descripción:</strong> {extendedOrder.description}</p>
              )}
            </div>

            <div className="text-right font-bold text-[#973c00]">
              Total: COP {total.toLocaleString("es-CO")}
            </div>
          </div>
        </div>

        <div className="text-right mt-6">
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:underline"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}