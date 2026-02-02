// src/context/CartContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "../components/Orders/InvoicePdf";
import type { Product, OrderPayload } from "../types";
import * as ordersService from "../services/clientOrders"; // ajusta path si necesario

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  sku?: string | null;
  companyId?: string | null;
};

type CartState = {
  items: CartItem[];
  open: boolean;
  adding: boolean;
  companyId: string | null; // empresa asociada al carrito
};

type CartActions = {
  addItem: (p: Product, qty?: number, opts?: { open?: boolean }) => void;
  updateQuantity: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  toggleOpen: (v?: boolean) => void;
  createOrder: (extras?: { description?: string }) => Promise<any>;
};

const KEY = "finanphy:cart:v1";

const CartContext = createContext<(CartState & CartActions) | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { items: [], open: false, adding: false, companyId: null };
      const parsed = JSON.parse(raw);
      return { items: parsed.items ?? [], open: false, adding: false, companyId: parsed.companyId ?? null };
    } catch {
      return { items: [], open: false, adding: false, companyId: null };
    }
  });

  // persist + sync
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ items: state.items, companyId: state.companyId }));
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setState((s) => ({ ...s, items: parsed.items ?? [], companyId: parsed.companyId ?? null }));
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [state.items, state.companyId]);

  // addItem: ahora no abre el panel por defecto.
  const addItem = useCallback((p: Product, qty = 1, opts: { open?: boolean } = { open: false }) => {
    setState((s) => {
      const prodCompany = p.companyId ?? null;

      // If cart has companyId and differs from product, reset cart (prevent mixing companies)
      if (s.companyId && prodCompany && s.companyId !== prodCompany) {
        // simple policy: clear and start new cart for new company
        return {
          items: [
            {
              productId: p.id,
              name: p.name,
              price: Number(p.price) || 0,
              quantity: qty,
              image: (p as any).imageUrl ?? null,
              sku: (p as any).sku ?? null,
              companyId: prodCompany,
            },
          ],
          open: !!opts.open,
          adding: s.adding,
          companyId: prodCompany,
        };
      }

      const found = s.items.find((it) => it.productId === p.id);
      let next: CartItem[];
      if (found) {
        next = s.items.map((it) => (it.productId === p.id ? { ...it, quantity: it.quantity + qty } : it));
      } else {
        next = [
          ...s.items,
          {
            productId: p.id,
            name: p.name,
            price: Number(p.price) || 0,
            quantity: qty,
            image: (p as any).imageUrl ?? null,
            sku: (p as any).sku ?? null,
            companyId: prodCompany,
          },
        ];
      }
      return { ...s, items: next, open: !!opts.open || s.open, companyId: s.companyId ?? prodCompany };
    });
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    setState((s) => ({
      ...s,
      items: s.items
        .map((it) => (it.productId === productId ? { ...it, quantity: Math.max(0, qty) } : it))
        .filter((it) => it.quantity > 0),
    }));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setState((s) => {
      const nextItems = s.items.filter((it) => it.productId !== productId);
      const nextCompany = nextItems.length === 0 ? null : s.companyId;
      return { ...s, items: nextItems, companyId: nextCompany };
    });
  }, []);

  const clear = useCallback(() => setState((s) => ({ ...s, items: [], companyId: null })), []);

  const toggleOpen = useCallback((v?: boolean) => {
    setState((s) => ({ ...s, open: typeof v === "boolean" ? v : !s.open }));
  }, []);

  const createOrder = useCallback(async (extras?: { description?: string }) => {
    setState((s) => ({ ...s, adding: true }));
    try {
      if (state.items.length === 0) throw new Error("Carrito vacío");
      const companyId = state.companyId;
      if (!companyId) throw new Error("companyId no definido en el carrito");

      const payload: OrderPayload = {
        companyId,
        items: state.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
      };

      if (extras?.description) (payload as any).description = extras.description;

      // llamamos a tu servicio existente
      const created: any = await ordersService.createOrder(payload);

      // intentar generar y subir factura automáticamente (no bloqueante para el flujo)
      try {
        const asPdf = pdf(<InvoicePdfDocument order={created} />);
        const blob = await asPdf.toBlob();
        const filename = `factura-${created.orderCode || created.id}.pdf`;
        console.log("[CartContext] Subiendo factura generada", { filename, size: blob.size });
        await ordersService.uploadOrderInvoice(created.id, blob, filename);
      } catch (err) {
        console.warn("No se pudo generar/subir factura automática desde CartContext:", err);
      }

      // limpia carrito en éxito
      setState({ items: [], open: false, adding: false, companyId: null });

      return created;
    } catch (err) {
      setState((s) => ({ ...s, adding: false }));
      throw err;
    }
  }, [state.items, state.companyId]);

  const value = useMemo(
    () => ({ ...state, addItem, updateQuantity, removeItem, clear, toggleOpen, createOrder }),
    [state, addItem, updateQuantity, removeItem, clear, toggleOpen, createOrder]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}