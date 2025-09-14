import { useAuth } from "../context/AuthContext";

export const useApi = () => {
  const { token } = useAuth();

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const res = await fetch(`${process.env.REACT_APP_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) throw new Error("Error en la solicitud");
    return res.json();
  };

  return { fetchWithAuth };
};