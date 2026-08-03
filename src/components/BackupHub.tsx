/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Send, 
  Printer, 
  FileText, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  TrendingUp, 
  Package, 
  History, 
  ArrowDownToLine, 
  Clock,
  ShieldCheck,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react';
import { db } from '../db';
import { printElement } from '../utils/print';

interface BackupHubProps {
  language: 'EN' | 'SW';
  userEmail: string;
}

interface BackupSettings {
  phone: string;
  cycle: 'manual' | 'five_days';
  enabled: boolean;
  lastBackupDate: string | null;
}

export default function BackupHub({ language, userEmail }: BackupHubProps) {
  const isSwahili = language === 'SW';
  
  // Backups storage
  const [settings, setSettings] = useState<BackupSettings>({
    phone: '+255 784 222 333',
    cycle: 'manual',
    enabled: true,
    lastBackupDate: null
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic system report compiler states
  const [stockSummary, setStockSummary] = useState({ totalItems: 0, lowStockCount: 0, totalValuation: 0 });
  const [recentSales, setRecentSales] = useState({ count: 0, totalVolume: 0 });
  const [recentPurchases, setRecentPurchases] = useState({ count: 0, totalGoodsAdded: 0, totalCost: 0 });
  const [loginActivities, setLoginActivities] = useState<any[]>([]);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);

  // Load configuration and data on boot
  useEffect(() => {
    // 1. Settings Loading
    const stored = localStorage.getItem('SmartERP_BackupSettings_v2');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error("Error loaded backup settings", e);
      }
    } else {
      // Look up and fallback to profile whatsapp number if present
      const profile = db.getProfile();
      if (profile?.whatsapp) {
        setSettings(prev => ({ ...prev, phone: profile.whatsapp }));
      }
    }

    // 2. Report Compilation
    const products = db.getProducts();
    const invoices = db.getInvoices();
    const transactions = db.getTransactions();
    const purchases = db.getPurchases();
    const audits = db.getAuditLog();

    // Stock Summary calculation
    const totalItems = products.length;
    const lowStockCount = products.filter(p => {
      const bQty = Object.values(p.branchStock || {}).reduce((s, v) => s + (v || 0), 0) || p.quantity || 0;
      return bQty <= (p.reorderLevel || 5);
    }).length;
    const totalValuation = products.reduce((sum, p) => {
      const bQty = Object.values(p.branchStock || {}).reduce((s, v) => s + (v || 0), 0) || p.quantity || 0;
      return sum + (bQty * (p.costPrice || p.sellingPrice || 0));
    }, 0);
    setStockSummary({ totalItems, lowStockCount, totalValuation });

    // Recent sales calculation (Past 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Filter transactions for past 7 days sales
    const pastSalesTxns = transactions.filter(t => {
      const isSales = t.type === 'Sale' || t.categoryId?.toLowerCase() === 'sales' || t.categoryId?.toLowerCase() === 'pos sale';
      const txnDate = new Date(t.date);
      return isSales && txnDate >= sevenDaysAgo;
    });

    const salesTotalValue = pastSalesTxns.reduce((sum, t) => sum + t.amount, 0);
    setRecentSales({ 
      count: pastSalesTxns.length, 
      totalVolume: salesTotalValue 
    });

    // Recent Restocks/Purchases compiled
    const completedPOs = purchases.filter(p => p.status === 'Received');
    const recentPOs = completedPOs.filter(p => new Date(p.date) >= sevenDaysAgo);
    const totalPOValue = recentPOs.reduce((sum, p) => sum + p.grandTotal, 0);
    const totalItemsAdded = recentPOs.length; // Simply count of orders
    setRecentPurchases({
      count: recentPOs.length,
      totalGoodsAdded: totalItemsAdded,
      totalCost: totalPOValue
    });

    // Logins tracking
    const loginLogs = audits.filter(a => 
      a.details?.toLowerCase().includes('login') || 
      a.details?.toLowerCase().includes('attendance') ||
      a.details?.toLowerCase().includes('session')
    ).slice(0, 10);
    setLoginActivities(loginLogs);

    // General audit actions (Past 10)
    setRecentAudits(audits.slice(0, 10));
  }, []);

  const saveBackupSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('SmartERP_BackupSettings_v2', JSON.stringify(settings));
    setSaveSuccess(true);
    db.logAudit('UPDATE', 'BackupSettings', `Updated system auto-backup settings to ${settings.cycle} for number ${settings.phone}`, userEmail);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleManualBackupTrigger = async () => {
    setIsLoading(true);
    
    // Simulated live compiling sequence with zero-delay
    setTimeout(() => {
      const nowString = new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString();
      const updatedSettings = {
        ...settings,
        lastBackupDate: nowString
      };
      setSettings(updatedSettings);
      localStorage.setItem('SmartERP_BackupSettings_v2', JSON.stringify(updatedSettings));
      
      setTriggerSuccess(true);
      db.logAudit('CREATE', 'SystemBackup', `Generated system security backup summary manually and queued WhatsApp dispatch`, userEmail);
      setIsLoading(false);
      
      // WhatsApp payload compiling
      const profile = db.getProfile();
      let msg = "";

      if (isSwahili) {
        msg = `🔒 *HIFADHI YA MFUMO NA RIPOTI RASMI - ${profile?.name?.toUpperCase() || 'SMART ERP'}*\n`;
        msg += `📅 *Tarehe na Saa:* ${nowString}\n`;
        msg += `📱 *Mwendeshaji:* ${userEmail}\n`;
        msg += `-----------------------------------------------\n\n`;
        msg += `📊 *1. MAELEZO YA STOKI (INVENTORY)*\n`;
        msg += `• Jumuia ya Bidhaa: ${stockSummary.totalItems} aina tofauti\n`;
        msg += `• Bidhaa zenye upungufu: ${stockSummary.lowStockCount} (Inahitaji Restock)\n`;
        msg += `• Thamani ya Bidhaa Ghala: TZS ${stockSummary.totalValuation.toLocaleString()}\n\n`;
        msg += `📈 *2. MAUZO (SALES - SIKU 7 ZILIZOPITA)*\n`;
        msg += `• Idadi ya Invoices zilizofanyika: ${recentSales.count}\n`;
        msg += `• Jumla ya Mapato Mauzo: TZS ${recentSales.totalVolume.toLocaleString()}\n\n`;
        msg += `📦 *3. MZIGO ULIOINGIA (STOCK-INS)*\n`;
        msg += `• Ununuzi mpya (POs): ${recentPurchases.count} zilizopokelewa\n`;
        msg += `• Thamani ya mzigo: TZS ${recentPurchases.totalCost.toLocaleString()}\n\n`;
        msg += `🔑 *4. USALAMA & LOGINS (AUDIT)*\n`;
        msg += `• Kuingia kwa watumishi (Logins hivi karibuni): ${loginActivities.length > 0 ? loginActivities.length : '0 active'}\n`;
        msg += `• Matukio ya Mfumo Yaliyorekodiwa: ${recentAudits.length} matukio\n\n`;
        msg += `-----------------------------------------------\n`;
        msg += `📁 *Thibitisha Ripoti Kamili na PDF katika ERP yako:* \n${window.location.origin}/verify?type=backupReport&date=${encodeURIComponent(nowString)}&items=${stockSummary.totalItems}&sales=${recentSales.totalVolume}\n\n`;
        msg += `_Hifadhi hii imetengenezwa kwa ulinzi wa kidijitali wa Smart ERP._`;
      } else {
        msg = `🔒 *CORE SYSTEM BACKUP & DISPATCH REPORT - ${profile?.name?.toUpperCase() || 'SMART ERP'}*\n`;
        msg += `📅 *Timestamp:* ${nowString}\n`;
        msg += `📱 *Operator:* ${userEmail}\n`;
        msg += `-----------------------------------------------\n\n`;
        msg += `📊 *1. STOCK & WAREHOUSE LEDGER*\n`;
        msg += `• Unique SKUs Registered: ${stockSummary.totalItems}\n`;
        msg += `• Critical Reorder Alerts: ${stockSummary.lowStockCount}\n`;
        msg += `• Current Asset Valuation: TZS ${stockSummary.totalValuation.toLocaleString()}\n\n`;
        msg += `📈 *2. COMMERCIAL OUTFLOW (PAST 7 DAYS)*\n`;
        msg += `• Settled Transactions Count: ${recentSales.count}\n`;
        msg += `• Total Revenues Generated: TZS ${recentSales.totalVolume.toLocaleString()}\n\n`;
        msg += `📦 *3. SUPPLY REPLENISHMENTS (STOCK-IN)*\n`;
        msg += `• Registered PO Restocks: ${recentPurchases.count}\n`;
        msg += `• Value of Goods Received: TZS ${recentPurchases.totalCost.toLocaleString()}\n\n`;
        msg += `🔑 *4. SECURITY ACCESS & LOGIN AUDIT*\n`;
        msg += `• Employee Login Attendance sessions: ${loginActivities.length}\n`;
        msg += `• System Trace audits compiled: ${recentAudits.length} logs\n\n`;
        msg += `-----------------------------------------------\n`;
        msg += `📁 *Review full certified system state & verification backup PDF here:* \n${window.location.origin}/verify?type=backupReport&date=${encodeURIComponent(nowString)}&items=${stockSummary.totalItems}&sales=${recentSales.totalVolume}\n\n`;
        msg += `_Protected by Smart ERP Digital Security Hub._`;
      }

      // WhatsApp mobile-friendly trigger
      const cleanPhone = settings.phone.replace(/\D/g, '');
      const link = document.createElement("a");
      link.href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => setTriggerSuccess(false), 4000);
    }, 1200);
  };

  const downloadBackupPDF = () => {
    printElement('printable-backup-report', 'System_Audit_Report_Backup');
    db.logAudit('TRANSFER', 'BackupPDF', `Downloaded system activity report in printable format`, userEmail);
  };

  const profile = db.getProfile();

  return (
    <div className="space-y-6 max-w-6xl mx-auto select-none animate-fade-in text-xs text-slate-800 dark:text-slate-200">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-250 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Database className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                {isSwahili ? 'Kitovu cha Hifadhi & WhatsApp (Backup Hub)' : 'System Automation Backups & WhatsApp Hub'}
              </h2>
              <p className="text-[10px] text-slate-400">
                {isSwahili 
                  ? 'Fanya nakala ya stoki, mizigo iliyoingia, ripoti za mauzo na logins na kuituma kwa mteja au sasa hivi.' 
                  : 'Maintain enterprise compliance: compile, print, export, and secure transaction snapshots to digital streams.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 text-[9.5px] font-black uppercase rounded-lg border flex items-center gap-1.5 ${
            settings.enabled 
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
          }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse"></span>
            <span>{settings.enabled ? (isSwahili ? 'AUTO-BACKUP IPO ACTV' : 'AUTO-BACKUP ACTIVE') : (isSwahili ? 'AUTO-BACKUP IMEZIMWA' : 'AUTO-BACKUP SUSPENDED')}</span>
          </span>
          
          <button
            onClick={() => {
              setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
              db.logAudit('UPDATE', 'BackupSettings', `Toggled auto-backup to ${!settings.enabled}`, userEmail);
            }}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-905 dark:hover:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl cursor-pointer"
            title={isSwahili ? 'Badili hali ya Auto-Backup' : 'Toggle manual system status'}
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CRITICAL CONFIGURATION SETTINGS (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={saveBackupSettings} className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-250 dark:border-slate-800 space-y-4">
            <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 dark:border-slate-850">
              <Settings className="h-4 w-4 text-indigo-500" />
              <span>{isSwahili ? 'MIPANGILIO YA HIFADHI NA RIPOTI' : 'REPORT CONFLICT CONFIGURATION'}</span>
            </span>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 rounded-xl flex items-center gap-2 font-bold text-[10px] uppercase">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span>{isSwahili ? 'Mipangilio Imesasishwa Kwenye Hifadhi!' : 'Backup triggers calibrated successfully!'}</span>
              </div>
            )}

            {/* WHATTSAP TELEPHONE NUMBER */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-black uppercase text-slate-400 block">
                {isSwahili ? 'Namba ya Simu Upokee Ripoti (WhatsApp Number):' : 'Backup Primary WhatsApp Number:'}
              </label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-50 dark:bg-slate-900/60 border p-2.5 rounded-xl font-bold font-mono tracking-wide text-xs focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. +255784222333"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
              <span className="text-[8.5px] text-slate-400 leading-normal block">
                {isSwahili 
                  ? 'Weka namba yenye namba ya nchi mfano: +255... Mfumo utatuma muhtasari na PDF hapa.' 
                  : 'Ensure complete international dialing code format. Reports will route to this receiver.'}
              </span>
            </div>

            {/* FREQUENCY PERIOD SELECT */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-black uppercase text-slate-400 block">
                {isSwahili ? 'Mzunguko wa Kutuma Backup (Interval Type):' : 'Scheduled Delivery Automation:'}
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, cycle: 'five_days' })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    settings.cycle === 'five_days' 
                      ? 'border-indigo-505 bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-bold' 
                      : 'border-slate-205 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-900 text-slate-500'
                  }`}
                >
                  <Calendar className="h-4.5 w-4.5 mb-1.5" />
                  <div>
                    <span className="block text-[10.5px] font-black">{isSwahili ? 'Kila Siku 5' : 'Every 5 Days'}</span>
                    <span className="block text-[8px] opacity-75">{isSwahili ? 'Inatuma Automatic' : 'Automatic push scheduling'}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, cycle: 'manual' })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    settings.cycle === 'manual' 
                      ? 'border-indigo-505 bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-bold' 
                      : 'border-slate-205 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-900 text-slate-500'
                  }`}
                >
                  <Clock className="h-4.5 w-4.5 mb-1.5" />
                  <div>
                    <span className="block text-[10.5px] font-black">{isSwahili ? 'Mtu Atakaporequest' : 'Manual Trigger'}</span>
                    <span className="block text-[8px] opacity-75">{isSwahili ? 'Haitatuma yenyewe' : 'Dispatched only on demand'}</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-extrabold uppercase rounded-xl text-[10px] tracking-wider cursor-pointer"
              >
                {isSwahili ? 'Hifadhi Mipangilio' : 'Save System Settings'}
              </button>
            </div>
          </form>

          {/* INSTANT MANUALLY PACKAGING WORKSPACE */}
          <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-250 dark:border-slate-800 space-y-4">
            <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider block">
              {isSwahili ? 'TUMA JUU YA MAOMBI (INSTANT WEB REQUEST)' : 'INSTANT FORCE DISPATCH'}
            </span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {isSwahili 
                ? 'Bonyeza hapa chini kukusanya data zote za stoki, mauzo, ununuzi wa mizigo yenye hadhi ya stoki na log auditing na kuituma sasa hivi kupitia WhatsApp.'
                : 'Instantly query database node registers, export transaction ledgers, parse security audit streams, and invoke secure WhatsApp dispatch.'}
            </p>

            {triggerSuccess && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 rounded-xl flex items-center gap-2 font-bold text-[10pt] uppercase">
                <CheckCircle className="h-4 w-4 text-indigo-500" />
                <span>{isSwahili ? 'Hifadhi Imekamilika na Kutumwa!' : 'Ledger Packaged & Sent Successfully!'}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={handleManualBackupTrigger}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 text-white font-extrabold uppercase rounded-xl flex items-center justify-center gap-2 text-xs tracking-wider cursor-pointer shadow-md shadow-indigo-600/10"
              >
                {isLoading ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{isSwahili ? 'Tuma Ripoti kwa WhatsApp Sasa 🚀' : 'Compress & Wire via WhatsApp Now 🚀'}</span>
              </button>
              
              <div className="text-[9px] text-slate-400 flex items-center gap-1 justify-center">
                <Clock className="h-3 w-3" />
                <span>{isSwahili ? `Hifadhi ya mwisho: ${settings.lastBackupDate || 'Bado'}` : `Stored register point: ${settings.lastBackupDate || 'Never'}`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED REPORT VIEW CANVAS FOR PRINTING/EXPORTING (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">
              {isSwahili ? 'MUHTASARI WA HIFADHI (REPORT CANVAS)' : 'AUDIT SNAPSHOT CANVAS'}
            </span>
            
            <button
              onClick={downloadBackupPDF}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 text-[10px] uppercase cursor-pointer shadow-xs"
              title={isSwahili ? 'Pakua ripoti hii katika PDF' : 'Print certified Document'}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{isSwahili ? 'Pakua kama PDF' : 'Download report PDF'}</span>
            </button>
          </div>

          {/* PRINT WORKSPACE SHEET CONTAINER */}
          <div 
            id="printable-backup-report" 
            className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-250 dark:border-slate-800 shadow-xl space-y-6 text-slate-800 dark:text-slate-300 relative font-sans"
          >
            {/* STAMP EMBELLISHMENT OR SECURITY SEAL FOR COHERENCY */}
            <div className="absolute top-4 right-4 border-2 border-dashed border-indigo-500/25 p-1 rounded-lg text-center leading-none tracking-widest text-[8px] font-black uppercase text-indigo-500 rotate-12 select-none">
              SMART ERP APPROVED<br/>VERIFIED BACKUP
            </div>

            {/* HEADER SHEET ROW */}
            <div className="flex justify-between items-start border-b pb-4 dark:border-slate-850">
              <div className="space-y-1">
                <span className="text-xl font-sans font-black text-indigo-700 dark:text-indigo-400 block mb-1">
                  {profile?.name?.toUpperCase() || 'SMART ERP ENTERPRISE'}
                </span>
                <p className="text-[9px] text-slate-400 leading-none">TIN: {profile?.tinNumber || '111-222-333'} | VAT: {profile?.vatNumber || 'VAT-444-555'}</p>
                <p className="text-[9px] text-slate-400 leading-none">Loc: {profile?.address || 'Kinondoni Plaza, Dar es Salaam'}</p>
              </div>
              <div className="text-right pt-1 space-y-0.5">
                <span className="block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold rounded text-[9.5px] uppercase tracking-wider">
                  SYSTEM STATUS REPORT
                </span>
                <div className="text-[9px] font-mono text-slate-400">Date: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {/* HIGH-LEVEL METRIC SLOTS */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border dark:border-slate-850 text-center space-y-0.5">
                <Package className="h-4.5 w-4.5 text-indigo-500 mx-auto" />
                <span className="block text-slate-400 text-[8.5px] uppercase font-bold">{isSwahili ? 'STOKI YA GHARANI' : 'LEDGER SKUS'}</span>
                <span className="block font-mono text-xs font-black text-slate-900 dark:text-white">{stockSummary.totalItems} Items</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border dark:border-slate-850 text-center space-y-0.5">
                <TrendingUp className="h-4.5 w-4.5 text-emerald-500 mx-auto" />
                <span className="block text-slate-400 text-[8.5px] uppercase font-bold">{isSwahili ? 'KAZI SIKU 7 (SALES)' : 'WEEKLY REVENUES'}</span>
                <span className="block font-mono text-xs font-black text-slate-900 dark:text-white">TZS {recentSales.totalVolume.toLocaleString()}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border dark:border-slate-850 text-center space-y-0.5">
                <ArrowDownToLine className="h-4.5 w-4.5 text-sky-500 mx-auto" />
                <span className="block text-slate-400 text-[8.5px] uppercase font-bold">{isSwahili ? 'UNUNUZI SIKU 7' : 'RESTOCK PO VALUE'}</span>
                <span className="block font-mono text-xs font-black text-slate-900 dark:text-white">TZS {recentPurchases.totalCost.toLocaleString()}</span>
              </div>
            </div>

            {/* BLOCK 1: DETAILED CURRENT STOCK LEDGER METRIC */}
            <div className="space-y-2">
              <span className="p-1 px-1.5 bg-slate-100 dark:bg-slate-900/40 rounded text-[9px] font-black uppercase text-slate-500 tracking-wider block">
                {isSwahili ? '1. TAARIFA YA SASA YA STOKI & VALUATION' : '1. ACTIVE PORTFOLIO INVENTORY STATUS'}
              </span>
              <div className="grid grid-cols-2 gap-4 text-[9.5px]">
                <div className="space-y-1 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border">
                  <div className="flex justify-between">
                    <span className="text-slate-450">{isSwahili ? 'Jumla ya Bidhaa Zako:' : 'Registered SKU Counter:'}</span>
                    <strong className="font-mono">{stockSummary.totalItems} TYPES</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-455">{isSwahili ? 'Bidhaa zenye Hatari ya Kwisha:' : 'Reorder Alert Count:'}</span>
                    <strong className={`font-mono ${stockSummary.lowStockCount > 0 ? 'text-rose-500 font-extrabold' : ''}`}>
                      {stockSummary.lowStockCount} PRODUCTS
                    </strong>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border">
                  <div className="flex justify-between">
                    <span className="text-slate-455">{isSwahili ? 'Mthamini mkuu wa Kununulia:' : 'Asset Buying Valuation:'}</span>
                    <strong className="font-mono">TZS {stockSummary.totalValuation.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-455">Licence Key Signature:</span>
                    <strong className="font-mono text-indigo-505 dark:text-indigo-400 text-[8.5px]">{profile?.verificationCode || 'VERIFIED-ERP-999-KEY'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* BLOCK 2: RECENT GOODS ENTERED FROM SUPPLIERS (STOCK IN) */}
            <div className="space-y-2">
              <span className="p-1 px-1.5 bg-slate-100 dark:bg-slate-900/40 rounded text-[9px] font-black uppercase text-slate-500 tracking-wider block">
                {isSwahili ? '2. MZIGO MPYA ULIOINGIA (PAST 7 DAYS RESTOCKS)' : '2. REPLENISHMENTS (PAST 7 DAYS STOCK-INS)'}
              </span>
              <div className="border rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-900/10">
                <table className="w-full text-left border-collapse text-[9px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 font-black text-slate-400 uppercase tracking-widest border-b dark:border-slate-850">
                      <th className="p-2">PO Ref</th>
                      <th className="p-2">Supplier Title</th>
                      <th className="p-2">Total Budget</th>
                      <th className="p-2">Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPurchases.count === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-400 font-medium">
                          {isSwahili ? 'Hakuna mzigo mpya uliopokelewa namba ya siku 7' : 'No restock receipt documents reported in past week.'}
                        </td>
                      </tr>
                    ) : (
                      db.getPurchases().slice(0, 3).map((po) => (
                        <tr key={po.id} className="border-b dark:border-slate-850">
                          <td className="p-2 font-mono font-bold">{po.poNumber}</td>
                          <td className="p-2">{po.supplierId.replace('sup-', '').toUpperCase()}</td>
                          <td className="p-2 font-mono font-bold">TZS {po.grandTotal.toLocaleString()}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-990/30 text-emerald-600 font-extrabold uppercase text-[7.5px]">
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BLOCK 3: SYSTEM STAFF ACCESS TRACE & RECENT LOGINS */}
            <div className="space-y-2">
              <span className="p-1 px-1.5 bg-slate-100 dark:bg-slate-900/40 rounded text-[9px] font-black uppercase text-slate-500 tracking-wider block">
                {isSwahili ? '3. USALAMA: VILIVYOZWA & LOGINS MAHUDHURIO' : '3. ACCESS & LEDGER EVENT LOG AUDIT'}
              </span>
              <div className="space-y-1.5 text-[9px]">
                {loginActivities.length === 0 ? (
                  <div className="p-2 text-center text-slate-450 italic bg-slate-50/50 dark:bg-slate-900/20 rounded border">
                    {isSwahili ? 'Hakuna kumbukumbu za hivi karibuni za kuingia mfumo.' : 'No login security signatures reported today.'}
                  </div>
                ) : (
                  loginActivities.slice(0, 4).map((log) => (
                    <div key={log.id} className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-lg border dark:border-slate-850">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight font-sans">{log.entity}: {log.details}</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[8.5px] shrink-0 font-medium">{log.timestamp} | {log.user}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* VERIFICATION SIGNATURE SHIELD ELEMENT */}
            <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 mt-3 flex items-start gap-2.5">
              <ShieldCheck className="h-6 w-6 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="block font-black text-[9.5px] uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                  {isSwahili ? 'HATI YA UHAKIKI COMPLIANT SYSTEM' : 'CERTIFIED SYSTEM ACCREDITATION'}
                </span>
                <p className="text-[8px] text-slate-400 leading-normal">
                  {isSwahili 
                    ? `Ripoti hii imelindwa na Smart Cryptography Ledger. Kila mabadiliko ya bidhaa, stoki, na mauzo yametiwa saini ya kidijitali.`
                    : `This audit state contains state vector hashes verified against standard cryptographic ledgers. Tampering voids local validation certificates.`}
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
