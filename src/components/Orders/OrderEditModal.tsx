import React, { useEffect, useState } from "react";
import { updateOrder, getOrderById } from "../../services/clientOrders";
import { getCustomers } from "../../services/customers";
import { Customer, Order } from "../../types";
import { useToast } from "../ui/ToastProvider";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderToEdit: Order;
  onUpdated?: (updated: Order) => void;
}

export default function OrderEditModal({ isOpen, onClose, orderToEdit, onUpdated }: Props) {
  const { push } = useToast();
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [description, setDescription] = useState<string>(orderToEdit?.description ?? "");
  const [customerId, setCustomerId] = useState<string>(orderToEdit?.customer?.id ?? "");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDescription(orderToEdit?.description ?? "");
    setCustomerId(orderToEdit?.customer?.id ?? "");
    setItems(Array.isArray(orderToEdit?.items) ? orderToEdit.items.map(it => ({ productId: it.productId ?? (it as any).product?.id, quantity: Number(it.quantity ?? 1) })) : []);
    if (orderToEdit?.company?.id) {
      getCustomers(orderToEdit.company.id).then((res: any) => setCustomers(Array.isArray(res) ? res : [])).catch(() => setCustomers([]));
    }
  }, [isOpen, orderToEdit]);

  const changeQty = (index: number, qty: number) => {
    const copy = [...items];
    copy[index] = { ...copy[index], quantity: qty };
    setItems(copy);
  };

  const handleSave = async () => {
    if (!orderToEdit?.id) { push('Orden inválida.', { type: 'error' }); return; }
    setSaving(true);
    try {
      const payload: any = {
        items: items.map(i => ({ productId: i.productId, quantity: Number(i.quantity || 0) })),
        description: description?.trim() || undefined,
        customerId: customerId || undefined,
      };
      const updated = await updateOrder(orderToEdit.id, payload);
      // Attempt to fetch full order
      try {
        const res = await getOrderById(orderToEdit.id);
        const payloadAny = (res as any).data as any;
        const fullOrder = payloadAny?.data ? payloadAny.data : payloadAny ?? res;
        onUpdated?.(fullOrder as Order);
      } catch (e) {
        onUpdated?.(updated as Order);
      }
      push('Orden actualizada correctamente.', { type: 'success' });
      onClose();
    } catch (err: any) {
      console.error('Error updating order:', err);
      push('No se pudo actualizar la orden. ' + (err?.response?.data?.message || ''), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-xl max-h-[90vh] overflow-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Editar orden {orderToEdit.orderCode}</h3>
          <button onClick={onClose} className="text-gray-600">Cerrar</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded px-2 py-1" rows={2} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cliente</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border rounded px-2 py-1">
              <option value="">Sin cliente</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <h4 className="font-medium">Productos</h4>
            <div className="space-y-2 mt-2">
              {items.map((it, idx) => (
                <div key={it.productId} className="flex items-center justify-between border p-2 rounded">
                  <div className="text-sm">{(orderToEdit.items && orderToEdit.items[idx] && orderToEdit.items[idx].product?.name) || it.productId}</div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={it.quantity} onChange={e => changeQty(idx, Number(e.target.value || 0))} className="w-20 border rounded px-2 py-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1.5 bg-gray-200 rounded">Cancelar</button>
            <button disabled={saving} onClick={handleSave} className="px-3 py-1.5 bg-blue-600 text-white rounded">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
