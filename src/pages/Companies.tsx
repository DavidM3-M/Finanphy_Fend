import React from "react";
import CompaniesList from "../components/CompaniesList";

export default function Companies() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Compañías</h1>
      <CompaniesList />
    </div>
  );
}
