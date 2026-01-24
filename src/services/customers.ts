import api from "./api";
import { Customer } from "../types";

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

export const updateCustomer = async (id: string, payload: Partial<Customer>) => {
  const res = await api.put<Customer>(`/customers/${id}`, payload, { headers: { ...authHeader() } });
  return res.data;
};

export const deleteCustomer = async (id: string) => {
  await api.delete(`/customers/${id}`, { headers: { ...authHeader() } });
};
