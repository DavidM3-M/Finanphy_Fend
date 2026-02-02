import React, { useEffect, useMemo, useState } from "react";
import { getProducts as fetchProducts, fetchAllProducts } from "../../services/products";
import type { Product, PaginatedResponse } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { setAuthToken } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { Package, User, ClipboardList } from "lucide-react";

export default function CreateOrderForm() {
  const [cliente, setCliente] = useState("");
  const [producto, setProducto] = useState("");
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [debugFetchedCount, setDebugFetchedCount] = useState<number | null>(null);
  const [debugMatchedCount, setDebugMatchedCount] = useState<number | null>(null);
  const [productLoading, setProductLoading] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [productTimer, setProductTimer] = useState<number | null>(null as unknown as number | null);
  const [cantidad, setCantidad] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);
  const navigate = useNavigate();
  const { company } = useAuth();

  // Ensure axios instance has the token header (in some cases AuthContext init may be delayed)
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setAuthToken(t);
  }, []);

  // Campos de factura
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [nit, setNit] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("");
  const [direccionFactura, setDireccionFactura] = useState("");
  const [sameAddress, setSameAddress] = useState(true);

  // Precios y cálculo
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(19); // ejemplo 19%
  const subtotal = useMemo(() => {
    const q = Number(cantidad) || 0;
    const p = Number(unitPrice) || 0;
    return Math.round(q * p * 100) / 100;
  }, [cantidad, unitPrice]);
  const taxAmount = useMemo(() => {
    return Math.round((subtotal * (taxPercent / 100)) * 100) / 100;
  }, [subtotal, taxPercent]);
  const total = useMemo(() => {
    return Math.round((subtotal + taxAmount) * 100) / 100;
  }, [subtotal, taxAmount]);

  // Animación de entrada
  useEffect(() => {
    const timeout = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  // Sincronizar direcciones
  useEffect(() => {
    if (sameAddress) setDireccionFactura(direccionCliente);
  }, [direccionCliente, sameAddress]);

  const validateForm = () => {
    if (!cliente.trim()) {
      alert("Ingrese el nombre del cliente");
      return false;
    }
    if (!producto) {
      alert("Seleccione un producto");
      return false;
    }
    if (!invoiceNumber.trim()) {
      alert("Ingrese el número de factura");
      return false;
    }
    if (!nit.trim()) {
      alert("Ingrese el NIT o identificación");
      return false;
    }
    if (subtotal <= 0) {
      alert("El subtotal debe ser mayor que 0. Verifique precio unitario y cantidad");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const payload = {
        cliente,
        producto,
        cantidad,
        unitPrice,
        subtotal,
        taxPercent,
        taxAmount,
        total,
        invoice: {
          number: invoiceNumber,
          date: invoiceDate,
          nit,
          direccion: direccionFactura,
        },
      };

      // Aquí iría la lógica de envío a la API
      

      // Simular respuesta y navegar
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
      <div className="flex items-center justify-center gap-3 mb-2">
        <div className="p-2 bg-[#ffb900] rounded-xl shadow-lg">
          <ClipboardList className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-[#973c00] tracking-tight">
          Detalles de la orden
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente y dirección */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#bb4d00] flex items-center gap-2">
              <User className="w-4 h-4" />
              Cliente
            </label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
              placeholder="Nombre del cliente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#bb4d00]">
              Dirección del cliente
            </label>
            <input
              type="text"
              value={direccionCliente}
              onChange={(e) => setDireccionCliente(e.target.value)}
              className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
              placeholder="Dirección física del cliente"
            />
          </div>
        </div>

        {/* Factura */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#bb4d00]">Número de factura</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
              placeholder="Ej: FV-0001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#bb4d00]">Fecha</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#bb4d00]">NIT o ID</label>
            <input
              type="text"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
              placeholder="NIT o identificación fiscal"
              required
            />
          </div>
        </div>

        {/* Dirección factura y toggle */}
        <div>
          <label className="flex items-center gap-3 text-sm font-medium text-[#bb4d00]">
            <input
              type="checkbox"
              checked={sameAddress}
              onChange={(e) => setSameAddress(e.target.checked)}
              className="h-4 w-4"
            />
            Usar misma dirección del cliente para factura
          </label>

          {!sameAddress && (
            <input
              type="text"
              value={direccionFactura}
              onChange={(e) => setDireccionFactura(e.target.value)}
              className="mt-2 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
              placeholder="Dirección de facturación"
            />
          )}
        </div>

        {/* Producto, cantidad, precio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-[#bb4d00] flex items-center gap-2">
              <Package className="w-4 h-4" />
              Producto
            </label>
            <input
              type="text"
              value={producto}
              onChange={(e) => {
                const v = e.target.value;
                setProducto(v);
                setShowSuggestions(true);
                // debounce server search
                if (productTimer) window.clearTimeout(productTimer);
                const t = window.setTimeout(async () => {
                  if (!v || v.trim() === "") {
                    setProductSuggestions([]);
                    return;
                  }
                  setProductLoading(true);
                  try {
                    // 1) Try server-side search (pages with search param)
                    const accServer = await fetchAllProducts(v, company?.id, 20);
                    setDebugFetchedCount(accServer?.length ?? 0);
                    let matched = accServer ?? [];

                    // 2) If server returned nothing, fallback to download-all + client filter
                    if (!matched || matched.length === 0) {
                      const maxPages = 50; // safety cap
                      const all = await fetchAllProducts(undefined, company?.id, maxPages);
                      const term = v.toString().trim().toLowerCase();
                      matched = (all ?? []).filter((p) => {
                        const name = (p.name || "").toString().toLowerCase();
                        const sku = (p.sku || "").toString().toLowerCase();
                        return name.includes(term) || sku.includes(term);
                      });
                      setDebugFetchedCount((all ?? []).length);
                    }

                    const items = (matched ?? []).slice(0, 10);
                    setDebugMatchedCount((matched ?? []).length ?? 0);

                    setProductSuggestions(items as Product[]);
                  } catch (err) {
                    console.error("Error buscando productos:", err);
                    setProductSuggestions([]);
                    setDebugFetchedCount(null);
                    setDebugMatchedCount(null);
                  } finally {
                    setProductLoading(false);
                  }
                }, 400) as unknown as number;
                setProductTimer(t);
              }}
              required
              className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
              placeholder="Busca por nombre o SKU..."
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => { if (productSuggestions.length) setShowSuggestions(true); }}
            />
            {/* Debug counters */}
            <div className="text-xs text-gray-500 mt-1">Resultados encontrados: {debugMatchedCount ?? "—"} — Productos descargados: {debugFetchedCount ?? "—"}</div>
            {showSuggestions && (productSuggestions.length > 0 || productLoading) && (
              <ul className="absolute z-20 left-0 right-0 bg-white border rounded shadow mt-1 max-h-56 overflow-auto">
                {productLoading && (
                  <li className="px-3 py-2 cursor-default text-sm text-gray-500 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" strokeOpacity="0.25" fill="none"></circle><path d="M22 12a10 10 0 00-10-10" strokeWidth="3" stroke="currentColor" strokeLinecap="round" fill="none"></path></svg>
                    Buscando…
                  </li>
                )}
                {productSuggestions.map((p) => (
                  <li
                    key={p.id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      // set selected product name and unit price
                      setProducto(p.name);
                      setUnitPrice(Number((p as any).price) || 0);
                      setShowSuggestions(false);
                      setProductSuggestions([]);
                    }}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">SKU: {p.sku} — ${Number((p as any).price).toFixed(2)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#bb4d00]">Cantidad</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              required
              min={1}
              className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
              placeholder="Ej: 10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#bb4d00]">Precio unitario</label>
            <input
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              required
              min={0}
              className="mt-1 w-full px-4 py-2 border border-[#fef3c6] rounded-lg bg-[#fffbeb] focus:border-[#fe9a00] focus:ring-2 focus:ring-[#fee685] transition"
              placeholder="Ej: 25.50"
            />
          </div>
        </div>

        {/* Resumen de totales */}
        <div className="bg-[#fffbeb] border border-[#fef3c6] rounded-lg p-4">
          <div className="flex justify-between text-sm text-[#973c00]">
            <span>Subtotal</span>
            <strong>${subtotal.toFixed(2)}</strong>
          </div>
          <div className="flex justify-between text-sm text-[#973c00] mt-1">
            <span>Impuesto ({taxPercent}%)</span>
            <strong>${taxAmount.toFixed(2)}</strong>
          </div>
          <div className="flex justify-between text-base font-bold text-[#973c00] mt-2">
            <span>Total</span>
            <strong>${total.toFixed(2)}</strong>
          </div>
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-[#fe9a00] hover:bg-[#e17100] text-white font-semibold py-2 rounded-lg transition disabled:opacity-60"
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