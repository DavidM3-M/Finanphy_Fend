import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { Customer } from "../types";
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
  getCustomerPayments,
} from "../services/customers";
import { getByCompanyAndCustomer } from "../services/clientOrders";
import type { Order } from "../types";
import OrderDetailModal from "../components/Orders/OrderDetailModal";
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
  const pageSize = 15;
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await getCustomers(companyId);
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudieron cargar los clientes");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) =>
      [c.name, c.email, c.phone, c.documentId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const totalItems = filtered.length;
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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

  const loadCustomerDetails = async (customerId: string) => {
    if (!companyId || !customerId) return;
    setLoadingCustomerData(true);
    try {
      // Try to fetch orders for this customer (backend may return paginated shape)
      try {
        const res: any = await getByCompanyAndCustomer(companyId, customerId, undefined, 1, 100);
        const orders = res?.data?.data ?? res?.data ?? [];
        setCustomerOrders(Array.isArray(orders) ? orders : []);
      } catch (err) {
        setCustomerOrders([]);
      }

      // Fetch customer payments/credits
      try {
        const payments = await getCustomerPayments(customerId);
        setCustomerPayments(Array.isArray(payments) ? payments : []);
      } catch (err) {
        setCustomerPayments([]);
      }
    } finally {
      setLoadingCustomerData(false);
    }
  };

  const API_BASE = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
  const resolveUrl = (url?: string | null) => {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url)) return url;
    if (!API_BASE) return url;
    if (!url.startsWith("/")) return `${API_BASE}/uploads/${url}`;
    return `${API_BASE}${url}`;
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
            {paginated.map((customer) => (
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
                    <button
                      onClick={async () => {
                        setDetailCustomer(customer);
                        setDetailModalOpen(true);
                        await loadCustomerDetails(customer.id);
                      }}
                      className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
                    >
                      Ver deudas/créditos
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
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
      {detailModalOpen && detailCustomer && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-4xl max-h-[85vh] overflow-auto p-4">
            <div className="flex items-start justify-between gap-4 border-b pb-3">
              <div>
                <h3 className="text-lg font-semibold text-[#973c00]">Detalle: {detailCustomer.name}</h3>
                <div className="text-xs text-[#7b3306]">{[detailCustomer.email, detailCustomer.phone, detailCustomer.documentId].filter(Boolean).join(' • ')}</div>
                {detailCustomer.address && <div className="text-xs text-[#7b3306] mt-1">{detailCustomer.address}</div>}
              </div>
              <button onClick={() => { setDetailModalOpen(false); setDetailCustomer(null); }} className="text-gray-500">✕</button>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold text-[#973c00]">Información</h4>
              <div className="text-sm mt-2">
                <div><strong>Notas:</strong> {detailCustomer.notes || '-'}</div>
                <div className="mt-1"><strong>Creado:</strong> {detailCustomer.createdAt || '-'}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-[#973c00]">Deudas (órdenes)</h4>
                {loadingCustomerData ? (
                  <div className="text-sm text-[#bb4d00]">Cargando órdenes...</div>
                ) : customerOrders.length === 0 ? (
                  <div className="text-xs text-[#7b3306]">No se encontraron órdenes.</div>
                ) : (
                  <ul className="space-y-2 mt-2">
                    {customerOrders.map((o) => {
                      const total = (o.items || []).reduce((s, it) => s + (Number((it as any).unitPrice) || 0) * (Number((it as any).quantity) || 0), 0);
                      return (
                            <li key={o.id} className="p-2 border rounded bg-white text-xs">
                              <div className="flex items-center justify-between">
                                <div className="cursor-pointer" onClick={async () => {
                                  setSelectedOrder(o);
                                }}>
                                  <div className="font-semibold">{o.orderCode}</div>
                                  <div className="text-xs text-gray-600">Estado: {o.status} · Pago: {o.paymentStatus ?? 'pendiente'}</div>
                                </div>
                                <div className="text-sm font-bold">COP {total.toLocaleString('es-CO')}</div>
                              </div>
                              <div className="mt-2">
                                {o.invoiceUrl && (() => {
                                  const invoiceLink = resolveUrl(o.invoiceUrl);
                                  return (
                                    <a href={invoiceLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Factura</a>
                                  );
                                })()}
                              </div>
                            </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-sm text-[#973c00]">Créditos / Abonos</h4>
                {loadingCustomerData ? (
                  <div className="text-sm text-[#bb4d00]">Cargando abonos...</div>
                ) : customerPayments.length === 0 ? (
                  <div className="text-xs text-[#7b3306]">No se encontraron abonos.</div>
                ) : (
                  <ul className="space-y-2 mt-2">
                    {customerPayments.map((p: any) => {
                      // heuristics to find evidence URL in payment object
                      const evidenceCandidates = [
                        p.evidenceUrl,
                        p.evidence?.url,
                        p.metadata?.evidenceUrl,
                        p.metadata?.evidence?.url,
                        p.fileUrl,
                        p.evidenceUrlFull,
                        p.url,
                      ];
                      const evidenceRaw = evidenceCandidates.find((c) => c);
                      const evidenceUrl = resolveUrl(evidenceRaw as string | undefined);
                      return (
                        <li key={p.id || `${p.amount}-${p.createdAt}`} className="p-2 border rounded bg-white text-xs">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">COP {Number(p.amount).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div>
                              <div className="text-xs text-gray-600">{new Date(p.paidAt || p.createdAt).toLocaleString()}</div>
                              <div className="text-xs text-gray-600">Método: {p.paymentMethod || '-'}</div>
                            </div>
                            <div className="text-xs text-right">
                              <div>Ref: {p.orderCode ?? p.orderId ?? (p.metadata?.orderId ?? '-')}</div>
                              {evidenceUrl && (
                                <div><a href={evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Comprobante</a></div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => { setSelectedOrder(null); loadCustomerDetails(detailCustomer?.id ?? ''); }}
          onUpdated={async (updated) => {
            // refresh local lists after order update
            setSelectedOrder(null);
            if (detailCustomer?.id) await loadCustomerDetails(detailCustomer.id);
          }}
        />
      )}
    </div>
  );
}
