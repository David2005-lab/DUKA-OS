/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Invoicing from './components/Invoicing';
import CRM from './components/CRM';
import SupplierStaff from './components/SupplierStaff';
import Accounting from './components/Accounting';
import EcommerceStore from './components/EcommerceStore';
import AIAssistant from './components/AIAssistant';
import SettingsAudit from './components/SettingsAudit';
import PriceCatalog from './components/PriceCatalog';

import { 
  LanguageCode, 
  ThemeMode, 
  UserRole, 
  Branch, 
  Product, 
  Invoice, 
  Transaction 
} from './types';
import { db } from './db';
import { translations } from './translations';
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  FileSpreadsheet, 
  BookOpen, 
  Clock, 
  Building2 
} from 'lucide-react';

export default function App() {
  // Settings Default States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState<LanguageCode>('EN');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [currentBranch, setCurrentBranch] = useState('branch-main');
  const [currentUser, setCurrentUser] = useState<{ email: string; role: UserRole }>({
    email: 'admin@enterprise-erp.com',
    role: 'Super Admin'
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadData = () => {
    // Dynamic bootstrap
    setBranches(db.getBranches());
    setProducts(db.getProducts());
    setInvoices(db.getInvoices());
    setTransactions(db.getTransactions());
    
    // Sync UI overrides values
    setLanguage(db.getLanguage());
    setTheme(db.getThemeMode());
    setCurrentBranch(db.getCurrentBranch());
    
    const u = db.getCurrentUser();
    if (u) {
      setCurrentUser(u);
    }
  };

  useEffect(() => {
    loadData();
    // Poll to keep in sync with active checkout deprivations
    const interval = setInterval(() => {
      setProducts(db.getProducts());
      setInvoices(db.getInvoices());
      setTransactions(db.getTransactions());
    }, 2500);
    return () => clearInterval(interval);
  }, [currentBranch]);

  // Handle HTML document styles dynamically
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'luxury-gold', 'neon-cyan', 'high-density', 'glass-future');
    if (theme === 'dark') root.classList.add('dark');
    if (theme === 'luxury-gold') root.classList.add('luxury-gold');
    if (theme === 'neon-cyan') root.classList.add('neon-cyan');
    if (theme === 'high-density') root.classList.add('high-density');
    if (theme === 'glass-future') root.classList.add('glass-future');
  }, [theme]);

  const t = translations[language];

  // Calculations for executive summary metrics
  const paidInvoices = invoices.filter((i) => i.status === 'Paid');
  const totalRevenueSum = paidInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

  // Depleted products trackers
  const lowStockCount = products.filter((p) => {
    const bQty = p.branchStock[currentBranch] ?? 0;
    return bQty <= p.reorderLevel;
  }).length;

  const totalRegisteredClients = db.getCustomers().length;
  const totalPendingBills = invoices.filter((i) => i.status === 'Pending').length;

  const getLastFiveDaysMetrics = () => {
    const days = [];
    const today = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayTxns = transactions.filter((tx) => tx.date === dateStr);
      const sales = dayTxns.filter((tx) => tx.type === 'Sale').reduce((sum, tx) => sum + tx.amount, 0);
      const expenses = dayTxns.filter((tx) => tx.type === 'Expense').reduce((sum, tx) => sum + tx.amount, 0);
      
      const label = d.toLocaleDateString(language === 'SW' ? 'sw-TZ' : 'en-US', { month: 'short', day: 'numeric' });
      days.push({ label, sales, expenses });
    }
    return days;
  };

  // View Router helper
  const renderTabContent = () => {
    switch (activeTab) {
      case 'pos':
        return <POS language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'prices':
        return <PriceCatalog language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'inventory':
        return <Inventory language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'invoices':
        return <Invoicing language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'crm':
        return <CRM language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'suppliers':
        return <SupplierStaff language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'accounting':
        return <Accounting language={language} currentBranch={currentBranch} />;
      case 'ecommerce':
        return <EcommerceStore language={language} currentBranch={currentBranch} />;
      case 'aiAssistant':
        return <AIAssistant language={language} />;
      case 'settings':
        return <SettingsAudit language={language} userEmail={currentUser.email} />;
      default: // 'dashboard' Core widgets overview
        return (
          <div className="space-y-6 animate-fade-in text-xs">
            
            {/* Context bar with welcome branding */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl gap-2 shadow-sm">
              <div>
                <strong className="text-sm font-serif text-slate-900 dark:text-white uppercase leading-none block">
                  {language === 'SW' ? 'Eneo la Utawala la ERP' : 'Intelligence ERP Master Console'}
                </strong>
                <span className="text-[10.5px] text-slate-400 mt-1 block font-extrabold">
                  {language === 'SW' ? 'Mfumo wa Kisasa wa Kusimamia Mauzo na Stoki (Duka OS)' : 'Advanced real-time sales and inventory management console.'}
                </span>
              </div>

              <div className="bg-indigo-600/10 border border-indigo-400/20 text-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 uppercase font-extrabold text-[10px]">
                <Clock className="h-4 w-4" />
                <span>UTC Active Node</span>
              </div>
            </div>

            {/* KPI Executive metrics cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Gross income card */}
              <div className="bg-white dark:bg-slate-950 p-4 border border-slate-205 dark:border-slate-800 rounded-xl shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 block">{t.totalSales}</span>
                  <strong className="text-sm font-mono tracking-tight text-slate-900 dark:text-white">TZS {totalRevenueSum.toLocaleString()}</strong>
                  <span className="text-[9.5px] text-emerald-600 font-bold block">Paid invoices verified</span>
                </div>
                <div className="h-10 w-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>

              {/* CRM clients counts */}
              <div className="bg-white dark:bg-slate-950 p-4 border border-slate-205 dark:border-slate-800 rounded-xl shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 block">Registered Customers</span>
                  <strong className="text-sm tracking-tight text-slate-900 dark:text-white font-mono">{totalRegisteredClients} Profiles</strong>
                  <span className="text-[9.5px] text-indigo-600 font-bold block">With distinct TIN / regions</span>
                </div>
                <div className="h-10 w-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              </div>

              {/* Pending Bills alerts */}
              <div className="bg-white dark:bg-slate-950 p-4 border border-slate-205 dark:border-slate-800 rounded-xl shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 block">Draft / Pending Invoices</span>
                  <strong className="text-sm tracking-tight text-slate-900 dark:text-white font-mono">{totalPendingBills} pending</strong>
                  <span className="text-[9.5px] text-amber-600 font-bold block">Awaiting sign checks</span>
                </div>
                <div className="h-10 w-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
              </div>

              {/* Low stock alerts alerts */}
              <div className="bg-white dark:bg-slate-950 p-4 border border-slate-205 dark:border-slate-800 rounded-xl shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-405 block">Depleted / Stock Warnings</span>
                  <strong className={`text-sm tracking-tight font-mono ${lowStockCount > 0 ? 'text-red-650' : 'text-slate-900 dark:text-white'}`}>{lowStockCount} Items alerts</strong>
                  <span className="text-[9.5px] text-slate-400 font-bold block">Below branch reorder limits</span>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-50 text-red-650 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>

            </div>

            {/* PAST FIVE DAYS TRANSACTION CHART */}
            {(() => {
              const chartData = getLastFiveDaysMetrics();
              const maxVal = Math.max(...chartData.map(d => Math.max(d.sales, d.expenses)), 100000);
              return (
                <div className="bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-205 dark:border-slate-800 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b pb-2 mb-2 border-slate-100 dark:border-slate-800">
                    <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1.5 matches-font">
                      <TrendingUp className="h-4 w-4 text-emerald-600 animate-pulse" />
                      <span>{language === 'SW' ? 'Mienendo ya Kifedha ya Siku 5 (Mauzo vs Gharama)' : '5-Day Financial Trend Analytics (Sales vs Expenses)'}</span>
                    </span>
                    <div className="flex items-center gap-3 text-[10px] font-extrabold">
                      <span className="flex items-center gap-1 text-slate-650 dark:text-slate-300">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
                        <span>{language === 'SW' ? 'Mauzo' : 'Sales Revenue'}</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-650 dark:text-slate-300">
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span>
                        <span>{language === 'SW' ? 'Gharama' : 'Expenses'}</span>
                      </span>
                    </div>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-medium">
                      {language === 'SW' ? 'Fanya uuzaji au manunuzi ili kusasisha grafu ya mienendo' : 'Log a POS sale or inventory purchase to generate dynamic trend series here.'}
                    </div>
                  ) : (
                    <div className="pt-4 pb-2">
                      {/* Custom SVG/CSS Flex Columns Bar Chart */}
                      <div className="relative h-44 flex items-end justify-between gap-4 border-b border-l border-slate-100 dark:border-slate-800 px-4 pb-1">
                        
                        {/* Background guide lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40 pr-4">
                          <div className="border-b border-slate-100 dark:border-slate-850 h-0"></div>
                          <div className="border-b border-slate-100 dark:border-slate-850 h-0"></div>
                          <div className="border-b border-slate-100 dark:border-slate-850 h-0"></div>
                          <div className="h-0"></div>
                        </div>

                        {chartData.map((day, dIdx) => {
                          const salesPercent = (day.sales / maxVal) * 100;
                          const expensesPercent = (day.expenses / maxVal) * 100;

                          return (
                            <div key={dIdx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                              
                              {/* Overlay values tooltip */}
                              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-slate-800 text-white p-2 rounded shadow-xl text-[9px] z-20 pointer-events-none flex flex-col gap-0.5 border border-slate-755/50">
                                <span className="font-bold underline text-slate-300">{day.label}</span>
                                <span className="text-emerald-400 font-mono font-bold">Sales: TZS {day.sales.toLocaleString()}</span>
                                <span className="text-rose-450 text-rose-400 font-mono font-bold">Expense: TZS {day.expenses.toLocaleString()}</span>
                              </div>

                              {/* Dual Bars stack */}
                              <div className="flex gap-1.5 items-end w-full justify-center flex-1 max-w-[80px] z-10 h-full">
                                {/* Sales Bar */}
                                <div className="w-1/2 flex flex-col justify-end h-full">
                                  <div 
                                    style={{ height: day.sales > 0 ? `${Math.max(4, salesPercent)}%` : '0%' }}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 hover:dark:bg-emerald-500 rounded-t transition-all duration-300 shadow-xs cursor-pointer"
                                  ></div>
                                </div>

                                {/* Expenses Bar */}
                                <div className="w-1/2 flex flex-col justify-end h-full">
                                  <div 
                                    style={{ height: day.expenses > 0 ? `${Math.max(4, expensesPercent)}%` : '0%' }}
                                    className="w-full bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 hover:dark:bg-rose-500 rounded-t transition-all duration-300 shadow-xs cursor-pointer"
                                  ></div>
                                </div>
                              </div>

                              {/* Axis Day label */}
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-tight mt-1 truncate max-w-full">
                                {day.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Visual rows layout - Main stats grids */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column Ledger ledger trail - Col 8 */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block border-b pb-1.5 flex items-center gap-1">
                  <BookOpen className="h-4 w-4 text-indigo-650" />
                  <span>HQ General Ledger transactions feeds</span>
                </span>

                {transactions.length === 0 ? (
                  <p className="text-center text-slate-400 py-12">No operations logged yet. Complete POS register checkouts or procure stocks to inflate journals.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {transactions.slice(0, 10).map((tx) => (
                      <div key={tx.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border flex items-center justify-between hover:bg-slate-50/10 transition-all text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-white font-bold block">{tx.description || tx.categoryId}</strong>
                          <span className="text-[9.5px] text-slate-405 font-mono">{tx.date} | Branch: {tx.branchId === 'branch-main' ? 'HQ' : 'Branch Node'}</span>
                        </div>

                        <strong className={`font-mono font-black ${tx.type === 'Sale' ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {tx.type === 'Sale' ? '+' : '-'} TZS {tx.amount.toLocaleString()}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column Warnings side block - Col 4 */}
              <div className="lg:col-span-4 space-y-4">
                
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3 shadow-sm">
                  <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block border-b pb-1">Depleted Stocks Warning panel</span>
                  
                  {products.length === 0 ? (
                    <p className="text-slate-400 text-center py-6">Stock catalogues empty. Register products.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {products.map((p) => {
                        const bQty = p.branchStock[currentBranch] ?? 0;
                        const isWarning = bQty <= p.reorderLevel;
                        return (
                          <div key={p.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border flex justify-between items-center">
                            <div className="flex-1 pr-2">
                              <span className="font-black text-slate-805 dark:text-slate-100 block line-clamp-1">{p.name}</span>
                              <span className="text-[9.5px] font-mono text-slate-450 block mt-0.5">SKU: {p.sku} | Buf: {p.reorderLevel} pcs</span>
                            </div>

                            <span className={`font-mono font-black text-xs px-2 py-0.5 rounded ${bQty <= 0 ? 'bg-red-100 text-red-900' : isWarning ? 'bg-amber-100 text-amber-900' : 'bg-slate-100'}`}>
                              {bQty} pcs
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Upper Navigation Row with dynamic triggers */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        language={language} 
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        currentBranch={currentBranch}
        setCurrentBranch={setCurrentBranch}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        branches={branches}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />

      {/* Main Core Router container positioned below fixed top horizontal dashboard */}
      <main className={`transition-all duration-300 pt-20 p-4 md:p-6 animate-fade-in ${
        sidebarCollapsed ? 'md:pl-20 lg:pl-20' : 'md:pl-20 lg:pl-72'
      }`}>
        <div className="w-full max-w-7xl mx-auto space-y-6">
          {renderTabContent()}
        </div>
      </main>

    </div>
  );
}
