import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Order } from "../../types";

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
  desc: { width: "45%" },
  qty: { width: "15%", textAlign: "right" },
  unit: { width: "20%", textAlign: "right" },
  price: { width: "20%", textAlign: "right" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: "40%" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
});

const formatCurrency = (n: number) =>
  `COP ${n.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;

export function InvoicePdfDocument({ order }: { order: Order }) {
  const safeNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const total = order.items.reduce((sum, item) => {
    const unit = safeNumber(item.unitPrice);
    const qty = safeNumber(item.quantity);
    return sum + unit * qty;
  }, 0);

  const customerName =
    order.customer?.name ?? `${order.user?.firstName ?? ""} ${order.user?.lastName ?? ""}`.trim();

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
            <Text style={invoiceStyles.infoRow}>
              Razón social: {company?.legalName ?? company?.tradeName ?? "N/D"}
            </Text>
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
            <Text style={[invoiceStyles.th, invoiceStyles.unit]}>V. unitario</Text>
            <Text style={[invoiceStyles.th, invoiceStyles.price]}>Subtotal</Text>
          </View>

          {order.items.map((item) => {
            const unit = safeNumber(item.unitPrice);
            const subtotal = unit * safeNumber(item.quantity);
            return (
              <View key={item.id} style={invoiceStyles.row} wrap={false}>
                <Text style={invoiceStyles.desc}>{item.product?.name ?? "Producto"}</Text>
                <Text style={invoiceStyles.qty}>{safeNumber(item.quantity)}</Text>
                <Text style={invoiceStyles.unit}>{formatCurrency(unit)}</Text>
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
          <View style={[invoiceStyles.totalsRow, { fontWeight: "bold" }]}> 
            <Text>Total</Text>
            <Text>{formatCurrency(total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
