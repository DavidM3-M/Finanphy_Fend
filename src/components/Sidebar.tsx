// src/components/Sidebar.tsx

import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  BarChart3,
  LucideIcon,
} from "lucide-react";

interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const menuItems: MenuItem[] = [
  {
    path: "/app/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Vista general",
  },
  {
    path: "/app/inventario",
    label: "Inventario",
    icon: Package,
    description: "Control de stock y productos",
  },
  {
    path: "/app/clasificacion",
    label: "Clasificación",
    icon: TrendingUp,
    description: "Ingresos y gastos",
  },
  {
    path: "/app/reportes",
    label: "Reportes",
    icon: BarChart3,
    description: "Análisis y métricas",
  },
];

const Sidebar: React.FC = () => {
  const { pathname } = useLocation();

  return (
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
      <div className="p-6 border-b border-[#fef3c6] bg-[#fffbeb]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#ffb900] rounded-lg">
            <LayoutDashboard className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-[#973c00] text-2xl font-bold">Finanphy</h2>
            <p className="text-[#bb4d00] text-xs font-medium">
              Sistema de Gestión
            </p>
          </div>
        </div>
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
                  className={`
                    group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActive
                      ? "bg-[#fee685] text-[#e17100]"
                      : "text-[#973c00] hover:bg-[#fffbeb]"}
                  `}
                >
                  <div className={`
                    flex-shrink-0 p-3 rounded-lg transition-transform duration-200
                    ${isActive
                      ? "bg-[#ffb900] scale-105"
                      : "bg-[#fef3c6] group-hover:scale-105"}
                  `}>
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
        <p className="text-xs text-[#bb4d00] mt-1">Versión 2.1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;