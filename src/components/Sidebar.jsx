import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Users, 
  CreditCard, 
  TrendingUp, 
  BarChart3,
  Building2
} from "lucide-react";

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { 
      path: "/dashboard", 
      label: "Dashboard", 
      icon: LayoutDashboard,
      description: "Vista general"
    },
    
    { 
      path: "/inventario", 
      label: "Inventario", 
      icon: Package,
      description: "Control de productos"
    },
    
    { 
      path: "/clasificacion", 
      label: "Movimientos", 
      icon: TrendingUp,
      description: "Ingresos y gastos"
    },
    { 
      path: "/reportes", 
      label: "Reportes", 
      icon: BarChart3,
      description: "Análisis y métricas"
    },

  ];

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-300 h-screen flex flex-col shadow-2xl border-r border-slate-700/50">
      {/* Logo / Header */}
      <div className="p-8 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-white text-2xl font-bold tracking-tight">
              Finanphy
            </h2>
            <p className="text-slate-400 text-xs font-medium">
              Sistema de Gestión
            </p>
          </div>
        </div>
      </div>

      {/* Menú Principal */}
      <nav className="flex-1 px-6 py-6">
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">
            Menú Principal
          </h3>
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl 
                             transition-all duration-300 relative overflow-hidden ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25"
                        : "hover:bg-slate-700/50 hover:text-white"
                    }`}
                  >
                    {/* Efecto de brillo en hover */}
                    <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                                   transform -skew-x-12 transition-transform duration-700 ${
                      isActive ? "" : "group-hover:translate-x-full -translate-x-full"
                    }`} />
                    
                    {/* Icono */}
                    <div className={`flex-shrink-0 p-2 rounded-lg transition-colors duration-300 ${
                      isActive 
                        ? "bg-white/20" 
                        : "bg-slate-600/30 group-hover:bg-slate-600/50"
                    }`}>
                      <Icon className={`w-5 h-5 transition-colors duration-300 ${
                        isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                      }`} />
                    </div>

                    {/* Contenido del texto */}
                    <div className="flex-1 min-w-0">
                      <span className={`block text-sm font-semibold transition-colors duration-300 ${
                        isActive ? "text-white" : "text-slate-200 group-hover:text-white"
                      }`}>
                        {item.label}
                      </span>
                      <span className={`block text-xs transition-colors duration-300 ${
                        isActive 
                          ? "text-blue-100" 
                          : "text-slate-400 group-hover:text-slate-300"
                      }`}>
                        {item.description}
                      </span>
                    </div>

                    {/* Indicador activo */}
                    {isActive && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Sección de Usuario/Estado */}
      <div className="px-6 py-4 border-t border-slate-700/50 bg-gradient-to-r from-slate-800/30 to-transparent">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Sistema Activo</p>
            <p className="text-xs text-slate-400">En línea</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center border-t border-slate-700/30">
        <div className="text-xs text-slate-500">
          <p className="font-medium">© {new Date().getFullYear()} Finanphy</p>
          <p className="mt-1">Versión 2.1.0</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;