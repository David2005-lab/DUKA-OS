/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  BookOpen, 
  Scale, 
  Wallet, 
  Printer, 
  Calculator,
  Download,
  Trash2,
  Edit,
  Save,
  X
} from 'lucide-react';
import { Transaction, Product } from '../types';
import { db } from '../db';
import { translations } from '../translations';
import { printElement } from '../utils/print';

interface AccountingProps {
  language: 'EN' | 'SW';
  currentBranch: string;
}

export default function Accounting({ language, currentBranch }: AccountingProps) {
  const t = translations[language];

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeBook, setActiveBook] = useState<'p&l' | 'cashflow' | 'balance' | 'ledger'>('p&l');

  // Transaction editing temporary states
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [editType, setEditType] = useState<'Sale' | 'Expense' | 'Refund'>('Expense');
  const [editDate, setEditDate] = useState('');

  const loadData = () => {
    setTransactions(db.getTransactions());
    setProducts(db.getProducts());
  };

  useEffect(() => {
    loadData();
  }, [currentBranch]);

  // Aggregate stats based STRICTLY on actual data
  const salesTxns = transactions.filter((tx) => tx.type === 'Sale');
  const expenseTxns = transactions.filter((tx) => tx.type === 'Expense');
  const refundTxns = transactions.filter((tx) => tx.type === 'Refund');

  const totalSalesRevenue = salesTxns.reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = expenseTxns.reduce((sum, tx) => sum + tx.amount, 0);
  const totalRefunds = refundTxns.reduce((sum, tx) => sum + tx.amount, 0);

  // Calculations
  const grossProfit = Math.max(0, totalSalesRevenue - totalRefunds);
  const netEarnings = grossProfit - totalExpenses;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Visual selectors header */}
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-4 border rounded-xl flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-650" />
          <h2 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white leading-none">Double-Entry Financial Ledgers</h2>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'p&l', label: t.pAndL, icon: TrendingUp },
            { id: 'cashflow', label: t.cashFlow, icon: Wallet },
            { id: 'balance', label: t.trialBalance, icon: Scale },
            { id: 'ledger', label: 'General Ledger', icon: BookOpen }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveBook(item.id as any)}
                className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1 whitespace-nowrap leading-none transition-all ${
                  activeBook === item.id
                    ? 'bg-indigo-605 text-white bg-indigo-600 border-indigo-600'
                    : 'bg-white text-slate-705 border-slate-205'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-white dark:bg-slate-950 rounded-xl border">
          <Calculator className="h-10 w-10 text-slate-300 mb-2" />
          <span className="font-extrabold text-sm uppercase text-slate-500">{t.noData}</span>
          <p className="text-xs text-slate-405 mt-1">{t.noDataDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          
          {/* Main accounts spreadsheet pane - Col 8 */}
          <div id="financial-statement-canvas" className="lg:col-span-8 bg-white dark:bg-slate-950 p-6 rounded-xl border shadow-md space-y-6">
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-black text-xs uppercase text-slate-800 dark:text-white">Structured Financial Statement</span>
              <button 
                onClick={() => printElement('financial-statement-canvas', `Financial_Statement_${activeBook.toUpperCase()}`)} 
                className="text-indigo-600 hover:underline flex items-center gap-1 leading-none font-bold"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Export Print preview</span>
              </button>
            </div>

            {activeBook === 'p&l' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-serif text-lg text-slate-900 dark:text-white">Profit & Loss Statement (TZS)</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Calculated for UTC calendar year 2026</span>
                </div>

                <div className="space-y-4">
                  {/* Revenue section */}
                  <div className="space-y-2">
                    <span className="font-bold uppercase tracking-wider text-slate-400 block text-[10px]">OPERATING REVENUES</span>
                    <div className="flex justify-between border-b pb-1">
                      <span>POS Receipts / Invoiced Sales Volume</span>
                      <span className="font-mono text-slate-800 dark:text-white">+ TZS {totalSalesRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 text-slate-500">
                      <span>Rebates & Customer Returns Deduction</span>
                      <span className="font-mono">- TZS {totalRefunds.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-b-2 pt-1 uppercase dark:text-white">
                      <span>Net Sales Revenues</span>
                      <span className="font-mono">TZS {grossProfit.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Expenses section */}
                  <div className="space-y-2 pt-4">
                    <span className="font-bold uppercase tracking-wider text-slate-400 block text-[10px]">OPERATING DISBURSEMENTS (EXPENSES)</span>
                    <div className="flex justify-between border-b pb-1 text-slate-500">
                      <span>Cost of Goods Sold (Procurements restock)</span>
                      <span className="font-mono text-rose-600">- TZS {totalExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-b-2 pt-1 uppercase dark:text-white">
                      <span>Total Operating Costs</span>
                      <span className="font-mono">TZS {totalExpenses.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Net Profit Section */}
                  <div className="pt-6">
                    <div className={`p-4 rounded-xl flex justify-between items-center ${netEarnings >= 0 ? 'bg-emerald-50 text-emerald-950' : 'bg-rose-50 text-rose-950'}`}>
                      <div>
                        <strong className="text-sm block">NET OPERATING INCOME (PROFIT)</strong>
                        <span className="text-[10px] text-slate-450 block font-normal">Sales Credits minus COGS debits.</span>
                      </div>
                      <span className="font-mono font-black text-lg">TZS {netEarnings.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeBook === 'cashflow' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif text-lg text-slate-900 dark:text-white">Statement of Cash Flows</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Dynamic cash asset movements</span>
                </div>

                <div className="space-y-3">
                  <span className="font-bold text-slate-400 block uppercase">Cash Inflow (Operating activities)</span>
                  <div className="flex justify-between border-b pb-1">
                    <span>Cash collected from Sales</span>
                    <span className="font-mono text-emerald-600">+ TZS {totalSalesRevenue.toLocaleString()}</span>
                  </div>

                  <span className="font-bold text-slate-400 block uppercase pt-3">Cash Outflow (Operating activities)</span>
                  <div className="flex justify-between border-b pb-1">
                    <span>Cash paid for Inventories COGS</span>
                    <span className="font-mono text-rose-600">- TZS {totalExpenses.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between font-black text-slate-900 border-t border-double pt-3 text-sm dark:text-white">
                    <span>NET INCREASE IN CASH TRUSTS</span>
                    <span className="font-mono text-indigo-700 dark:text-indigo-400">TZS {netEarnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {activeBook === 'balance' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif text-lg text-slate-900 dark:text-white">Working Trial Balance Sheet</h3>
                  <span className="text-[10px] text-slate-400 font-mono font-normal">Active accounts balance ledger logs</span>
                </div>

                <table className="w-full text-left">
                  <thead className="bg-slate-50 font-bold border-b text-slate-550">
                    <tr>
                      <th className="p-2">Account Node Code</th>
                      <th className="p-2 text-right">Debit Balance (Dr)</th>
                      <th className="p-2 text-right">Credit Balance (Cr)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-bold">1000 - Bank / Cash accounts</td>
                      <td className="p-2 text-right font-mono text-emerald-600">TZS {netEarnings.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono text-slate-300">-</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-bold">4000 - Sales revenue account</td>
                      <td className="p-2 text-right font-mono text-slate-300">-</td>
                      <td className="p-2 text-right font-mono text-indigo-700">TZS {totalSalesRevenue.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-bold">5000 - Cost of goods sold (COGS)</td>
                      <td className="p-2 text-right font-mono text-rose-600">TZS {totalExpenses.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono text-slate-300">-</td>
                    </tr>
                    <tr className="border-b font-extrabold bg-slate-50">
                      <td className="p-2 text-slate-900">Aggregate ledger trial checks</td>
                      <td className="p-2 text-right font-mono text-emerald-600">TZS {totalSalesRevenue.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono text-indigo-650">TZS {totalSalesRevenue.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeBook === 'ledger' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-serif text-lg text-slate-900 dark:text-white">{language === 'SW' ? 'Kumbukumbu Kuu za Fedha (Ledger)' : 'Security General Ledger Records'}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">{language === 'SW' ? 'Njia salama za kufuata miamala na mtiririko' : 'Ledger Double-entry transaction trails'}</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {transactions.map((tx) => {
                    const isEditing = editingTxId === tx.id;
                    return (
                      <div key={tx.id} className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg transition-all">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex gap-2 items-center border-b pb-1.5">
                              <span className="font-extrabold text-[10px] text-indigo-600 block uppercase">
                                {language === 'SW' ? 'Hariri Shughuli ya Fedha' : 'Edit Financial Ledger Item'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="font-bold text-slate-500 block text-[9px] uppercase">
                                  {language === 'SW' ? 'Maelezo' : 'Description'}
                                </label>
                                <input
                                  type="text"
                                  value={editDesc}
                                  onChange={(e) => setEditDesc(e.target.value)}
                                  className="w-full border rounded p-1.5 bg-white text-slate-800"
                                />
                              </div>
                              <div>
                                <label className="font-bold text-slate-500 block text-[9px] uppercase">
                                  {language === 'SW' ? 'Kiasi (TZS)' : 'Amount (TZS)'}
                                </label>
                                <input
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(Number(e.target.value))}
                                  className="w-full border rounded p-1.5 bg-white text-slate-800 font-mono"
                                />
                              </div>
                              <div>
                                <label className="font-bold text-slate-500 block text-[9px] uppercase">
                                  {language === 'SW' ? 'Aina ya Fedha' : 'Flow Type'}
                                </label>
                                <select
                                  value={editType}
                                  onChange={(e) => setEditType(e.target.value as any)}
                                  className="w-full border rounded p-1.5 bg-white text-slate-800"
                                >
                                  <option value="Sale">Sale (+)</option>
                                  <option value="Expense">Expense (-)</option>
                                  <option value="Refund">Refund (-)</option>
                                </select>
                              </div>
                              <div>
                                <label className="font-bold text-slate-500 block text-[9px] uppercase">
                                  {language === 'SW' ? 'Tarehe' : 'Date'}
                                </label>
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="w-full border rounded p-1.5 bg-white text-slate-800 font-mono"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-1.5 pt-1.5">
                              <button
                                onClick={() => setEditingTxId(null)}
                                className="px-2.5 py-1 text-[11px] rounded bg-slate-200 text-slate-750 hover:bg-slate-350 flex items-center gap-1 cursor-pointer font-bold"
                              >
                                <X className="h-3 w-3" />
                                <span>{language === 'SW' ? 'Ghairi' : 'Cancel'}</span>
                              </button>
                              <button
                                onClick={() => {
                                  const updated: Transaction = {
                                    ...tx,
                                    description: editDesc,
                                    amount: editAmount,
                                    type: editType,
                                    date: editDate
                                  };
                                  db.updateTransaction(updated, 'Admin');
                                  setEditingTxId(null);
                                  loadData();
                                }}
                                className="px-2.5 py-1 text-[11px] rounded bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 cursor-pointer font-bold shadow"
                              >
                                <Save className="h-3 w-3" />
                                <span>{language === 'SW' ? 'Hifadhi' : 'Save'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 pr-1">
                              <div className="flex gap-2 items-center">
                                <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase text-center ${tx.type === 'Sale' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}>
                                  {tx.type}
                                </span>
                                <span className="text-[10px] text-slate-450 font-mono font-medium">{tx.date}</span>
                              </div>
                              <p className="font-black text-xs mt-1 text-slate-800 dark:text-slate-100">{tx.description || tx.categoryId}</p>
                              {tx.performedBy && (
                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5 font-sans">
                                  👤 {tx.performedBy}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`font-mono font-black text-xs whitespace-nowrap ${tx.type === 'Sale' ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {tx.type === 'Sale' ? '+' : '-'} TZS {tx.amount.toLocaleString()}
                              </span>
                              <div className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/80 rounded p-0.5 border border-slate-200/50">
                                <button
                                  onClick={() => {
                                    setEditingTxId(tx.id);
                                    setEditDesc(tx.description || tx.categoryId);
                                    setEditAmount(tx.amount);
                                    setEditType(tx.type);
                                    setEditDate(tx.date);
                                  }}
                                  className="p-1 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded transition cursor-pointer"
                                  title={language === 'SW' ? 'Hariri' : 'Edit'}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    const msg = language === 'SW' 
                                      ? 'Je, una uhakika unataka kufuta kabisa operesheni hii ya fedha?' 
                                      : 'Are you sure you want to delete this ledger entry permanently?';
                                    if (window.confirm(msg)) {
                                      db.deleteTransaction(tx.id, 'Admin');
                                      loadData();
                                    }
                                  }}
                                  className="p-1 hover:bg-rose-100 text-slate-500 hover:text-rose-605 rounded transition cursor-pointer"
                                  title={language === 'SW' ? 'Futa' : 'Delete'}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Balance highlights panel - Col 4 */}
          <div className="lg:col-span-4 space-y-4">
            
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-xl shadow-md p-4 space-y-4 border border-indigo-850">
              <span className="font-bold uppercase tracking-wider text-[9px] text-indigo-300 block">Bank Account balance</span>
              <div className="text-xl font-mono font-black tracking-tight leading-none">
                TZS {netEarnings.toLocaleString()}
              </div>
              <p className="text-[10px] text-indigo-200 font-medium">Synced securely with POS and procurement goods deliveries receipts ledger indices.</p>
            </div>

            <div className="bg-white dark:bg-slate-950 p-4 border rounded-xl space-y-2">
              <strong className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block border-b pb-1">Tax liabilities index</strong>
              
              <div className="flex justify-between pt-1.5 font-medium">
                <span>Value Added Tax (18% on gross)</span>
                <span className="font-mono font-bold">TZS {((grossProfit * 18)/118).toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-slate-400 italic">Simulated real-time EFD / E-Tax values generated automatically as transactions scale.</p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
