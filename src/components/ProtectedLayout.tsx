// src/components/ProtectedLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./ui/Sidebar";

export default function ProtectedLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="relative min-h-screen bg-[#fffbeb]">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido principal */}
      <main className="ml-80 px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#973c00]">
             ¡Hola {user?.firstName}!
            </h1>
            <p className="text-sm text-[#bb4d00]">Tu panel de gestión</p>
          </div>
          <button
            onClick={logout}
            className="bg-[#fe9a00] hover:bg-[#e17100] text-white px-4 py-2 rounded-lg shadow transition-colors duration-200"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Aquí se montan las rutas hijas */}
        <div className="space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}