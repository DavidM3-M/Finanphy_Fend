import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/clasificacion", label: "Clasificación" },
    { path: "/reportes", label: "Reportes" }, // ✅ Agregado
  ];

  return (
    <nav className="bg-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-2xl font-bold text-indigo-400">
              Finanphy
            </span>
          </div>

          {/* Links de navegación */}
          <div className="flex space-x-6 items-center">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;