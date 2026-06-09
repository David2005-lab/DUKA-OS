/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BusinessConfig,
  Branch,
  Employee,
  Product,
  Customer,
  Supplier,
  Invoice,
  Transaction,
  PurchaseOrder,
  StockTransfer,
  Notification,
  AuditLog,
  UserRole,
  InvoiceStatus,
  ThemeMode,
  LanguageCode
} from './types';

// Storage keys
const KEYS = {
  PROFILE: 'SmartERP_Profile',
  BRANCHES: 'SmartERP_Branches',
  EMPLOYEES: 'SmartERP_Employees',
  PRODUCTS: 'SmartERP_Products',
  CUSTOMERS: 'SmartERP_Customers',
  SUPPLIERS: 'SmartERP_Suppliers',
  INVOICES: 'SmartERP_Invoices',
  TRANSACTIONS: 'SmartERP_Transactions',
  PURCHASES: 'SmartERP_Purchases',
  TRANSFERS: 'SmartERP_Transfers',
  NOTIFICATIONS: 'SmartERP_Notifications',
  AUDIT: 'SmartERP_Audit',
  SESSION_USER: 'SmartERP_SessionUser',
  SESSION_USER_ROLE: 'SmartERP_SessionUserRole',
  SESSION_BRANCH: 'SmartERP_SessionBranch',
  LANGUAGE: 'SmartERP_Language',
  THEME_MODE: 'SmartERP_ThemeMode'
};

// Simple helper to load / save
const load = <T>(key: string, fallback: T): T => {
  const data = localStorage.getItem(key);
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch (err) {
    return fallback;
  }
};

const save = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const clearAllData = () => {
  localStorage.clear();
};

const DEFAULT_PROFILE: BusinessConfig = {
  id: 'biz-node',
  name: 'DUKA OS ENTERPRISE',
  category: 'General Retailer',
  regNumber: 'REG-2026-X01',
  tinNumber: '111-222-333',
  vatNumber: 'VAT-444-555',
  address: 'Kinondoni Plaza, Dar es Salaam',
  region: 'Dar es Salaam',
  district: 'Kinondoni',
  country: 'Tanzania',
  phone: '+255 754 000 111',
  whatsapp: '+255 784 222 333',
  email: 'info@dukaos.co.tz',
  website: 'https://dukaos.co.tz',
  description: 'Modern Retail, Wholesale and Distribution System',
  logoUrl: '',
  unlimitedBranches: true,
  companyStamp: 'OFFICIAL REGISTERED COMPLIANCE SEAL - DUKA OS',
  qrCodeSeed: 'DUKA-OS-LEDGER-VERIFY',
  verificationCode: 'LICENSE-DUKA-ERP-999-PRO'
};

export const db = {
  // CONFIG & PROFILE
  getProfile: (): BusinessConfig => {
    const p = load<BusinessConfig | null>(KEYS.PROFILE, null);
    return p ? { ...DEFAULT_PROFILE, ...p } : DEFAULT_PROFILE;
  },
  saveProfile: (profile: BusinessConfig, userEmail: string) => {
    save(KEYS.PROFILE, profile);
    db.logAudit('CREATE', 'BusinessProfile', `Configured business registration: ${profile.name}`, userEmail);

    // Bootstrap default main branch if not exists
    const branches = db.getBranches();
    if (branches.length === 0) {
      db.saveBranches([
        {
          id: 'branch-main',
          name: 'HQ / Main Branch',
          code: 'HQ-01',
          location: `${profile.region || 'Dar es Salaam'}, ${profile.country || 'Tanzania'}`,
          manager: 'Business Owner',
          phone: profile.phone
        }
      ], userEmail);
    }
  },

  // BRANCHES
  getBranches: (): Branch[] => load<Branch[]>(KEYS.BRANCHES, []),
  saveBranches: (branches: Branch[], userEmail: string) => {
    save(KEYS.BRANCHES, branches);
  },
  addBranch: (branch: Branch, userEmail: string) => {
    const branches = db.getBranches();
    branches.push(branch);
    db.saveBranches(branches, userEmail);
    db.logAudit('CREATE', 'Branch', `Added branch ${branch.name} (${branch.code})`, userEmail);
  },

  // EMPLOYEES
  getEmployees: (): Employee[] => load<Employee[]>(KEYS.EMPLOYEES, []),
  saveEmployees: (employees: Employee[], userEmail: string) => {
    save(KEYS.EMPLOYEES, employees);
  },
  addEmployee: (employee: Employee, userEmail: string) => {
    const list = db.getEmployees();
    list.push(employee);
    db.saveEmployees(list, userEmail);
    db.logAudit('CREATE', 'Employee', `Created employee profile for ${employee.name} as ${employee.role}`, userEmail);
  },
  updateEmployeeAttendance: (employeeId: string, date: string, status: 'Present' | 'Absent' | 'Leave' | 'Late', userEmail: string) => {
    const employees = db.getEmployees();
    const idx = employees.findIndex((e) => e.id === employeeId);
    if (idx !== -1) {
      employees[idx].attendance = {
        ...employees[idx].attendance,
        [date]: status
      };
      db.saveEmployees(employees, userEmail);
      db.logAudit('UPDATE', 'Employee', `Marked attendance for ${employees[idx].name} on ${date}: ${status}`, userEmail);
    }
  },
  addLeaveRequest: (employeeId: string, request: Employee['leaveRequests'][0], userEmail: string) => {
    const employees = db.getEmployees();
    const idx = employees.findIndex((e) => e.id === employeeId);
    if (idx !== -1) {
      employees[idx].leaveRequests.push(request);
      db.saveEmployees(employees, userEmail);
      db.logAudit('CREATE', 'LeaveRequest', `Submitted leave request for ${employees[idx].name}`, userEmail);
    }
  },
  resolveLeaveRequest: (employeeId: string, requestId: string, status: 'Approved' | 'Rejected', userEmail: string) => {
    const employees = db.getEmployees();
    const idx = employees.findIndex((e) => e.id === employeeId);
    if (idx !== -1) {
      const rIdx = employees[idx].leaveRequests.findIndex((r) => r.id === requestId);
      if (rIdx !== -1) {
        employees[idx].leaveRequests[rIdx].status = status;
        db.saveEmployees(employees, userEmail);
        db.logAudit('UPDATE', 'LeaveRequest', `${status} leave request for ${employees[idx].name}`, userEmail);
      }
    }
  },

  // PRODUCTS
  getProducts: (): Product[] => load<Product[]>(KEYS.PRODUCTS, []),
  saveProducts: (products: Product[]) => {
    save(KEYS.PRODUCTS, products);
  },
  addProduct: (product: Product, userEmail: string) => {
    const list = db.getProducts();
    list.push(product);
    db.saveProducts(list);
    db.logAudit('CREATE', 'Product', `Created product: ${product.name} [SKU: ${product.sku}]`, userEmail);
    db.checkInventoryAlerts(product);
  },
  updateProduct: (product: Product, userEmail: string) => {
    const list = db.getProducts();
    const idx = list.findIndex((p) => p.id === product.id);
    if (idx !== -1) {
      const old = list[idx];
      list[idx] = product;
      db.saveProducts(list);
      db.logAudit('UPDATE', 'Product', `Updated product: ${product.name} [SKU: ${product.sku}]`, userEmail);
      db.checkInventoryAlerts(product);
    }
  },
  deleteProduct: (id: string, userEmail: string) => {
    const list = db.getProducts();
    const idx = list.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const name = list[idx].name;
      const sku = list[idx].sku;
      list.splice(idx, 1);
      db.saveProducts(list);
      db.logAudit('DELETE', 'Product', `Deleted product: ${name} [SKU: ${sku}]`, userEmail);
    }
  },

  // CUSTOMERS
  getCustomers: (): Customer[] => load<Customer[]>(KEYS.CUSTOMERS, []),
  addCustomer: (customer: Customer, userEmail: string) => {
    const list = db.getCustomers();
    list.push(customer);
    save(KEYS.CUSTOMERS, list);
    db.logAudit('CREATE', 'Customer', `Registered Customer: ${customer.fullName} of ${customer.companyName || 'Individual'}`, userEmail);
    db.addNotification('New Customer Registered', `Customer ${customer.fullName} added successfully.`, 'New_Customer');
  },
  updateCustomerCredit: (customerId: string, amount: number) => {
    const list = db.getCustomers();
    const idx = list.findIndex((c) => c.id === customerId);
    if (idx !== -1) {
      list[idx].creditBalance += amount;
      save(KEYS.CUSTOMERS, list);
    }
  },
  updateCustomer: (customer: Customer, userEmail: string) => {
    const list = db.getCustomers();
    const idx = list.findIndex((c) => c.id === customer.id);
    if (idx !== -1) {
      list[idx] = customer;
      save(KEYS.CUSTOMERS, list);
      db.logAudit('UPDATE', 'Customer', `Updated customer profile: ${customer.fullName}`, userEmail);
    }
  },
  deleteCustomer: (id: string, userEmail: string) => {
    const list = db.getCustomers();
    const idx = list.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const name = list[idx].fullName;
      list.splice(idx, 1);
      save(KEYS.CUSTOMERS, list);
      db.logAudit('DELETE', 'Customer', `Deleted customer profile: ${name}`, userEmail);
    }
  },

  // SUPPLIERS
  getSuppliers: (): Supplier[] => load<Supplier[]>(KEYS.SUPPLIERS, []),
  addSupplier: (supplier: Supplier, userEmail: string) => {
    const list = db.getSuppliers();
    list.push(supplier);
    save(KEYS.SUPPLIERS, list);
    db.logAudit('CREATE', 'Supplier', `Registered Supplier: ${supplier.name} (${supplier.companyName})`, userEmail);
  },
  updateSupplier: (supplier: Supplier, userEmail: string) => {
    const list = db.getSuppliers();
    const idx = list.findIndex((s) => s.id === supplier.id);
    if (idx !== -1) {
      list[idx] = supplier;
      save(KEYS.SUPPLIERS, list);
      db.logAudit('UPDATE', 'Supplier', `Updated Supplier: ${supplier.name}`, userEmail);
    }
  },
  deleteSupplier: (id: string, userEmail: string) => {
    const list = db.getSuppliers();
    const idx = list.findIndex((s) => s.id === id);
    if (idx !== -1) {
      const name = list[idx].name;
      list.splice(idx, 1);
      save(KEYS.SUPPLIERS, list);
      db.logAudit('DELETE', 'Supplier', `Deleted Supplier: ${name}`, userEmail);
    }
  },

  // INVOICES & TRANSACTIONS
  getInvoices: (): Invoice[] => load<Invoice[]>(KEYS.INVOICES, []),
  saveInvoices: (invoices: Invoice[]) => {
    save(KEYS.INVOICES, invoices);
  },
  deleteInvoice: (id: string, userEmail: string) => {
    const list = db.getInvoices();
    const idx = list.findIndex((inv) => inv.id === id);
    if (idx !== -1) {
      const num = list[idx].invoiceNumber;
      list.splice(idx, 1);
      db.saveInvoices(list);
      db.logAudit('DELETE', 'Invoice', `Deleted Invoice: ${num}`, userEmail);
    }
  },
  addInvoice: (invoice: Invoice, userEmail: string) => {
    const list = db.getInvoices();
    list.push(invoice);
    db.saveInvoices(list);
    db.logAudit('CREATE', 'Invoice', `Created ${invoice.status} Invoice ${invoice.invoiceNumber}. Total: ${invoice.grandTotal}`, userEmail);

    // If Paid or Partially paid, record ledger double entry immediately
    if (invoice.amountPaid > 0) {
      db.addTransaction({
        id: `txn-inv-${invoice.id}-${Date.now()}`,
        type: 'Sale',
        date: invoice.invoiceDate,
        categoryId: 'Invoiced Revenue',
        description: `Collected payment of ${invoice.amountPaid} for Invoice ${invoice.invoiceNumber}`,
        amount: invoice.amountPaid,
        paymentMethod: invoice.paymentMethod || 'Cash',
        referenceId: invoice.id,
        branchId: invoice.branchId || 'branch-main',
        performedBy: userEmail
      }, userEmail);
    }

    // Adjust quantities if the invoice is marked as Approved or Paid
    if (invoice.status === 'Paid' || invoice.status === 'Approved' || invoice.status === 'Sent') {
      db.deductStockForInvoice(invoice, userEmail);
    }
  },
  updateInvoiceStatus: (id: string, status: InvoiceStatus, amountPaid: number, userEmail: string) => {
    const list = db.getInvoices();
    const idx = list.findIndex((inv) => inv.id === id);
    if (idx !== -1) {
      const oldStatus = list[idx].status;
      list[idx].status = status;
      const additionalPaid = amountPaid - list[idx].amountPaid;
      list[idx].amountPaid = amountPaid;
      db.saveInvoices(list);

      db.logAudit('UPDATE', 'Invoice', `Updated Invoice ${list[idx].invoiceNumber} status from ${oldStatus} to ${status}`, userEmail);

      // Log transaction if additional amount was collected
      if (additionalPaid > 0) {
        db.addTransaction({
          id: `txn-inv-up-${id}-${Date.now()}`,
          type: 'Sale',
          date: new Date().toISOString().split('T')[0],
          categoryId: 'Invoiced Revenue',
          description: `Collected partial/full payment of ${additionalPaid} on Invoice ${list[idx].invoiceNumber}`,
          amount: additionalPaid,
          paymentMethod: list[idx].paymentMethod || 'Cash',
          referenceId: id,
          branchId: list[idx].branchId || 'branch-main',
          performedBy: userEmail
        }, userEmail);
      }

      // If status changed to Approved/Paid but was Draft/Pending before, deduct stock
      if (
        (status === 'Paid' || status === 'Approved' || status === 'Sent') &&
        (oldStatus === 'Draft' || oldStatus === 'Pending' || oldStatus === 'Cancelled')
      ) {
        db.deductStockForInvoice(list[idx], userEmail);
      }
    }
  },

  deductStockForInvoice: (invoice: Invoice, userEmail: string) => {
    const products = db.getProducts();
    invoice.items.forEach((item) => {
      // Find matching product either by name, barcode or sku
      const pIdx = products.findIndex((p) => p.sku === item.sku || p.barcode === item.barcode || p.name === item.productName);
      if (pIdx !== -1) {
        const prod = products[pIdx];
        const branchId = invoice.branchId || 'branch-main';
        const currentQty = prod.branchStock[branchId] ?? prod.quantity;
        
        // Relational trigger: Current Stock minus user sold amount
        const updatedQty = Math.max(0, currentQty - item.quantity);
        prod.branchStock[branchId] = updatedQty;
        
        // Update global counter
        prod.quantity = Object.values(prod.branchStock).reduce((sum, v) => sum + v, 0);

        db.updateProduct(prod, userEmail);
      }
    });
  },

  // STATS & TRANSACTIONS
  getTransactions: (): Transaction[] => load<Transaction[]>(KEYS.TRANSACTIONS, []),
  saveTransactions: (txns: Transaction[]) => {
    save(KEYS.TRANSACTIONS, txns);
  },
  addTransaction: (transaction: Transaction, userEmail: string) => {
    const list = db.getTransactions();
    list.push(transaction);
    db.saveTransactions(list);
    db.logAudit('CREATE', 'Transaction', `Logged Ledger entry: [${transaction.type}] ${transaction.description || transaction.categoryId} of ${transaction.amount}`, userEmail);

    if (transaction.type === 'Sale') {
      db.addNotification('New Sale Completed', `Revenue tracking: Transacted +${transaction.amount} via ${transaction.paymentMethod}`, 'New_Sale');
    }
  },
  deleteTransaction: (id: string, userEmail: string) => {
    const list = db.getTransactions();
    const idx = list.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const desc = list[idx].description || list[idx].categoryId;
      list.splice(idx, 1);
      db.saveTransactions(list);
      db.logAudit('DELETE', 'Transaction', `Deleted Transaction Ledger item: ${desc}`, userEmail);
    }
  },
  updateTransaction: (transaction: Transaction, userEmail: string) => {
    const list = db.getTransactions();
    const idx = list.findIndex((t) => t.id === transaction.id);
    if (idx !== -1) {
      list[idx] = transaction;
      db.saveTransactions(list);
      db.logAudit('UPDATE', 'Transaction', `Updated Transaction Ledger item: ${transaction.description || transaction.categoryId}`, userEmail);
    }
  },

  // PURCHASE ORDERS
  getPurchases: (): PurchaseOrder[] => load<PurchaseOrder[]>(KEYS.PURCHASES, []),
  addPurchaseOrder: (po: PurchaseOrder, userEmail: string) => {
    const list = db.getPurchases();
    list.push(po);
    save(KEYS.PURCHASES, list);
    db.logAudit('CREATE', 'PurchaseOrder', `Issued Supplier Purchase Order ${po.poNumber} for ${po.grandTotal}`, userEmail);
  },
  receivePurchaseOrder: (poId: string, userEmail: string) => {
    const list = db.getPurchases();
    const idx = list.findIndex((p) => p.id === poId);
    if (idx !== -1 && list[idx].status !== 'Received') {
      list[idx].status = 'Received';
      save(KEYS.PURCHASES, list);

      // Update Inventory Quantities automatically!
      // Received stock increases inventory automatically!
      const products = db.getProducts();
      const po = list[idx];
      po.items.forEach((item) => {
        const pIdx = products.findIndex((p) => p.id === item.productId);
        if (pIdx !== -1) {
          const prod = products[pIdx];
          const bId = po.branchId || 'branch-main';
          const curQty = prod.branchStock[bId] ?? 0;
          prod.branchStock[bId] = curQty + item.quantity;
          prod.quantity = Object.values(prod.branchStock).reduce((sum, val) => sum + val, 0);
          
          db.updateProduct(prod, userEmail);
          
          db.logAudit('UPDATE', 'Product', `Purchase Restock: SKU ${prod.sku} increased +${item.quantity}`, userEmail);
        }
      });

      // Post expenses in ledger
      db.addTransaction({
        id: `txn-pur-${poId}-${Date.now()}`,
        type: 'Expense',
        date: new Date().toISOString().split('T')[0],
        categoryId: 'Cost of Goods Sold',
        description: `Paid supplier for Goods Received on PO ${po.poNumber}`,
        amount: po.grandTotal,
        paymentMethod: 'Bank Transfer',
        referenceId: poId,
        branchId: po.branchId,
        performedBy: userEmail
      }, userEmail);

      db.logAudit('UPDATE', 'PurchaseOrder', `Completed receipt of Supplier PO: ${po.poNumber}`, userEmail);
    }
  },

  // BRANCH STOCK TRANSFERS
  getTransfers: (): StockTransfer[] => load<StockTransfer[]>(KEYS.TRANSFERS, []),
  addTransfer: (transfer: StockTransfer, userEmail: string) => {
    const list = db.getTransfers();
    list.push(transfer);
    save(KEYS.TRANSFERS, list);
    db.logAudit('CREATE', 'BranchTransfer', `Requested stock transfer of (${transfer.quantity}) units of product ID ${transfer.productId}`, userEmail);
  },
  completeTransfer: (transferId: string, userEmail: string) => {
    const list = db.getTransfers();
    const idx = list.findIndex((t) => t.id === transferId);
    if (idx !== -1 && list[idx].status === 'Pending') {
      const transfer = list[idx];
      const products = db.getProducts();
      const pIdx = products.findIndex((p) => p.id === transfer.productId);

      if (pIdx !== -1) {
        const prod = products[pIdx];
        
        // Reduce from Source Branch
        const srcQty = prod.branchStock[transfer.fromBranchId] ?? 0;
        prod.branchStock[transfer.fromBranchId] = Math.max(0, srcQty - transfer.quantity);

        // Increase at Dest Branch
        const destQty = prod.branchStock[transfer.toBranchId] ?? 0;
        prod.branchStock[transfer.toBranchId] = destQty + transfer.quantity;

        // Balance total global quantity
        prod.quantity = Object.values(prod.branchStock).reduce((sum, v) => sum + v, 0);

        db.updateProduct(prod, userEmail);

        transfer.status = 'Completed';
        save(KEYS.TRANSFERS, list);

        db.logAudit('TRANSFER', 'Product', `Executed multi-branch Stock Transfer on SKU: ${prod.sku} (${transfer.quantity} pcs)`, userEmail);
        db.addNotification('Stock Transfer Completed', `Stock transfer request completed between branches successfully.`, 'Payment_Alert');
      }
    }
  },

  // NOTIFICATION UTILITIES
  getNotifications: (): Notification[] => load<Notification[]>(KEYS.NOTIFICATIONS, []),
  addNotification: (title: string, message: string, type: Notification['type']) => {
    const list = db.getNotifications();
    list.unshift({
      id: `notify-${Date.now()}-${Math.random()}`,
      title,
      message,
      type,
      date: new Date().toISOString(),
      read: false
    });
    save(KEYS.NOTIFICATIONS, list.slice(0, 100)); // cap at 100 alerts
  },
  markNotificationsAsRead: () => {
    const list = db.getNotifications();
    list.forEach((n) => (n.read = true));
    save(KEYS.NOTIFICATIONS, list);
  },

  // AUDIT TRAIL LOGGING
  getAuditLog: (): AuditLog[] => load<AuditLog[]>(KEYS.AUDIT, []),
  getLogs: (): AuditLog[] => db.getAuditLog(),
  logAudit: (action: AuditLog['action'], entity: string, details: string, user: string) => {
    const list = db.getAuditLog();
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      action,
      entity,
      details,
      user: user || 'Anonymous System'
    };
    list.unshift(newLog);
    save(KEYS.AUDIT, list);
  },

  completeOnlineOrder: (order: any, userEmail: string) => {
    const products = db.getProducts();
    order.items.forEach((item: any) => {
      const pIdx = products.findIndex((p) => p.name === item.productName || p.id === item.id);
      if (pIdx !== -1) {
        const prod = products[pIdx];
        const bId = order.branchId || 'branch-main';
        const curQty = prod.branchStock[bId] ?? prod.quantity;
        prod.branchStock[bId] = Math.max(0, curQty - item.quantity);
        prod.quantity = Object.values(prod.branchStock).reduce((sum, v) => sum + v, 0);
        db.updateProduct(prod, userEmail);
      }
    });

    db.addTransaction({
      id: `txn-online-${order.id}`,
      type: 'Sale',
      date: new Date().toISOString().split('T')[0],
      categoryId: 'Online Channels Store Revenue',
      description: `E-Commerce order checkout #${order.orderId} fulfilled successfully for customer ${order.customerName}`,
      amount: order.totalAmount,
      paymentMethod: 'Mobile Money Gateway',
      referenceId: order.orderId,
      branchId: order.branchId || 'branch-main',
      performedBy: userEmail
    }, userEmail);

    db.addNotification('Web Order Completed!', `E-Commerce payment of TZS ${order.totalAmount} processed for items checkout`, 'New_Sale');
  },

  checkInventoryAlerts: (product: Product) => {
    if (product.quantity <= 0) {
      db.addNotification('Product Out of Stock!', `${product.name} [SKU: ${product.sku}] is currently completely out of stock. Please issue Purchase Restock immediately!`, 'Low_Stock');
    } else if (product.quantity <= product.reorderLevel) {
      db.addNotification('Low Stock Warning', `${product.name} is running low (${product.quantity} units available). Reorder limit: ${product.reorderLevel}`, 'Low_Stock');
    }

    // Expiry check
    if (product.expiryDate) {
      const expDate = new Date(product.expiryDate);
      const today = new Date();
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        db.addNotification('EXPIRED BATCH DETECTED', `${product.name} [Batch: ${product.batchNumber || 'N/A'}] expired on ${product.expiryDate}! Move to Defective category.`, 'Low_Stock');
      } else if (diffDays <= 30) {
        db.addNotification('Batch Approaching Expiry', `${product.name} is expiring in ${diffDays} days! Limit distribution and re-price.`, 'Low_Stock');
      }
    }
  },

  // USER SESSION TRACKING
  getCurrentUser: (): { email: string; role: UserRole } => {
    const email = localStorage.getItem(KEYS.SESSION_USER) || 'owner@smartbusinessexample.com';
    const role = (localStorage.getItem(KEYS.SESSION_USER_ROLE) || 'Owner') as UserRole;
    return { email, role };
  },
  setCurrentUser: (email: string, role: UserRole) => {
    localStorage.setItem(KEYS.SESSION_USER, email);
    localStorage.setItem(KEYS.SESSION_USER_ROLE, role);
  },
  getCurrentBranch: (): string => {
    return localStorage.getItem(KEYS.SESSION_BRANCH) || 'branch-main';
  },
  setCurrentBranch: (branchId: string) => {
    localStorage.setItem(KEYS.SESSION_BRANCH, branchId);
  },

  // THEME & LANGUAGE CONFIGS
  getThemeMode: (): ThemeMode => (localStorage.getItem(KEYS.THEME_MODE) || 'high-density') as ThemeMode,
  setThemeMode: (mode: ThemeMode) => localStorage.setItem(KEYS.THEME_MODE, mode),
  getLanguage: (): LanguageCode => (localStorage.getItem(KEYS.LANGUAGE) || 'EN') as LanguageCode,
  setLanguage: (lang: LanguageCode) => localStorage.setItem(KEYS.LANGUAGE, lang)
};
