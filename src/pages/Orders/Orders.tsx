// src/pages/Orders.tsx

import React, { useEffect, useState } from "react";
import type { PaginatedMeta } from "../../types";
import {
  getAllOrders,
  deleteOrder,
  updateOrderStatus,
  Order,
  uploadOrderInvoice,
} from "../../services/clientOrders";
import OrderModal from "../../components/Orders/OrderModal";
import OrderDetailModal from "../../components/Orders/OrderDetailModal";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/* ---------- Helpers ---------- */
const friendlyDate = (iso: string) => {
  try {
    return format(parseISO(iso), "EEE, d 'de' MMM yyyy", { locale: es });
  } catch {
    return new Date(iso).toLocaleDateString();
  }
};

const invoiceStyles = StyleSheet.create({
  page: { padding: 20, fontSize: 11, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "bold", color: "#973c00" },
  section: { marginVertical: 6 },
  infoBlock: { flexDirection: "row", gap: 12 },
  infoBox: { flex: 1, padding: 8, borderWidth: 1, borderColor: "#f2e6c9", borderRadius: 6 },
  infoTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 4, color: "#973c00" },
  infoRow: { marginBottom: 2 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, paddingBottom: 6, marginTop: 6 },
  th: { fontWeight: "bold" },
  row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  desc: { width: "55%" },
  qty: { width: "15%", textAlign: "right" },
  price: { width: "30%", textAlign: "right" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: "40%" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
});

const formatCurrency = (n: number) =>
  `COP ${n.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;

function InvoicePdfDocument({ order }: { order: Order }) {
  const safeNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const total = order.items.reduce((sum, item) => {
    const unit = safeNumber(item.unitPrice);
    const qty = safeNumber(item.quantity);
    return sum + unit * qty;
  }, 0);

  const customerName = order.customer?.name
    ?? `${order.user?.firstName ?? ""} ${order.user?.lastName ?? ""}`.trim();

  const company = order.company;
  const customer = order.customer;

  return (
    <Document>
      <Page size="A4" style={invoiceStyles.page}>
        <View style={invoiceStyles.header}>
          <View>
            <Text style={invoiceStyles.title}>Factura de venta</Text>
            <Text>Código: {order.orderCode}</Text>
            <Text>Estado: {order.status}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>Fecha: {new Date(order.createdAt).toLocaleDateString()}</Text>
            <Text>Cliente: {customerName || "N/D"}</Text>
            <Text>Empresa: {company?.tradeName ?? "N/D"}</Text>
            <Text>Email: {company?.companyEmail ?? "N/D"}</Text>
            <Text>Teléfono: {company?.companyPhone ?? "N/D"}</Text>
          </View>
        </View>

        <View style={[invoiceStyles.section, invoiceStyles.infoBlock]}>
          <View style={invoiceStyles.infoBox}>
            <Text style={invoiceStyles.infoTitle}>Datos de la empresa</Text>
            <Text style={invoiceStyles.infoRow}>Razón social: {company?.legalName ?? company?.tradeName ?? "N/D"}</Text>
            <Text style={invoiceStyles.infoRow}>NIT: {company?.taxId ?? "N/D"}</Text>
            <Text style={invoiceStyles.infoRow}>Dirección: {company?.fiscalAddress ?? "N/D"}</Text>
            <Text style={invoiceStyles.infoRow}>Ciudad: {company?.city ?? "N/D"}</Text>
            <Text style={invoiceStyles.infoRow}>Estado: {company?.state ?? "N/D"}</Text>
            <Text style={invoiceStyles.infoRow}>Email: {company?.companyEmail ?? "N/D"}</Text>
            <Text style={invoiceStyles.infoRow}>Teléfono: {company?.companyPhone ?? "N/D"}</Text>
          </View>

          <View style={invoiceStyles.infoBox}>
            <Text style={invoiceStyles.infoTitle}>Datos del cliente</Text>
            <Text style={invoiceStyles.infoRow}>Nombre: {customerName || "N/D"}</Text>
            <Text style={invoiceStyles.infoRow}>Documento: {customer?.documentId ?? "N/D"}</Text>
            <Text style={invoiceStyles.infoRow}>Email: {customer?.email ?? "N/D"}</Text>
            <Text style={invoiceStyles.infoRow}>Teléfono: {customer?.phone ?? "N/D"}</Text>
            <Text style={invoiceStyles.infoRow}>Dirección: {customer?.address ?? "N/D"}</Text>
          </View>
        </View>

        {order.description && (
          <View style={invoiceStyles.section}>
            <Text style={{ fontWeight: "bold" }}>Descripción</Text>
            <Text>{order.description}</Text>
          </View>
        )}

        <View style={invoiceStyles.section}>
          <Text style={{ fontWeight: "bold", marginBottom: 6 }}>Productos</Text>

          <View style={invoiceStyles.tableHeader}>
            <Text style={[invoiceStyles.th, invoiceStyles.desc]}>Descripción</Text>
            <Text style={[invoiceStyles.th, invoiceStyles.qty]}>Cant.</Text>
            <Text style={[invoiceStyles.th, invoiceStyles.price]}>Subtotal</Text>
          </View>

          {order.items.map((item) => {
            const unit = safeNumber(item.unitPrice);
            const subtotal = unit * safeNumber(item.quantity);
            return (
              <View key={item.id} style={invoiceStyles.row} wrap={false}>
                <Text style={invoiceStyles.desc}>{item.product?.name ?? "Producto"}</Text>
                <Text style={invoiceStyles.qty}>{safeNumber(item.quantity)}</Text>
                <Text style={invoiceStyles.price}>{formatCurrency(subtotal)}</Text>
              </View>
            );
          })}
        </View>

        <View style={invoiceStyles.totals}>
          <View style={invoiceStyles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(total)}</Text>
          </View>
          <View style={[invoiceStyles.totalsRow, { fontWeight: "bold" }]}
          >
            <Text>Total</Text>
            <Text>{formatCurrency(total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

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
  const pageSize = 10;
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

  const fetchOrders = async () => {
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
  };

  useEffect(() => {
    fetchOrders();
  }, [page, pageSize, searchTerm, statusFilter, dateFrom, dateTo]);

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
        const orderToInvoice = orders.find((o) => o.id === id);
        if (orderToInvoice && !orderToInvoice.invoiceUrl) {
          try {
            const asPdf = pdf(<InvoicePdfDocument order={orderToInvoice} />);
            const blob = await asPdf.toBlob();
            const filename = `factura-${orderToInvoice.orderCode || id}.pdf`;
            const updated = await uploadOrderInvoice(id, blob, filename);
            setOrders((prev) =>
              prev.map((o) => (o.id === id ? { ...o, ...updated } : o))
            );
            setSelectedOrder((cur) => (cur && cur.id === id ? { ...cur, ...updated } : cur));
          } catch (err) {
            console.error("Error adjuntando factura:", err);
            alert("La orden se marcó como enviada, pero no se pudo adjuntar la factura.");
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