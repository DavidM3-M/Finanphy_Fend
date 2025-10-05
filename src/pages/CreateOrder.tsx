import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, User, ClipboardList } from "lucide-react";

export default function CreateOrderForm() {
  const [cliente, setCliente] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);
  const navigate = useNavigate();

  // Animación de entrada
  useEffect(() => {
    const timeout = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Aquí iría la lógica de envío a la API
      console.log("Orden creada:", { cliente, producto, cantidad });
      navigate("/app/orders");
    } catch (err) {
      alert("Error al crear la orden");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`w-full bg-white rounded-2xl shadow-2xl border border-[#fef3c6] p-8 space-y-6 transition-all duration-700 ease-out ${
        animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {/* Encabezado */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <div className="p-2 bg-[#ffb900] rounded-xl shadow-lg">
          <ClipboardList className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-[#973c00] tracking-tight">
          Detalles de la orden
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-[#bb4d00] flex items-center gap-2">
            <User className="w-4 h-4" />
            Cliente
          </label>
          <input
            type="text"
            value={cliente}
            onChange={e => setCliente(e.target.value)}
            required
            className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb]
                       focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
            placeholder="Nombre del cliente"
          />
        </div>

        {/* Producto */}
        <div>
          <label className="block text-sm font-medium text-[#bb4d00] flex items-center gap-2">
            <Package className="w-4 h-4" />
            Producto
          </label>
          <select
            value={producto}
            onChange={e => setProducto(e.target.value)}
            required
            className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb]
                       focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
          >
            <option value="">Selecciona un producto</option>
            <option value="Producto A">Producto A</option>
            <option value="Producto B">Producto B</option>
            <option value="Producto C">Producto C</option>
          </select>
        </div>

        {/* Cantidad */}
        <div>
          <label className="block text-sm font-medium text-[#bb4d00]">Cantidad</label>
          <input
            type="number"
            value={cantidad}
            onChange={e => setCantidad(Number(e.target.value))}
            required
            min={1}
            className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb]
                       focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
            placeholder="Ej: 10"
          />
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2
                     bg-[#fe9a00] hover:bg-[#e17100] text-white font-semibold py-2
                     rounded-lg transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                viewBox="0 0 24 24"
              />
              <span>Creando orden…</span>
            </>
          ) : (
            "Crear orden"
          )}
        </button>
      </form>
    </div>
  );
}