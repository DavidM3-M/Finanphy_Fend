import React, { useRef, useState } from "react";
import { Order } from "../../types";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { useAuth } from "../../context/AuthContext";
import { deleteOrderInvoice, uploadOrderInvoice } from "../../services/clientOrders";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState(false);

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

  const handlePreviewPdf = async () => {
    try {
      const asPdf = pdf(<OrderPdfDocument />);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error("Error generando PDF:", err);
    }
  };

  const handleUploadInvoice = async (file: File) => {
    if (!order) return;
    setUploading(true);
    try {
      const updated = await uploadOrderInvoice(order.id, file, file.name);
      onUpdated?.({ ...order, ...updated });
    } catch (err) {
      console.error("Error subiendo factura:", err);
      alert("No se pudo adjuntar la factura.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteInvoice = async () => {
    if (!order) return;
    setDeletingInvoice(true);
    try {
      const updated = await deleteOrderInvoice(order.id);
      onUpdated?.({ ...order, ...updated });
    } catch (err) {
      console.error("Error eliminando factura:", err);
      alert("No se pudo eliminar la factura.");
    } finally {
      setDeletingInvoice(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const asPdf = pdf(<OrderPdfDocument />);
      const blob = await asPdf.toBlob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const filename = `orden-${order.orderCode || order.id}.pdf`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
    } catch (err) {
      console.error("Error descargando PDF:", err);
    }
  };

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
                    {order.invoiceFilename ?? "Adjunto"}
                  </span>
                ) : (
                  <span>Sin adjunto</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {order.invoiceUrl && (
                  <a
                    href={order.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded text-sm font-semibold bg-gradient-to-r from-[#f6c453] to-[#fe9a00] text-white shadow hover:from-[#f0b842] hover:to-[#e27b00]"
                  >
                    Ver factura
                  </a>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadInvoice(file);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded text-sm font-semibold bg-gradient-to-r from-[#ffe08a] to-[#ffb900] text-[#7b3306] shadow hover:from-[#ffda70] hover:to-[#eaa200] disabled:opacity-60"
                >
                  {uploading ? "Subiendo..." : "Adjuntar factura"}
                </button>
                {order.invoiceUrl && (
                  <button
                    onClick={handleDeleteInvoice}
                    disabled={deletingInvoice}
                    className="px-3 py-1.5 bg-red-600 text-white rounded text-sm shadow hover:bg-red-700 disabled:opacity-60"
                  >
                    {deletingInvoice ? "Eliminando..." : "Eliminar factura"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={handlePreviewPdf} className="px-4 py-2 bg-blue-600 text-white rounded">
            Previsualizar PDF
          </button>
          <button onClick={handleDownloadPdf} className="px-4 py-2 bg-indigo-600 text-white rounded">
            Descargar PDF
          </button>
          <button onClick={onClose} className="text-sm text-gray-600 hover:underline">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}