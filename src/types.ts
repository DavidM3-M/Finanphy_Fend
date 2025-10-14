export interface Company {
  id: string;
  userId: string;
  tradeName: string;
  legalName: string;
  companyType: string;
  taxId: string;
  taxRegistry: string;
  businessPurpose: string;
  companyEmail: string;
  companyPhone: string;
  fiscalAddress: string;
  city: string;
  state: string;
  representativeName: string;
  representativeDocument: string;
  incorporationDate: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  createdAt: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  price: string;
  cost: string;
  isPublic: boolean;
  isActive: boolean;
  stock: number;
  companyId: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  product: Product;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
}

export type OrderStatus = 'recibido' | 'en_proceso' | 'enviado';

export interface Order {
  id: string;
  orderCode: string;
  status: OrderStatus;
  createdAt: string;
  userId: string;
  company: Company;
  user?: User;
  items: OrderItem[];
  description?: string;
}

export interface OrderItemPayload {
  productId: string;
  quantity: number;
}

export interface OrderPayload {
  companyId: string;
  items: OrderItemPayload[];
}

// src/types/auth.ts
export interface CreateCompanyPayload {
  tradeName: string;
  legalName: string;
  companyType: string;
  taxId: string;
  taxRegistry?: string;
  businessPurpose?: string;
  companyEmail?: string;
  companyPhone?: string;
  fiscalAddress?: string;
  city?: string;
  state?: string;
  representativeName?: string;
  representativeDocument?: string;
  incorporationDate?: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company: CreateCompanyPayload;
}

