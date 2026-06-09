/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// User roles in the ERP Pro Max
export type UserRole =
  | 'Super Admin'
  | 'Owner'
  | 'Manager'
  | 'Accountant'
  | 'Cashier'
  | 'Salesperson'
  | 'Storekeeper';

export interface BusinessConfig {
  id: string;
  name: string;
  category: string;
  regNumber: string;
  tinNumber: string;
  vatNumber: string;
  address: string;
  region: string;
  district: string;
  country: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  description: string;
  logoUrl: string; // Base64 encoded or default asset
  unlimitedBranches: boolean;
  companyStamp: string; // Signature or base64 stamp text
  qrCodeSeed: string; // Used to authenticate PDF / Receipt invoices
  verificationCode: string; // Unique ERP License code
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  location: string;
  manager: string;
  phone: string;
}

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  salary: number;
  attendance: {
    [date: string]: 'Present' | 'Absent' | 'Leave' | 'Late';
  };
  leaveRequests: {
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
  }[];
  photoUrl: string;
}

export interface ProductVariant {
  name: string;
  sku: string;
  barcode: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  images: string[]; // List of base64 / urls
  videos: string[];
  sku: string;
  barcode: string;
  qrCode: string;
  category: string;
  brand: string;
  supplierId: string;
  manufacturer: string;
  serialNumber: string;
  batchNumber: string;
  expiryDate: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  taxRate: number; // e.g. 18 for VAT
  quantity: number; // global or original stock
  reorderLevel: number;
  // Dynamic branch stock mapping: { [branchId]: quantity }
  branchStock: { [branchId: string]: number };
  variants: ProductVariant[];
  color?: string;
  size?: string;
  unit?: string; // e.g. Pcs, Box, Kg
}

export interface Customer {
  id: string;
  fullName: string;
  companyName: string;
  tinNumber: string;
  vatNumber: string;
  regNumber: string;
  address: string;
  region: string;
  country: string;
  phone: string;
  email: string;
  photoUrl: string;
  loyaltyPoints: number;
  creditBalance: number;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  tin: string;
  phone: string;
  email: string;
  address: string;
  rating: number; // 1-5 stars
}

export type InvoiceStatus =
  | 'Draft'
  | 'Pending'
  | 'Sent'
  | 'Approved'
  | 'Partially Paid'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled'
  | 'Refunded';

export interface InvoiceItem {
  id: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  discount: number; // flat discount per item
  taxRate: number; // e.g. 18 for VAT
  total: number;
}

export interface Invoice {
  id: string; // Unique Invoice ID
  invoiceNumber: string; // Styled format, e.g. INV-2026-0001
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  refNumber: string;
  salesperson: string;
  branchId: string;
  customerId: string; // Links to Customer entry
  customerDetails: {
    fullName: string;
    companyName: string;
    tinNumber: string;
    vatNumber: string;
    regNumber: string;
    address: string;
    region: string;
    country: string;
    phone: string;
    email: string;
  };
  status: InvoiceStatus;
  items: InvoiceItem[];
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  amountPaid: number;
  paymentMethod: string;
  customerSignature: string; // Base64 signature path or SVG drawing data
  sellerSignature: string;
  verificationId: string; // Generated signature hash
  qrCodeUrl: string; // Base64 QR code or generated SVG verify seed
}

export interface POSOrder {
  id: string;
  items: {
    product: Product;
    quantity: number;
    discount: number; // percentage or amount
    variantIndex?: number;
  }[];
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  status: 'Hold' | 'Completed';
  date: string;
}

export interface Transaction {
  id: string;
  type: 'Sale' | 'Purchase' | 'Expense' | 'Refund' | 'Branch_Transfer';
  date: string;
  categoryId: string; // POS Sale, Supplier Purchase, Rent, etc.
  description: string;
  amount: number;
  paymentMethod: string;
  referenceId: string; // Link to Invoice ID, Purchase Order ID, etc.
  branchId: string;
  performedBy: string; // Employee ID or User email
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  branchId: string;
  date: string;
  status: 'Draft' | 'Sent' | 'Received' | 'Cancelled';
  items: {
    productId: string;
    quantity: number;
    costPrice: number;
  }[];
  grandTotal: number;
}

export interface StockTransfer {
  id: string;
  date: string;
  fromBranchId: string;
  toBranchId: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'Pending' | 'Completed';
  initiatedBy: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'Low_Stock' | 'New_Sale' | 'New_Customer' | 'Overdue_Invoice' | 'Payment_Alert';
  date: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'TRANSFER';
  entity: string; // e.g., 'Product', 'Invoice', 'Branch', etc.
  details: string;
  user: string; // User email or role name
}

export type ThemeMode = 'light' | 'dark' | 'luxury-gold' | 'neon-cyan' | 'high-density' | 'glass-future';
export type LanguageCode = 'EN' | 'SW';

export type PDFTemplateType =
  | 'Modern'
  | 'Corporate'
  | 'Executive'
  | 'Premium'
  | 'Retail'
  | 'Minimal'
  | 'Luxury';

export type ExcelTemplateType =
  | 'Summary Report'
  | 'Detailed Report'
  | 'Accounting Report'
  | 'Tax Report'
  | 'Inventory Report';
