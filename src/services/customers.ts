import api from "./api";
import type { Customer } from "../types";

function authHeader() {
  const token = localStorage.getItem("token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const createCustomer = async (payload: Partial<Customer>) => {
  const res = await api.post<Customer>("/customers", payload, { headers: { ...authHeader() } });
  return res.data;
};

export const getCustomers = async (companyId?: string) => {
  const res = await api.get<Customer[]>("/customers", {
    params: companyId ? { companyId } : undefined,
    headers: { ...authHeader() },
  });
  return res.data;
};

export const getCustomerById = async (id: string) => {
  const res = await api.get<Customer>(`/customers/${id}`, { headers: { ...authHeader() } });
  return res.data;
};

export const getCustomerPayments = async (customerId: string) => {
  const res = await api.get<any[]>(`/customers/${customerId}/payments`, {
    headers: { ...authHeader() },
  });
  return res.data;
};

export const getCustomerDebtSummary = async (customerId: string) => {
  const res = await api.get<any>(`/customers/${customerId}/debt-summary`, { headers: { ...authHeader() } });
  return res.data;
};

export const updateCustomer = async (id: string, payload: Partial<Customer>) => {
  const res = await api.put<Customer>(`/customers/${id}`, payload, { headers: { ...authHeader() } });
  return res.data;
};

export const deleteCustomer = async (id: string) => {
  await api.delete(`/customers/${id}`, { headers: { ...authHeader() } });
};

export const createCustomerPayment = async (
  customerId: string,
  payload: {
    amount: number;
    paidAt?: string;
    paymentMethod?: string;
    note?: string;
    orderId?: string;
  },
  evidenceFile?: File | Blob,
) => {
  // If an evidence file is provided, send multipart/form-data
  if (evidenceFile) {
    const form = new FormData();
    form.append("amount", String(payload.amount));
    if (payload.paidAt) form.append("paidAt", payload.paidAt);
    if (payload.paymentMethod) form.append("paymentMethod", payload.paymentMethod);
    if (payload.note) form.append("note", payload.note);
    if (payload.orderId) form.append("orderId", payload.orderId);
    form.append("evidence", evidenceFile, (evidenceFile as any)?.name ?? "evidence");
    const res = await api.post(`/customers/${customerId}/payments`, form, {
      headers: { ...authHeader() },
    });
    return res.data;
  }

  const res = await api.post(`/customers/${customerId}/payments`, payload, { headers: { ...authHeader() } });
  return res.data;
};
