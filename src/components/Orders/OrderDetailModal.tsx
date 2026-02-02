import React, { useState } from "react";
import { Order } from "../../types";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { useAuth } from "../../context/AuthContext";
import { uploadOrderInvoice, getOrderById, deleteOrderInvoice } from "../../services/clientOrders";
import { InvoicePdfDocument } from "./InvoicePdf";
import api from "../../services/api";
import { getCustomerById } from "../../services/customers";

interface Props {
  order: Order | null;
  onClose: () => void;
  onUpdated?: (updated: Order) => void;
}

interface ExtendedOrder extends Order {
  description?: string;
}

export default function OrderDetailModal({ order, onClose, onUpdated }: Props) {
  const { company: authCompany } = useAuth();
  const [uploadingGenerated, setUploadingGenerated] = useState(false);
  const API_BASE = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
  const resolveUrl = (url?: string | null) => {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url)) return url;
    if (!API_BASE) return url;
    if (!url.startsWith("/")) return `${API_BASE}/uploads/${url}`;
    return `${API_BASE}${url}`;
  };

  if (!order) return null;

  const companyToShow =
    authCompany ?? order.company ?? {
      id: "",
      tradeName: "Empresa no disponible",
      taxId: "",
      companyEmail: undefined,
      companyPhone: undefined,
      fiscalAddress: undefined,
    };

  const extendedOrder = order as ExtendedOrder;

  const safeNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const total = order.items.reduce((sum, item) => {
    const unit = safeNumber(item.unitPrice);
    const qty = safeNumber(item.quantity);
    return sum + unit * qty;
  }, 0);

  const styles = StyleSheet.create({
    page: { padding: 20, fontSize: 11, fontFamily: "Helvetica" },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    title: { fontSize: 16, fontWeight: "bold", color: "#973c00" },
    section: { marginVertical: 6 },
    tableHeader: { flexDirection: "row", borderBottomWidth: 1, paddingBottom: 6, marginTop: 6 },
    th: { fontWeight: "bold" },
    row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
    desc: { width: "55%" },
    qty: { width: "15%", textAlign: "right" },
    price: { width: "30%", textAlign: "right" },
    totals: { marginTop: 12, alignSelf: "flex-end", width: "40%" },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
    footer: { marginTop: 20, fontSize: 9, color: "#666" },
  });

  function formatCurrency(n: number) {
    return `COP ${n.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;
  }

  // `renderPdfDocument` removed — `InvoicePdfDocument` is used for PDF generation to keep a single implementation.

  // Preview/download helpers removed (not used here).

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999] transition-opacity duration-300">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-xl transform transition-all duration-300 scale-100 translate-y-0">
        <h2 className="text-xl font-bold mb-6 text-[#973c00]">📄 Detalle de orden</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">🛒 Productos</h3>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {order.items.map((item) => {
                const unit = safeNumber(item.unitPrice);
                const subtotal = unit * safeNumber(item.quantity);
                return (
                  <li key={item.id} className="border p-3 rounded">
                    <p className="font-semibold">{item.product?.name ?? "Producto desconocido"}</p>
                    <p className="text-sm text-gray-600">Cantidad: {safeNumber(item.quantity)}</p>
                    <p className="text-sm text-gray-600">Precio unitario: COP {unit}</p>
                    <p className="text-sm text-gray-600">Subtotal: COP {subtotal.toLocaleString("es-CO")}</p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg shadow-inner">
            <div className="space-y-2 mb-4">
              <p>
                <strong>Código:</strong> {order.orderCode}
              </p>
              <p>
                <strong>Estado:</strong> {order.status}
              </p>
              <p>
                <strong>Fecha:</strong> {new Date(order.createdAt).toLocaleDateString()}
              </p>
              <p>
                <strong>Cliente:</strong> {order.customer?.name ?? (`${order.user?.firstName ?? ""} ${order.user?.lastName ?? ""}`.trim() || "N/D")}
              </p>
              <p>
                <strong>Empresa:</strong> {companyToShow.tradeName}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Email:</strong> {companyToShow.companyEmail ?? "N/D"}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Teléfono:</strong> {companyToShow.companyPhone ?? "N/D"}
              </p>
              {extendedOrder.description && (
                <p>
                  <strong>Descripción:</strong> {extendedOrder.description}
                </p>
              )}
            </div>

            <div className="text-right font-bold text-[#973c00]">Total: COP {total.toLocaleString("es-CO")}</div>

              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  <strong>Factura:</strong>
                  {order.invoiceUrl ? (
                    <span className="text-xs text-[#7b3306]">
                      {order.invoiceFilename ?? "Factura generada"}
                    </span>
                  ) : (
                    <span>Sin factura generada</span>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  {order.invoiceUrl && (
                    <a
                      href={resolveUrl(order.invoiceUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded text-sm font-bold bg-gradient-to-r from-[#f6c453] to-[#fe9a00] text-white shadow hover:from-[#f0b842] hover:to-[#e27b00]"
                    >
                      Ver factura
                    </a>
                  )}
            
                  {!order.invoiceUrl ? (
                    <button
                      onClick={async () => {
                          try {
                            setUploadingGenerated(true);
                            // Ensure company/customer normalization if needed
                            const maybeOrder = { ...order } as Order;
                            if (maybeOrder.company && (maybeOrder.company as any).data) {
                              maybeOrder.company = (maybeOrder.company as any).data;
                            }
                            if (!maybeOrder.customer && (maybeOrder as any).customerId) {
                              try {
                                const cust = await getCustomerById((maybeOrder as any).customerId);
                                maybeOrder.customer = cust;
                              } catch (e) {
                                // ignore
                              }
                            }

                            const asPdf = pdf(<InvoicePdfDocument order={maybeOrder} />);
                            const blob = await asPdf.toBlob();
                            const filename = `factura-${maybeOrder.orderCode || maybeOrder.id}.pdf`;
                            const updated = await uploadOrderInvoice(maybeOrder.id, blob, filename);
                            onUpdated?.({ ...maybeOrder, ...updated });
                            alert("Factura generada y subida correctamente.");
                          } catch (err: any) {
                            console.error("Error subiendo factura generada:", err?.response?.data ?? err);
                            alert("No se pudo subir la factura generada. " + (err?.response?.data?.message || ""));
                          } finally {
                            setUploadingGenerated(false);
                          }
                      }}
                      disabled={uploadingGenerated}
                      className="px-3 py-1.5 rounded text-sm font-semibold bg-green-600 text-white shadow disabled:opacity-60"
                    >
                      {uploadingGenerated ? "Subiendo..." : "Subir factura generada"}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!window.confirm("¿Eliminar la factura? Esta acción no se puede deshacer.")) return;
                          try {
                            setUploadingGenerated(true);
                            await deleteOrderInvoice(order.id);
                            onUpdated?.({ ...order, invoiceUrl: null, invoiceFilename: undefined });
                            alert("Factura eliminada.");
                          } catch (err: any) {
                            console.error("Error eliminando factura:", err?.response?.data ?? err);
                            alert("No se pudo eliminar la factura. " + (err?.response?.data?.message || ""));
                          } finally {
                            setUploadingGenerated(false);
                          }
                        }}
                        disabled={uploadingGenerated}
                        className="px-3 py-1.5 rounded text-sm font-semibold bg-red-600 text-white shadow disabled:opacity-60"
                      >
                        {uploadingGenerated ? "Procesando..." : "Eliminar factura"}
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            setUploadingGenerated(true);
                            // Fetch full order to ensure company/customer data present
                            const res = await getOrderById(order.id);
                            const payload = res.data as any;
                            const fullOrder = (payload && payload.data) ? (payload.data as Order) : (payload as Order);

                            // Normalize company response shape
                            try {
                              const companyId = (fullOrder as any).companyId ?? fullOrder.company?.id;
                              if ((!fullOrder.company || !(fullOrder.company as any).tradeName) && companyId) {
                                const cRes = await api.get(`/companies/${companyId}`);
                                fullOrder.company = cRes.data?.data ?? cRes.data;
                              } else if (fullOrder.company && (fullOrder.company as any).data) {
                                fullOrder.company = (fullOrder.company as any).data;
                              }
                            } catch (e) {
                              console.warn("No se pudo obtener company adicional:", e);
                            }

                            // Normalize customer
                            try {
                              const customerId = (fullOrder as any).customerId ?? (fullOrder.customer as any)?.id;
                              if ((!fullOrder.customer || !(fullOrder.customer as any).name) && customerId) {
                                const cust = await getCustomerById(customerId);
                                fullOrder.customer = cust ?? (cust as any).data ?? fullOrder.customer;
                              } else if (fullOrder.customer && (fullOrder.customer as any).data) {
                                fullOrder.customer = (fullOrder.customer as any).data;
                              }
                            } catch (e) {
                              console.warn("No se pudo obtener customer adicional:", e);
                            }

                            const asPdf = pdf(<InvoicePdfDocument order={fullOrder} />);
                            const blob = await asPdf.toBlob();
                            const filename = `factura-${fullOrder.orderCode || fullOrder.id}.pdf`;
                            const updated = await uploadOrderInvoice(fullOrder.id, blob, filename);
                            onUpdated?.({ ...fullOrder, ...updated });
                            alert("Factura regenerada y reemplazada correctamente.");
                          } catch (err: any) {
                            console.error("Error regenerando factura:", err?.response?.data ?? err);
                            alert("No se pudo regenerar la factura. " + (err?.response?.data?.message || ""));
                          } finally {
                            setUploadingGenerated(false);
                          }
                        }}
                        disabled={uploadingGenerated}
                        className="px-3 py-1.5 rounded text-sm font-semibold bg-amber-600 text-white shadow disabled:opacity-60"
                      >
                        {uploadingGenerated ? "Procesando..." : "Regenerar"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}