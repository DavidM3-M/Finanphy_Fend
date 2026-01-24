import React, { useEffect, useState } from "react";
import { getProducts } from "services/products";
import { Product } from "types";


export default function ProductSelector() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<
    { product: Product; quantity: number }[]
  >([]);

  useEffect(() => {
    getProducts({ page: 1, limit: 50 }).then((res) =>
      setProducts(Array.isArray(res?.data) ? res.data : [])
    );
  }, []);

  const handleAdd = (product: Product) => {
    const exists = selected.find(i => i.product.id === product.id);
    if (exists) return;
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

  const total = selected.reduce(
    (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  return (
    <div className="grid grid-cols-2 gap-6 max-w-6xl mx-auto py-10 px-4">
      {/* 🧱 Productos disponibles */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-[#973c00]">🧱 Productos</h2>
        <div className="grid grid-cols-2 gap-4">
          {products.map(product => (
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

      {/* 🛒 Lista seleccionada */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-[#973c00]">🛒 Selección</h2>
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

        {/* 💰 Total */}
        <div className="mt-6 text-right font-bold text-[#973c00] text-lg">
          Total: COP {total.toLocaleString("es-CO")}
        </div>
      </div>
    </div>
  );
}