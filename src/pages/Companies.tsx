import React, { useEffect, useState } from "react";
import axios, { AxiosResponse } from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "https://finanphy-dev-auth.onrender.com";

type Company = {
  id?: number | string;
  tradeName: string;
  legalName?: string;
  companyType?: string;
  taxId?: string;
  taxRegistry?: string;
  businessPurpose?: string;
  companyEmail?: string;
  companyPhone?: string;
  fiscalAddress?: string;
  city?: string;
  state?: string;
  representativeName?: string;
  representativeDocument?: string;
  incorporationDate?: string;
};

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emptyForm: Company = {
    tradeName: "",
    legalName: "",
    companyType: "",
    taxId: "",
    taxRegistry: "",
    businessPurpose: "",
    companyEmail: "",
    companyPhone: "",
    fiscalAddress: "",
    city: "",
    state: "",
    representativeName: "",
    representativeDocument: "",
    incorporationDate: "",
  };

  const [form, setForm] = useState<Company>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const api = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
  });

  api.interceptors.request.use((cfg) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (token) {
        cfg.headers = cfg.headers || {};
        (cfg.headers as any)["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // Ignorar
    }
    return cfg;
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchCompanies() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/companies");
      console.log("✅ Respuesta del backend:", res);
      setCompanies(res.data || []);
    } catch (err: any) {
      console.error("❌ Error al cargar compañías:", err.response?.data || err.message);
      setError("No se pudieron cargar las compañías.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(emptyForm);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  }

  function openEdit(c: Company) {
    setForm({ ...c });
    setIsEditing(true);
    setEditingId(c.id ?? null);
    setIsModalOpen(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();

    if (!form.tradeName || form.tradeName.trim() === "") {
      setToast("El nombre comercial (tradeName) es requerido.");
      return;
    }

    if (form.incorporationDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.incorporationDate)) {
      setToast("La fecha debe tener formato YYYY-MM-DD.");
      return;
    }

    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([_, v]) => v !== ""));
      console.log("📤 Enviando payload:", payload);

      let res: AxiosResponse<any>;

      if (!isEditing) {
        res = await api.post(`/api/companies`, payload);
        setCompanies((prev) => [res.data, ...prev]);
        setToast("Compañía creada con éxito.");
      } else if (isEditing && editingId != null) {
        res = await api.patch(`/api/companies/${editingId}`, payload);
        setCompanies((prev) => prev.map((p) => (p.id === editingId ? res.data : p)));
        setToast("Cambios guardados correctamente.");
      }

      setIsModalOpen(false);
    } catch (err: any) {
      const backendMsg = err.response?.data?.message || err.response?.data?.error;

      if (backendMsg?.toLowerCase().includes("exist") || backendMsg?.includes("existente")) {
        setToast("⚠️ Ya existe una compañía con ese nombre o NIT.");
      } else {
        setToast("Error al guardar la compañía. Revisa la consola para más detalles.");
      }

      console.error("❌ Error completo al guardar compañía:", err.response?.data || err.message);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/api/companies/${deleteId}`);
      setCompanies((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
      setToast("Compañía eliminada.");
    } catch (err) {
      console.error("❌ Error al eliminar compañía:", err);
      setToast("Error al eliminar. Revisa la consola.");
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Compañías</h1>
        <div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Nueva compañía
          </button>
          <button
            onClick={fetchCompanies}
            className="ml-2 px-3 py-2 border rounded"
            title="Refrescar lista"
          >
            {loading ? "Cargando..." : "Refrescar"}
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {!loading && companies.length === 0 && (
        <div className="text-gray-600">No hay compañías. Crea la primera.</div>
      )}

      <div className="space-y-3">
        {companies.map((c) => (
          <details key={String(c.id)} className="p-3 border rounded shadow-sm bg-white">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <div>
                <div className="font-semibold">{c.tradeName || "(Sin nombre)"}</div>
                <div className="text-sm text-gray-500">{c.city || c.state}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(c);
                  }}
                  className="px-3 py-1 border rounded text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(c.id ?? null);
                  }}
                  className="px-3 py-1 border rounded text-sm text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </summary>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-gray-600">Nombre legal</div>
                <div className="font-medium">{c.legalName || "-"}</div>

                <div className="mt-2 text-sm text-gray-600">Tipo</div>
                <div className="font-medium">{c.companyType || "-"}</div>

                <div className="mt-2 text-sm text-gray-600">NIT / Tax ID</div>
                <div className="font-medium">{c.taxId || "-"}</div>

                <div className="mt-2 text-sm text-gray-600">Registro tributario</div>
                <div className="font-medium">{c.taxRegistry || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Contacto</div>
                <div className="font-medium">
                  {c.companyEmail || "-"} • {c.companyPhone || "-"}
                </div>

                <div className="mt-2 text-sm text-gray-600">Dirección fiscal</div>
                <div className="font-medium">{c.fiscalAddress || "-"}</div>

                <div className="mt-2 text-sm text-gray-600">Representante</div>
                <div className="font-medium">
                  {c.representativeName || "-"} ({c.representativeDocument || "-"})
                </div>

                <div className="mt-2 text-sm text-gray-600">Fecha de constitución</div>
                <div className="font-medium">{c.incorporationDate || "-"}</div>
              </div>
            </div>
          </details>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {isEditing ? "Editar compañía" : "Crear compañía"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-600">
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-auto pr-2">
              <div>
                <label className="block text-sm">Nombre comercial *</label>
                <input
                  name="tradeName"
                  value={form.tradeName}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">Nombre legal</label>
                  <input
                    name="legalName"
                    value={form.legalName}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm">Tipo</label>
                  <input
                    name="companyType"
                    value={form.companyType}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">Tax ID / NIT</label>
                  <input
                    name="taxId"
                    value={form.taxId}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm">Registro tributario</label>
                  <input
                    name="taxRegistry"
                    value={form.taxRegistry}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm">Objeto social</label>
                <textarea
                  name="businessPurpose"
                  value={form.businessPurpose}
                  onChange={handleChange as any}
                  className="w-full border rounded px-2 py-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">Email</label>
                  <input
                    name="companyEmail"
                    value={form.companyEmail}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm">Teléfono</label>
                  <input
                    name="companyPhone"
                    value={form.companyPhone}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm">Dirección fiscal</label>
                <input
                  name="fiscalAddress"
                  value={form.fiscalAddress}
                  onChange={handleChange}
                  className="w-full border rounded px-2 py-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm">Ciudad</label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm">Departamento</label>
                  <input
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm">Fecha incorporación</label>
                  <input
                    name="incorporationDate"
                    value={form.incorporationDate}
                    onChange={handleChange}
                    placeholder="YYYY-MM-DD"
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">Representante</label>
                  <input
                    name="representativeName"
                    value={form.representativeName}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm">Documento representante</label>
                  <input
                    name="representativeDocument"
                    value={form.representativeDocument}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded"
                >
                  {isEditing ? "Guardar cambios" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Confirmar eliminación</h2>
            <p className="mb-6 text-gray-700">
              ¿Estás seguro de que deseas eliminar esta compañía? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded">
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center justify-between gap-3">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-gray-300 hover:text-white">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
