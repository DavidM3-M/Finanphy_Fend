// src/pages/Orders.tsx

import React, { useCallback, useEffect, useState } from "react";
import type { PaginatedMeta } from "../../types";
import {
  getAllOrders,
  deleteOrder,
  updateOrderStatus,
  getOrderById,
  Order,
  uploadOrderInvoice,
  deleteOrderInvoice,
} from "../../services/clientOrders";
import api from "../../services/api";
import OrderModal from "../../components/Orders/OrderModal";
import OrderDetailModal from "../../components/Orders/OrderDetailModal";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { pdf } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "../../components/Orders/InvoicePdf";

/* ---------- Helpers ---------- */
const friendlyDate = (iso: string) => {
  try {
    return format(parseISO(iso), "EEE, d 'de' MMM yyyy", { locale: es });
  } catch {
    return new Date(iso).toLocaleDateString();
  }
};



/* ---------- FiltersRow (local) ---------- */
function FiltersRow({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  onCreate,
}: {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-3 items-end">
      <div className="flex items-center gap-2">
        <label className="sr-only">Buscar por código</label>
        <input
          type="text"
          placeholder="Buscar por código"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border px-3 py-2 rounded w-60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Buscar por código"
        />
      </div>

      <div>
        <label className="sr-only">Filtrar por estado</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border px-3 py-2 rounded w-44 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="recibido">Recibido</option>
          <option value="en_proceso">En proceso</option>
          <option value="enviado">Enviado</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="sr-only">Desde</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Fecha desde"
        />
        <label className="sr-only">Hasta</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Fecha hasta"
        />
      </div>

      <div className="ml-auto flex gap-2">
        <button
          onClick={onCreate}
          className="bg-[#fe9a00] text-white px-4 py-2 rounded-md text-sm hover:bg-[#e08900] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#f59e0b]"
          aria-label="Crear nueva orden"
        >
          + Nueva orden
        </button>
      </div>
    </div>
  );
}

/* ---------- Página Orders (con modal de confirmación para eliminar) ---------- */

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // pendingDeleteId gestiona el modal de confirmación
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const companyId = "";

  const totalPages = meta?.totalPages ?? 1;
  const totalItems = meta?.total ?? filteredOrders.length;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllOrders({
        page,
        limit: pageSize,
      });
      const payload = res.data;
      const list = Array.isArray(payload?.data) ? payload.data : [];
      setOrders(list);
      setFilteredOrders(list);
      setMeta(payload?.meta ?? null);
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (meta?.totalPages && page > meta.totalPages) {
      setPage(meta.totalPages);
    }
  }, [meta, page]);

  // applyFilters se mantiene y es consumido por el useEffect que sigue
  const applyFilters = () => {
    let filtered = [...orders];

    if (searchTerm) {
      const q = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((o) => o.orderCode?.toLowerCase().includes(q));
    }

    if (statusFilter) {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((o) => new Date(o.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((o) => new Date(o.createdAt) <= to);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredOrders(filtered);
  };

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, dateFrom, dateTo, orders]);

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      try {
        await deleteOrderInvoice(id);
      } catch (err) {
        console.warn("No se pudo eliminar la factura asociada (puede que no exista):", err);
      }

      await deleteOrder(id);
      await fetchOrders();
      // cerrar detalle si estaba abierto
      setSelectedOrder((cur) => (cur?.id === id ? null : cur));
    } catch (err) {
      console.error("Error al eliminar orden:", err);
      fetchOrders();
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateOrderStatus(id, status);
      const typedStatus = status as unknown as Order["status"];
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: typedStatus } : o)));
      setSelectedOrder((cur) => (cur && cur.id === id ? { ...cur, status: typedStatus } : cur));

      if (status === "enviado") {
        const orderListEntry = orders.find((o) => o.id === id);
        if (orderListEntry && !orderListEntry.invoiceUrl) {
          try {
            // Obtener la orden completa desde el servidor para asegurar company/customer/description
            const fullRes = await getOrderById(id);
            const payload = (fullRes as any).data as any;
            let fullOrder = payload?.data ? (payload.data as Order) : (payload as Order);

            // Normalizar company si viene en campos anidados
            try {
              const companyId = (fullOrder as any).companyId ?? fullOrder.company?.id;
              if ((!fullOrder.company || !(fullOrder.company as any).tradeName) && companyId) {
                const c = await api.get(`/companies/${companyId}`);
                fullOrder.company = c.data?.data ?? c.data;
              } else if (fullOrder.company && (fullOrder.company as any).data) {
                fullOrder.company = (fullOrder.company as any).data;
              }
            } catch (e) {
              console.warn("No se pudo normalizar company para factura:", e);
            }

            // Normalizar customer
            try {
              const customerId = (fullOrder as any).customerId ?? (fullOrder.customer as any)?.id;
              if ((!fullOrder.customer || !(fullOrder.customer as any).name) && customerId) {
                const cust = await (await import('../../services/customers')).getCustomerById(customerId);
                fullOrder.customer = cust ?? (cust as any).data ?? fullOrder.customer;
              } else if (fullOrder.customer && (fullOrder.customer as any).data) {
                fullOrder.customer = (fullOrder.customer as any).data;
              }
            } catch (e) {
              console.warn("No se pudo normalizar customer para factura:", e);
            }

            const asPdf = pdf(<InvoicePdfDocument order={fullOrder} />);
            const blob = await asPdf.toBlob();
            const filename = `factura-${fullOrder.orderCode || id}.pdf`;
            console.log("[Orders] Preparando subida de factura", { id, filename, size: blob.size, type: blob.type });
            const updated = await uploadOrderInvoice(id, blob, filename);
            setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
            setSelectedOrder((cur) => (cur && cur.id === id ? { ...cur, ...updated } : cur));
          } catch (err: any) {
            console.error("Error adjuntando factura:", err, err?.response?.data);
            alert("La orden se marcó como enviada, pero no se pudo adjuntar la factura. " + (err?.response?.data?.message || ""));
          }
        }
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert("No se pudo actualizar el estado. Verifica tu conexión o permisos.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-[#973c00]">📦 Órdenes</h1>

      <FiltersRow
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        onCreate={() => setShowCreateModal(true)}
      />

      <OrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        companyId={companyId}
        onCreated={fetchOrders}
      />

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdated={(updated) => {
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          setSelectedOrder(updated);
        }}
      />

      {loading ? (
        <div className="bg-white border border-gray-100 rounded-lg p-6 text-center shadow-sm">
          Cargando órdenes...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg p-6 text-center text-gray-600 shadow-sm">
          No se encontraron órdenes con los filtros aplicados.
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredOrders.map((order) => (
            <li
              key={order.id}
              className="border bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer"
              onClick={() => setSelectedOrder(order)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedOrder(order);
                }
              }}
              aria-label={`Ver detalles de ${order.orderCode}`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#973c00] truncate">{order.orderCode}</p>
                  <p className="text-sm text-gray-600">
                    Estado:{" "}
                    <span
                      className={`font-medium ${
                        order.status === "enviado"
                          ? "text-green-700"
                          : order.status === "en_proceso"
                          ? "text-yellow-700"
                          : "text-gray-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">{friendlyDate(order.createdAt)}</p>

                  <div className="mt-3">
                    <label className="sr-only">Cambiar estado</label>
                    <select
                      value={order.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(order.id, e.target.value);
                      }}
                      className="border px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      aria-label={`Cambiar estado de ${order.orderCode}`}
                    >
                      <option value="recibido">Recibido</option>
                      <option value="en_proceso">En proceso</option>
                      <option value="enviado">Enviado</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm text-gray-500">{/* placeholder cliente */}</div>

                  <div className="flex items-center gap-2">
                    {/* Botón estilizado que abre el modal de confirmación */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDeleteId(order.id);
                      }}
                      className="inline-flex items-center gap-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition focus:outline-none focus:ring-2 focus:ring-red-200"
                      aria-label={`Eliminar ${order.orderCode}`}
                      title="Eliminar orden"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 6h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 11v6M14 11v6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 6V4h6v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && filteredOrders.length > 0 && (
        <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
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

      {/* Modal de confirmación para eliminar */}
      {pendingDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 mx-4">
            <h3 id="delete-modal-title" className="text-lg font-semibold mb-2">Confirmar eliminación</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Estás seguro que quieres eliminar esta orden? Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300"
              >
                Cancelar
              </button>

              <button
                onClick={async () => {
                  if (!pendingDeleteId) return;
                  await handleDelete(pendingDeleteId);
                  setPendingDeleteId(null);
                }}
                disabled={deleting}
                className={`px-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  deleting ? "bg-red-400 text-white cursor-wait" : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}