// src/components/CatalogoQr.tsx
import React, { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { LayoutDashboard } from 'lucide-react';
import { useProducts } from '../context/ProductsContext';

export default function CatalogoQr() {
  const [mostrarQR, setMostrarQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const { companyId } = useProducts(); // Asegurate que sea un string válido

  if (!companyId || typeof companyId !== 'string') {
    console.warn('⚠️ companyId inválido:', companyId);
    return null;
  }

  const url = `https://finanphy.netlify.app/catalogo/${companyId}`;
  console.log('🧠 companyId:', companyId);
  console.log('🔗 URL generada:', url);

  const descargarQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngFile;
      link.download = `catalogo_${companyId}.png`;
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
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
              <p className="text-[#bb4d00] text-xs font-medium">Sistema de Gestión</p>
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

      {/* Modal flotante */}
      {mostrarQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 text-[#973c00]">Catálogo público</h3>
            <div ref={qrRef} className="flex justify-center items-center">
            <QRCode value={url} size={200} />
            </div>
            <p className="mt-2 text-sm text-red-500 break-all">🔴 Debug: {url}</p>
            <div className="mt-4 flex justify-center gap-3">
            <p className="text-xs text-red-500 mt-2 text-center">{url}</p>
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