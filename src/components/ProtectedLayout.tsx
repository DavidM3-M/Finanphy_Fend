// src/components/ProtectedLayout.tsx
import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white">
        <div className="p-4 font-bold">Finanphy</div>
        <nav className="flex flex-col p-4 space-y-2">
          <Link to="dashboard" className="hover:bg-gray-700 p-2 rounded">Dashboard</Link>
          <Link to="facturacion" className="hover:bg-gray-700 p-2 rounded">Facturación</Link>
          <Link to="reportes" className="hover:bg-gray-700 p-2 rounded">Reportes</Link>
        </nav>
        <div className="mt-auto p-4">
          <span className="block mb-2">Hola, {user?.firstName}</span>
          <button onClick={logout} className="bg-red-500 px-4 py-2 rounded">Cerrar sesión</button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 bg-gray-100 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}