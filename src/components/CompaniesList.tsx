import React, { useEffect, useState } from "react";
import { getCompanies, deleteCompany, Company } from "../services/companiesService";

export default function CompaniesList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (err) {
      setError("No se pudieron cargar las compañías");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Eliminar esta compañía?")) return;
    try {
      await deleteCompany(id);
      setCompanies(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert("Error eliminando la compañía");
    }
  };

  if (loading) return <p>Cargando...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Compañías</h2>
      <div className="grid gap-4">
        {companies.map(c => (
          <div key={c.id} className="border p-4 rounded shadow bg-white">
            <h3 className="font-semibold text-lg">{c.tradeName}</h3>
            <p>Email: {c.companyEmail}</p>
            <p>Tel: {c.companyPhone}</p>
            <p>Ciudad: {c.city} - {c.state}</p>

            <div className="flex gap-2 mt-3">
              <button
                className="px-3 py-1 border rounded bg-gray-100"
                onClick={() => alert("Aquí iría la lógica de editar")}
              >
                Editar
              </button>
              <button
                className="px-3 py-1 bg-red-600 text-white rounded"
                onClick={() => handleDelete(c.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
