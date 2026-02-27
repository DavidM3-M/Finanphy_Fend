import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { Company, Customer } from "../../types";

const styles = StyleSheet.create({
  page: { fontSize: 11, padding: 20 },
  header: { fontSize: 14, marginBottom: 8, fontWeight: "bold" },
  section: { marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontWeight: "bold" },
});

export function PaymentReceiptDocument({ company, customer, payment, order }: { company: Company; customer: Customer; payment: any; order?: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>COMPROBANTE DE ABONO</Text>

        {/* Emisor / Receptor */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Empresa:</Text>
            <Text>{company.tradeName || company.legalName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>NIT / Identificación:</Text>
            <Text>{(company as any).taxId ?? (company as any).nit ?? 'N/D'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dirección fiscal:</Text>
            <Text>{(company as any).fiscalAddress ?? (company as any).address ?? 'N/D'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cliente:</Text>
            <Text>{customer.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Documento cliente:</Text>
            <Text>{(customer as any).documentId ?? '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Comprobante N°:</Text>
            <Text>{payment.id ?? payment.reference ?? `PA-${payment.createdAt ? new Date(payment.createdAt).getTime() : Date.now()}`}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha emisión:</Text>
            <Text>{payment.paidAt || payment.createdAt || new Date().toISOString()}</Text>
          </View>
        </View>

        {/* Orden y productos (si aplica) */}
        {order && (
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>Orden vinculada:</Text>
              <Text>{order.orderCode ?? order.code ?? '-'}</Text>
            </View>
            {Array.isArray(order.items) && order.items.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.label}>Productos:</Text>
                {order.items.map((it: any, idx: number) => (
                  <View key={idx} style={styles.row}>
                    <Text>{it.product?.name ?? it.productName ?? it.name ?? ('Producto ' + (it.productId ?? idx + 1))}</Text>
                    <Text>{(Number(it.quantity) || 0)} x {Number(it.unitPrice || it.price || 0).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Monto (numérico):</Text>
            <Text>{Number(payment.amount).toFixed(2)} COP</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Monto (letras):</Text>
            <Text>{numberToSpanishWords(Number(payment.amount))} COP</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Método de pago:</Text>
            <Text>{payment.paymentMethod || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Referencia / Nota:</Text>
            <Text>{payment.note || '-'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text>Este comprobante sirve como constancia de pago. La información aquí contenida es válida para efectos contables y tributarios. Conserva este documento como soporte de la transacción.</Text>
        </View>

        <View style={{ marginTop: 18 }}>
          <View style={styles.row}>
            <Text>___________________________</Text>
            <Text>___________________________</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Firma representante</Text>
            <Text style={styles.label}>Firma cliente</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function generatePaymentReceiptBlob({ company, customer, payment }: { company: Company; customer: Customer; payment: any }) {
  const asPdf = pdf(<PaymentReceiptDocument company={company} customer={customer} payment={payment} order={payment.order} />);
  const blob = await asPdf.toBlob();
  return blob;
}

// Simple number to Spanish words (handles up to millions reasonably)
function numberToSpanishWords(amount: number): string {
  if (!Number.isFinite(amount) || isNaN(amount)) return '';
  const entero = Math.floor(Math.abs(amount));
  const pesos = entero;
  const unidades = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciseis','diecisiete','dieciocho','diecinueve'];
  const decenas = ['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];

  function sectionToWords(n: number): string {
    if (n < 20) return unidades[n];
    if (n < 100) {
      const d = Math.floor(n/10);
      const r = n % 10;
      if (d === 2 && r > 0) return 'veinti' + unidades[r];
      return decenas[d] + (r ? ' y ' + unidades[r] : '');
    }
    if (n < 1000) {
      const c = Math.floor(n/100);
      const r = n % 100;
      const centenas: any = {1:'ciento',2:'doscientos',3:'trescientos',4:'cuatrocientos',5:'quinientos',6:'seiscientos',7:'setecientos',8:'ochocientos',9:'novecientos'};
      if (n === 100) return 'cien';
      return (centenas[c] || '') + (r ? ' ' + sectionToWords(r) : '');
    }
    if (n < 1000000) {
      const miles = Math.floor(n/1000);
      const r = n % 1000;
      const milesText = (miles === 1) ? 'mil' : sectionToWords(miles) + ' mil';
      return milesText + (r ? ' ' + sectionToWords(r) : '');
    }
    const millones = Math.floor(n/1000000);
    const r = n % 1000000;
    const millonesText = (millones === 1) ? 'un millón' : sectionToWords(millones) + ' millones';
    return millonesText + (r ? ' ' + numberToSpanishWords(r) : '');
  }

  const sign = amount < 0 ? 'menos ' : '';
  const words = sectionToWords(pesos) || 'cero';
  const decimals = Math.round((Math.abs(amount) - entero) * 100);
  const centsText = decimals > 0 ? ` con ${decimals}/100` : '';
  return (sign + words).replace(/\buno mil\b/, 'un mil') + centsText;
}
