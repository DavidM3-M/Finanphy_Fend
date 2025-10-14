// src/components/OrderModal.tsx
import React, { useEffect, useState } from "react";
import { createOrder } from "../services/clientOrders";
import { getProducts } from "../services/products";
import { Product } from "../types";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onCreated: () => void;
}

export default function OrderModal({ isOpen, onClose, companyId, onCreated }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<{ product: Product; quantity: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getProducts().then(setProducts);
      setSelected([]);
      setSearchTerm("");
      setDescription("");
    }
  }, [isOpen]);

  const handleAdd = (product: Product) => {
    if (selected.find(i => i.product.id === product.id)) return;
    setSelected([...selected, { product, quantity: 1 }]);
  };

  const handleQuantityChange = (index: number, value: number) => {
    const updated = [...selected];
    const max = updated[index].product.stock;
    updated[index].quantity = Math.min(Math.max(1, value), max);
    setSelected(updated);
  };

  const handleRemove = (index: number) => {
    const updated = [...selected];
    updated.splice(index, 1);
    setSelected(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const items = selected.map(i => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));
      // description no se envía al backend actualmente
      await createOrder({ companyId, items });
      onCreated();
      onClose();
    } catch (err) {
      console.error("Error al crear orden:", err);
    } finally {
      setLoading(false);
    }
  };

  const total = selected.reduce(
    (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  if (!isOpen) return null;

  /* ---------------------------
     Componente PDF (cliente)
     --------------------------- */
  const styles = StyleSheet.create({
    page: { padding: 20, fontSize: 11, fontFamily: "Helvetica" },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    title: { fontSize: 14, fontWeight: "bold" },
    section: { marginVertical: 6 },
    tableHeader: { flexDirection: "row", borderBottomWidth: 1, paddingBottom: 6, marginTop: 6 },
    th: { fontWeight: "bold" },
    row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
    desc: { width: "60%" },
    qty: { width: "15%", textAlign: "right" },
    price: { width: "25%", textAlign: "right" },
    totals: { marginTop: 8, alignSelf: "flex-end", width: "40%" },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  });

  function formatCurrency(n: number) {
    return `COP ${n.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;
  }

  // Documento que se renderiza con los datos actuales de la orden
  const OrderPdfDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Orden de compra</Text>
            <Text>Empresa: {companyId}</Text>
          </View>
          <View>
            <Text>Fecha: {new Date().toLocaleDateString()}</Text>
            <Text>Descripción: {description || "-"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: "bold", marginBottom: 6 }}>Items</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.desc]}>Descripción</Text>
            <Text style={[styles.th, styles.qty]}>Cant.</Text>
            <Text style={[styles.th, styles.price]}>Subtotal</Text>
          </View>

          {selected.map((it, idx) => {
            const subtotal = parseFloat(it.product.price) * it.quantity;
            return (
              <View key={idx} style={styles.row} wrap={false}>
                <Text style={styles.desc}>{it.product.name}</Text>
                <Text style={styles.qty}>{it.quantity}</Text>
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
      </Page>
    </Document>
  );

  /* -------------------------------------------
     Genera el PDF y abre una nueva pestaña con blob
     ------------------------------------------- */
  const handlePreviewPdf = async () => {
    try {
      // Si no hay items, no generar
      if (selected.length === 0) return;

      // Genera el PDF con @react-pdf/renderer -> blob
      const asPdf = pdf(<OrderPdfDocument />);
      const blob = await asPdf.toBlob();

      // Crea URL y abre en nueva pestaña
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      // opcional: revocar la URL después de un tiempo
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error("Error generando PDF:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl shadow-xl max-h-screen flex flex-col">
        {/* Encabezado */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-[#973c00] mb-4">Crear orden</h2>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción de la orden
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full border rounded px-3 py-2"
              placeholder="Ej. Pedido urgente para cliente VIP"
            />
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="grid grid-cols-2 gap-6 px-6 py-4 overflow-hidden flex-grow">
          {/* Panel izquierdo: productos */}
          <div className="overflow-y-auto pr-2">
            <h3 className="font-semibold mb-4">Productos</h3>

            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border px-3 py-2 rounded mb-4 w-full"
            />

            <div className="grid grid-cols-2 gap-4">
              {products
                .filter(p =>
                  p.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(product => (
                  <div
                    key={product.id}
                    className="border p-4 rounded shadow hover:shadow-lg cursor-pointer"
                    onClick={() => handleAdd(product)}
                  >
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-gray-600">Precio: COP {product.price}</p>
                    <p className="text-sm text-gray-600">Stock: {product.stock}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Panel derecho: selección */}
          <div className="bg-yellow-50 p-4 rounded-lg shadow-inner overflow-y-auto">
            <h3 className="font-semibold mb-4">Selección</h3>
            {selected.length === 0 ? (
              <p className="text-gray-500">No has seleccionado productos.</p>
            ) : (
              <ul className="space-y-4">
                {selected.map((item, index) => (
                  <li key={item.product.id} className="border p-4 rounded shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-gray-600">
                          Precio unitario: COP {item.product.price}
                        </p>
                        <p className="text-sm text-gray-600">
                          Stock disponible: {item.product.stock}
                        </p>
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
                          className="border px-2 py-1 rounded mt-2 w-20"
                        />
                      </div>
                      <button
                        onClick={() => handleRemove(index)}
                        className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 text-right font-bold text-[#973c00] text-lg">
              Total: COP {total.toLocaleString("es-CO")}
            </div>
          </div>
        </div>

        {/* Botones fijos */}
        <div className="px-6 py-4 border-t flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="bg-gray-300 text-gray-800 rounded-full w-10 h-10 flex items-center justify-center"
              title="Cancelar"
            >
              ⏴
            </button>

            {/* Botón de previsualizar PDF */}
            <button
              onClick={handlePreviewPdf}
              disabled={selected.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              title="Previsualizar PDF"
            >
              Previsualizar PDF
            </button>
          </div>

          <div>
            <button
              onClick={handleSubmit}
              disabled={loading || selected.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              {loading ? "Guardando..." : "Guardar orden"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}