// src/components/OrderDetailModal.tsx
import React from "react";
import { Order } from "../types";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

interface Props {
  order: Order | null;
  onClose: () => void;
}

// Extensión local del tipo para evitar error TS
interface ExtendedOrder extends Order {
  description?: string;
}

export default function OrderDetailModal({ order, onClose }: Props) {
  if (!order) return null;

  const extendedOrder = order as ExtendedOrder;

  const total = order.items.reduce((sum, item) => {
    const subtotal = parseFloat(item.unitPrice) * item.quantity;
    return sum + subtotal;
  }, 0);

  // --- PDF styles and document (using @react-pdf/renderer) ---
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
            <Text>Cliente: {order.user?.firstName} {order.user?.lastName}</Text>
            <Text>Empresa: {order.company.tradeName}</Text>
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
            const subtotal = parseFloat(item.unitPrice) * item.quantity;
            return (
              <View key={item.id} style={styles.row} wrap={false}>
                <Text style={styles.desc}>{item.product.name}</Text>
                <Text style={styles.qty}>{item.quantity}</Text>
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

        <Text style={styles.footer}>Generado por Finanphy</Text>
      </Page>
    </Document>
  );

  // --- Handlers para generar y abrir/descargar PDF ---
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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl shadow-xl transform transition-all duration-300 scale-100 translate-y-0">
        <h2 className="text-xl font-bold mb-6 text-[#973c00]">📄 Detalle de orden</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* Productos */}
          <div>
            <h3 className="font-semibold mb-2">🛒 Productos</h3>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {order.items.map(item => (
                <li key={item.id} className="border p-3 rounded">
                  <p className="font-semibold">{item.product.name}</p>
                  <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                  <p className="text-sm text-gray-600">Precio unitario: COP {item.unitPrice}</p>
                  <p className="text-sm text-gray-600">
                    Subtotal: COP {(parseFloat(item.unitPrice) * item.quantity).toLocaleString("es-CO")}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Detalles adicionales */}
          <div className="bg-yellow-50 p-4 rounded-lg shadow-inner">
            <div className="space-y-2 mb-4">
              <p><strong>Código:</strong> {order.orderCode}</p>
              <p><strong>Estado:</strong> {order.status}</p>
              <p><strong>Fecha:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
              <p><strong>Cliente:</strong> {order.user?.firstName} {order.user?.lastName}</p>
              <p><strong>Empresa:</strong> {order.company.tradeName}</p>
              {extendedOrder.description && (
                <p><strong>Descripción:</strong> {extendedOrder.description}</p>
              )}
            </div>

            <div className="text-right font-bold text-[#973c00]">
              Total: COP {total.toLocaleString("es-CO")}
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