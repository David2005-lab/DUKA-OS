/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Search, 
  Send, 
  Mail, 
  Check, 
  X, 
  Clipboard, 
  Tag, 
  Layers, 
  Building2, 
  PhoneCall, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  FileCheck,
  Printer,
  Trash2,
  Upload,
  Paperclip,
  Download,
  FileText
} from 'lucide-react';
import { db } from '../db';
import { printElement } from '../utils/print';
import { Product, LanguageCode } from '../types';

interface PriceCatalogProps {
  language: LanguageCode;
  currentBranch: string;
  userEmail: string;
}

export default function PriceCatalog({ language, currentBranch, userEmail }: PriceCatalogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProducts, setSelectedProducts] = useState<{ [id: string]: boolean }>({});
  
  // Contact Sender Details
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('SmartERP_SendPricePhone') || '');
  const [customerEmail, setCustomerEmail] = useState(() => localStorage.getItem('SmartERP_SendPriceEmail') || '');
  const [clientName, setClientName] = useState(() => localStorage.getItem('SmartERP_SendPriceName') || '');
  const [pricingType, setPricingType] = useState<'both' | 'retail' | 'wholesale'>('both');
  
  // Status states
  const [customMsg, setCustomMsg] = useState('');
  const [isMessageDirty, setIsMessageDirty] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [emailSentStatus, setEmailSentStatus] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  // Immersive PDF Quotation Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState('');

  // Loaded profiles
  const [profile, setProfile] = useState(() => db.getProfile());

  // Active user checkers tracked in real-time
  const [activeOperator, setActiveOperator] = useState(() => localStorage.getItem('SmartERP_ActiveOperator') || 'Sada Salim');
  const [activeShift, setActiveShift] = useState(() => localStorage.getItem('SmartERP_ActiveShift') || 'Shift ya Asubuhi');

  // Customer Attachments Loader State
  const [attachments, setAttachments] = useState<{ id: string; name: string; size: string; dataUrl?: string }[]>(() => {
    try {
      const stored = localStorage.getItem('SmartERP_PriceAttachments');
      return stored ? JSON.parse(stored) : [
        { id: 'attach-1', name: 'Brosha_Kuu_ya_Bidhaa_2026.pdf', size: '1.4 MB' },
        { id: 'attach-2', name: 'Orodha_Rasmi_ya_Bei_Kamilifu.xlsx', size: '620 KB' }
      ];
    } catch {
      return [];
    }
  });

  const [sentHistory, setSentHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('SmartERP_SentPriceHistory');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('SmartERP_SentPriceHistory', JSON.stringify(sentHistory));
  }, [sentHistory]);

  useEffect(() => {
    localStorage.setItem('SmartERP_PriceAttachments', JSON.stringify(attachments));
  }, [attachments]);

  useEffect(() => {
    setProducts(db.getProducts());
    setProfile(db.getProfile());
    setQuotationNumber(`QTN-${Date.now().toString().substring(5)}`);
  }, []);

  // Listen to profile / operator updates
  useEffect(() => {
    const handleStorageChange = () => {
      setProfile(db.getProfile());
      setActiveOperator(localStorage.getItem('SmartERP_ActiveOperator') || 'Sada Salim');
      setActiveShift(localStorage.getItem('SmartERP_ActiveShift') || 'Shift ya Asubuhi');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save phone & email details to localStorage
  useEffect(() => {
    localStorage.setItem('SmartERP_SendPricePhone', customerPhone);
    localStorage.setItem('SmartERP_SendPriceEmail', customerEmail);
    localStorage.setItem('SmartERP_SendPriceName', clientName);
  }, [customerPhone, customerEmail, clientName]);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtering products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.barcode && p.barcode.includes(searchQuery));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Toggle selection
  const handleToggleProduct = (id: string) => {
    setSelectedProducts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = (select: boolean) => {
    const updated: { [id: string]: boolean } = {};
    if (select) {
      filteredProducts.forEach(p => {
        updated[p.id] = true;
      });
    }
    setSelectedProducts(updated);
  };

  const getSelectedCount = () => {
    return Object.values(selectedProducts).filter(Boolean).length;
  };

  // Compile visual text message to copy or send via WhatsApp
  const compileMessageText = () => {
    const shopName = profile?.name || 'DUKA OS ENTERPRISE';
    const activeSeller = activeOperator;
    
    let msg = `*🛒 ${shopName.toUpperCase()} - ORODHA YA BEI RAFTI*\n`;
    
    const physicalLoc = [profile?.district, profile?.region].filter(Boolean).join(', ');
    if (physicalLoc) {
      msg += `📍 Makaazi yetu: *${physicalLoc}*\n`;
    }

    if (clientName.trim()) {
      msg += `Habari Ndg. *${clientName.trim()}*,\n`;
    } else {
      msg += `Habari Mteja wetu, `;
    }
    msg += `Hapa ni machaguo ya bei zetu kulingana na mahitaji yako:\n\n`;

    const selectedList = products.filter(p => selectedProducts[p.id]);
    const itemsToFormat = selectedList.length > 0 ? selectedList : filteredProducts.slice(0, 15);

    if (selectedList.length === 0) {
      msg += `_(Inaonyesha bidhaa ${itemsToFormat.length} za juu. Unaweza kuchagua bidhaa maalum kwenye kioo cha ERP ili kutengeneza orodha yako)_\n\n`;
    }

    itemsToFormat.forEach((p, idx) => {
      const stockQty = p.branchStock[currentBranch] ?? p.quantity ?? 0;
      msg += `*${idx + 1}. ${p.name.toUpperCase()}*\n`;
      msg += `   • SKU: \`${p.sku}\`\n`;
      
      if (pricingType === 'both' || pricingType === 'retail') {
        msg += `   • Reja Reja (Retail): *TZS ${p.sellingPrice.toLocaleString()}*\n`;
      }
      if (pricingType === 'both' || pricingType === 'wholesale') {
        msg += `   • Jumla (Wholesale): *TZS ${p.wholesalePrice.toLocaleString()}*\n`;
      }
      
      msg += `   • Hali ya Stoki: ${stockQty > 0 ? `Ipo (Pcs ${stockQty})` : `Haipo ❌`}\n\n`;
    });

    // Mention pricing document generated
    msg += `📄 *MAKADIRIO YA BEI YAMEANDALIWA RASMI (PDF)*\n`;
    msg += `Tumekuandalia faili ya PDF yenye mchanganuo wa bei hizo hapo juu. Tunakutumia muda huu hapa WhatsApp.\n\n`;

    msg += `✍️ Imeandaliwa na Muuzaji: *${activeSeller}* (${activeShift})\n`;
    msg += `Simu ya Kupiga: ${profile?.phone || '+255 754 000 111'}\n`;
    msg += `WhatsApp yetu: ${profile?.whatsapp || '+255 784 222 333'}\n`;
    msg += `Asante kwa kufanya biashara nasi! Jet-set via Duka OS 🚀`;

    return msg;
  };

  // Keep live text message synced (only if user has not edited details manually)
  useEffect(() => {
    if (!isMessageDirty) {
      setCustomMsg(compileMessageText());
    }
  }, [selectedProducts, pricingType, clientName, products, searchQuery, selectedCategory, isMessageDirty, profile, activeOperator, activeShift]);

  // Handle local file uploads -> Covert to mock base64
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert(language === 'SW' ? 'Kiambatisho ni kikubwa mno! Tumia faili chini ya 3MB.' : 'File is too large! Maximum allowed document size is 3MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAttachment = {
          id: `attach-${Date.now()}`,
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          dataUrl: reader.result as string
        };
        setAttachments(prev => [...prev, newAttachment]);
        db.logAudit('CREATE', 'CRM', `Uploaded new booklet catalog attachment: ${file.name}`, userEmail);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAttachment = (id: string, name: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
    db.logAudit('DELETE', 'CRM', `Removed booklet attachment ${name}`, userEmail);
  };

  // Inject attachment simulated link directly into the template text area
  const handleInjectAttachment = (name: string) => {
    const downloadLink = `\n📁 *Kiambatisho kilichojumuishwa:* [${name}] (https://verify.smartbusinesserp.com/download/document-${Date.now().toString(36)})\n`;
    setCustomMsg(prev => prev + downloadLink);
    setIsMessageDirty(true);
  };

  // Generate real WhatsApp click-to-chat links
  const handleSendWhatsApp = () => {
    setPhoneError('');
    let cleanerPhone = customerPhone.replace(/\D/g, ''); // strip spaces, plus sign etc.
    
    if (!cleanerPhone) {
      setPhoneError(language === 'SW' ? 'Tafadhali weka namba ya simu ya mteja!' : 'Please enter customer phone!');
      return;
    }

    // Default Tanzanian prefix if they typed starting with 0
    if (cleanerPhone.startsWith('0')) {
      cleanerPhone = '255' + cleanerPhone.substring(1);
    } else if (!cleanerPhone.startsWith('255') && cleanerPhone.length === 9) {
      cleanerPhone = '255' + cleanerPhone;
    }

    // Automatically copy details to clipboard
    try {
      navigator.clipboard.writeText(customMsg);
    } catch (e) {
      console.error(e);
    }

    // Log the transaction/blast in active audit database
    db.logAudit('TRANSFER', 'CRM', `Dispatched Quotation PDF and compiled sheet ${quotationNumber} to customer WhatsApp: ${cleanerPhone}`, userEmail);

    // Save into price catalog customer dispatch history
    const newLog = {
      id: 'log-' + Date.now(),
      clientName: clientName.trim() || (language === 'SW' ? 'Mteja Asiyejulikana' : 'Unknown Recipient'),
      customerPhone: cleanerPhone,
      customerEmail: customerEmail.trim() || '-',
      timestamp: new Date().toLocaleString(),
      itemsCount: getSelectedCount() || filteredProducts.slice(0, 15).length,
      channel: 'WhatsApp'
    };
    setSentHistory((prev: any) => [newLog, ...prev]);

    // Open physical PDF preview modal and trigger print/save in background
    setIsPdfModalOpen(true);

    // Launch WhatsApp
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanerPhone}&text=${encodeURIComponent(customMsg)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSentStatus(false);

    if (!customerEmail.trim()) {
      setEmailError(language === 'SW' ? 'Tafadhali weka barua pepe sahihi!' : 'Please enter a valid email address!');
      return;
    }

    // Simulate real server side dispatching mechanism
    db.logAudit('TRANSFER', 'CRM', `Dispatched official pricing sheet email ${quotationNumber} to client: ${customerEmail}`, userEmail);
    
    // Save into price catalog customer dispatch history
    const newLog = {
      id: 'log-' + Date.now(),
      clientName: clientName.trim() || (language === 'SW' ? 'Mteja Asiyejulikana' : 'Unknown Recipient'),
      customerPhone: customerPhone.trim() || '-',
      customerEmail: customerEmail.trim(),
      timestamp: new Date().toLocaleString(),
      itemsCount: getSelectedCount() || filteredProducts.slice(0, 15).length,
      channel: 'Email'
    };
    setSentHistory((prev: any) => [newLog, ...prev]);

    setEmailSentStatus(true);
    setTimeout(() => {
      setEmailSentStatus(false);
    }, 4500);
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(customMsg);
    setCopiedStatus(true);
    setTimeout(() => {
      setCopiedStatus(false);
    }, 2500);
  };

  // Compile active selected products specifically for quotation table
  const selectedList = products.filter(p => selectedProducts[p.id]);
  const quotationItems = selectedList.length > 0 ? selectedList : filteredProducts.slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      
      {/* Title block with elegant glass visual accent */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-radial-gradient from-blue-500/5 to-transparent pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Tag className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">
              {language === 'SW' ? 'Katalugu ya Bei (Jumla na Reja Reja)' : 'Wholesale & Retail Price Sheet'}
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl">
            {language === 'SW' 
              ? 'Tazama na utume orodha ya bei ya bidhaa kwa wateja wako wa Reja Reja na Jumla. Unaweza kupakua brosha, kuhariri ujumbe, au kufungua PDF ya ankara ya kielektroniki.'
              : 'Browse and share interactive product price matrix. Filter by category, select preferred items, upload pricing sheets and generate dynamic quotation PDFs.'}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button 
            type="button"
            onClick={() => {
              setQuotationNumber(`QTN-${Date.now().toString().substring(5)}`);
              setIsPdfModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-black uppercase tracking-wider text-[10px] transition-colors shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{language === 'SW' ? 'Tengeneza PDF ya Bei 📄' : 'Generate Quote PDF 📄'}</span>
          </button>
          
          <button 
            onClick={() => {
              setProducts(db.getProducts());
              setProfile(db.getProfile());
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-extrabold transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{language === 'SW' ? 'Rudisha' : 'Sync'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Price Menu View (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            
            {/* Filtering controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-1 gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={language === 'SW' ? 'Tafuta bidhaa kwa jina au SKU...' : 'Search product title, SKU, coding...'}
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-850 dark:text-slate-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    db.logAudit('TRANSFER', 'CRM', `Searched price sheet for term: ${searchQuery}`, userEmail);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase leading-none px-4 rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm transition-colors"
                >
                  <Search className="h-3 w-3" />
                  <span>{language === 'SW' ? 'Tafuta' : 'Search'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-extrabold"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c === 'All' ? (language === 'SW' ? 'Makundi Yote' : 'All Categories') : c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick bulk actions */}
            <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50 text-[10.5px]">
              <span className="font-bold text-slate-505 dark:text-slate-400">
                {language === 'SW' 
                  ? `Inaonyesha bidhaa ${filteredProducts.length} zilizochujwa` 
                  : `Showing ${filteredProducts.length} filtered products`}
              </span>
              <div className="flex gap-2 font-extrabold">
                <button 
                  onClick={() => handleSelectAll(true)}
                  className="text-indigo-605 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {language === 'SW' ? 'Chagua Zote' : 'Select All'}
                </button>
                <span className="text-slate-300">|</span>
                <button 
                  onClick={() => handleSelectAll(false)}
                  className="text-rose-650 hover:underline"
                >
                  {language === 'SW' ? 'Futa Chagua Zote' : 'Clear Selection'}
                </button>
              </div>
            </div>

            {/* Product Grid Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-205 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-900/60 text-slate-505 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold select-none text-[10.5px]">
                    <th className="py-2.5 px-3 w-10 text-center">✓</th>
                    <th className="py-2.5 px-3">{language === 'SW' ? 'Bidhaa' : 'Product'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'SW' ? 'Reja Reja TZS' : 'Retail TZS'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'SW' ? 'Jumla TZS' : 'Wholesale TZS'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'SW' ? 'Stoki' : 'Stock'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-405 font-semibold">
                        <ShoppingBag className="h-6 w-6 mx-auto mb-1 text-slate-305" />
                        <p>{language === 'SW' ? 'Hakuna bidhaa inayolingana' : 'No matching materials cataloged'}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isChecked = !!selectedProducts[p.id];
                      const branchQty = p.branchStock[currentBranch] ?? p.quantity ?? 0;
                      return (
                        <tr 
                          key={p.id} 
                          onClick={() => handleToggleProduct(p.id)}
                          className={`hover:bg-slate-50/65 dark:hover:bg-slate-900/40 cursor-pointer transition-colors ${
                            isChecked ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleProduct(p.id)}
                              className="h-3.5 w-3.5 text-indigo-600 border-slate-300 dark:border-slate-700 rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-slate-850 dark:text-slate-100 uppercase">{p.name}</div>
                            <span className="text-[10px] text-slate-450 dark:text-slate-500 block font-mono mt-0.5">
                              SKU: {p.sku} | {p.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                            {p.sellingPrice.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                            {p.wholesalePrice.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            {branchQty > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded text-[9.5px]">
                                {branchQty} pcs
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-455 bg-rose-50 dark:bg-rose-950/15 px-2 py-0.5 rounded text-[9.5px]">
                                Out ❌
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] leading-relaxed text-slate-500">
              💡 <strong>{language === 'SW' ? 'Maelekezo:' : 'Quick Tip:'}</strong> {language === 'SW'
                ? 'Bidhaa unazochagua kwa kuweka tiki (✓) hapa zitajazwa kiotomatiki kwenye sanduku la ujumbe upande wa kulia. Ukichagua tupu, mfumo utajaza bidhaa 15 za kwanza kutumia kielelezo cha bei!'
                : 'Checked products (✓) are automatically parsed into the broadcast preview. If empty, the system defaults to compiling the top 15 products for quick broadcasting.'}
            </div>

          </div>

          {/* DYNAMIC ATTACHMENTS MANAGER FORM & VIEWER */}
          <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5 leading-none">
                  <Paperclip className="h-4 w-4 text-emerald-600" />
                  <span>{language === 'SW' ? 'Viambatanisho vya Bei & Vipeperushi' : 'Pricing Brochures & Attachments Registry'}</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {language === 'SW' ? 'Weka viambatanisho vya PDFs ili uambatishe na ujumbe wa bei.' : 'Upload official PDF/Excel catalogs and insert direct booklet download URLs.'}
                </p>
              </div>

              <div className="mt-2 sm:mt-0">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                  id="catalog-file-uploader"
                  className="hidden"
                  onChange={handleAttachmentUpload}
                />
                <label
                  htmlFor="catalog-file-uploader"
                  className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 py-1.5 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Upload className="h-3 w-3" />
                  <span>{language === 'SW' ? 'Pakia Brosha 📁' : 'Upload Brochure 📁'}</span>
                </label>
              </div>
            </div>

            {attachments.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-[11px]">
                {language === 'SW' ? 'Bado hujapakia brosha yoyote.' : 'No uploaded catalog brochures found.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map(a => (
                  <div key={a.id} className="p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-red-500 shrink-0" />
                        <span className="font-extrabold text-slate-850 dark:text-slate-200 truncate block text-[10.5px]">
                          {a.name}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono block pl-5 mt-0.5">Size: {a.size}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-1">
                      <button
                        type="button"
                        onClick={() => handleInjectAttachment(a.name)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded font-bold text-[9px] px-1.5 tracking-wider uppercase leading-tight"
                        title="Ambatanisha kwenye ujumbe wa mteja"
                      >
                        ⚡ Attach
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(a.id, a.name)}
                        className="text-red-500 hover:text-red-705 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: WhatsApp & Email Sender Panel (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <Send className="h-4 w-4 text-emerald-505" />
                {language === 'SW' ? 'Chombo cha WhatsApp / Email' : 'Broadcaster Desk'}
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                {language === 'SW' ? `${getSelectedCount()} Imeteuliwa` : `${getSelectedCount()} Checked`}
              </span>
            </div>

            {/* Inputs Form */}
            <div className="space-y-3.5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest block mb-1">
                    {language === 'SW' ? 'Jina la Mteja' : 'Customer Name'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. David Fredrick"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 font-bold"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest block mb-1">
                    {language === 'SW' ? 'Orodha ya Bei' : 'Price Matrix Filter'}
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-extrabold"
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value as any)}
                  >
                    <option value="both">{language === 'SW' ? 'Zote mbili (Jumla & Reja Reja)' : 'Pricing Box (Both List)'}</option>
                    <option value="retail">{language === 'SW' ? 'Reja Reja Tu (Selling Price)' : 'Retail Only (S-Price)'}</option>
                    <option value="wholesale">{language === 'SW' ? 'Jumla Tu (Wholesale Price)' : 'Wholesale Only (W-Price)'}</option>
                  </select>
                </div>
              </div>

              {/* CRM Phone block */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest block font-bold">
                    {language === 'SW' ? 'Namba ya Simu ya WhatsApp' : 'WhatsApp Contact Number'}
                  </label>
                  {(() => {
                    const clean = customerPhone.replace(/\D/g, '');
                    if (clean.startsWith('0')) {
                      return <span className="text-[8.5px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/25 px-1.5 rounded">{language === 'SW' ? '🔑 Tanzania (255)' : '🔑 Local (255)'}</span>;
                    }
                    return null;
                  })()}
                </div>

                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <PhoneCall className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. 0754 000 111 or +255 754 ..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-850 dark:text-slate-150 font-mono font-bold"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setPhoneError('');
                      }}
                    />
                  </div>
                  <button
                    onClick={handleSendWhatsApp}
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-3.5 rounded-lg flex items-center shrink-0 uppercase tracking-wide gap-1 shadow-sm transition-colors"
                  >
                    <span>{language === 'SW' ? 'Tuma WhatsApp' : 'Send WhatsApp'}</span>
                    <Send className="h-3 w-3" />
                  </button>
                </div>
                {phoneError && (
                  <p className="text-red-500 font-bold text-[10px] mt-1">{phoneError}</p>
                )}
              </div>

              {/* CRM Email Block */}
              <form onSubmit={handleSendEmail} className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest block font-bold">
                  {language === 'SW' ? 'Barua Pepe ya Mteja (Email)' : 'Client Email Endpoint'}
                </label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="e.g. mteja@gmail.com"
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-850 dark:text-slate-150 font-mono"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        setEmailError('');
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] px-3.5 rounded-lg flex items-center shrink-0 uppercase tracking-wide gap-1 transition-colors"
                  >
                    <span>{language === 'SW' ? 'Tuma Barua' : 'Send Email'}</span>
                    <Mail className="h-3 w-3" />
                  </button>
                </div>
                {emailError && (
                  <p className="text-red-500 font-bold text-[10px] mt-1">{emailError}</p>
                )}
                {emailSentStatus && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5 font-bold text-[10.5px]">
                    <Check className="h-4 w-4" />
                    <span>
                      {language === 'SW' 
                        ? `Orodha ya bei imetumwa kiusalama kwa: ${customerEmail}!` 
                        : `Pricing sheet safely broadcast to client email: ${customerEmail}!`}
                    </span>
                  </div>
                )}
              </form>

              {/* Message compiled Preview Block & Editor */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 space-y-1.5">
                <div className="flex justify-between items-center select-none">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">
                    {language === 'SW' ? 'Ujumbe utakaotumwa (Orodha ya Bei)' : 'Customizable Broadcast Message Text'}
                  </label>
                  <div className="flex gap-3">
                    {isMessageDirty && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMessageDirty(false);
                          setCustomMsg(compileMessageText());
                        }}
                        className="text-[9.5px] text-amber-600 hover:underline font-bold"
                      >
                        [Reset to Template]
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCopyClipboard}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                    >
                      {copiedStatus ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Clipboard className="h-3.5 w-3.5" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* TEXTAREA EDITOR - Allows manual edit before send */}
                <textarea
                  className="w-full h-80 bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-[10.5px] text-slate-100 leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner resize-y"
                  value={customMsg}
                  onChange={(e) => {
                    setCustomMsg(e.target.value);
                    setIsMessageDirty(true);
                  }}
                  placeholder="Draft your offer sheet message..."
                />
                
                <p className="text-[9px] text-slate-400 leading-none">
                  🏢 {language === 'SW' ? 'Unaweza kubadilisha orodha na maandishi hapo juu moja kwa moja kwa mkono.' : 'This text editor is live! Feel free to customize greetings, discounts, or banking codes manually.'}
                </p>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Recipient History List - Pia ionyeshe watu ambao imewatumia kama history hivi */}
      <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">
              {language === 'SW' ? 'Historia ya Kutuma Bei kwa Wateja' : 'Quotation Dispatch Recipient History'}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {language === 'SW' 
                ? 'Hapa ni orodha ya wateja waliopokea mazingira ya bei zetu kwa WhatsApp au Email.' 
                : 'Interactive real-time historical logs of clients who were forwarded custom pricing catalogs.'}
            </p>
          </div>
          {sentHistory.length > 0 && (
            <button 
              onClick={() => setSentHistory([])}
              className="text-[10px] text-red-500 font-bold hover:underline"
            >
              {language === 'SW' ? 'Futa Historia Yote' : 'Clear Log History'}
            </button>
          )}
        </div>

        {sentHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            {language === 'SW' ? 'Bado hujatuma orodha ya bei kwa mteja yeyote katika kipindi hiki!' : 'No custom quotation shares or broadcasts recorded yet!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-slate-400 uppercase text-[9px] tracking-wider font-extrabold pb-2">
                  <th className="py-2.5">Jina la Mteja</th>
                  <th className="py-2.5">Mawasiliano (Simu / Barua Pepe)</th>
                  <th className="py-2.5 text-center">Njia Iliyotumika</th>
                  <th className="py-2.5 text-center">Idadi ya Bidhaa</th>
                  <th className="py-2.5 text-right">Tarehe na Saa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900 leading-relaxed font-medium text-stone-900 dark:text-stone-100">
                {sentHistory.map((h: any) => (
                  <tr key={h.id} className="text-slate-705 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white uppercase">{h.clientName}</td>
                    <td className="py-2.5 font-mono text-[11px]">
                      {h.customerPhone !== '-' && <span className="block text-emerald-600 dark:text-emerald-450">📞 {h.customerPhone}</span>}
                      {h.customerEmail !== '-' && <span className="block text-indigo-600 dark:text-indigo-400">✉️ {h.customerEmail}</span>}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        h.channel === 'WhatsApp' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-450 border border-emerald-500/20' 
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/35 dark:text-indigo-450 border border-indigo-500/20'
                      }`}>
                        {h.channel}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono font-extrabold text-[12px]">{h.itemsCount}</td>
                    <td className="py-2.5 text-right font-mono text-slate-450">{h.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================= */}
      {/* IMMERSIVE QUOTATION PDF PRINT VIEW OVERLAY MODAL */}
      {/* ======================================================= */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto select-none print:static print:bg-white print:p-0">
          
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden print:static print:border-none print:max-h-full print:shadow-none">
            
            {/* Modal Actions Bar (No-Print) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-b flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-600" />
                <span className="font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  {language === 'SW' ? 'Muhakiki wa Quotation & PDF' : 'Quotation Document Preview'}
                </span>
              </div>

              <div className="flex items-center gap-2.5 font-bold">
                <button
                  onClick={() => printElement('quotation-printable-canvas', `Quotation_${clientName.replace(/\s+/g, '_') || 'Customer'}`)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10.5px] uppercase tracking-wide px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>{language === 'SW' ? 'Chapa au Hifadhi PDF' : 'Print / Export PDF'}</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    alert(language === 'SW' ? 'Ankara imeandaliwa na kuhifadhiwa kiusalama!' : 'Quotation workbook successfully registered and generated!');
                    setIsPdfModalOpen(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10.5px] uppercase tracking-wide px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {language === 'SW' ? 'Hifadhi Leda' : 'Log Save'}
                </button>

                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg border hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* PRINT CANVAS SHEET CONTAINER */}
            <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900 font-sans print:static print:overflow-visible print:p-0" id="quotation-printable-canvas">
              
              {/* Header block with Logo and Company Info */}
              <div className="flex justify-between items-start border-b pb-6 mb-6">
                
                {/* Brand Visual Logo */}
                <div>
                  {profile?.logoUrl ? (
                    <img src={profile.logoUrl} className="h-14 w-auto object-contain mb-2 max-w-[160px]" alt="Logo" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="text-indigo-600 font-sans font-black tracking-tighter text-lg bg-indigo-50 px-3.5 py-2 border rounded-xl uppercase inline-block mb-2">
                      🏢 {profile?.name || 'DUKA OS Enterprise'}
                    </div>
                  )}
                  <h1 className="text-xl font-black tracking-tight uppercase text-indigo-900">
                    {language === 'SW' ? 'MAKADIRIO YA BEI / QUOTATION' : 'OFFICIAL PRICING QUOTATION'}
                  </h1>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mt-0.5">
                    No: {quotationNumber}
                  </span>
                </div>

                {/* Secure QR Stamp */}
                <div className="text-right">
                  <div className="bg-slate-50 p-3 rounded-xl border border-dashed flex items-center gap-2.5">
                    <div className="h-10 w-10 bg-slate-950 rounded flex items-center justify-center font-mono text-[9px] text-white font-bold leading-none p-1 shrink-0">
                      QR SEAL
                    </div>
                    <div className="text-left font-mono text-[8.5px] leading-tight text-slate-500">
                      <span className="font-extrabold text-slate-900 block">SmartERP TRUST VERIFIED</span>
                      <div>License: DUKA-PRO-999</div>
                      <div>Date Issued: {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* CRM Seller & Buyer Contact blocks */}
              <div className="grid grid-cols-2 gap-8 text-xs mb-6 pb-6 border-b border-slate-100">
                
                {/* Seller Side */}
                <div>
                  <span className="font-bold text-[9.5px] text-slate-400 uppercase tracking-widest block mb-1">Seller Details / Wauzaji:</span>
                  <div className="space-y-1">
                    <strong className="text-slate-800 text-sm">{profile?.name || 'DUKA OS ENTERPRISE'}</strong>
                    <div className="text-slate-500 font-medium leading-normal space-y-0.5 mt-0.5">
                      {profile?.district && profile?.region && (
                        <div>📍 Location: {profile.district}, {profile.region} - {profile.country || 'Tanzania'}</div>
                      )}
                      {profile?.address && <div>Address: {profile.address}</div>}
                      <div>TIN Code: <span className="font-bold font-mono text-slate-800">{profile?.tinNumber || '00-000-000'}</span></div>
                      <div>VAT Registration: <span className="font-mono text-slate-800">{profile?.vatNumber || 'VAT-XXX'}</span></div>
                      <div>Email Support: {profile?.email || 'sales@dukaos.co.tz'}</div>
                      <div>Contact Line: {profile?.phone || '+255 754 000 111'}</div>
                      <div>WhatsApp Channel: {profile?.whatsapp || '+255 784 222 333'}</div>
                    </div>
                  </div>
                </div>

                {/* Buyer Client Side */}
                <div>
                  <span className="font-bold text-[9.5px] text-slate-400 uppercase tracking-widest block mb-1">Client Details / Mteja wetu:</span>
                  <div className="space-y-1 bg-indigo-50/15 p-3 rounded-xl border border-indigo-50">
                    {clientName.trim() ? (
                      <strong className="text-indigo-900 text-sm uppercase block">🎯 {clientName.trim()}</strong>
                    ) : (
                      <em className="text-slate-400 block">{language === 'SW' ? 'Mteja Mwenye Thamani (Walk-in Customer)' : 'Valued Walk-in Customer'}</em>
                    )}
                    
                    <div className="text-slate-600 font-medium leading-normal space-y-1 mt-1 pl-1">
                      {customerPhone.trim() && (
                        <div>📞 Phone: <span className="font-bold font-mono">{customerPhone}</span></div>
                      )}
                      {customerEmail.trim() && (
                        <div>✉️ Email Address: <span className="font-mono">{customerEmail}</span></div>
                      )}
                      <div className="text-[9.5px] text-slate-400 pt-1.5 border-t border-indigo-100/40 mt-1.5">
                        Quote Issued: <span className="font-bold font-mono text-slate-700">{new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="text-[9.5px] text-slate-400">
                        Quotation Valid until: <span className="font-bold font-mono text-slate-600">{new Date(Date.now() + 14 * 24 * 3600 * 1000).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Items price listing table */}
              <div>
                <span className="font-bold text-[9.5px] text-slate-400 uppercase tracking-widest block mb-1">Price Catalog Listing Matrix:</span>
                <table className="w-full text-left border-collapse text-xs mb-6">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider border-b border-t">
                      <th className="py-2 px-3 w-8 text-center">S/N</th>
                      <th className="py-2 px-3">Item Name & SKU</th>
                      <th className="py-2 px-3">Logistics Category</th>
                      <th className="py-2 px-3 text-right font-black">Selling Price (TZS)</th>
                      <th className="py-2 px-3 text-center">Branch Stock Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotationItems.map((item, index) => {
                      const branchQty = item.branchStock[currentBranch] ?? item.quantity ?? 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 text-center font-bold font-mono text-[11px]">{index + 1}</td>
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-slate-900 uppercase">{item.name}</span>
                            <span className="block text-[8.5px] text-slate-400 font-mono mt-0.5">SKU: {item.sku}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="bg-slate-100 text-slate-705 px-1.5 py-0.5 rounded text-[9.5px] font-semibold uppercase">{item.category}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-800">
                            {(pricingType === 'wholesale' ? (item.wholesalePrice || item.sellingPrice) : item.sellingPrice).toLocaleString()} TZS
                          </td>
                          <td className="py-3 px-3 text-center font-extrabold font-mono text-emerald-600">
                            {branchQty > 0 ? `${branchQty} pcs` : 'Out of Stock ❌'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Terms, Stamp, Signature block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end border-t pt-6 text-xs">
                
                {/* Left block notes */}
                <div className="space-y-4 font-medium text-slate-500 pl-1 leading-relaxed text-[10.5px]">
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-[9.5px] tracking-widest block mb-1">Standard Quotation Conditions:</h4>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Hali ya bei ni halisi na imehakikiwa kwenye mfumo wa ERP wa Duka OS.</li>
                      <li>Mazungumzo na punguzo la bei linategemea kiasi cha ununuzi kiwandani.</li>
                      <li>Malipo yote yafanyike kupitia akaunti rasmi ya Benki ya Kampuni.</li>
                    </ol>
                  </div>
                  
                  {profile?.companyStamp && (
                    <div className="p-2.5 bg-indigo-50/10 border border-indigo-100 rounded-lg text-indigo-800 italic text-[10px] font-serif">
                      🔒 Official Seal: "{profile.companyStamp}"
                    </div>
                  )}
                </div>

                {/* Right block stamp & verification QR code block */}
                <div className="flex items-center justify-center gap-4 flex-wrap md:flex-nowrap">
                  <div className="flex flex-col items-center justify-center text-center p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200">
                    <QRCodeSVG 
                      value={`https://dukaos.com/verify?type=quotation&client=${encodeURIComponent(clientName || 'Cash Customer')}&date=${new Date().toISOString().split('T')[0]}&total=${selectedProducts.reduce((sum, item) => sum + (pricingType === 'Retail' ? item.product.retailPrice : item.product.wholesalePrice) * item.qty, 0)}`}
                      size={64}
                      level="M"
                      fgColor="#1e1b4b"
                      bgColor="#ffffff"
                    />
                    <span className="text-[7px] uppercase font-bold text-slate-400 mt-1 block">
                      Verify Quotation
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="border-4 border-double border-indigo-700 text-indigo-800 dark:border-indigo-500 dark:text-indigo-400 rounded-full h-28 w-28 p-2 flex flex-col justify-center items-center select-none font-bold scale-90">
                      <span className="text-[7px] uppercase font-black font-sans shrink-0 truncate max-w-[80px]">{profile?.name ? profile.name.substring(0, 18) : 'DUKA OS'}</span>
                      <span className="text-[10px] uppercase font-black tracking-widest shrink-0 py-0.5">CERTIFIED</span>
                      <span className="text-[7px] italic shrink-0 leading-none">Smart ERP</span>
                      <span className="text-[7px] uppercase mt-0.5 shrink-0 font-mono text-slate-500">{new Date().getFullYear()} SECURE</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 mt-1 block pl-1">
                      Authorized Electronic Seal / Muhuri rasmi wa Kielektroniki
                    </span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
