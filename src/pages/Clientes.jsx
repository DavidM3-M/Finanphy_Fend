/*
import { useEffect, useState } from "react";
import { getClientes } from "../services/api";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchClientes() {
      setLoading(true);
      setError("");
      try {
        const { data } = await getClientes();
        // Algunos backends envían la lista dentro de "data.data"
        setClientes(Array.isArray(data) ? data : data?.data || []);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err.message
        );
      } finally {
        setLoading(false);
      }
    }
    fetchClientes();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Clientes</h2>

      {loading && <p>Cargando clientes...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && clientes.length === 0 && (
        <p>No se encontraron clientes.</p>
      )}

      {!loading && !error && clientes.length > 0 && (
        <ul className="list-disc pl-6">
          {clientes.map((c, i) => (
            <li key={c.id || i}>
              {c.firstName} {c.lastName} – {c.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}*/
