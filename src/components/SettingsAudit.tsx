/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldAlert, 
  Trash2, 
  CheckSquare, 
  ToggleLeft, 
  Save, 
  FileLock2, 
  EyeOff,
  History,
  QrCode,
  Clipboard,
  Check,
  ExternalLink,
  Printer,
  HelpCircle,
  FileText,
  BadgeAlert,
  Download,
  Palette,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BusinessConfig, AuditLog, QRLog, PrintLog } from '../types';
import { db } from '../db';
import { translations } from '../translations';

interface SettingsAuditProps {
  language: 'EN' | 'SW';
  userEmail: string;
}

export default function SettingsAudit({ language, userEmail }: SettingsAuditProps) {
  const t = translations[language];

  // States
  const [profile, setProfile] = useState<BusinessConfig>({
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
    phone: '+255 754 005 111',
    whatsapp: '+255 784 222 333',
    email: 'info@dukaos.co.tz',
    website: 'https://dukaos.co.tz',
    description: 'Modern Retail, Wholesale and Distribution System',
    logoUrl: '',
    unlimitedBranches: true,
    companyStamp: 'OFFICIAL SEAL - DUKA OS',
    qrCodeSeed: 'DUKA-OS-VERIFY',
    verificationCode: 'LICENSE-999-PRO'
  });
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchLogsQuery, setSearchLogsQuery] = useState('');
  const [selectedLogAction, setSelectedLogAction] = useState<string>('All');

  // QR Log diagnostic states
  const [activeTab, setActiveTab ] = useState<'audit' | 'qr' | 'print' | 'generator'>('audit');
  const [qrLogs, setQrLogs] = useState<QRLog[]>([]);
  const [searchQrQuery, setSearchQrQuery] = useState('');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Print history states
  const [printLogs, setPrintLogs] = useState<PrintLog[]>([]);
  const [searchPrintQuery, setSearchPrintQuery] = useState('');

  // Local document state list loaders for the QR generator
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // QR Custom Generator State Engine
  const [genDocType, setGenDocType] = useState<'invoice' | 'receipt' | 'custom'>('invoice');
  const [genSelectedId, setGenSelectedId] = useState<string>('');
  const [genQrMode, setGenQrMode] = useState<'url' | 'text'>('url');
  const [genCustomText, setGenCustomText] = useState<string>(
    language === 'SW' 
      ? 'THIBITISHA: Duka OS limethibitisha nyaraka hii kuwa salama.' 
      : 'AUTHENTIC: Duka OS has digitally secured this document on system node.'
  );

  const loadSettingsData = () => {
    const prof = db.getProfile();
    if (prof) {
      setProfile(prof);
    }
    setLogs(db.getLogs());
    setQrLogs(db.getQRLogs());
    setPrintLogs(db.getPrintLogs());
    
    // Load local invoices & transactions
    const invData = db.getInvoices() || [];
    const trxData = db.getTransactions() || [];
    setInvoices(invData);
    setTransactions(trxData);
    
    // Auto-prepopulate generated selection ID if lists are populated
    if (invData.length > 0) {
      setGenSelectedId(invData[0].id);
    } else if (trxData.length > 0) {
      setGenSelectedId((trxData[0] as any).orderId || trxData[0].id);
    }
  };

  useEffect(() => {
    loadSettingsData();

    // Re-load on local storage changes (e.g. from POS or Invoicing / print preview)
    const handleStorageRefresh = () => {
      setQrLogs(db.getQRLogs());
      setPrintLogs(db.getPrintLogs());
    };
    window.addEventListener('storage', handleStorageRefresh);
    return () => window.removeEventListener('storage', handleStorageRefresh);
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveProfile(profile, userEmail);
    alert(language === 'SW' ? 'Mipangilio ya Kampuni Imehifadhiwa kikamilifu!' : 'Company business profile successfully updated across the ERP system!');
    loadSettingsData();
    
    // Dispatch instant update storage event to trigger POS/Catalog reload in real-time
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert(language === 'SW' ? 'Nembo ni kubwa sana! Tafadhali tumia picha chini ya 1.5MB' : 'Logo file size exceeds limit! Please choose an image smaller than 1.5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, logoUrl: reader.result as string }));
        db.logAudit('UPDATE', 'BusinessProfile', 'Uploaded active company brand logo', userEmail);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    setProfile((prev) => ({ ...prev, logoUrl: '' }));
    db.logAudit('UPDATE', 'BusinessProfile', 'Cleared company logo configuration', userEmail);
  };

  const handleWipeDatabase = () => {
    if (confirm('CRITICAL WARNING: This will completely wipe all local databases, inventory counts, accounting journals and transaction histories from localStorage. Proceed?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Filter audit logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchLogsQuery.toLowerCase()) ||
                          log.entity.toLowerCase().includes(searchLogsQuery.toLowerCase()) ||
                          (log.user && log.user.toLowerCase().includes(searchLogsQuery.toLowerCase()));
    const matchesAction = selectedLogAction === 'All' || log.action === selectedLogAction;
    return matchesSearch && matchesAction;
  });

  // Filter QR logs
  const filteredQrLogs = qrLogs.filter(log => {
    return (
      log.transactionId.toLowerCase().includes(searchQrQuery.toLowerCase()) ||
      log.url.toLowerCase().includes(searchQrQuery.toLowerCase()) ||
      (log.invoiceNumber && log.invoiceNumber.toLowerCase().includes(searchQrQuery.toLowerCase())) ||
      (log.generatedBy && log.generatedBy.toLowerCase().includes(searchQrQuery.toLowerCase())) ||
      log.type.toLowerCase().includes(searchQrQuery.toLowerCase())
    );
  });

  // Filter Print logs
  const filteredPrintLogs = printLogs.filter(log => {
    return (
      log.documentId.toLowerCase().includes(searchPrintQuery.toLowerCase()) ||
      log.documentTitle.toLowerCase().includes(searchPrintQuery.toLowerCase()) ||
      log.printerType.toLowerCase().includes(searchPrintQuery.toLowerCase()) ||
      log.triggeredBy.toLowerCase().includes(searchPrintQuery.toLowerCase())
    );
  });

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLogId(id);
    setTimeout(() => setCopiedLogId(null), 1500);
  };

  // Dynamically calculate QR payload based on active selections
  const getCalculatedQrValueInput = () => {
    if (genDocType === 'invoice') {
      const selectedInv = invoices.find(inv => inv.id === genSelectedId);
      if (!selectedInv) return 'DUKA OS INVOICE: No invoice selected';
      if (genQrMode === 'url') {
        return `${window.location.origin}/verify?type=invoice&id=${selectedInv.id}&ref=${selectedInv.refNumber || selectedInv.id}&amount=${selectedInv.grandTotal}&date=${selectedInv.invoiceDate}&client=${encodeURIComponent(selectedInv.customerDetails?.fullName || '')}`;
      } else {
        return `=== DUKA OS SECURITY VERIFY ===\n` +
               `STATUS: AUTHENTIC / SAHIHI\n` +
               `INVOICE: ${selectedInv.invoiceNumber}\n` +
               `DATE   : ${selectedInv.invoiceDate}\n` +
               `CLIENT : ${selectedInv.customerDetails?.fullName || 'Cash Customer'}\n` +
               `TIN/VAT: ${profile.tinNumber || '111-222-333'}\n` +
               `AMOUNT : TZS ${selectedInv.grandTotal.toLocaleString()}\n` +
               `================================\n` +
               `VERIFIED BY DEV TEK INNOVATION`;
      }
    } else if (genDocType === 'receipt') {
      const selectedTrx = transactions.find(t => (t.orderId || t.id) === genSelectedId);
      if (!selectedTrx) return 'DUKA OS RECEIPT: No receipt selected';
      if (genQrMode === 'url') {
        return `${window.location.origin}/verify?type=receipt&id=${selectedTrx.orderId || selectedTrx.id}&invoice=${selectedTrx.invoiceNumber}&amount=${selectedTrx.grandTotal}&date=${encodeURIComponent(selectedTrx.timestamp)}&cashier=${encodeURIComponent(selectedTrx.cashierName || '')}`;
      } else {
        return `=== DUKA OS SECURE RECEIPT ===\n` +
               `STATUS: VALIDATED / MEMORY LEDGER\n` +
               `INV NO : ${selectedTrx.invoiceNumber}\n` +
               `DATE   : ${selectedTrx.timestamp}\n` +
               `CASHIER: ${selectedTrx.cashierName || 'Counter Cashier'}\n` +
               `TOTAL  : TZS ${selectedTrx.grandTotal.toLocaleString()}\n` +
               `--------------------------------\n` +
               `DEV TEK SECURE AUDIT SIGNATURE`;
      }
    } else {
      return genCustomText;
    }
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById('qr-gen-canvas-rendered');
    if (!svgElement) return;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = `duka-os-authenticity-qr-${Date.now().toString(36)}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleCopyQRText = () => {
    navigator.clipboard.writeText(getCalculatedQrValueInput());
    alert(language === 'SW' ? 'Yaliyomo kwenye QR yamenakiliwa ya kutosha kwenye clipboard!' : 'QR embedded payload copied to clipboard!');
  };

  return (
    <div className="space-y-6 text-xs animate-fade-in">
      
      <div className="flex border-b border-slate-100 dark:border-slate-800 gap-4 flex-wrap pb-1.5 justify-between items-center">
        <h2 className="text-sm font-extrabold uppercase text-indigo-700 flex items-center gap-1.5 leading-none">
          <Settings className="h-4 w-4 text-indigo-600" />
          <span>{language === 'SW' ? 'Nembo, Mipangilio ya Kampuni & Kumbukumbu za Ukaguzi' : 'Enterprise Branding, Profile Settings & Security Audits'}</span>
        </h2>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-105 px-2 py-0.5 rounded border">
          Node Configuration State: Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Profile editor form - Col 7 */}
        <form onSubmit={handleSaveProfile} className="lg:col-span-7 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm text-xs">
          
          <div className="flex justify-between items-center border-b pb-1">
            <span className="font-extrabold text-[10.5px] text-indigo-700 uppercase tracking-widest block">
              {language === 'SW' ? 'Maelezo Kamili ya Biashara na Leseni' : 'Business Registration & Profiling Matrix'}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
              {language === 'SW' ? 'Uhakiki: Amilifu' : 'Status: Secured'}
            </span>
          </div>

          {/* Logo Uploader Widget */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white dark:bg-slate-950 h-20 w-20 rounded-xl border flex items-center justify-center p-2 relative overflow-hidden shrink-0">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} className="h-full w-full object-contain" alt="Current Logo" referrerPolicy="no-referrer" />
              ) : (
                <div className="text-center text-slate-400 text-[10px] uppercase font-bold">
                  {language === 'SW' ? 'Hakuna Nembo' : 'No Logo'}
                </div>
              )}
            </div>
            
            <div className="space-y-1.5 flex-1 w-full text-center sm:text-left">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'SW' ? 'Bofya kupakia Nembo mpya ya Biashara:' : 'Upload Business Brand Logo:'}
              </span>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload-selector"
                />
                <label
                  htmlFor="logo-upload-selector"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-lg cursor-pointer text-[10.5px] transition-colors shadow-sm"
                >
                  {language === 'SW' ? 'Chagua Picha 📁' : 'Choose Logo File 📁'}
                </label>
                {profile.logoUrl && (
                  <button
                    type="button"
                    onClick={handleClearLogo}
                    className="text-[10px] text-red-500 font-bold hover:underline"
                  >
                    {language === 'SW' ? 'Ondoa Nembo' : 'Clear Brand Logo'}
                  </button>
                )}
              </div>
              <p className="text-[9.5px] text-slate-405 leading-none">
                {language === 'SW' ? 'Inasaidia muundo wa JPG, PNG au SVG. Nembo hii itawekwa kwenye ankara, risiti na ripoti.' : 'Supported image formats. This logo populates dynamically across PDF invoices, cash registers, receipts, and headers.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Jina la Kampuni au Huduma *' : 'Registered Business Name *'}</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-bold text-slate-850 dark:text-slate-100"
                placeholder="e.g. DUKA OS ENTERPRISES"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Sekta/Aina ya Huduma' : 'Business Category/Industry'}</label>
              <input
                type="text"
                value={profile.category}
                onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg text-slate-800 dark:text-slate-200"
                placeholder="e.g. Retail and Wholesales"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Namba ya Usajili wa Biashara (BRELA)' : 'Registration License Code (REG)'}</label>
              <input
                type="text"
                value={profile.regNumber}
                onChange={(e) => setProfile({ ...profile, regNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                placeholder="REG-000-XX"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Namba ya TIN (Tanzania VAT) *' : 'Corporate TIN Core Code *'}</label>
              <input
                type="text"
                required
                value={profile.tinNumber}
                onChange={(e) => setProfile({ ...profile, tinNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono font-bold text-slate-850 dark:text-slate-100"
                placeholder="000-000-000"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Namba ya VRN/VAT ya Kampuni *' : 'VAT Registration Number *'}</label>
              <input
                type="text"
                required
                value={profile.vatNumber}
                onChange={(e) => setProfile({ ...profile, vatNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                placeholder="VAT-XXXX"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Barua Pepe ya Kampuni' : 'Corporate Support Email'}</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                placeholder="accounts@business.co.tz"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Tovuti ya Biashara' : 'Company Website URL'}</label>
              <input
                type="text"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                placeholder="https://www.business.co.tz"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Namba Maalum ya WhatsApp ya Kampuni *' : 'Company Broadcast WhatsApp *'}</label>
              <input
                type="text"
                required
                value={profile.whatsapp}
                onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono font-bold text-emerald-600 dark:text-emerald-400"
                placeholder="+255 x-xxxx-xxxx"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Namba ya Simu ya Kupigia ya Kampuni *' : 'Corporate Phone Line Call *'}</label>
              <input
                type="text"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                placeholder="+255 x-xxxx-xxxx"
              />
            </div>

            {/* SEHEMU YA BIASHARA DETAILS (Location, region, district) */}
            <div className="md:col-span-2 border-t pt-3 mt-1">
              <span className="font-extrabold text-[9.5px] text-slate-400 uppercase tracking-widest block mb-2">
                {language === 'SW' ? 'Sehemu ya Biashara na Anwani Lojistiki' : 'Business Location & Logistics Jurisdiction'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">{language === 'SW' ? 'Mkoa (Region) *' : 'Region State *'}</label>
                  <input
                    type="text"
                    required
                    value={profile.region}
                    onChange={(e) => setProfile({ ...profile, region: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-semibold text-slate-800 dark:text-slate-200"
                    placeholder="e.g. Dar es Salaam"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">{language === 'SW' ? 'Wilaya (District) *' : 'Business District *'}</label>
                  <input
                    type="text"
                    required
                    value={profile.district}
                    onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-semibold text-slate-800 dark:text-slate-200"
                    placeholder="e.g. Kinondoni"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Anwani kamili ya Posta/Mtaa' : 'HQ Physical Street Address'}</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg text-slate-800 dark:text-slate-200"
                placeholder="Cargo Road Suite X, Kinondoni Near Kinondoni Plaza"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Slogan au Maelezo ya Biashara' : 'Business Slogan / Core Focus Note'}</label>
              <input
                type="text"
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg text-slate-800 dark:text-slate-200 italic"
                placeholder="Slogan, e.g. Quality and Trust first"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Maneno ya Muhuri we Kielektroniki (Stamp)' : 'Authorized Corporate Signature Stamp Text'}</label>
              <input
                type="text"
                value={profile.companyStamp}
                onChange={(e) => setProfile({ ...profile, companyStamp: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 p-2.5 mt-1 rounded-lg font-serif italic text-sm text-indigo-700 dark:text-indigo-405"
                placeholder="E.g. CERTIFIED CHIEF COMPLIANCE CONTROLLER SEAL SmartBusiness Ltd"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t">
            <div className="flex gap-2">
              <button
                onClick={handleWipeDatabase}
                type="button"
                className="text-[#dc2626] border border-red-500/15 hover:bg-red-200/10 p-2 rounded-lg text-[10px] font-bold"
              >
                {language === 'SW' ? 'Futa Data Zote za Mfumo' : 'Wipe localStorage datasets'}
              </button>

              <button
                onClick={() => window.dispatchEvent(new Event('start-guided-tour'))}
                type="button"
                className="text-indigo-600 dark:text-indigo-400 border border-indigo-500/15 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 p-2 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <HelpCircle className="h-3 w-3" />
                <span>{language === 'SW' ? 'Mwongozo wa Mfumo' : 'Replay System Tour'}</span>
              </button>
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-6 rounded-lg leading-none flex items-center gap-1.5 shadow"
            >
              <Save className="h-4 w-4" />
              <span>{language === 'SW' ? 'Hifadhi Maana' : 'Commit Configuration Setup'}</span>
            </button>
          </div>
        </form>

        {/* Tabbed Logs & Diagnostics Section - Col 5 */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-[585px] shadow-sm text-[11px]">
          {/* Tabs Navigation Header */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 mb-3 overflow-x-auto gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-405 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>{language === 'SW' ? 'Ukaguzi Salama' : 'Security Audit'}</span>
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'qr'
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-405 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
            >
              <QrCode className="h-3.5 w-3.5 text-indigo-505" />
              <span>{language === 'SW' ? 'Logi za QR Code' : 'QR Diagnostic Log'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('generator')}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'generator'
                  ? 'border-emerald-500 text-emerald-650 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-405 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
            >
              <QrCode className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <span>{language === 'SW' ? 'KISALISHA QR' : 'QR GENERATOR'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('print')}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'print'
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-405 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
            >
              <Printer className="h-3.5 w-3.5 text-emerald-600" />
              <span>{language === 'SW' ? 'Kumbukumbu za Chapa' : 'Print History'}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {activeTab === 'audit' && (
              <>
                <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                  {language === 'SW' 
                    ? 'Mabadiliko yote ya bei, kufuta stoki, kufanya mauzo na kuongeza wafanyakazi imeandikwa kwenye leda asilia ya ukaguzi.' 
                    : 'All inventory adjustments, POS sales, quotation broadcasts, and stamp alterations trigger persistent ledger registry actions.'}
                </p>

                {/* Search audit box and Filter controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border dark:border-slate-800">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Tafuta logi</label>
                    <input 
                      type="text" 
                      placeholder="e.g. mteja, kufuta..."
                      className="w-full bg-white dark:bg-slate-950 border p-1 rounded font-medium text-[10px]"
                      value={searchLogsQuery}
                      onChange={(e) => setSearchLogsQuery(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Muamala</label>
                    <select 
                      className="w-full bg-white dark:bg-slate-950 border p-1 rounded text-[10px] font-bold"
                      value={selectedLogAction}
                      onChange={(e) => setSelectedLogAction(e.target.value)}
                    >
                      <option value="All">{language === 'SW' ? 'Zote mbili' : 'All Action Types'}</option>
                      <option value="CREATE">CREATE</option>
                      <option value="UPDATE">UPDATE</option>
                      <option value="DELETE">DELETE</option>
                      <option value="TRANSFER">TRANSFER</option>
                    </select>
                  </div>
                </div>

                {filteredLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-405">
                    {language === 'SW' ? 'Hakuna logi inayolingana' : 'No matching audit records.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 border dark:border-slate-800 rounded-lg space-y-1 relative">
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase text-center ${
                            log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-500/10' : 
                            log.action === 'UPDATE' ? 'bg-indigo-50 text-indigo-850 dark:bg-indigo-950/20 dark:text-indigo-405 border border-indigo-500/10' :
                            log.action === 'DELETE' ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-500/10' :
                            'bg-amber-50 text-amber-805 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-500/10'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-[9.5px] text-slate-405 font-mono">{log.timestamp.substring(11, 19)} PST</span>
                        </div>

                        <p className="font-extrabold text-slate-800 dark:text-slate-200 leading-normal text-[10.5px]">
                          {log.details}
                        </p>
                        <div className="text-[9px] text-slate-400 text-right pt-1.5 border-t border-dashed dark:border-slate-850/50">
                          {language === 'SW' ? 'Maelezo:' : 'Log Account:'} <strong className="text-slate-600 dark:text-slate-350">{log.user || 'System Cashier Node'}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'qr' && (
              <>
                {/* QR Code Diagnostics Screen */}
                <div className="p-3 bg-indigo-50/25 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                  <div className="flex gap-2 items-start">
                    <ShieldAlert className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200 block text-[10.5px]">Redirect Diagnostics Ledger</strong>
                      <span className="text-[9.5px] text-slate-550 dark:text-slate-400 block mt-0.5 leading-relaxed">
                        To debug if verification redirects point to the default <code className="bg-white px-1 font-mono rounded dark:bg-slate-900 text-rose-600">dukaos.com</code> endpoint, you can inspect their real encoded values compiled in this device's memory.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Search QR logs */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border dark:border-slate-800">
                  <label className="text-[9px] font-black uppercase text-slate-405 block mb-0.5">Filter generated QR sheets</label>
                  <input 
                    type="text" 
                    placeholder="Search transaction ID, invoice, URL, cashier..."
                    className="w-full bg-white dark:bg-slate-950 border p-1 rounded font-medium text-[10px]"
                    value={searchQrQuery}
                    onChange={(e) => setSearchQrQuery(e.target.value)}
                  />
                </div>

                {filteredQrLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    No QR code generation records are in ledger space yet. Issue some receipts in POS or view an active invoice to trigger automated tracking.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredQrLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 border dark:border-slate-800 rounded-lg space-y-1.5 relative">
                        <div className="flex justify-between items-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase border ${
                            log.type === 'invoice' ? 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/25 dark:text-indigo-405' :
                            log.type === 'receipt' ? 'bg-emerald-50 text-emerald-800 border-emerald-250 dark:bg-emerald-950/25 dark:text-emerald-405' :
                            'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/25 dark:text-violet-405'
                          }`}>
                            {log.type}
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[9.5px] border-b border-dashed pb-1.5 dark:border-slate-800">
                          <div>
                            <span className="text-slate-405 block uppercase text-[8px] font-black">Transaction ID :</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono truncate block">{log.transactionId}</span>
                          </div>
                          <div>
                            <span className="text-slate-405 block uppercase text-[8px] font-black">Invoice / Ref :</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono truncate block">{log.invoiceNumber || 'N/A'}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-405 block uppercase text-[8px] font-black mb-1">Generated URL :</span>
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 p-1.5 rounded border dark:border-slate-800">
                            <span className="font-mono text-[9px] text-indigo-700 dark:text-indigo-400 break-all select-all flex-1 leading-normal">
                              {log.url}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyUrl(log.url, log.id)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-505 transition-colors cursor-pointer shrink-0"
                              title="Copy URL"
                            >
                              {copiedLogId === log.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Clipboard className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <a
                              href={log.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-indigo-505 transition-colors shrink-0"
                              title="Open Url in new tab"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[8.5px] pt-1 text-slate-400">
                          <span>By: <strong className="text-slate-600 dark:text-slate-350">{log.generatedBy}</strong></span>
                          <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'print' && (
              <>
                {/* Print History Audit Trail */}
                <div className="p-3 bg-emerald-50/25 dark:bg-emerald-950/20 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
                  <div className="flex gap-2 items-start">
                    <Printer className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200 block text-[10.5px]">
                        {language === 'SW' ? 'Logi za Kichapishi' : 'Print History Audits'}
                      </strong>
                      <span className="text-[9.5px] text-slate-550 dark:text-slate-400 block mt-0.5 leading-relaxed">
                        {language === 'SW' 
                          ? 'Msururu wa ukaguzi salama wa nyaraka zote zilizotolewa na kuchapishwa joto au A4.' 
                          : 'Tracks desktop paper feeds, direct thermal receipt spools, and offline PDF exports in a secured audit log.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Filter / Search Print history */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border dark:border-slate-800">
                  <label className="text-[9px] font-black uppercase text-slate-405 block mb-0.5">
                    {language === 'SW' ? 'Chuja kumbukumbu za kuchapa' : 'Filter print history logs'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={language === 'SW' ? 'Tafuta mfumo, namba ya risiti, mtumiaji...' : 'Search document ID, title, type, user...'}
                    className="w-full bg-white dark:bg-slate-950 border p-1 rounded font-medium text-[10px]"
                    value={searchPrintQuery}
                    onChange={(e) => setSearchPrintQuery(e.target.value)}
                  />
                </div>

                {filteredPrintLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    {language === 'SW' 
                      ? 'Hakuna kumbukumbu za uchapishaji zilizopatikana kwenye mfumo huu bado.' 
                      : 'No print history records found. Open custom print preview in Invoicing or POS and print to record events.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPrintLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 border dark:border-slate-800 rounded-lg space-y-1.5 relative hover:border-emerald-500/20 transition-all">
                        <div className="flex justify-between items-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase border flex items-center gap-1 ${
                            log.printerType === 'Thermal' 
                              ? 'bg-rose-50 text-rose-850 border-rose-250 dark:bg-rose-950/25 dark:text-rose-400' 
                              : 'bg-indigo-50 text-indigo-850 border-indigo-250 dark:bg-indigo-950/25 dark:text-indigo-400'
                          }`}>
                            <Printer className="h-2.5 w-2.5 shrink-0" />
                            <span>{log.printerType}</span>
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="text-[10.5px]">
                          <span className="text-slate-405 block uppercase text-[8px] font-black">Document Name :</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">{log.documentTitle}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[9.5px] border-b border-dashed pb-1.5 dark:border-slate-800">
                          <div>
                            <span className="text-slate-405 block uppercase text-[8px] font-black">Document Ref / ID :</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono truncate block">{log.documentId}</span>
                          </div>
                          <div>
                            <span className="text-slate-405 block uppercase text-[8px] font-black">Ink Saver :</span>
                            <span className={`font-bold ${log.inkSaver ? 'text-emerald-600' : 'text-slate-400'} block`}>
                              {log.inkSaver ? (language === 'SW' ? 'Eco Amilifu' : 'Eco Mode Active') : (language === 'SW' ? 'Haijawashwa' : 'Inactive')}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[8.5px] pt-1 text-slate-400">
                          <span>Operator: <strong className="text-slate-600 dark:text-slate-350">{log.triggeredBy}</strong></span>
                          <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'generator' && (
              <div className="space-y-4 animate-fade-in text-[11px]">
                <div className="p-3 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/10 flex gap-2 items-start">
                  <BadgeAlert className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200 block text-[10.5px]">
                      {language === 'SW' ? 'Kizalisha QR vya Uhakiki Maalum' : 'Interactive Receipt & Invoice QR Authenticator'}
                    </strong>
                    <span className="text-[9.5px] text-slate-500 block leading-relaxed mt-0.5" style={{ whiteSpace: 'normal' }}>
                      {language === 'SW'
                        ? 'Tengeneza QR code kwa wateja kuhakiki usahihi wa ankara au risiti. Chagua hali ya "Maandishi Tu" ili ikiskaniwa na simu ilete maelezo ya ankara moja kwa moja bila mtandao!'
                        : 'Deploy tamper-proof commercial signatures. Toggling "Plain Text Only" embeds actual invoice parameters directly within the QR matrix code so scanning triggers raw outputs instantly without needing internet!'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 border dark:border-slate-800 rounded-xl">
                  {/* Select Source Document Type */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black uppercase text-slate-400 block">
                      {language === 'SW' ? '1. Chagua Chanzo Cha Nyaraka:' : '1. Select Source Document Type:'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['invoice', 'receipt', 'custom'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setGenDocType(type);
                            if (type === 'invoice' && invoices.length > 0) {
                              setGenSelectedId(invoices[0].id);
                            } else if (type === 'receipt' && transactions.length > 0) {
                              setGenSelectedId(transactions[0].orderId || transactions[0].id);
                            } else {
                              setGenSelectedId('');
                            }
                          }}
                          className={`p-2 rounded-lg border text-[10px] font-bold text-center capitalize transition-all cursor-pointer ${
                            genDocType === type
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-50'
                          }`}
                        >
                          {type === 'invoice' ? (language === 'SW' ? 'Ankara' : 'Invoice') :
                           type === 'receipt' ? (language === 'SW' ? 'Risiti' : 'Receipt') :
                           (language === 'SW' ? 'Maandishi Tu' : 'Custom')
                          }
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Document selector dropdown */}
                  {genDocType !== 'custom' && (
                    <div className="space-y-1 mt-2.5">
                      <label className="text-[9.5px] font-black uppercase text-slate-400 block">
                        {language === 'SW' ? '2. Chagua Nyaraka Rasmi:' : '2. Select Document reference:'}
                      </label>
                      <select
                        value={genSelectedId}
                        onChange={(e) => setGenSelectedId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border p-2 rounded-lg font-bold text-[10.5px]"
                      >
                        {genDocType === 'invoice' ? (
                          invoices.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.invoiceNumber} - {inv.customerDetails?.fullName} (TZS {inv.grandTotal?.toLocaleString()})
                            </option>
                          ))
                        ) : (
                          transactions.map((t) => (
                            <option key={t.orderId || t.id} value={t.orderId || t.id}>
                              {t.invoiceNumber || 'POS Order'} - {new Date(t.timestamp).toLocaleDateString()} (TZS {t.grandTotal?.toLocaleString()})
                            </option>
                          ))
                        )}
                        {genDocType === 'invoice' && invoices.length === 0 && (
                          <option>{language === 'SW' ? 'Hakuna Ankara Kwenye Mfumo' : 'No invoices on file'}</option>
                        )}
                        {genDocType === 'receipt' && transactions.length === 0 && (
                          <option>{language === 'SW' ? 'Hakuna Risiti Kwenye Mfumo' : 'No retail transactions'}</option>
                        )}
                      </select>
                    </div>
                  )}

                  {/* Custom plain text input */}
                  {genDocType === 'custom' && (
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-black uppercase text-slate-400 block">
                        {language === 'SW' ? 'Andika Maandishi ya QR:' : 'Write custom QR Payload:'}
                      </label>
                      <textarea
                        value={genCustomText}
                        onChange={(e) => setGenCustomText(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border p-2 rounded-lg font-mono text-[9px] min-h-[60px]"
                        placeholder={language === 'SW' ? 'Andika hapa...' : 'Type text metadata here...'}
                      />
                    </div>
                  )}

                  {/* QR Output Mode Toggle */}
                  {genDocType !== 'custom' && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[9.5px] font-black uppercase text-slate-400 block">
                        {language === 'SW' ? '3. Umbizo la QR Code:' : '3. QR Metadata Encoding Style:'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setGenQrMode('url')}
                          className={`p-2 rounded-lg border text-[9.5px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all text-center cursor-pointer ${
                            genQrMode === 'url'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-extrabold'
                              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-400'
                          }`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>{language === 'SW' ? 'Wavuti (Verify Link)' : 'Web Verification URL'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGenQrMode('text')}
                          className={`p-2 rounded-lg border text-[9.5px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all text-center cursor-pointer ${
                            genQrMode === 'text'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-extrabold'
                              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-400'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>{language === 'SW' ? 'Maandishi Tu (Plain Text)' : 'Offline Raw Text Only'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Display interactive generated QR Frame */}
                <div className="border border-indigo-100 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950/80 shadow-xs flex flex-col sm:flex-row items-center gap-4">
                  {/* Real-time Dynamic QR code element */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-250 shrink-0 shadow-xs flex items-center justify-center">
                    <QRCodeSVG
                      id="qr-gen-canvas-rendered"
                      value={getCalculatedQrValueInput()}
                      size={100}
                      level="H"
                      fgColor="#0f172a"
                      bgColor="#ffffff"
                    />
                  </div>

                  <div className="flex-1 space-y-2 text-left self-stretch flex flex-col justify-between">
                    <div>
                      <span className="text-[8px] font-bold uppercase py-0.5 px-2 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-755 dark:text-indigo-400 rounded-lg inline-block tracking-wider">
                        {language === 'SW' ? 'KUSHIRIKI SALAMA' : 'SECURE COMPLIANCE QR'}
                      </span>
                      <strong className="block text-slate-850 dark:text-slate-200 text-[11px] font-extrabold mt-1 truncate">
                        {genDocType === 'invoice' ? (invoices.find(i=>i.id===genSelectedId)?.invoiceNumber || 'Invoice QR') :
                         genDocType === 'receipt' ? (transactions.find(t=>(t.orderId||t.id)===genSelectedId)?.invoiceNumber || 'Receipt QR') :
                         'Custom Text QR'
                        }
                      </strong>
                      <div className="text-[9px] font-mono p-1.5 bg-slate-50 dark:bg-slate-900 rounded border border-dashed dark:border-slate-800 max-h-[55px] overflow-y-auto leading-normal text-slate-500 select-all max-w-[210px] break-all whitespace-pre-wrap">
                        {getCalculatedQrValueInput()}
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyQRText}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-extrabold text-[9.5px] rounded-lg cursor-pointer transition-all uppercase leading-none"
                      >
                        {language === 'SW' ? 'Nakili' : 'Copy Payload'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadQR}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9.5px] rounded-lg cursor-pointer transition-all flex items-center gap-1 uppercase leading-none"
                      >
                        <Download className="h-3 w-3" />
                        <span>{language === 'SW' ? 'Pakua' : 'Download SVG'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
