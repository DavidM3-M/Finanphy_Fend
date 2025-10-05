import React from "react";
import { NavLink } from "react-router-dom";

const Navbar = () => {
  const navItems = [
    { path: "/app/dashboard",            label: "Dashboard",      exact: true  },
    { path: "/app/clasificacion",   label: "Clasificación", exact: false },
    { path: "/app/reportes-diarios", label: "Reportes",      exact: false },
    { path: "/app/orders", label: "Ordenes",      exact: false },
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

          {/* Links */}
          <div className="flex space-x-6 items-center">
            {navItems.map(({ path, label, exact }) => (
              <NavLink
                key={path}
                to={path}
                end={exact}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive
                      ? "text-indigo-400 border-b-2 border-indigo-400"
                      : "text-slate-300 hover:text-white"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;