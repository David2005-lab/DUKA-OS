/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Award, 
  Coins, 
  History, 
  TrendingUp, 
  PhoneCall, 
  UserSquare2 
} from 'lucide-react';
import { Customer, Invoice } from '../types';
import { db } from '../db';
import { translations } from '../translations';

interface CRMProps {
  language: 'EN' | 'SW';
  currentBranch: string;
  userEmail: string;
}

export default function CRM({ language, currentBranch, userEmail }: CRMProps) {
  const t = translations[language];

  // States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [crmSearch, setCrmSearch] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [compName, setCompName] = useState('');
  const [tin, setTin] = useState('');
  const [vat, setVat] = useState('');
  const [reg, setReg] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('Tanzania');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const loadCRMData = () => {
    const custs = db.getCustomers();
    setCustomers(custs);
    setInvoices(db.getInvoices());

    const targetCustId = localStorage.getItem('SmartERP_CRM_SelectedCustomerId');
    if (targetCustId) {
      const match = custs.find((c) => c.id === targetCustId);
      if (match) {
        setCrmSearch(match.fullName);
      }
      localStorage.removeItem('SmartERP_CRM_SelectedCustomerId');
    }
  };

  useEffect(() => {
    loadCRMData();
  }, [currentBranch]);

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      alert('Full Name and Phone Number are required parameters!');
      return;
    }

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      fullName,
      companyName: compName,
      tinNumber: tin,
      vatNumber: vat,
      regNumber: reg,
      address,
      region,
      country,
      phone,
      email,
      photoUrl: '', // simulated default avatar
      loyaltyPoints: 100, // start with 100 registration loyalty points
      creditBalance: 0,
      notes
    };

    db.addCustomer(newCust, userEmail);
    
    // Reset Form
    setFullName('');
    setCompName('');
    setTin('');
    setVat('');
    setReg('');
    setAddress('');
    setRegion('');
    setPhone('');
    setEmail('');
    setNotes('');
    setShowAddForm(false);
    
    loadCRMData();
    alert(language === 'SW' ? 'Wasifu wa Mteja Umesajiliwa!' : 'Customer registered successfully with 100 registration royalty points!');
  };

  const getCustomerMetrics = (custId: string) => {
    const custInvoices = invoices.filter((i) => i.customerId === custId && i.status === 'Paid');
    const totalSpent = custInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
    const totalContracts = custInvoices.length;
    return { totalSpent, totalContracts };
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-650" />
          <h2 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white leading-none">Enterprise CRM & Sales Contacts</h2>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <input
              type="text"
              placeholder="Filter customer..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white pl-2 pr-6"
              value={crmSearch}
              onChange={(e) => setCrmSearch(e.target.value)}
            />
            {crmSearch && (
              <button 
                onClick={() => setCrmSearch('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-[10px]"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-lg flex items-center gap-1.5 shadow shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Account Profile</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmitCustomer} className="bg-white dark:bg-slate-950 p-6 rounded-xl border shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-fade-in">
          <div className="md:col-span-3 border-b pb-1.5 mb-2">
            <span className="font-extrabold text-xs uppercase text-slate-800">Add Account Client Sheet</span>
          </div>

          <div>
            <label className="font-bold text-slate-650">Customer Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 border p-2 mt-1 rounded-lg"
              placeholder="e.g. Frederick David"
            />
          </div>

          <div>
            <label className="font-bold text-slate-650">Company Name</label>
            <input
              type="text"
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              className="w-full bg-slate-50 border p-2 mt-1 rounded-lg"
              placeholder="e.g. Tanzania Highway Contractors"
            />
          </div>

          <div>
            <label className="font-bold text-slate-650">Customer TIN Number</label>
            <input
              type="text"
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              className="w-full bg-slate-50 border p-2 mt-1 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-650">Customer VAT Number</label>
            <input
              type="text"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              className="w-full bg-slate-50 border p-2 mt-1 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-650">License Registration ID (REG)</label>
            <input
              type="text"
              value={reg}
              onChange={(e) => setReg(e.target.value)}
              className="w-full bg-slate-50 border p-2 mt-1 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-650">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border p-2 mt-1 rounded-lg"
            />
          </div>

          <div>
            <label className="font-bold text-slate-650">Region / Province</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-slate-50 border p-2 mt-1 rounded-lg"
            />
          </div>

          <div>
            <label className="font-bold text-slate-650">Phone Number *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 border p-2 mt-1 rounded-lg font-semibold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-650">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border p-2 mt-1 rounded-lg"
            />
          </div>

          <div className="md:col-span-3">
            <label className="font-bold text-slate-650">Sales Notes / Credit Guidelines</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border p-2 mt-1 rounded-lg h-16"
              placeholder="Credit status, special corporate agreements..."
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-6 rounded-lg leading-none shadow"
            >
              Verify & Register Client Profile
            </button>
          </div>
        </form>
      )}

      {/* CRM database records */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-white dark:bg-slate-950 rounded-xl border">
          <Users className="h-10 w-10 text-slate-300 mb-2" />
          <span className="font-extrabold text-sm uppercase text-slate-500">{t.noData}</span>
          <p className="text-xs text-slate-400 mt-1">{t.noDataDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers
            .filter((c) => {
              if (!crmSearch) return true;
              const term = crmSearch.toLowerCase().trim();
              return c.fullName.toLowerCase().includes(term) || 
                (c.companyName && c.companyName.toLowerCase().includes(term)) ||
                c.phone.includes(term);
            })
            .map((c) => {
            const metrics = getCustomerMetrics(c.id);
            return (
              <div key={c.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:shadow transition-all relative">
                
                {/* Account card header */}
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 rounded-lg flex items-center justify-center text-sm font-black uppercase">
                        {c.fullName[0]}{c.fullName.split(' ')?.[1]?.[0] || ''}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-xs leading-none">{c.fullName}</h3>
                        <span className="text-[10px] text-slate-400 font-medium block mt-1 line-clamp-1">{c.companyName || 'Individual Contact'}</span>
                      </div>
                    </div>

                    <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5 leading-none shadow-sm">
                      <Award className="h-3 w-3" />
                      <span>{c.loyaltyPoints} pts</span>
                    </span>
                  </div>

                  {/* Body contact cards */}
                  <div className="mt-4 space-y-1.5 text-slate-500 text-xs">
                    <div className="flex items-center gap-2"><PhoneCall className="h-3 w-3 text-slate-405" /> <span className="font-semibold text-slate-700 dark:text-slate-300">{c.phone}</span></div>
                    {c.email && <div className="text-[11px] font-mono break-all">{c.email}</div>}
                    <div className="text-[11px] italic font-medium">{c.address}, {c.region}</div>
                    {c.tinNumber && <div className="text-[10px] font-mono"><span className="text-slate-400 font-sans">TIN:</span> {c.tinNumber}</div>}
                  </div>

                  {c.notes && (
                    <div className="mt-3 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded text-[11px] italic border text-slate-500">
                      <strong>Notes:</strong> {c.notes}
                    </div>
                  )}

                </div>

                 {/* Lifetime metrics logs and admin delete */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block font-sans text-[10px] uppercase">Spendings</span>
                    <strong className="text-slate-900 dark:text-white text-xs">TZS {metrics.totalSpent.toLocaleString()}</strong>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const msg = language === 'SW' 
                          ? `Je, uko tayari kumfuta kabisa mteja huyu "${c.fullName}"? Hii itafuta kila kumbukumbu zake!`
                          : `Are you sure you want to permanently delete customer "${c.fullName}"? This will prune their references!`;
                        if (window.confirm(msg)) {
                          db.deleteCustomer(c.id, userEmail);
                          setCustomers(db.getCustomers());
                        }
                      }}
                      className="p-1 hover:bg-rose-100 rounded text-slate-450 hover:text-rose-600 transition cursor-pointer"
                      title={language === 'SW' ? 'Futa mteja huyu' : 'Delete this customer'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <div className="text-right">
                      <span className="text-slate-400 block font-sans text-[10px] uppercase">Purchased invoices</span>
                      <strong className="text-slate-900 dark:text-white text-xs">{metrics.totalContracts} invoices</strong>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
