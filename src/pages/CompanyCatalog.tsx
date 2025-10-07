import React, { useState, useRef } from "react";
import QRCode from "react-qr-code";
import { LayoutDashboard } from "lucide-react";
import { useProducts } from "../context/ProductsContext";

export default function CompanyCatalog() {
  const [mostrarQR, setMostrarQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const { products, loading, error, companyId } = useProducts();

  // Validación quirúrgica: no renderizar si el ID no está listo
  if (!companyId || typeof companyId !== "string") {
    console.warn("⚠️ companyId aún no está listo:", companyId);
    return (
      <div className="p-6 text-center text-gray-500">
        Cargando empresa...
      </div>
    );
  }

  const url = `https://finanphy.netlify.app/catalogo/${companyId}`;
  console.log("🔗 URL del QR:", url);

  const descargarQR = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngFile;
      link.download = `catalogo_${companyId}.png`;
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-[#fef3c6] bg-[#fffbeb]">
        <div className="flex items-center justify-between">
          {/* Logo + Título */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ffb900] rounded-lg">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-[#973c00] text-2xl font-bold">Finanphy</h2>
              <p className="text-[#bb4d00] text-xs font-medium">Catálogo público</p>
            </div>
          </div>

          {/* Botón QR */}
          <button
            onClick={() => setMostrarQR(true)}
            className="px-4 py-2 bg-[#ffb900] text-white rounded-lg hover:bg-[#e6a800] transition"
          >
            Generar QR
          </button>
        </div>
      </div>

      {/* Render de productos */}
      <div className="p-6">
        {loading ? (
          <p className="text-center text-gray-500">Cargando productos...</p>
        ) : error ? (
          <p className="text-center text-red-500">Error: {error}</p>
        ) : products.length === 0 ? (
          <p className="text-center text-gray-500">Esta empresa no tiene productos públicos</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="border p-4 rounded shadow-sm">
                <h3 className="font-bold text-lg">{p.name}</h3>
                <p className="text-sm text-gray-600">SKU: {p.sku}</p>
                <p className="text-green-700 font-semibold mt-2">${p.price}</p>
                <p className="text-xs text-gray-500">Stock: {p.stock}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal flotante QR */}
      {mostrarQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 text-[#973c00]">Catálogo público</h3>
            <div ref={qrRef}>
              <QRCode value={url} size={200} />
            </div>
            <p className="mt-2 text-sm text-gray-600 break-all">🔗 Link: {url}</p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={descargarQR}
                className="px-4 py-2 bg-[#ffb900] text-white rounded hover:bg-[#e6a800] transition"
              >
                Descargar QR
              </button>
              <button
                onClick={() => setMostrarQR(false)}
                className="px-4 py-2 bg-[#973c00] text-white rounded hover:bg-[#7e3200] transition"
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