import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL, // ahora usa la variable del .env
  headers: {
    Authorization: `Bearer ${process.env.REACT_APP_API_TOKEN}`, // el token que Melo te pasó
  },
});

export type Company = {
  id: number;
  tradeName: string;
  legalName: string;
  companyType: string;
  taxId: string;
  companyEmail: string;
  companyPhone: string;
  city: string;
  state: string;
  representativeName: string;
};

export const getCompanies = async (): Promise<Company[]> => {
  const res = await api.get("/companies");
  return res.data;
};

export const deleteCompany = async (id: number): Promise<void> => {
  await api.delete(`/companies/${id}`);
};
