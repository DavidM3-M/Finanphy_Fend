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

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
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

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  customer?: Customer;
  items: OrderItem[];
  description?: string;
  invoiceUrl?: string | null;
  invoiceFilename?: string | null;
  invoiceMime?: string | null;
  invoiceSize?: number | null;
  invoiceUploadedAt?: string | null;
}

export interface OrderItemPayload {
  productId: string;
  quantity: number;
}

export interface OrderPayload {
  companyId: string;
  items: OrderItemPayload[];
  customerId?: string;
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

