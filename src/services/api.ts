// src/services/api.ts
import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "https://finanphy-dev-auth.onrender.com";

const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

export function setAuthToken(token: string) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete api.defaults.headers.common["Authorization"];
}

api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err.response?.status === 401) {
      // Opcional: redirigir o emitir evento de logout aquí
      console.warn("Token inválido o expirado");
    }
    return Promise.reject(err);
  }
);


export const getIncomes = () => api.get("/incomes");
export const getExpenses = () => api.get("/expenses");

export default api;