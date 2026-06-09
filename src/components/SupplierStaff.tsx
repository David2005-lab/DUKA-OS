/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  FileCheck, 
  Star, 
  NotebookPen, 
  Contact, 
  CheckSquare, 
  TrendingDown, 
  FileText, 
  Clock, 
  UsersRound, 
  Briefcase 
} from 'lucide-react';
import { Supplier, PurchaseOrder, Employee, Product, Branch } from '../types';
import { db } from '../db';
import { translations } from '../translations';

interface SupplierStaffProps {
  language: 'EN' | 'SW';
  currentBranch: string;
  userEmail: string;
}

export default function SupplierStaff({ language, currentBranch, userEmail }: SupplierStaffProps) {
  const t = translations[language];

  // Tab configurations
  const [procurementSubTab, setProcurementSubTab] = useState<'procure' | 'employees'>('procure');

  // States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Creators overlays
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showReplenishForm, setShowReplenishForm] = useState(false);

  // Forms states : Supplier
  const [supName, setSupName] = useState('');
  const [supComp, setSupComp] = useState('');
  const [supTin, setSupTin] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddr, setSupAddr] = useState('');
  const [supRating, setSupRating] = useState(5);

  // Forms states : Employee
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState<'Owner' | 'Manager' | 'Accountant' | 'Cashier' | 'Salesperson' | 'Storekeeper'>('Storekeeper');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empSalary, setEmpSalary] = useState(0);

  // Forms states : Replenish Purchase Order
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [replenishItems, setReplenishItems] = useState<{ productId: string; qty: number; cost: number }[]>([]);

  const loadAllData = () => {
    setSuppliers(db.getSuppliers());
    setPurchases(db.getPurchases());
    setEmployees(db.getEmployees());
    setProducts(db.getProducts());
    setBranches(db.getBranches());
  };

  useEffect(() => {
    loadAllData();
  }, [currentBranch]);

  // Handle supplier save
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supPhone) return;

    db.addSupplier({
      id: `sup-${Date.now()}`,
      name: supName,
      companyName: supComp,
      tin: supTin,
      phone: supPhone,
      email: supEmail,
      address: supAddr,
      rating: supRating
    }, userEmail);

    setSupName('');
    setSupComp('');
    setSupTin('');
    setSupPhone('');
    setSupEmail('');
    setSupAddr('');
    setSupRating(5);
    setShowAddSupplier(false);
    loadAllData();
  };

  // Handle employee save
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empPhone) return;

    db.addEmployee({
      id: `emp-${Date.now()}`,
      name: empName,
      role: empRole,
      email: empEmail || `${empName.toLowerCase().replace(' ', '')}@enterprise-erp.com`,
      phone: empPhone,
      salary: empSalary,
      attendance: {},
      leaveRequests: [],
      photoUrl: ''
    }, userEmail);

    setEmpName('');
    setEmpRole('Storekeeper');
    setEmpEmail('');
    setEmpPhone('');
    setEmpSalary(0);
    setShowAddEmployee(false);
    loadAllData();
  };

  // Add items inside replenishment builder
  const handleAppendReplenishItem = (pId: string) => {
    const matched = products.find((p) => p.id === pId);
    if (!matched) return;

    const existing = replenishItems.find((i) => i.productId === pId);
    if (existing) {
      setReplenishItems(replenishItems.map((i) => i.productId === pId ? { ...i, qty: i.qty + 10 } : i));
    } else {
      setReplenishItems([...replenishItems, { productId: pId, qty: 50, cost: matched.costPrice }]);
    }
  };

  // Dispatch PO to system
  const handleReplenishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || replenishItems.length === 0) return;

    const aggregateTotal = replenishItems.reduce((sum, item) => sum + (item.cost * item.qty), 0);
    const invoicePO = `PO-${Date.now().toString().substring(5)}`;

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: invoicePO,
      supplierId: selectedSupplier,
      branchId: currentBranch,
      date: new Date().toISOString().split('T')[0],
      status: 'Sent',
      items: replenishItems,
      grandTotal: aggregateTotal
    };

    db.addPurchaseOrder(newPO, userEmail);

    // Reset Forms
    setReplenishItems([]);
    setSelectedSupplier('');
    setShowReplenishForm(false);
    loadAllData();
    alert('Repelishment Purchase Order Issued successfully to supplier!');
  };

  // Confirm goods delivery received -> trigger inventory increments
  const handleGoodsReceived = (poId: string) => {
    db.receivePurchaseOrder(poId, userEmail);
    loadAllData();
    alert(language === 'SW' ? 'Shehena Imepokewa na Bidhaa Zimeongezwa stoki!' : 'PO Delivery checked OK: Branch Stocks inflated automatically and expense log entered!');
  };

  // Attendance switches
  const handleMarkAttend = (eId: string, status: 'Present' | 'Absent' | 'Leave' | 'Late') => {
    const today = new Date().toISOString().split('T')[0];
    db.updateProduct; // avoid unused checker
    db.updateEmployeeAttendance(eId, today, status, userEmail);
    loadAllData();
  };

  return (
    <div className="space-y-6">

      {/* Selector switches */}
      <div className="flex border-b border-slate-100 dark:border-slate-850 gap-1.5">
        <button
          onClick={() => setProcurementSubTab('procure')}
          className={`px-4 py-2 text-xs font-bold border-b-2 leading-none flex items-center gap-1.5 ${
            procurementSubTab === 'procure'
              ? 'border-indigo-650 text-indigo-650'
              : 'border-transparent text-slate-500 hover:text-slate-850 dark:hover:text-white'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Procurement & Purchase Orders</span>
        </button>

        <button
          onClick={() => setProcurementSubTab('employees')}
          className={`px-4 py-2 text-xs font-bold border-b-2 leading-none flex items-center gap-1.5 ${
            procurementSubTab === 'employees'
              ? 'border-indigo-650 text-indigo-650'
              : 'border-transparent text-slate-500 hover:text-slate-853 dark:hover:text-white'
          }`}
        >
          <UsersRound className="h-4 w-4" />
          <span>HR Staff Payroll & Attendance</span>
        </button>
      </div>

      {procurementSubTab === 'procure' && (
        <div className="space-y-6">
          
          {/* Buttons console */}
          <div className="flex flex-wrap gap-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border">
            <button
              onClick={() => setShowAddSupplier(!showAddSupplier)}
              className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-lg flex items-center gap-1 leading-none shadow"
            >
              <Plus className="h-4 w-4" />
              <span>Register Supply Partner</span>
            </button>

            <button
              onClick={() => setShowReplenishForm(!showReplenishForm)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-4 py-2 rounded-lg flex items-center gap-1 leading-none shadow"
            >
              <NotebookPen className="h-4 w-4" />
              <span>Issue Procurement restock order (PO)</span>
            </button>
          </div>

          {/* New Supplier Overlay */}
          {showAddSupplier && (
            <form onSubmit={handleSaveSupplier} className="bg-white dark:bg-slate-950 border p-6 rounded-xl shadow text-xs grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
              <div className="md:col-span-3 border-b pb-1">
                <span className="font-extrabold text-slate-800 uppercase text-xs">Register Supply Partner</span>
              </div>
              <div>
                <label className="font-bold text-slate-600">Supplier Name *</label>
                <input type="text" value={supName} onChange={(e) => setSupName(e.target.value)} className="w-full bg-slate-50 border p-2 mt-1 rounded-lg" placeholder="Contact Representative" required />
              </div>
              <div>
                <label className="font-bold text-slate-600">Company Name</label>
                <input type="text" value={supComp} onChange={(e) => setSupComp(e.target.value)} className="w-full bg-slate-50 border p-2 mt-1 rounded-lg" placeholder="Industrial Corp" />
              </div>
              <div>
                <label className="font-bold text-slate-600">Company TIN</label>
                <input type="text" value={supTin} onChange={(e) => setSupTin(e.target.value)} className="w-full bg-slate-50 border p-2 mt-1 rounded-lg font-mono" />
              </div>
              <div>
                <label className="font-bold text-slate-600">Contact Phone *</label>
                <input type="text" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} className="w-full bg-slate-50 border p-2 mt-1 rounded-lg" required />
              </div>
              <div>
                <label className="font-bold text-slate-600">Partner Rating (1-5)</label>
                <input type="number" value={supRating} min="1" max="5" onChange={(e) => setSupRating(Number(e.target.value))} className="w-full border p-2 mt-1 rounded bg-slate-50" />
              </div>
              <div className="md:col-span-3">
                <label className="font-bold text-slate-600">Corporate Address</label>
                <input type="text" value={supAddr} onChange={(e) => setSupAddr(e.target.value)} className="w-full bg-slate-50 border p-2 mt-1 rounded-lg" />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="bg-indigo-650 hover:bg-indigo-700 text-white p-2 px-6 font-bold rounded-lg">Initialize Supplier agreement</button>
              </div>
            </form>
          )}

          {/* New Purchase Order Issue replenisher */}
          {showReplenishForm && (
            <form onSubmit={handleReplenishSubmit} className="bg-white dark:bg-slate-950 p-6 rounded-xl border shadow-lg text-xs space-y-4 animate-fade-in">
              <div className="border-b pb-1 flex justify-between">
                <span className="font-extrabold text-xs text-slate-800 uppercase">Draft Purchase Order</span>
                <button type="button" onClick={() => setShowReplenishForm(false)} className="text-slate-400 underline font-bold">Close Drawer</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-600 block">Deliver to Tawi Branch Context</label>
                  <strong className="text-sm border-b pb-1 font-sans text-indigo-700 dark:text-indigo-400 block mt-1 uppercase">HQ / Main Branch Depot</strong>
                </div>

                <div>
                  <label className="font-bold text-slate-600">Select Registered Supplier *</label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full bg-slate-50 border p-2 mt-1 rounded-lg"
                    required
                  >
                    <option value="">Choose Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.companyName || 'Corporate'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Replenish item arrays builder */}
              <div className="space-y-2 border-t pt-4">
                <label className="font-bold text-slate-705 block uppercase text-[10px]">Add stock lines to Draft PO</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAppendReplenishItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="bg-slate-50 border p-2 rounded max-w-sm w-full font-semibold"
                >
                  <option value="">Insert Product to restock...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} [SKU: {p.sku}]</option>
                  ))}
                </select>

                {replenishItems.length > 0 && (
                  <div className="border rounded-xl bg-slate-50/50 p-2 text-xs">
                    <table className="w-full text-left bg-white rounded-lg overflow-hidden border">
                      <thead className="bg-slate-100 font-bold border-b">
                        <tr>
                          <th className="p-2">Product Name</th>
                          <th className="p-2 text-center">Batch Quantity</th>
                          <th className="p-2 text-right">Negotiated Cost (TZS)</th>
                          <th className="p-2 text-right">Row Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {replenishItems.map((item, index) => {
                          const pObj = products.find((p) => p.id === item.productId);
                          return (
                            <tr key={item.productId} className="border-b">
                              <td className="p-2 font-bold">{pObj?.name}</td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={(e) => {
                                    const updated = [...replenishItems];
                                    updated[index].qty = Math.max(1, Number(e.target.value));
                                    setReplenishItems(updated);
                                  }}
                                  className="w-16 border rounded text-center p-1"
                                />
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  value={item.cost}
                                  onChange={(e) => {
                                    const updated = [...replenishItems];
                                    updated[index].cost = Math.max(0, Number(e.target.value));
                                    setReplenishItems(updated);
                                  }}
                                  className="w-24 border rounded text-right p-1"
                                />
                              </td>
                              <td className="p-2 text-right font-mono font-bold">
                                {(item.cost * item.qty).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-black py-2.5 px-6 rounded-lg shadow"
              >
                Sign & Dispatch Purchase Order Order
              </button>
            </form>
          )}

          {/* Suppliers registry */}
          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center text-slate-400 bg-white dark:bg-slate-950 rounded-xl border">
              <Star className="h-10 w-10 text-slate-300 mb-2" />
              <span className="font-extrabold text-sm uppercase text-slate-500">{t.noData}</span>
              <p className="text-xs text-slate-400 mt-1">Please register suppliers who replenish your hardware, grocery, electronic stocks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-white dark:bg-slate-950 p-4 border rounded-xl">
              <div className="space-y-3">
                <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block border-b pb-1">Supply Partners</span>
                {suppliers.map((s) => (
                  <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg flex justify-between items-center">
                    <div>
                      <strong className="text-slate-900 dark:text-white text-xs">{s.name}</strong>
                      <p className="text-slate-450 text-[10.5px] mt-0.5">{s.companyName || 'Retailer Partner'} - {s.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5 text-amber-500">
                        {Array.from({ length: s.rating || 5 }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-500" />
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const msg = language === 'SW'
                            ? `Je, una uhakika unataka kumfuta msambazaji "${s.name}"?`
                            : `Are you sure you want to delete supplier "${s.name}"?`;
                          if (window.confirm(msg)) {
                            db.deleteSupplier(s.id, userEmail);
                            setSuppliers(db.getSuppliers());
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                        title={language === 'SW' ? 'Futa' : 'Delete'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Purchase replenishment logs */}
              <div className="space-y-3">
                <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block border-b pb-1">Purchase orders replenishment tracker</span>
                {purchases.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-6">No replenishment log records found.</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {purchases.map((po) => {
                      const sup = suppliers.find((sp) => sp.id === po.supplierId);
                      return (
                        <div key={po.id} className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg flex justify-between items-center">
                          <div>
                            <span className="font-mono font-black text-slate-900 dark:text-white">{po.poNumber}</span>
                            <p className="text-[10px] text-slate-405 mt-0.5">Supplier: {sup?.name || 'Bulk vendor'} - Total: <span className="font-bold text-indigo-750 font-mono">TZ {po.grandTotal.toLocaleString()}</span></p>
                          </div>
                          {po.status === 'Sent' ? (
                            <button
                              onClick={() => handleGoodsReceived(po.id)}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-950 text-[10px] font-bold py-1 px-3 rounded flex items-center gap-1 leading-none shadow-sm"
                            >
                              <FileCheck className="h-3.5 w-3.5" />
                              <span>Confirm Received</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-black font-mono text-green-700 bg-green-50 px-2 py-1 rounded">GOODS RECEIVED OK</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {procurementSubTab === 'employees' && (
        <div className="space-y-6">
          
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border">
            <span className="font-extrabold text-xs text-slate-650 uppercase">Active Employee Directory</span>
            <button
              onClick={() => setShowAddEmployee(!showAddEmployee)}
              className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-lg flex items-center gap-1 leading-none shadow"
            >
              <Plus className="h-4 w-4" />
              <span>Add Staff Profile</span>
            </button>
          </div>

          {showAddEmployee && (
            <form onSubmit={handleSaveEmployee} className="bg-white dark:bg-slate-950 border p-6 rounded-xl shadow text-xs grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              <div className="lg:col-span-3 border-b pb-1">
                <span className="font-extrabold text-slate-800 uppercase text-xs">New Employee Dossier</span>
              </div>
              <div>
                <label className="font-bold text-slate-600">Employee Full Name *</label>
                <input type="text" value={empName} onChange={(e) => setEmpName(e.target.value)} className="w-full bg-slate-50 border p-2 mt-1 rounded-lg" required />
              </div>
              <div>
                <label className="font-bold text-slate-600">Enterprise Role Designation *</label>
                <select value={empRole} onChange={(e) => setEmpRole(e.target.value as any)} className="w-full bg-slate-50 border p-2 mt-1 rounded-lg font-bold">
                  <option value="Manager">Manager / Branch Supervisor</option>
                  <option value="Accountant">Accountant / Treasurer</option>
                  <option value="Cashier">Cashier / Counter operator</option>
                  <option value="Salesperson">Salesperson / Representative</option>
                  <option value="Storekeeper">Storekeeper / Stoki Controller</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-600">Authorized Phone *</label>
                <input type="text" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} className="w-full bg-slate-50 border p-2 mt-1 rounded-lg font-semibold" required />
              </div>
              <div>
                <label className="font-bold text-slate-600">Secure SSO Email</label>
                <input type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} className="w-full bg-slate-50 border p-2.5 mt-1 rounded-lg" placeholder="email@enterprise.com" />
              </div>
              <div>
                <label className="font-bold text-slate-600">Agreed Base Salary (TZS / Month)</label>
                <input type="number" value={empSalary || ''} onChange={(e) => setEmpSalary(Number(e.target.value))} className="w-full bg-slate-50 border p-2.5 mt-1 rounded-lg font-mono font-bold text-emerald-850" />
              </div>
              <div className="lg:col-span-3 flex justify-end">
                <button type="submit" className="bg-indigo-650 hover:bg-indigo-700 text-white p-2.5 px-6 font-bold rounded-lg shadow">Onboard Employee & Lock Permissions</button>
              </div>
            </form>
          )}

          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-white dark:bg-slate-950 rounded-xl border">
              <UsersRound className="h-10 w-10 text-slate-300 mb-2" />
              <span className="font-extrabold text-sm uppercase text-slate-500">{t.noData}</span>
              <p className="text-xs text-slate-400 mt-1">Onboard staff members to log daily attendance sheets, lock role permissions, and track salaries.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs bg-white dark:bg-slate-950 p-4 border rounded-xl">
              
              {/* Daily attendance board - Col 8 */}
              <div className="lg:col-span-8 space-y-3">
                <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block border-b pb-1">{t.attendance}</span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 font-bold border-b text-slate-500">
                      <tr>
                        <th className="p-2">Employee</th>
                        <th className="p-2">Assigned ERP role</th>
                        <th className="p-2 text-right">Base Salary</th>
                        <th className="p-2 text-center">Mark attendance Today</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-800">
                      {employees.map((em) => {
                        const today = new Date().toISOString().split('T')[0];
                        const checked = em.attendance[today];
                        return (
                          <tr key={em.id}>
                            <td className="p-2 font-bold">{em.name}</td>
                            <td className="p-2"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-200/40 rounded font-black uppercase text-[9.5px]">{em.role}</span></td>
                            <td className="p-2 text-right font-mono font-bold text-slate-700">TZS {em.salary.toLocaleString()}</td>
                            <td className="p-2 text-center flex justify-center gap-1.5 pt-3">
                              {(['Present', 'Absent', 'Late', 'Leave'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleMarkAttend(em.id, st)}
                                  className={`text-[9.5px] p-1 px-2 border rounded font-bold transition-all ${
                                    checked === st
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {st[0]}
                                </button>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Staff Leave requests - Col 4 */}
              <div className="lg:col-span-4 space-y-3">
                <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block border-b pb-1">{t.leaveRequests}</span>
                <p className="text-[10px] text-slate-400">Manage leaving declarations submitted by on-boarded employees securely.</p>
                <div className="border border-dashed p-3 text-center text-slate-400 rounded-lg py-8">
                  No active leave proposals awaiting owner authorization at this timestamp.
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
