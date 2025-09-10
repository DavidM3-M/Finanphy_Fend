import { api } from "../api/axiosClient";

// Intenta soportar distintas claves de token
const extractToken = (data) =>
  data?.token || data?.access_token || data?.jwt || data?.data?.token || null;

export async function login({ email, password }) {
  const { data } = await api.post("/auth/login", { email, password });
  const token = extractToken(data);
  if (!token) throw new Error("Login OK pero no llegó token en la respuesta");
  localStorage.setItem("token", token);
  return data;
}

export async function registerUser(user) {
  const { data } = await api.post("/auth/register", user);
  return data;
}
