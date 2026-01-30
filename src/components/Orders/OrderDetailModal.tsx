import React, { useState } from "react";
import { Order } from "../../types";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { useAuth } from "../../context/AuthContext";
import { uploadOrderInvoice } from "../../services/clientOrders";

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

  const OrderPdfDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Detalle de orden</Text>
            <Text>Código: {order.orderCode}</Text>
            <Text>Estado: {order.status}</Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text>Fecha: {new Date(order.createdAt).toLocaleDateString()}</Text>
            <Text>
              Cliente: {order.customer?.name ?? (`${order.user?.firstName ?? ""} ${order.user?.lastName ?? ""}`.trim() || "N/D")}
            </Text>
            <Text>Empresa: {companyToShow.tradeName}</Text>
            <Text>Email: {companyToShow.companyEmail ?? "N/D"}</Text>
            <Text>Teléfono: {companyToShow.companyPhone ?? "N/D"}</Text>
          </View>
        </View>

        {extendedOrder.description && (
          <View style={styles.section}>
            <Text style={{ fontWeight: "bold" }}>Descripción</Text>
            <Text>{extendedOrder.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={{ fontWeight: "bold", marginBottom: 6 }}>Productos</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.desc]}>Descripción</Text>
            <Text style={[styles.th, styles.qty]}>Cant.</Text>
            <Text style={[styles.th, styles.price]}>Subtotal</Text>
          </View>

          {order.items.map((item) => {
            const unit = safeNumber(item.unitPrice);
            const subtotal = unit * safeNumber(item.quantity);
            return (
              <View key={item.id} style={styles.row} wrap={false}>
                <Text style={styles.desc}>{item.product?.name ?? "Producto desconocido"}</Text>
                <Text style={styles.qty}>{safeNumber(item.quantity)}</Text>
                <Text style={styles.price}>{formatCurrency(subtotal)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(total)}</Text>
          </View>
          <View style={[styles.totalsRow, { fontWeight: "bold" }]}>
            <Text>Total</Text>
            <Text>{formatCurrency(total)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>Datos fiscales de la empresa:</Text>
          <Text style={{ fontSize: 10, color: "#444" }}>
            NIT: {companyToShow.taxId ?? "N/D"} — Dirección: {companyToShow.fiscalAddress ?? "N/D"}
          </Text>
          <Text style={{ fontSize: 9, color: "#666", marginTop: 10 }}>Generado por Finanphy</Text>
        </View>
      </Page>
    </Document>
  );

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
            
                  {!order.invoiceUrl && (
                    <button
                      onClick={async () => {
                        try {
                          setUploadingGenerated(true);
                          const asPdf = pdf(<OrderPdfDocument />);
                          const blob = await asPdf.toBlob();
                          const filename = `factura-${order.orderCode || order.id}.pdf`;
                          console.log("[OrderDetailModal] Subiendo factura generada", { filename, size: blob.size });
                          const updated = await uploadOrderInvoice(order.id, blob, filename);
                          onUpdated?.({ ...order, ...updated });
                          alert("Factura generada y subida correctamente.");
                        } catch (err: any) {
                          console.error("Error subiendo factura generada:", err, err?.response?.data);
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