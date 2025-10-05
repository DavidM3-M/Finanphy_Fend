import React, { useEffect, useState } from "react";
import {
  getAllOrders,
  deleteOrder,
  updateOrderStatus,
  Order,
} from "../services/clientOrders";
import OrderModal from "../components/OrderModal";
import OrderDetailModal from "../components/OrderDetailModal";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const companyId = "de4c3464-a06e-45a6-b1dd-2c03c2deb72c";

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getAllOrders();
      setOrders(res.data);
      setFilteredOrders(res.data);
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm("¿Seguro que quieres eliminar esta orden?");
    if (!confirm) return;

    try {
      await deleteOrder(id);
      fetchOrders();
    } catch (err) {
      console.error("Error al eliminar orden:", err);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
  try {
    await updateOrderStatus(id, status);
    await fetchOrders(); // ✅ refresca la lista
    } catch (err) {
        console.error("Error al actualizar estado:", err);
        alert("No se pudo actualizar el estado. Verifica tu conexión o permisos.");
    }
    };

  const applyFilters = () => {
    let filtered = [...orders];

    if (searchTerm) {
      filtered = filtered.filter(o =>
        o.orderCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(o => new Date(o.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      filtered = filtered.filter(o => new Date(o.createdAt) <= to);
    }

    setFilteredOrders(filtered);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, dateFrom, dateTo, orders]);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-[#973c00]">📦 Órdenes</h1>

      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <input
          type="text"
          placeholder="Buscar por código"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border px-3 py-2 rounded w-60"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border px-3 py-2 rounded w-40"
        >
          <option value="">Todos los estados</option>
          <option value="recibido">Recibido</option>
          <option value="en_proceso">En proceso</option>
          <option value="enviado">Enviado</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#fe9a00] text-white px-4 py-2 rounded"
        >
          + Nueva orden
        </button>
      </div>

      <OrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        companyId={companyId}
        onCreated={fetchOrders}
      />

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />

      {loading ? (
        <p>Cargando órdenes...</p>
      ) : filteredOrders.length === 0 ? (
        <p>No se encontraron órdenes con los filtros aplicados.</p>
      ) : (
        <ul className="space-y-4">
          {filteredOrders.map(order => (
            <li
              key={order.id}
              className="border p-4 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition"
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-[#973c00]">{order.orderCode}</p>
                  <p className="text-sm text-gray-600">Estado: {order.status}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>

                  <div className="mt-2">
                    <select
                      value={order.status}
                      onClick={e => e.stopPropagation()}
                      onChange={e => handleUpdateStatus(order.id, e.target.value)}
                      className="border px-2 py-1 rounded text-sm"
                    >
                      <option value="recibido">Recibido</option>
                      <option value="en_proceso">En proceso</option>
                      <option value="enviado">Enviado</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(order.id);
                  }}
                  className="text-red-600 hover:underline text-sm"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}