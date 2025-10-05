import React, { useEffect, useState } from "react";
import { createOrder } from "../services/clientOrders";
import { getProducts } from "../services/products";
import { Product } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onCreated: () => void;
}

export default function OrderModal({ isOpen, onClose, companyId, onCreated }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<{ product: Product; quantity: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getProducts().then(setProducts);
      setSelected([]);
      setSearchTerm("");
      setDescription("");
    }
  }, [isOpen]);

  const handleAdd = (product: Product) => {
    if (selected.find(i => i.product.id === product.id)) return;
    setSelected([...selected, { product, quantity: 1 }]);
  };

  const handleQuantityChange = (index: number, value: number) => {
    const updated = [...selected];
    const max = updated[index].product.stock;
    updated[index].quantity = Math.min(Math.max(1, value), max);
    setSelected(updated);
  };

  const handleRemove = (index: number) => {
    const updated = [...selected];
    updated.splice(index, 1);
    setSelected(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const items = selected.map(i => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));
      // description no se envía al backend
      await createOrder({ companyId, items });
      onCreated();
      onClose();
    } catch (err) {
      console.error("Error al crear orden:", err);
    } finally {
      setLoading(false);
    }
  };

  const total = selected.reduce(
    (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl shadow-xl max-h-screen flex flex-col">
        {/* Encabezado */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-[#973c00] mb-4">📝 Crear orden</h2>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción de la orden
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full border rounded px-3 py-2"
              placeholder="Ej. Pedido urgente para cliente VIP"
            />
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="grid grid-cols-2 gap-6 px-6 py-4 overflow-hidden flex-grow">
          {/* 🧱 Panel izquierdo: productos */}
          <div className="overflow-y-auto pr-2">
            <h3 className="font-semibold mb-4">🧱 Productos</h3>

            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border px-3 py-2 rounded mb-4 w-full"
            />

            <div className="grid grid-cols-2 gap-4">
              {products
                .filter(p =>
                  p.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(product => (
                  <div
                    key={product.id}
                    className="border p-4 rounded shadow hover:shadow-lg cursor-pointer"
                    onClick={() => handleAdd(product)}
                  >
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-gray-600">Precio: COP {product.price}</p>
                    <p className="text-sm text-gray-600">Stock: {product.stock}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* 🛒 Panel derecho: selección */}
          <div className="bg-yellow-50 p-4 rounded-lg shadow-inner overflow-y-auto">
            <h3 className="font-semibold mb-4">🛒 Selección</h3>
            {selected.length === 0 ? (
              <p className="text-gray-500">No has seleccionado productos.</p>
            ) : (
              <ul className="space-y-4">
                {selected.map((item, index) => (
                  <li key={item.product.id} className="border p-4 rounded shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-gray-600">
                          Precio unitario: COP {item.product.price}
                        </p>
                        <p className="text-sm text-gray-600">
                          Stock disponible: {item.product.stock}
                        </p>
                        <input
                          type="number"
                          min={1}
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={e =>
                            handleQuantityChange(index, Number(e.target.value))
                          }
                          className="border px-2 py-1 rounded mt-2 w-20"
                        />
                      </div>
                      <button
                        onClick={() => handleRemove(index)}
                        className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 text-right font-bold text-[#973c00] text-lg">
              Total: COP {total.toLocaleString("es-CO")}
            </div>
          </div>
        </div>

        {/* Botones fijos */}
        <div className="px-6 py-4 border-t flex justify-between">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-800 rounded-full w-10 h-10 flex items-center justify-center"
            title="Cancelar"
          >
            ⏴
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selected.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {loading ? "Guardando..." : "Guardar orden"}
          </button>
        </div>
      </div>
    </div>
  );
}