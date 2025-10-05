import api from "./api"; // tu instancia de Axios
import { Product } from "../types";

export const getProducts = async (): Promise<Product[]> => {
  const res = await api.get("/products");
  return res.data;
};