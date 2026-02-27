import React, { useMemo, useState, useEffect } from "react";
import OrderEditModal from "./OrderEditModal";
import { Order } from "../../types";
import { getCustomerPayments, createCustomerPayment } from "../../services/customers";
import { uploadOrderInvoice, getOrderById as getOrderByIdService } from "../../services/clientOrders";
import { useToast } from "../ui/ToastProvider";
import { generatePaymentReceiptBlob } from "../Customers/PaymentReceiptPdf";
import { pdf } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "./InvoicePdf";

interface Props {
  order?: Order | null;
  onClose: () => void;
  onUpdated?: (updated: Order) => void;
}

export default function OrderDetailModal({ order, onClose, onUpdated }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const { push } = useToast();

  const API_BASE = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
  const resolveUrl = (url?: string | null | undefined) => {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(String(url))) return String(url);
    if (!API_BASE) return url;
    if (!String(url).startsWith("/")) return `${API_BASE}/uploads/${url}`;
    return `${API_BASE}${url}`;
  };

  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState<number | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [customPayMethod, setCustomPayMethod] = useState<string>("");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [paymentEvidence, setPaymentEvidence] = useState<File | null>(null);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!order || !order.customer?.id) return setCustomerPayments([]);
      setLoadingPayments(true);
      try {
        const payments = await getCustomerPayments(order.customer.id);
        if (!mounted) return;
        setCustomerPayments(Array.isArray(payments) ? payments : []);
      } catch (e) {
        console.warn('No se pudieron cargar abonos del cliente', e);
        if (mounted) setCustomerPayments([]);
      } finally {
        if (mounted) setLoadingPayments(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [order]);

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

  const safeNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const total = useMemo(() => {
    if (!order) return 0;
    return (order.items || []).reduce((acc, it) => acc + safeNumber(it.unitPrice) * safeNumber(it.quantity), 0);
  }, [order]);

  if (!order) return null;
  const invoiceResolved = resolveUrl(order.invoiceUrl ?? order.invoiceFilename);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg w-full max-w-6xl shadow-xl transform transition-all duration-300 max-h-[90vh] overflow-hidden flex flex-col relative">
        <button onClick={onClose} aria-label="Cerrar" title="Cerrar" className="absolute right-4 top-4 rounded-full w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white">✕</button>
        <button onClick={() => setShowEdit(true)} aria-label="Editar" title="Editar" className="absolute right-16 top-4 rounded-full w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h6M6 7v10a2 2 0 0 0 2 2h10M6 7l6 6" />
          </svg>
        </button>

        <div className="overflow-auto max-h-[80vh]">
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#973c00]">📄 Detalle de orden</h2>
              <div className="text-sm text-gray-600">{order.orderCode} · {new Date(order.createdAt).toLocaleString()}</div>
            </div>

            <div />
          </div>

          <div className="grid gap-6 px-6 py-4" style={{ gridTemplateColumns: '1fr 360px' }}>
            <div>
              <div className="border p-6 rounded-lg bg-white overflow-auto" style={{ maxHeight: '60vh' }}>
                <h3 className="font-semibold mb-4">🛒 Productos</h3>
                <ul className="space-y-2">
                  {(order.items || []).map((item) => {
                    const unit = safeNumber(item.unitPrice);
                    const subtotal = unit * safeNumber(item.quantity);
                    return (
                      <li key={item.id} className="border p-3 rounded">
                        <p className="font-semibold">{item.product?.name ?? 'Producto'}</p>
                        <p className="text-sm text-gray-600">Cantidad: {safeNumber(item.quantity)}</p>
                        <p className="text-sm text-gray-600">Precio unitario: COP {unit.toLocaleString('es-CO')}</p>
                        <p className="text-sm text-gray-600">Subtotal: COP {subtotal.toLocaleString('es-CO')}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {order.description && (
                <div className="mt-4 bg-white border p-4 rounded">
                  <h4 className="font-semibold">Descripción</h4>
                  <p className="text-sm text-gray-700">{order.description}</p>
                </div>
              )}

              {/* Abonos: lista y formulario */}
              <section className="mt-4 bg-white border p-4 rounded">
                <h4 className="font-semibold mb-3">Abonos</h4>
                {loadingPayments ? (
                  <div className="text-sm text-gray-600">Cargando abonos...</div>
                ) : (
                  <div className="space-y-2">
                    {customerPayments.length === 0 ? (
                      <div className="text-sm text-gray-500">No hay abonos registrados para este cliente.</div>
                    ) : (
                      <ul className="space-y-2 max-h-40 overflow-auto">
                        {customerPayments.filter(p => (p.orderId === order.id) || (p.orderCode === order.orderCode) || (p.metadata && p.metadata.orderId === order.id)).map((p: any) => {
                          const evidenceCandidates = [p.evidenceUrl, p.evidence?.url, p.metadata?.evidenceUrl, p.metadata?.evidence?.url, p.fileUrl, p.evidenceUrlFull, p.url];
                          const evidenceRaw = evidenceCandidates.find((c) => c);
                          const evidenceUrl = resolveUrl((evidenceRaw && typeof evidenceRaw === 'string') ? evidenceRaw : undefined);
                          return (
                            <li key={p.id || `${p.amount}-${p.createdAt}`} className="p-2 border rounded bg-white text-sm flex items-center justify-between">
                              <div>
                                <div className="font-semibold">COP {Number(p.amount).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div>
                                <div className="text-xs text-gray-600">{new Date(p.paidAt || p.createdAt).toLocaleString()}</div>
                                <div className="text-xs text-gray-600">Método: {p.paymentMethod || '-'}</div>
                              </div>
                              <div className="text-xs text-right">
                                <div>Ref: {p.orderCode ?? p.orderId ?? (p.metadata?.orderId ?? '-')}</div>
                                {evidenceUrl && (<div><a href={evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Comprobante</a></div>)}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                <div className="mt-4 border-t pt-3">
                  <h5 className="font-medium mb-2">Registrar abono</h5>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <input type="number" placeholder="Monto" value={paymentAmount ?? ""} onChange={e => setPaymentAmount(e.target.value ? Number(e.target.value) : undefined)} className="border px-2 py-1 rounded" />
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="border px-2 py-1 rounded">
                      <option value="">Seleccionar método</option>
                      {paymentMethods.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      {!paymentMethods.includes('Otro') && <option value="Otro">Otro</option>}
                    </select>
                    <input placeholder="Nota (opcional)" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} className="border px-2 py-1 rounded" />
                  </div>
                  {paymentMethod === 'Otro' && (
                    <div className="mt-2">
                      <input placeholder="Método personalizado" value={customPayMethod} onChange={e => setCustomPayMethod(e.target.value)} className="border px-2 py-1 rounded w-full" />
                    </div>
                  )}
                  <div className="mt-2">
                    <label className="block text-sm text-gray-600 mb-1">Evidencia (opcional, PDF/imagen)</label>
                    <input type="file" accept="application/pdf,image/*" onChange={e => setPaymentEvidence(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
                    {paymentEvidence && <div className="text-xs text-gray-600 mt-1">Archivo: {paymentEvidence.name} ({(paymentEvidence.size/1024).toFixed(1)} KB)</div>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={async () => {
                      if (!order?.customer?.id) { push('No hay cliente asociado a la orden.', { type: 'error' }); return; }
                      if (!paymentAmount || Number(paymentAmount) <= 0) { push('Ingresa un monto válido.', { type: 'warning' }); return; }
                      setCreatingPayment(true);
                      try {
                        let evidenceToSend: File | Blob | undefined = paymentEvidence ?? undefined;
                        if (!evidenceToSend) {
                          try {
                            const company = (order.company as any) ?? { tradeName: 'Empresa' };
                            const customer = order.customer as any;
                            const chosenPaymentMethod = paymentMethod === 'Otro' ? (customPayMethod || undefined) : (paymentMethod || undefined);
                            const tmpPayment = { amount: paymentAmount, paidAt: new Date().toISOString(), paymentMethod: chosenPaymentMethod, note: paymentNote, order };
                            const blob = await generatePaymentReceiptBlob({ company, customer, payment: tmpPayment });
                            const file = new File([blob], `comprobante-${order.orderCode || order.id}.pdf`, { type: 'application/pdf' });
                            evidenceToSend = file;
                          } catch (e) {
                            console.warn('No se pudo generar comprobante PDF automáticamente', e);
                          }
                        }

                        const chosenPaymentMethod = paymentMethod === 'Otro' ? (customPayMethod || undefined) : (paymentMethod || undefined);
                        const payload: any = {
                          amount: Number(paymentAmount),
                          paymentMethod: chosenPaymentMethod,
                          note: paymentNote || undefined,
                          orderId: order.id,
                        };

                        await createCustomerPayment(order.customer.id, payload, evidenceToSend as any);
                        push('Abono registrado correctamente.', { type: 'success' });
                        // refresh payments
                        const payments = await getCustomerPayments(order.customer.id);
                        setCustomerPayments(Array.isArray(payments) ? payments : []);
                        setPaymentAmount(undefined);
                        setPaymentMethod('');
                        setCustomPayMethod('');
                        setPaymentNote('');
                        setPaymentEvidence(null);
                        // optionally refresh order via callback
                        try { if (onUpdated) {
                          const upd = await (await import('../../services/clientOrders')).getOrderById(order.id);
                          const payload = (upd as any).data as any;
                          const fullOrder = payload?.data ? payload.data : payload;
                          onUpdated(fullOrder as Order);
                        } } catch (e) { /* ignore */ }
                      } catch (err: any) {
                        console.error('Error registrando abono:', err);
                        push('No se pudo registrar el abono. ' + (err?.response?.data?.message || ''), { type: 'error' });
                      } finally {
                        setCreatingPayment(false);
                      }
                    }} disabled={creatingPayment} className="px-3 py-1.5 bg-green-600 text-white rounded disabled:opacity-60">{creatingPayment ? 'Registrando...' : 'Registrar abono'}</button>
                    <button onClick={() => { setPaymentAmount(undefined); setPaymentMethod(''); setPaymentNote(''); setPaymentEvidence(null); }} className="px-3 py-1.5 bg-gray-200 rounded">Limpiar</button>
                  </div>
                </div>
              </section>
            </div>

            <aside className="border p-6 rounded-lg bg-yellow-50">
              <h3 className="font-semibold mb-4">Resumen</h3>
              <div className="text-right font-bold text-[#973c00] text-2xl">Total: COP {total.toLocaleString('es-CO')}</div>

              <div className="mt-4 text-sm text-gray-700">
                <div>Estado: <span className="font-semibold">{order.status === 'enviado' ? 'Enviado' : 'Sin enviar'}</span></div>
                <div className="mt-2">Cliente: <span className="font-medium">{order.customer?.name ?? 'N/D'}</span></div>
                {(order.invoiceFilename || order.invoiceUrl) && (
                  <div className="mt-3">
                    <div className="text-xs text-[#7b3306]">Factura: {order.invoiceFilename ?? ''}</div>
                    {invoiceResolved && (
                      <div><a href={invoiceResolved} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Ver factura</a></div>
                    )}
                    {order.invoiceUploadedAt && <div className="text-xs text-gray-500">Subida: {new Date(order.invoiceUploadedAt).toLocaleString()}</div>}
                  </div>
                )}

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700">Subir / actualizar factura (PDF)</label>
                  <input type="file" accept="application/pdf" onChange={e => setInvoiceFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} className="mt-1" />
                  {invoiceFile && <div className="text-xs text-gray-600 mt-1">Seleccionado: {invoiceFile.name}</div>}
                  <div className="mt-2">
                    <button disabled={!invoiceFile || uploadingInvoice} onClick={async () => {
                      if (!order?.id) { push('Orden sin id, no se puede subir factura.', { type: 'error' }); return; }
                      if (!invoiceFile) { push('Selecciona un archivo PDF.', { type: 'warning' }); return; }
                      setUploadingInvoice(true);
                      try {
                        await uploadOrderInvoice(order.id, invoiceFile, invoiceFile.name);
                        push('Factura subida correctamente.', { type: 'success' });
                        // refresh order and propagate
                        try {
                          const res: any = await getOrderByIdService(order.id);
                          const payload = (res as any).data as any;
                          const fullOrder = payload?.data ? payload.data : payload;
                          onUpdated?.(fullOrder as Order);
                        } catch (e) {
                          console.warn('No se pudo refrescar la orden tras subir factura', e);
                        }
                        setInvoiceFile(null);
                      } catch (err: any) {
                        console.error('Error subiendo factura:', err);
                        push('No se pudo subir la factura. ' + (err?.response?.data?.message || ''), { type: 'error' });
                      } finally {
                        setUploadingInvoice(false);
                      }
                    }} className="mt-1 px-3 py-1.5 bg-indigo-600 text-white rounded disabled:opacity-60">{uploadingInvoice ? 'Subiendo...' : 'Subir factura'}</button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="px-6 py-4 border-t" />

        {showEdit && (
          <OrderEditModal
            isOpen={showEdit}
            onClose={() => setShowEdit(false)}
            orderToEdit={order}
            onUpdated={async (updated) => {
              setShowEdit(false);
              onUpdated?.(updated);
              try {
                if (updated && updated.id && updated.status !== 'enviado') {
                  // generate and upload invoice after edit (same flow)
                  let res: any = null;
                  try { res = await getOrderByIdService(updated.id); } catch (e) { res = updated; }
                  const payloadAny = (res as any).data as any;
                  const fullOrder = payloadAny?.data ? payloadAny.data : (payloadAny ?? res ?? updated);
                  const normalizeOrderForPdf = (o: any) => {
                    const companySrc = o.company ?? {};
                    const customerSrc = o.customer ?? {};
                    let itemsSrc = Array.isArray(o.items) ? o.items : [];
                    const company = {
                      tradeName: companySrc.tradeName ?? companySrc.legalName ?? "",
                      legalName: companySrc.legalName ?? companySrc.tradeName ?? "",
                      taxId: companySrc.taxId ?? "",
                      fiscalAddress: companySrc.fiscalAddress ?? "",
                      city: companySrc.city ?? "",
                      state: companySrc.state ?? "",
                      companyEmail: companySrc.companyEmail ?? "",
                      companyPhone: companySrc.companyPhone ?? "",
                    };
                    const customer = {
                      name: customerSrc.name ?? `${customerSrc.firstName ?? ''} ${customerSrc.lastName ?? ''}`.trim(),
                      documentId: customerSrc.documentId ?? '',
                      email: customerSrc.email ?? '',
                      phone: customerSrc.phone ?? '',
                      address: customerSrc.address ?? '',
                    };
                    const items = itemsSrc.map((it: any) => ({
                      id: it.id ?? it.productId ?? Math.random().toString(36).slice(2,9),
                      product: { name: it.product?.name ?? it.productName ?? it.name ?? '' },
                      unitPrice: Number(it.unitPrice ?? it.price ?? it.product?.price ?? 0),
                      quantity: Number(it.quantity ?? it.qty ?? 1),
                    }));
                    return { ...o, company, customer, items, createdAt: o.createdAt ?? new Date().toISOString() };
                  };
                  const pdfOrderToSend = normalizeOrderForPdf(fullOrder);
                  try {
                    const asPdf = pdf(<InvoicePdfDocument order={pdfOrderToSend} />);
                    const blob = await asPdf.toBlob();
                    const filename = `factura-${pdfOrderToSend.orderCode || pdfOrderToSend.id}.pdf`;
                    await uploadOrderInvoice(pdfOrderToSend.id, blob, filename);
                    push('Factura actualizada automáticamente.', { type: 'success' });
                    try {
                      const res2: any = await getOrderByIdService(pdfOrderToSend.id);
                      const payload2 = (res2 as any).data as any;
                      const refreshed = payload2?.data ? payload2.data : payload2 ?? res2;
                      onUpdated?.(refreshed as Order);
                    } catch (e) { /* ignore refresh error */ }
                  } catch (e) {
                    console.error('Error generando/subiendo factura automática tras edición:', e);
                    push('No se pudo generar/subir la factura automáticamente.', { type: 'error' });
                  }
                }
              } catch (err) {
                console.error('Error en onUpdated auto-invoice flow:', err);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
