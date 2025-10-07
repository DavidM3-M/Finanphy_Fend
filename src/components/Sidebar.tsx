import React, { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import QRCode from "react-qr-code";
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  BarChart3,
  LucideIcon,
  ClipboardList,
} from "lucide-react";
import { useProducts } from "../context/ProductsContext";

interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const menuItems: MenuItem[] = [
  { path: "/app/dashboard",   label: "Dashboard",    icon: LayoutDashboard, description: "Vista general" },
  { path: "/app/inventario",  label: "Inventario",   icon: Package,         description: "Control de stock y productos" },
  { path: "/app/clasificacion", label: "Clasificación", icon: TrendingUp,     description: "Ingresos y gastos" },
  { path: "/app/reportes",    label: "Reportes",      icon: BarChart3,        description: "Análisis y métricas" },
  { path: "/app/orders",      label: "Órdenes",       icon: ClipboardList,    description: "Gestión de pedidos" },
];

const Sidebar: React.FC = () => {
  const { pathname } = useLocation();
  const [mostrarQR, setMostrarQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const { companyId } = useProducts();

  // indicador de carga
  const companyLoading = companyId === "";

  // siempre renderizamos el sidebar completo
  // solo deshabilitamos el botón de QR mientras companyId esté vacío
  const url = `https://finanphy.netlify.app/catalogo/${companyId}`;

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
  console.log("🧠 companyId desde contexto:", companyId);
  return (
    <>
      <aside
        className="
          fixed top-6 left-6 z-50
          w-72 h-[calc(100vh-3rem)]
          bg-white border border-[#fef3c6]
          rounded-2xl shadow-2xl
          flex flex-col overflow-hidden
        "
      >
        {/* Header */}
        <div className="p-6 border-b border-[#fef3c6] bg-[#fffbeb] flex items-center justify-between">
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
            disabled={companyLoading}
            className={`p-2 rounded-full transition ${
              companyLoading
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[#ffb900] hover:bg-[#e6a800] text-white"
            }`}
            title={companyLoading ? "Cargando empresa…" : "Generar QR"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill={companyLoading ? "#999" : "white"}>
              <path d="M3 3h4v4H3V3zm0 7h4v4H3v-4zm7-7h4v4h-4V3zm7 0h4v4h-4V3zm0 7h4v4h-4v-4zm-7 7h4v4h-4v-4z" />
            </svg>
          </button>
        </div>

        {/* Menú */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto no-scrollbar">
          <h3 className="text-xs font-semibold uppercase text-[#973c00] mb-4 px-2">
            Menú Principal
          </h3>
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive =
                pathname === item.path || pathname.startsWith(item.path + "/");
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-[#fee685] text-[#e17100]"
                        : "text-[#973c00] hover:bg-[#fffbeb]"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 p-3 rounded-lg transition-transform duration-200 ${
                        isActive
                          ? "bg-[#ffb900] scale-105"
                          : "bg-[#fef3c6] group-hover:scale-105"
                      }`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {item.label}
                      </p>
                      <p className="text-xs text-[#bb4d00] truncate">
                        {item.description}
                      </p>
                    </div>
                    {isActive && (
                      <span className="ml-auto w-1 h-6 bg-[#ffb900] rounded-full" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Estado del sistema */}
        <div className="px-6 py-4 border-t border-[#fef3c6] bg-[#fffbeb]">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#fef3c6]">
            <div className="w-8 h-8 bg-[#fe9a00] rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#973c00]">Sistema Activo</p>
              <p className="text-xs text-[#bb4d00]">En línea</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center border-t border-[#fef3c6] bg-[#fffbeb]">
          <p className="text-xs text-[#973c00] font-medium">
            © {new Date().getFullYear()} Finanphy
          </p>
          <p className="text-xs text-[#bb4d00] mt-1">Versión 1.1.5</p>
        </div>
      </aside>

      {/* Modal flotante QR */}
      {mostrarQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999]">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 text-[#973c00]">
              Catálogo público
            </h3>

            {/* Si sigue cargando, mostramos loader interno */}
            {companyLoading ? (
              <p className="py-10 text-gray-500">Cargando empresa…</p>
            ) : (
              <>
                <div ref={qrRef} className="flex justify-center items-center">
                <QRCode value={url} size={200} />
                </div>
                <p className="mt-2 text-sm text-gray-600 break-all">{url}</p>
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;