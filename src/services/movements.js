// src/services/movements.js
import api from "./api"; // tu instancia de axios ya configurada

/**
 * Obtener los movimientos recientes desde el backend
 * @param {number} limit - Cantidad de movimientos a traer (opcional)
 */
export const getRecentMovements = async (limit = 5) => {
  try {
    const response = await api.get(`/movimientos?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener movimientos recientes", error);
    throw error;
  }
};
