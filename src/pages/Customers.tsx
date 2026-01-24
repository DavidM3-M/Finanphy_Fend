import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { Customer, PaginatedMeta } from "../types";
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "../services/customers";
import toast from "react-hot-toast";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  documentId: "",
  address: "",
  notes: "",
};

export default function Customers(): React.ReactElement {
  const { company } = useAuth();
  const companyId = company?.id;

  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadCustomers = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await getCustomers({
        companyId,
        page,
        limit: pageSize,
        search: query.trim() || undefined,
      });
      setItems(Array.isArray(res?.data) ? res.data : []);
      setMeta(res?.meta ?? null);
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudieron cargar los clientes");
    } finally {
      setLoading(false);
    }
  }, [companyId, page, pageSize, query]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (meta?.totalPages && page > meta.totalPages) {
      setPage(meta.totalPages);
    }
  }, [meta, page]);

  const filtered = useMemo(() => items, [items]);
  const totalPages = meta?.totalPages ?? 1;
  const totalItems = meta?.total ?? filtered.length;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId) return;
    if (!form.name.trim()) return;

    const payload = {
      companyId,
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      documentId: form.documentId.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (editingId) {
        await updateCustomer(editingId, payload);
        await loadCustomers();
        toast.success("Cliente actualizado");
      } else {
        await createCustomer(payload);
        await loadCustomers();
        toast.success("Cliente creado");
      }
      resetForm();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar el cliente");
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      documentId: customer.documentId ?? "",
      address: customer.address ?? "",
      notes: customer.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este cliente?")) return;
    try {
      await deleteCustomer(id);
      await loadCustomers();
      toast.success("Cliente eliminado");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo eliminar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#973c00]">Clientes</h1>
          <p className="text-sm text-[#bb4d00]">Gestiona tus clientes registrados</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setModalOpen(true);
          }}
          className="px-4 py-2 rounded-lg bg-[#fe9a00] text-white font-semibold"
        >
          + Nuevo cliente
        </button>
      </div>

      {!companyId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          No hay empresa asociada para cargar clientes.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#fef3c6] shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#973c00]">Listado</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente"
            className="px-3 py-2 rounded-lg border border-[#fef3c6] bg-[#fffbeb]"
          />
        </div>

        {loading ? (
          <div className="text-sm text-[#bb4d00]">Cargando clientes...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-[#7b3306]">Sin clientes registrados.</div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((customer) => (
              <li
                key={customer.id}
                className="rounded-xl border border-[#fef3c6] bg-[#fffbeb] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#973c00]">{customer.name}</div>
                    <div className="text-xs text-[#7b3306]">
                      {[customer.email, customer.phone, customer.documentId]
                        .filter(Boolean)
                        .join(" • ") || "Sin datos adicionales"}
                    </div>
                    {customer.address && (
                      <div className="text-xs text-[#7b3306] mt-1">{customer.address}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="px-3 py-1 text-sm rounded bg-[#fe9a00] text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="px-3 py-1 text-sm rounded bg-red-500 text-white"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                {customer.notes && (
                  <div className="text-xs text-[#7b3306] mt-2">{customer.notes}</div>
                )}
              </li>
            ))}
          </ul>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-[#7b3306]">
            <span>
              Página {page} de {totalPages} · Total {totalItems}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-[#973c00]">
                {editingId ? "Editar cliente" : "Nuevo cliente"}
              </h3>
              <button onClick={resetForm} className="text-gray-500">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 p-4">
              <input
                className="w-full px-3 py-2 rounded-lg border border-[#fef3c6] bg-[#fffbeb]"
                placeholder="Nombre"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                required
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-[#fef3c6] bg-[#fffbeb]"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-[#fef3c6] bg-[#fffbeb]"
                placeholder="Teléfono"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-[#fef3c6] bg-[#fffbeb]"
                placeholder="Documento"
                value={form.documentId}
                onChange={(e) => setForm((s) => ({ ...s, documentId: e.target.value }))}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-[#fef3c6] bg-[#fffbeb]"
                placeholder="Dirección"
                value={form.address}
                onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
              />
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-[#fef3c6] bg-[#fffbeb]"
                placeholder="Notas"
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                rows={3}
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-[#fe9a00] text-white font-semibold"
                >
                  {editingId ? "Guardar cambios" : "Crear cliente"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
