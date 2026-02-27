import React, { useEffect, useState } from "react";
import { createOrder, uploadOrderInvoice, getOrderById, confirmOrder, getAllOrders, updateOrderStatus, updateOrder } from "../../services/clientOrders";
import { checkStock, getProducts, fetchAllProducts } from "../../services/products";
import { getCustomers, getCustomerById } from "../../services/customers";
import { Customer, Product, Order } from "../../types";
import { pdf, Document, Page, Text } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "../../components/Orders/InvoicePdf";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/ToastProvider";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string; // opcional, ya no se usará como fuente de verdad
  onCreated?: () => void;
  orderToEdit?: Order | null;
  onUpdated?: (updated: Order) => void;
}
export default function OrderModal({ isOpen, onClose, companyId, onCreated, orderToEdit, onUpdated }: Props) {
  const { company: authCompany } = useAuth();
  const { push } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<{ product: Product; quantity: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number | undefined>(undefined);
  const [payMethod, setPayMethod] = useState<string>("");
  const [markAsSent, setMarkAsSent] = useState<boolean>(false);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [customPayMethod, setCustomPayMethod] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      // load a quick page for initial UX
      getProducts({ page: 1, limit: 100, companyId: authCompany?.id }).then((res) =>
        setProducts(Array.isArray(res?.data) ? res.data : []),
      ).catch(() => setProducts([]));
      if (authCompany?.id) {
        getCustomers(authCompany.id).then((data) => setCustomers(Array.isArray(data) ? data : [])).catch(() => setCustomers([]));
      } else {
        setCustomers([]);
      }
      if (orderToEdit) {
        // populate fields from orderToEdit
        setSelected(Array.isArray(orderToEdit.items) ? orderToEdit.items.map((it: any) => ({ product: it.product, quantity: it.quantity })) : []);
        setDescription(orderToEdit.description ?? "");
        setCustomerId(orderToEdit.customer?.id ?? (orderToEdit as any).customerId ?? "");
        setCustomerDetails(orderToEdit.customer ?? null);
      } else {
        setSelected([]);
        setDescription("");
        setCustomerId("");
        setCustomerDetails(null);
      }
    }
  }, [isOpen, authCompany?.id]);

  useEffect(() => {
    let cancelled = false;
    const defaults = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];
    const tryFetch = async () => {
      try {
        const candidates = ["/payment-methods", "/api/payment-methods", "/settings/payment-methods"];
        for (const url of candidates) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              if (!cancelled) setPaymentMethods(Array.from(new Set(data.map(String))));
              return;
            }
          } catch (e) {
            // ignore and try next
          }
        }
      } catch (e) {
        // ignore
      }
      if (!cancelled) setPaymentMethods(Array.from(new Set(defaults)));
    };
    tryFetch();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!customerId) {
        setCustomerDetails(null);
        return;
      }
      try {
        const c = await getCustomerById(customerId);
        if (!cancelled) setCustomerDetails((c as any)?.data ?? c ?? null);
      } catch (e) {
        if (!cancelled) setCustomerDetails(null);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let t: number | undefined;
    const doSearch = async () => {
      if (!searchTerm || searchTerm.trim() === "") return;
      try {
        const maxPages = 20;
        const acc = await fetchAllProducts(searchTerm.trim(), authCompany?.id, maxPages);
        if (!cancelled) setProducts(acc ?? []);
      } catch (err) {
        console.warn("OrderModal search failed, falling back to first page", err);
        if (!cancelled) {
          const res = await getProducts({ page: 1, limit: 100, companyId: authCompany?.id });
          if (!cancelled) setProducts(Array.isArray(res?.data) ? res.data : []);
        }
      }
    };

    t = window.setTimeout(doSearch, 300) as unknown as number;
    return () => {
      cancelled = true;
      if (t) window.clearTimeout(t);
    };
  }, [searchTerm, isOpen, authCompany?.id]);

  const handleAdd = (product: Product) => {
    if (selected.find(i => i.product.id === product.id)) return;
    setSelected([...selected, { product, quantity: 1 }]);
  };

  const handleRemove = (index: number) => {
    const updated = [...selected];
    updated.splice(index, 1);
    setSelected(updated);
  };

  const safeNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const insufficient = selected
    .map(i => ({ name: i.product.name, requested: i.quantity, available: i.product.stock ?? 0 }))
    .filter(x => x.requested > x.available);

  const handleSubmit = async () => {
    if (!authCompany || !authCompany.id) {
      push("No se encontró la empresa del usuario autenticado. Verifica tu sesión.", { type: 'error' });
      return;
    }

    if (selected.length === 0) {
      push("Selecciona al menos un producto.", { type: 'warning' });
      return;
    }

    const insufficientLocal: Array<{ name: string; requested: number; available: number }> = [];
    selected.forEach(i => {
      const avail = (i.product.stock ?? 0);
      if (i.quantity > avail) insufficientLocal.push({ name: i.product.name, requested: i.quantity, available: avail });
    });
    if (insufficientLocal.length > 0) {
      const msg = insufficientLocal.map(x => `${x.name}: solicitado ${x.requested}, disponible ${x.available}`).join("\n");
      push("Stock insuficiente: " + msg, { type: 'error', ttl: 8000 });
      return;
    }

    setLoading(true);
    try {
      const items = selected.map(i => ({ productId: i.product.id, quantity: i.quantity }));

      const chosenPaymentMethod = payMethod === 'Otro' ? (customPayMethod || undefined) : (payMethod || undefined);
      const payload: any = {
        items,
        description: description?.trim() || undefined,
        companyId: authCompany.id,
        customerId: customerId || undefined,
        paymentMethod: chosenPaymentMethod,
      };

      try {
        const stockRes = await checkStock(items);
        const insufficientSrv = stockRes.filter((r) => !r.sufficient);
          if (insufficientSrv.length > 0) {
          const msg = insufficientSrv
            .map((x) => `${x.productId}: solicitado ${x.requested}, disponible ${x.available ?? "N/D"}`)
            .join("; ");
          push("Stock insuficiente: " + msg, { type: 'error', ttl: 8000 });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Error comprobando stock en servidor:", err);
      }

      let created: any = null;
      let createdId: string | null = null;
      if (orderToEdit && (orderToEdit as any).id) {
        // update existing order
        try {
          const updated = await updateOrder(orderToEdit.id, payload);
          created = updated;
          createdId = updated?.id ?? updated?.data?.id ?? null;
          console.log('[OrderModal] updateOrder returned:', updated);
        } catch (e) {
          console.error('Error updating order:', e);
          throw e;
        }
      } else {
        const cRes: any = await createOrder(payload);
        created = cRes;
        console.log('[OrderModal] createOrder returned:', created);
        createdId = created?.id ?? created?.data?.id ?? (created as any)?.orderId ?? null;
      }
      // Fallback: if API didn't return an id, try to resolve by orderCode
      if (!createdId && (created?.orderCode || created?.data?.orderCode)) {
        const code = created?.orderCode ?? created?.data?.orderCode;
        try {
          const searchRes: any = await getAllOrders({ search: code, companyId: authCompany?.id, limit: 10 });
          const payloadAny = (searchRes as any).data as any;
          const list = payloadAny?.data ?? payloadAny ?? searchRes;
          let found = null;
          if (Array.isArray(list)) found = list.find((o: any) => o.orderCode === code);
          else if (Array.isArray(list?.data)) found = list.data.find((o: any) => o.orderCode === code);
          if (found) createdId = found.id ?? found._id ?? found.orderId ?? null;
          console.log('[OrderModal] resolved createdId by orderCode:', createdId, { code, found });
        } catch (e) {
          console.warn('[OrderModal] fallback search by orderCode failed', e);
        }
      }

      if (!createdId) {
        console.warn("createOrder did not return an id, skipping confirmation step");
      }

      let confirmedOrder: any = null;
      try {
        if (createdId) {
          // If user provided a pay amount > 0, mark as paid for that amount; otherwise register as debt
          const amountNum = Number(payAmount ?? 0);
          const opts: any = amountNum > 0
            ? { paid: true, amount: amountNum, paymentMethod: chosenPaymentMethod }
            : { paid: false };
          const cRes = await confirmOrder(createdId, opts);
          confirmedOrder = cRes?.data ?? cRes;
        }
      } catch (err: any) {
        console.warn("No se pudo confirmar la orden automáticamente:", err);
      }

      // If requested, mark order as enviado (sent)
      try {
        if (createdId && markAsSent) {
          await updateOrderStatus(createdId, 'enviado');
          console.log('[OrderModal] order marked as enviado for', createdId);
        }
      } catch (e) {
        console.warn('[OrderModal] failed to mark order as enviado', e);
      }

      // Always try to fetch the fresh order from server after confirmation attempt
      let fullOrder: Order | null = null;
      try {
        if (createdId) {
          try {
            const res = await getOrderById(createdId);
            const payloadAny = (res as any).data as any;
            fullOrder = payloadAny?.data ? (payloadAny.data as Order) : (payloadAny as Order);
          } catch (fetchErr) {
            // if fetching fails, fallback to whatever confirm returned (if it's a full order)
            if (confirmedOrder && (confirmedOrder.items || confirmedOrder.orderCode || confirmedOrder.paymentStatus)) {
              fullOrder = confirmedOrder as Order;
            } else {
              console.warn('[OrderModal] no se pudo obtener la orden actualizada tras confirmar:', fetchErr);
            }
          }
        } else if (confirmedOrder && (confirmedOrder.items || confirmedOrder.orderCode || confirmedOrder.paymentStatus)) {
          fullOrder = confirmedOrder as Order;
        }

        if (!fullOrder) {
          console.warn("No se obtuvo la orden completa para generar factura, se omite la subida de factura.");
        } else {
          let pdfOrder: any = null;
          try {
            pdfOrder = JSON.parse(JSON.stringify(fullOrder));
          } catch (e) {
            pdfOrder = fullOrder as any;
          }

          try {
            // Ensure company object is populated for the PDF
            try {
              const companyId = (fullOrder as any).companyId ?? fullOrder.company?.id;
              if ((!fullOrder.company || !(fullOrder.company as any)?.tradeName) && companyId) {
                // dynamic import of api to avoid circulars
                const api = (await import("../../services/api")).default;
                const cRes = await api.get(`/companies/${companyId}`);
                fullOrder.company = cRes.data?.data ?? cRes.data ?? fullOrder.company;
              } else if (fullOrder.company && (fullOrder.company as any).data) {
                fullOrder.company = (fullOrder.company as any).data;
              }
            } catch (e) {
              console.warn("No se pudo obtener company adicional para la factura:", e);
            }

            // Ensure customer object is populated for the PDF
            try {
              const customerId = (fullOrder as any).customerId ?? (fullOrder.customer as any)?.id;
              if ((!fullOrder.customer || !(fullOrder.customer as any)?.name) && customerId) {
                const cust = await getCustomerById(customerId);
                fullOrder.customer = cust ?? (cust as any).data ?? fullOrder.customer;
              } else if (fullOrder.customer && (fullOrder.customer as any).data) {
                fullOrder.customer = (fullOrder.customer as any).data;
              }
            } catch (e) {
              console.warn('No se pudo obtener customer adicional para la factura:', e);
            }

            // Generate invoice using the full template and upload using fullOrder.id
            try {
              const normalizeOrderForPdf = (o: any) => {
                const companySrc = o.company ?? authCompany ?? {};
                const customerSrc = o.customer ?? customerDetails ?? {};
                let itemsSrc = Array.isArray(o.items) ? o.items : [];
                // fallback to selected items when API did not return items for newly created order
                if ((!itemsSrc || itemsSrc.length === 0) && Array.isArray(selected) && selected.length > 0) {
                  itemsSrc = selected.map(s => ({ product: s.product, quantity: s.quantity, unitPrice: s.product.price }));
                }

                const company = {
                  tradeName: companySrc.tradeName ?? companySrc.legalName ?? companySrc.name ?? "",
                  legalName: companySrc.legalName ?? companySrc.tradeName ?? companySrc.name ?? "",
                  taxId: companySrc.taxId ?? companySrc.nit ?? companySrc.documentId ?? "",
                  fiscalAddress: companySrc.fiscalAddress ?? companySrc.address ?? companySrc.street ?? "",
                  city: companySrc.city ?? companySrc.town ?? "",
                  state: companySrc.state ?? companySrc.region ?? "",
                  companyEmail: companySrc.companyEmail ?? companySrc.email ?? "",
                  companyPhone: companySrc.companyPhone ?? companySrc.phone ?? companySrc.telephone ?? "",
                };

                const customer = {
                  name: (customerSrc.name ?? `${customerSrc.firstName ?? ""} ${customerSrc.lastName ?? ""}`.trim()) || customerSrc.fullName || (customerDetails?.name ?? ""),
                  documentId: customerSrc.documentId ?? customerSrc.document ?? customerSrc.identification ?? "",
                  email: customerSrc.email ?? customerSrc.contactEmail ?? "",
                  phone: customerSrc.phone ?? customerSrc.contactPhone ?? "",
                  address: customerSrc.address ?? customerSrc.fiscalAddress ?? customerSrc.street ?? "",
                };

                const items = itemsSrc.map((it: any) => ({
                  id: it.id ?? it.itemId ?? it.productId ?? `${Math.random().toString(36).slice(2, 9)}`,
                  product: { name: it.product?.name ?? it.productName ?? it.name ?? (it.productId ? `Producto ${it.productId}` : "Producto") },
                  unitPrice: Number(it.unitPrice ?? it.price ?? it.product?.price ?? it.unit_price ?? 0),
                  quantity: Number(it.quantity ?? it.qty ?? it.amount ?? 1),
                }));

                const createdAt = o.createdAt ?? o.created_at ?? o.created ?? new Date().toISOString();

                return { ...o, createdAt, company, customer, items };
              };

              const pdfOrderToSend = normalizeOrderForPdf(fullOrder as any);
              console.log('[OrderModal] pdfOrderToSend sample:', { orderCode: pdfOrderToSend.orderCode, createdAt: pdfOrderToSend.createdAt, company: pdfOrderToSend.company, customer: pdfOrderToSend.customer, itemsCount: pdfOrderToSend.items.length });
              try { console.log('[OrderModal] pdfOrderToSend full:', JSON.stringify(pdfOrderToSend, null, 2)); } catch (e) {}

              const asPdf = pdf(<InvoicePdfDocument order={pdfOrderToSend} />);
              const blob = await asPdf.toBlob();
              const filename = `factura-${fullOrder.orderCode || fullOrder.id}.pdf`;
              const uploadId = fullOrder.id ?? createdId ?? null;
              if (!uploadId) {
                console.warn('[clientOrders] upload skipped: no order id available for upload', { fullOrder, createdId });
              } else {
                await uploadOrderInvoice(uploadId, blob, filename);
                console.log('Factura generada y subida correctamente para', uploadId);
              }
            } catch (errPdf) {
              console.error('Error generando/subiendo factura (PDF) con template:', errPdf);
              throw errPdf;
            }
          } catch (pdfErr: any) {
            console.error("Error generando/subiendo factura automática:", pdfErr);
          }
        }
      } catch (err: any) {
        console.error("Error generando/subiendo factura automática:", err, err?.response?.data);
        alert("Orden creada, pero no se pudo adjuntar la factura automáticamente. " + (err?.response?.data?.message || ""));
      }

      if (orderToEdit) {
        onUpdated?.(confirmedOrder ?? (created as any));
      } else {
        onCreated?.();
      }
      onClose();
    } catch (err) {
      console.error("Error al crear orden:", err);
      alert("Error al crear la orden");
    } finally {
      setLoading(false);
    }
  };

  const total = selected.reduce((sum, item) => sum + safeNumber(item.product.price) * safeNumber(item.quantity), 0);

  const handlePreviewPdf = async () => {
    try {
      if (selected.length === 0) return;
      const pdfOrder: any = {
        id: 'preview',
        orderCode: undefined,
        description,
        items: selected.map(s => ({ product: s.product, quantity: s.quantity })),
        total,
        customer: customerDetails ?? undefined,
        company: authCompany ?? undefined,
      };
      const asPdf = pdf(<InvoicePdfDocument order={pdfOrder} />);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error("Error generando PDF:", err);
      push("Error generando PDF", { type: 'error' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg w-full max-w-6xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col relative">
        <button onClick={onClose} aria-label="Cerrar" title="Cerrar" className="absolute right-4 top-4 rounded-full w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-700">✕</button>

        <div className="overflow-auto max-h-[72vh]">
          <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-[#973c00] mb-4">Crear orden</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción de la orden</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={255} className="w-full border rounded px-3 py-2" placeholder="Ej. Pedido urgente para cliente VIP" />
            <div className="text-xs text-gray-500 mt-1">{description.length}/255</div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="">Sin cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Monto a pagar ahora (dejar vacío para registrar como deuda)</label>
            <div className="grid grid-cols-2 gap-2 items-center">
              <input type="number" placeholder="0" value={payAmount ?? ""} onChange={e => setPayAmount(e.target.value ? Number(e.target.value) : undefined)} className="border px-2 py-1 rounded" />
              <div>
                {paymentMethods && paymentMethods.length > 0 ? (
                  <select value={payMethod || ""} onChange={e => {
                    const v = e.target.value;
                    setPayMethod(v);
                    if (v !== 'Otro') setCustomPayMethod('');
                  }} className="w-full border px-2 py-1 rounded">
                    <option value="">Seleccionar método</option>
                    {[...new Set([...paymentMethods, 'Otro'])].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input placeholder="Método (efectivo, transferencia...)" value={payMethod} onChange={e => setPayMethod(e.target.value)} className="border px-2 py-1 rounded w-full" />
                )}

                {payMethod === 'Otro' && (
                  <input placeholder="Indica el método" value={customPayMethod} onChange={e => setCustomPayMethod(e.target.value)} className="border px-2 py-1 rounded w-full mt-2" />
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="inline-flex items-center">
              <input type="checkbox" className="form-checkbox h-4 w-4 text-green-600" checked={markAsSent} onChange={e => setMarkAsSent(e.target.checked)} />
              <span className="ml-2 text-sm text-gray-700">Marcar orden como enviado</span>
            </label>
          </div>
        </div>

          <div className="grid gap-6 px-6 py-4" style={{ gridTemplateColumns: '1fr 420px' }}>
          <div className="pr-2">
            <div className="border p-6 rounded-lg shadow-md bg-white overflow-auto" style={{ maxHeight: '60vh' }}>
              <h3 className="font-semibold mb-4 text-lg">Productos</h3>
              <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border px-3 py-2 rounded mb-4 w-full" />
              <div className="flex flex-col space-y-2">
                {products
                  .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(product => (
                    <div key={product.id} className="border px-2 py-2 rounded-sm hover:shadow-sm cursor-pointer flex justify-between items-center min-h-[48px]" onClick={() => handleAdd(product)}>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-gray-600 mt-1">Precio: COP {product.price}</p>
                        <p className="text-xs text-gray-600">Stock: {product.stock}</p>
                      </div>
                      <div className="text-xs text-gray-600">Agregar</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="border p-6 rounded-lg shadow-md bg-yellow-50 overflow-auto" style={{ maxHeight: '60vh' }}>
            <h3 className="font-semibold mb-4 text-lg">Selección</h3>
            {insufficient.length > 0 && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                <strong>Stock insuficiente:</strong>
                <ul className="mt-2 text-sm">
                  {insufficient.map((x) => (
                    <li key={x.name}>{x.name}: solicitado {x.requested}, disponible {x.available}</li>
                  ))}
                </ul>
              </div>
            )}

            {selected.length === 0 ? (
              <p className="text-gray-500">No has seleccionado productos.</p>
            ) : (
              <ul className="space-y-2">
                {selected.map((item, index) => (
                  <li key={item.product.id} className="border px-2 py-2 rounded-sm shadow-sm bg-white flex items-center justify-between min-h-[44px]">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product.name}</p>
                      <p className="text-xs text-gray-600">Precio: COP {item.product.price} · Stock: {item.product.stock}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={item.product.stock}
                        value={selected[index].quantity || ""}
                        onChange={e => {
                          const raw = e.target.value;
                          const updated = [...selected];

                          if (raw === "") {
                            updated[index].quantity = 0;
                            setSelected(updated);
                            return;
                          }

                          const parsed = parseInt(raw, 10);
                          const max = item.product.stock;

                          if (!isNaN(parsed)) {
                            updated[index].quantity = Math.min(Math.max(1, parsed), max);
                            setSelected(updated);
                          }
                        }}
                        className="border px-2 py-1 rounded w-16 text-sm"
                      />
                      <button onClick={() => handleRemove(index)} className="bg-red-500 text-white rounded w-8 h-8 flex items-center justify-center text-sm" title="Eliminar">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 text-right font-bold text-[#973c00] text-2xl">Total: COP {total.toLocaleString("es-CO")}</div>
          </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end items-center gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handlePreviewPdf} disabled={selected.length === 0} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" title="Previsualizar PDF">Previsualizar PDF</button>
            <button onClick={handleSubmit} disabled={loading || selected.length === 0 || insufficient.length > 0} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">{loading ? "Guardando..." : "Guardar orden"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
