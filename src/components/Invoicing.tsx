/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  FileSpreadsheet, 
  Plus, 
  TrendingUp, 
  Printer, 
  UserPlus, 
  CheckCircle, 
  Signature, 
  QrCode, 
  FileCheck, 
  FileText, 
  Layers, 
  Percent,
  Award,
  Trash2,
  Send,
  Wrench,
  X
} from 'lucide-react';
import { Invoice, Product, Customer, PDFTemplateType, InvoiceStatus } from '../types';
import { db } from '../db';
import { translations } from '../translations';
import { printElement, printCanvasToPDF, debugPrintableCanvas } from '../utils/print';

interface InvoicingProps {
  language: 'EN' | 'SW';
  currentBranch: string;
  userEmail: string;
}

export default function Invoicing({ language, currentBranch, userEmail }: InvoicingProps) {
  const t = translations[language];

  // States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // WhatsApp states
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappFormat, setWhatsappFormat] = useState<'pdf' | 'summary'>('pdf');

  useEffect(() => {
    if (selectedInvoice) {
      setWhatsappPhone(selectedInvoice.customerDetails?.phone || '');
    }
  }, [selectedInvoice]);

  const [activeCashier, setActiveCashier] = useState(() => localStorage.getItem('SmartERP_ActiveOperator') || 'Sada Salim');
  const [activeShift, setActiveShift] = useState(() => localStorage.getItem('SmartERP_ActiveShift') || 'Shift ya Asubuhi');

  useEffect(() => {
    const handleStorageChange = () => {
      setActiveCashier(localStorage.getItem('SmartERP_ActiveOperator') || 'Sada Salim');
      setActiveShift(localStorage.getItem('SmartERP_ActiveShift') || 'Shift ya Asubuhi');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (selectedInvoice) {
      const qrUrl = `${window.location.origin}/verify?type=invoice&id=${selectedInvoice.id}&ref=${selectedInvoice.refNumber}&amount=${selectedInvoice.grandTotal}&date=${selectedInvoice.invoiceDate}`;
      db.addQRLog({
        transactionId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        type: 'invoice',
        url: qrUrl,
        generatedBy: activeCashier || userEmail || 'Invoicing Manager'
      });
    }
  }, [selectedInvoice, activeCashier, userEmail]);
  
  // Choose PDF Template
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplateType>('Modern');

  // Printer and PDF Customizer configurations
  const [printPadding, setPrintPadding] = useState<number>(10);
  const [inkSaverMode, setInkSaverMode] = useState<boolean>(false);
  const [showPrinterDebugger, setShowPrinterDebugger] = useState<boolean>(false);

  // Customer bindings
  const [selectedCustId, setSelectedCustId] = useState('');
  
  // Items in Invoice
  const [invoiceItems, setInvoiceItems] = useState<{ product: Product; qty: number; discount: number }[]>([]);
  const [poNumber, setPoNumber] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Signature PAD Simulation State
  const [custSignature, setCustSignature] = useState('');
  const [sellerSignature, setSellerSignature] = useState('');

  const loadData = () => {
    const list = db.getInvoices();
    setInvoices(list);
    setProducts(db.getProducts());
    setCustomers(db.getCustomers());

    const targetInvoiceId = localStorage.getItem('SmartERP_SelectedInvoiceId');
    if (targetInvoiceId) {
      const match = list.find((i) => i.id === targetInvoiceId);
      if (match) {
        setSelectedInvoice(match);
        setShowCreate(false);
      }
      localStorage.removeItem('SmartERP_SelectedInvoiceId');
    }
  };

  useEffect(() => {
    loadData();
    // Default system date setting
    setDueDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 15 days term
  }, [currentBranch]);

  // Append product to invoice builder table
  const addProductToInvoice = (pId: string) => {
    const prod = products.find((p) => p.id === pId);
    if (!prod) return;
    
    const existingIdx = invoiceItems.findIndex((i) => i.product.id === pId);
    if (existingIdx !== -1) {
      const updated = [...invoiceItems];
      updated[existingIdx].qty += 1;
      setInvoiceItems(updated);
    } else {
      setInvoiceItems([...invoiceItems, { product: prod, qty: 1, discount: 0 }]);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCashier.trim()) {
      alert(language === 'SW' ? 'Hitilafu: Tafadhali weka jina la Muuzaji (Cashier Name / ID) kwenye ubao wa juu au badili opereta kabla ya kuandaa ankara!' : 'Error: Please specify the Cashier Name / ID on the header panel before creating an invoice!');
      return;
    }
    if (!activeShift.trim()) {
      alert(language === 'SW' ? 'Hitilafu: Tafadhali chagua Shift ya kazi kabla ya kuandaa ankara!' : 'Error: Please specify the Work Shift before creating an invoice!');
      return;
    }

    if (!selectedCustId || invoiceItems.length === 0) {
      alert('Selected Customer and at least one item are mandatory requirements!');
      return;
    }

    const customerMatch = customers.find((c) => c.id === selectedCustId);
    if (!customerMatch) return;

    const uniqueId = `inv-${Date.now()}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const subTotal = invoiceItems.reduce((sum, item) => sum + (item.product.sellingPrice * item.qty), 0);
    const discountItems = invoiceItems.reduce((sum, item) => sum + (item.discount * item.qty), 0);
    const finalTotal = Math.max(0, subTotal - discountItems);
    const taxAmount = Math.round(finalTotal - (finalTotal / 1.18));
    const taxableAmount = finalTotal - taxAmount;

    const uniqueVerificationHash = `VER-INV-${uniqueId.substring(4)}`;

    const newInvoice: Invoice = {
      id: uniqueId,
      invoiceNumber: invoiceNumber,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate,
      poNumber: poNumber || 'N/A',
      refNumber: uniqueVerificationHash,
      salesperson: `${activeCashier} (${activeShift})`,
      branchId: currentBranch,
      customerId: selectedCustId,
      customerDetails: {
        fullName: customerMatch.fullName,
        companyName: customerMatch.companyName,
        tinNumber: customerMatch.tinNumber,
        vatNumber: customerMatch.vatNumber,
        regNumber: customerMatch.regNumber,
        address: customerMatch.address,
        region: customerMatch.region,
        country: customerMatch.country,
        phone: customerMatch.phone,
        email: customerMatch.email
      },
      status: 'Pending',
      items: invoiceItems.map((i) => ({
        id: i.product.id,
        productName: i.product.name,
        sku: i.product.sku,
        barcode: i.product.barcode,
        quantity: i.qty,
        unitPrice: i.product.sellingPrice,
        discount: i.discount,
        taxRate: 18,
        total: (i.product.sellingPrice - i.discount) * i.qty
      })),
      subTotal: subTotal,
      taxTotal: taxAmount,
      discountTotal: discountItems,
      grandTotal: finalTotal,
      amountPaid: 0,
      paymentMethod: 'Bank Transfer',
      customerSignature: custSignature || 'Digitally Signed - Customer Webapp',
      sellerSignature: sellerSignature || activeCashier || 'Verified - Business CFO Seal',
      verificationId: uniqueVerificationHash,
      qrCodeUrl: `${window.location.origin}/verify?type=invoice&id=${uniqueVerificationHash}&ref=${uniqueVerificationHash}`
    };

    db.addInvoice(newInvoice, userEmail);
    
    // Clear & reload
    setInvoiceItems([]);
    setSelectedCustId('');
    setCustSignature('');
    setSellerSignature('');
    setShowCreate(false);
    loadData();
    alert(language === 'SW' ? 'Nyaraka ya Ankara Imetengenezwa!' : 'Invoice generated successfully with verified verification ID keys!');
  };

  const updateInvoiceStatusLocal = (id: string, stat: InvoiceStatus) => {
    // Determine paid amount based on status
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    const gTotal = inv.grandTotal;
    const amtPaid = stat === 'Paid' ? gTotal : stat === 'Partially Paid' ? Math.floor(gTotal / 2) : 0;
    
    db.updateInvoiceStatus(id, stat, amtPaid, userEmail);
    loadData();
    // Update active visual panel
    const fresh = db.getInvoices().find((i) => i.id === id);
    if (fresh) setSelectedInvoice(fresh);
  };

  const getTemplateLayoutStyles = () => {
    // Return CSS presets matching chosen style before export
    switch (selectedTemplate) {
      case 'Corporate':
        return {
          card: 'border-t-8 border-t-blue-800 bg-white font-serif tracking-normal p-8',
          headerBg: 'bg-blue-50/50 p-4 border rounded',
          accentText: 'text-blue-900',
          tableHead: 'bg-blue-900 text-white font-bold'
        };
      case 'Executive':
        return {
          card: 'border-t-8 border-t-slate-800 bg-white font-sans p-10 shadow-md',
          headerBg: 'bg-slate-50 border-y border-slate-200 p-4',
          accentText: 'text-slate-850',
          tableHead: 'bg-slate-850 text-white font-semibold'
        };
      case 'Premium':
        return {
          card: 'border-t-8 border-t-purple-800 bg-white p-8 font-sans',
          headerBg: 'bg-purple-50/40 p-5 rounded-lg border border-purple-100',
          accentText: 'text-purple-900',
          tableHead: 'bg-purple-900 text-white font-bold'
        };
      case 'Retail':
        return {
          card: 'border bg-white font-mono p-4 text-xs tracking-tight',
          headerBg: 'border-b border-dashed pb-3 mb-3',
          accentText: 'text-black',
          tableHead: 'border-b font-black text-black'
        };
      case 'Minimal':
        return {
          card: 'bg-white p-10 font-sans tracking-wide border-0',
          headerBg: 'border-b border-slate-100 pb-6 mb-6',
          accentText: 'text-slate-705',
          tableHead: 'border-b border-slate-200 text-slate-800 font-extrabold'
        };
      case 'Luxury':
        return {
          card: 'border-2 border-amber-500 bg-stone-950 text-amber-500 p-10 font-serif shadow-2xl',
          headerBg: 'border border-amber-900/60 bg-stone-900 p-6',
          accentText: 'text-amber-400',
          tableHead: 'bg-amber-500 text-black font-extrabold'
        };
      default: // Modern
        return {
          card: 'border bg-white rounded-xl shadow-lg font-sans p-8',
          headerBg: 'bg-indigo-50/20 p-5 rounded-lg border border-indigo-120/40',
          accentText: 'text-indigo-950',
          tableHead: 'bg-indigo-950 text-white font-bold'
        };
    }
  };

  const tStyles = getTemplateLayoutStyles();
  const profileConfig = db.getProfile();

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-650" />
          <h2 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white leading-none">Advanced Invoices Center</h2>
        </div>

        <button
          onClick={() => { setShowCreate(!showCreate); setSelectedInvoice(null); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-lg flex items-center gap-1.5 leading-none shadow"
        >
          <Plus className="h-4 w-4" />
          <span>New Invoice Builder</span>
        </button>
      </div>

      {/* Invoice Creator Drawer Panel */}
      {showCreate && (
        <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border shadow-xl space-y-4 animate-fade-in text-xs">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-extrabold text-xs text-slate-850 dark:text-white uppercase">Corporate Invoice Formulator</span>
            <button onClick={() => setShowCreate(false)} className="text-slate-400 font-bold underline hover:text-slate-900">Close Form</button>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Client Selection */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Select Customer Profile *</label>
                <select
                  value={selectedCustId}
                  onChange={(e) => setSelectedCustId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border mt-1 font-semibold"
                  required
                >
                  <option value="">Choose registered buyer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.fullName} [TIN: {c.tinNumber || 'N/A'}]</option>
                  ))}
                </select>
              </div>

              {/* Purchase order term */}
              <div>
                <label className="font-bold text-slate-600">Buyer PO Number</label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full bg-slate-50 border rounded-lg p-2.5 mt-1"
                  placeholder="PO-X9202"
                />
              </div>

              {/* Due Date setting */}
              <div>
                <label className="font-bold text-slate-600">Payment Due Term *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border rounded-lg p-2.5 mt-1 font-mono"
                  required
                />
              </div>

            </div>

            {/* Product selection rows */}
            <div className="space-y-2 border-t pt-4">
              <label className="font-bold text-slate-800 dark:text-white block uppercase text-[10px]">Add products to Billing Sheet</label>
              
              <div className="flex gap-2 max-w-sm">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addProductToInvoice(e.target.value);
                      e.target.value = ''; // reset
                    }
                  }}
                  className="w-full bg-slate-50 border rounded-lg p-2"
                >
                  <option value="">Select inventory SKU to insert...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (TZS {p.sellingPrice.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              {/* Selected Items Builder Table */}
              {invoiceItems.length > 0 && (
                <div className="border rounded-xl spill-hidden bg-slate-50/45 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 font-bold border-b">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-center">Quantity</th>
                        <th className="p-2 text-right">Unit Price (TZS)</th>
                        <th className="p-2 text-right">Discount (TZS)</th>
                        <th className="p-2 text-right">Total (TZS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                      {invoiceItems.map((item, idx) => (
                        <tr key={item.product.id}>
                          <td className="p-2 font-bold">{item.product.name}</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => {
                                const updated = [...invoiceItems];
                                updated[idx].qty = Math.max(1, Number(e.target.value));
                                setInvoiceItems(updated);
                              }}
                              className="w-16 border rounded text-center p-1"
                            />
                          </td>
                          <td className="p-2 text-right font-mono">{item.product.sellingPrice.toLocaleString()}</td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => {
                                const updated = [...invoiceItems];
                                updated[idx].discount = Math.max(0, Number(e.target.value));
                                setInvoiceItems(updated);
                              }}
                              className="w-24 border rounded text-right p-1"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold">
                            {((item.product.sellingPrice - item.discount) * item.qty).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Simulated Hand Signatures Pad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <label className="font-bold text-slate-600 block">Customer Digital Signature Authorized Stamp</label>
                <input
                  type="text"
                  placeholder="Draw / Type Customer Sign name (eg. 'F. D. Nyenza')"
                  value={custSignature}
                  onChange={(e) => setCustSignature(e.target.value)}
                  className="w-full bg-slate-50 border rounded-lg p-2.5 mt-1 font-serif text-sm border-dashed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block">Authorized Representative Signature</label>
                <input
                  type="text"
                  placeholder="Draw / Type Seller Authorized Sign (eg. 'Chief Accountant')"
                  value={sellerSignature}
                  onChange={(e) => setSellerSignature(e.target.value)}
                  className="w-full bg-slate-50 border rounded-lg p-2.5 mt-1 font-serif text-sm border-dashed"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-6 rounded-lg leading-none shadow"
            >
              Sign & Commit Invoice to Ledgers
            </button>
          </form>
        </div>
      )}

      {/* Main invoices manager table & Selected PDF templates print workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column Invoice Lists - Col 4 */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-950 p-4 border rounded-xl overflow-y-auto max-h-[80vh] space-y-3">
          <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider block">Invoiced Receivables list</span>
          {invoices.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">No bills created. Build one above or complete a register transaction.</p>
          ) : (
            invoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className={`w-full text-left p-3 rounded-lg border flex flex-col justify-between transition-all hover:bg-slate-50/50 ${
                  selectedInvoice?.id === inv.id 
                    ? 'border-indigo-600 bg-indigo-50/15' 
                    : 'border-slate-100 dark:border-slate-850'
                }`}
              >
                <div className="flex justify-between w-full">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                    inv.status === 'Paid' ? 'bg-green-100 text-green-900' : inv.status === 'Pending' ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900'
                  }`}>
                    {inv.status}
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 line-clamp-1 mt-1 font-medium">{inv.customerDetails.fullName}</p>

                <div className="flex justify-between w-full mt-2 border-t pt-1.5 border-dashed">
                  <span className="text-[10px] text-slate-400 font-mono">Date: {inv.invoiceDate}</span>
                  <span className="text-[11px] font-mono font-black text-indigo-750 dark:text-indigo-400">TZS {inv.grandTotal.toLocaleString()}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right column template preview room - Col 8 */}
        <div className="lg:col-span-8 space-y-4">
          {selectedInvoice ? (
            <div className="space-y-4">
              
              {/* Layout controls header */}
              <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between text-xs">
                
                {/* Template Preset Selector */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">Preset Theme Layout:</span>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value as PDFTemplateType)}
                    className="bg-white dark:bg-slate-950 border rounded px-2 py-1 font-semibold"
                  >
                    {['Modern', 'Corporate', 'Executive', 'Premium', 'Retail', 'Minimal', 'Luxury'].map((tType) => (
                      <option key={tType} value={tType}>{tType} Preset Layout</option>
                    ))}
                  </select>
                </div>

                {/* Status Toggle control */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">Change Status:</span>
                  <select
                    value={selectedInvoice.status}
                    onChange={(e) => updateInvoiceStatusLocal(selectedInvoice.id, e.target.value as InvoiceStatus)}
                    className="bg-white dark:bg-slate-950 border border-slate-200 rounded px-2 py-1 font-bold text-emerald-800"
                  >
                    {['Draft', 'Pending', 'Sent', 'Approved', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled', 'Refunded'].map((stType) => (
                      <option key={stType} value={stType}>Mark as {stType}</option>
                    ))}
                  </select>
                </div>

                 {/* Print PDF triggers & deletion controls */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => printElement('printable-area-canvas', `Invoice_${selectedInvoice.invoiceNumber || selectedInvoice.id}`)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer text-xs animate-fade-in"
                    title={language === 'SW' ? 'Chapa hati hii ya PDF ya kiwango cha thabiti' : 'Print this high-fidelity PDF invoice using standard driver'}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>{language === 'SW' ? 'Chapa / PDF' : 'Print / PDF'}</span>
                  </button>

                  <button
                    onClick={() => setShowPrinterDebugger(!showPrinterDebugger)}
                    className={`font-black py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer text-xs transition-colors ${
                      showPrinterDebugger 
                        ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                        : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 hover:bg-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                    title={language === 'SW' ? 'Fungua daktari wa utatuzi wa matatizo ya chapa' : 'Launch custom printer console & debug suite'}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>{language === 'SW' ? 'Marekebisho' : 'Debug Printer'}</span>
                  </button>

                  <button
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer text-xs"
                    title={language === 'SW' ? 'Tuma kwa mteja kupitia WhatsApp' : 'Dispatch invoice via WhatsApp'}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => {
                      const msg = language === 'SW' 
                        ? 'Je, una uhakika unataka kufuta ankara hii kabisa? Kitendo hiki hakiwezi kurejeshwa!'
                        : 'Are you sure you want to permanently delete this invoice? This action is irreversible!';
                      if (window.confirm(msg)) {
                        db.deleteInvoice(selectedInvoice.id, userEmail);
                        setSelectedInvoice(null);
                        loadData();
                      }
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-black py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer text-xs"
                    title={language === 'SW' ? 'Futa Ankara hii' : 'Delete this Invoice'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{language === 'SW' ? 'Futa Ankara' : 'Delete Invoice'}</span>
                  </button>
                </div>
              </div>

              {/* LIVE PRINTER DIAGNOSTICS & TUNING CONSOLE PANEL */}
              {showPrinterDebugger && (() => {
                const diag = debugPrintableCanvas();
                return (
                  <div className="bg-amber-500/5 dark:bg-amber-950/10 border border-amber-500/20 rounded-xl p-4 mb-4 select-none animate-fade-in text-xs no-print">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-3">
                      <div className="font-extrabold text-amber-850 text-amber-800 dark:text-amber-400 flex items-center gap-2 text-sm uppercase">
                        <Wrench className="h-4 w-4 text-amber-600 animate-spin-slow" />
                        <span>SMART PRINTER RESOLUTION CONSOLE & DIAGNOSTICS</span>
                      </div>
                      <button 
                        onClick={() => setShowPrinterDebugger(false)} 
                        className="text-amber-700 dark:text-amber-500 hover:text-amber-900 font-bold p-1 rounded-full cursor-pointer hover:bg-amber-500/10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Tuner configurations */}
                      <div className="bg-white dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                        <h4 className="font-extrabold text-slate-700 dark:text-slate-300 border-b pb-1 text-[10px] tracking-wider uppercase">1. PRINT TUNING CONTROLS</h4>
                        
                        {/* Margins tuning slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center font-bold text-slate-500 text-[10px]">
                            <span>CUSTOM MARGIN RESIZE:</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-black">{printPadding} mm</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="25" 
                            value={printPadding} 
                            onChange={(e) => setPrintPadding(parseInt(e.target.value))} 
                            className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg"
                          />
                        </div>

                        {/* Ink conservation checkbox */}
                        <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                          <input 
                            type="checkbox" 
                            checked={inkSaverMode} 
                            onChange={(e) => setInkSaverMode(e.target.checked)} 
                            className="accent-indigo-600 rounded mt-0.5" 
                          />
                          <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                            <span className="font-extrabold block text-slate-700 dark:text-slate-200">ECO INK SAVER MODE</span>
                            <span>Automatically strips heavy dark backgrounds, forcing high-contrast grayscale for printer ecology.</span>
                          </div>
                        </label>
                      </div>

                      {/* Diagnostic criteria list */}
                      <div className="bg-white dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 lg:col-span-2 space-y-3">
                        <h4 className="font-extrabold text-slate-700 dark:text-slate-300 border-b pb-1 text-[10px] tracking-wider uppercase">2. LIVE PRINTER COMPLIANCE CHECKLIST</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
                          <div className="flex items-start gap-1.5">
                            <span className={diag.canvasFound ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                              {diag.canvasFound ? "✓" : "✗"}
                            </span>
                            <div>
                              <span className="font-bold block">DOM Print-Canvas Presence</span>
                              <span className="text-[10px] text-slate-400">{diag.canvasFound ? "Success: #printable-area-canvas ready for spool" : "Error: Cannot resolve printing element"}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-1.5">
                            <span className="text-indigo-600 font-bold">●</span>
                            <div>
                              <span className="font-bold block">Document Complexity Density</span>
                              <span className="text-[10px] text-slate-400">Contains {diag.elementCount} active markup vector elements</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-1.5">
                            <span className={diag.hasDarkBackground ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}>
                              {diag.hasDarkBackground ? "⚠" : "✓"}
                            </span>
                            <div>
                              <span className="font-bold block">Ink Volume Audit</span>
                              <span className="text-[10px] text-slate-400">{diag.hasDarkBackground ? "Alert: High ink-dump slate fields found" : "Optimized: Clean bright print balance"}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">📄</span>
                            <div>
                              <span className="font-bold block">Expected Page Count</span>
                              <span className="text-[10px] text-slate-400">Fits inside ~{diag.estimatedPages} standard A4 printable sheets</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-extrabold text-[9px] uppercase tracking-widest block text-slate-400 mb-1">RECOMMENDED REMEDIATION ACTIONS:</span>
                          <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-300 italic">
                            {diag.recommendations.map((rec, rIdx) => (
                              <li key={`rec-${rIdx}`}>{rec}</li>
                            ))}
                            {diag.issues.map((iss, iIdx) => (
                              <li key={`iss-${iIdx}`} className="text-amber-600 dark:text-amber-400 font-semibold">{iss}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {/* Diagnostic Actions row */}
                    <div className="mt-3 pt-3 border-t border-amber-500/15 flex flex-wrap justify-between items-center gap-2">
                      <span className="text-[10px] text-slate-400 italic">Verify your layout in real-time. Use 'A4 simulated bounds' to trace dimensions.</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => printElement('printable-area-canvas', `Invoice_${selectedInvoice.invoiceNumber || selectedInvoice.id}`)}
                          className="bg-slate-500 hover:bg-slate-650 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] tracking-wider uppercase cursor-pointer"
                        >
                          Raw Spooler Test
                        </button>
                        <button 
                          onClick={() => printCanvasToPDF(`Invoice_${selectedInvoice.invoiceNumber || selectedInvoice.id}`, printPadding, inkSaverMode)}
                          className="bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-extrabold text-[10px] tracking-wider uppercase cursor-pointer flex items-center gap-1.5 shadow"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Trigger PDF Rendering</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ACTIVE RENDERED INVOICE VIEW TEMPLATE SHEET */}
              <div 
                className={`${tStyles.card} ${showPrinterDebugger ? "ring-2 ring-amber-500 border-amber-400 relative before:content-['A4_SIMULATED_PAGE_BOUNDS'] before:absolute before:top-2 before:right-2 before:text-[8px] before:font-bold before:bg-amber-100 before:text-amber-800 before:px-1.5 before:py-0.5 before:rounded before:z-50 shadow-2xl transition-all" : ""}`} 
                id="printable-area-canvas"
                style={showPrinterDebugger ? { padding: `${printPadding}mm` } : undefined}
              >
                
                {/* Visual Label Branding row */}
                <div className="flex justify-between items-start border-b pb-6 mb-6 border-slate-200">
                  <div>
                    {profileConfig?.logoUrl ? (
                      <img src={profileConfig.logoUrl} className="h-12 w-auto object-contain mb-2" alt="Business Logo" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-xl font-black text-indigo-900 border-l-4 border-indigo-600 pl-2 uppercase">{profileConfig?.name || 'DUKA OS Suite'}</span>
                    )}
                    <h2 className="text-xl font-extrabold tracking-tight mt-1 uppercase text-slate-800">{selectedInvoice.invoiceNumber}</h2>
                    <span className="text-[10px] font-mono text-slate-400 block mt-1">Status: <span className="font-bold text-indigo-700 uppercase">{selectedInvoice.status}</span></span>
                  </div>

                  {/* QR Invoice Authenticator Verification box */}
                  <div className="text-right flex flex-col items-end">
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 border rounded-lg flex items-center gap-2 text-stone-900 dark:text-stone-100">
                      <div className="bg-white p-1 rounded border">
                        <QRCodeSVG 
                          value={`${window.location.origin}/verify?type=invoice&id=${selectedInvoice.id}&ref=${selectedInvoice.refNumber}&amount=${selectedInvoice.grandTotal}&date=${selectedInvoice.invoiceDate}`}
                          size={56}
                          level="M"
                          fgColor="#1e1b4b"
                          bgColor="#ffffff"
                        />
                      </div>
                      <div className="text-left font-mono text-[8.5px] leading-tight text-slate-500">
                        <span className="font-bold block text-slate-900 dark:text-slate-100">VERIFIED OFFICIAL ERP SECURE</span>
                        <div>LIC-ID: {selectedInvoice.refNumber}</div>
                        <div>Date Signed: {selectedInvoice.invoiceDate}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seller & Buyer details row side-by-side */}
                <div className="grid grid-cols-2 gap-8 text-slate-705 text-xs mb-6">
                  <div>
                    <span className="font-bold uppercase tracking-wider block text-slate-400 text-[10px] mb-1">Seller details (Muuza bidhaa)</span>
                    <strong className="text-sm dark:text-white">{profileConfig?.name || 'DUKA OS Enterprise Ltd'}</strong>
                    <div className="mt-1 space-y-0.5 font-normal text-slate-500">
                      <div>Address: {profileConfig?.address || 'HQ Suite, Region'}</div>
                      <div>TIN Number: {profileConfig?.tinNumber || '000-000-000'}</div>
                      <div>VAT Code: {profileConfig?.vatNumber || '00-000000'}</div>
                      <div>Contact email: {profileConfig?.email || 'sales@enterprise.com'}</div>
                      <div>Phone Whatsapp: {profileConfig?.phone || '000'}</div>
                      <div className="pt-1.5 mt-1.5 border-t border-slate-200/60 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 leading-none">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>{language === 'SW' ? 'Muuza Bidhaa:' : 'Sales Cashier:'}</span>
                        <span className="font-extrabold">{selectedInvoice.salesperson || 'HQ Retail Staff'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold uppercase tracking-wider block text-slate-400 text-[10px] mb-1">Purchaser details (Mnunuzi)</span>
                    <strong className="text-sm text-indigo-950 dark:text-indigo-400">{selectedInvoice.customerDetails.fullName}</strong>
                    <div className="mt-1 space-y-0.5 text-slate-500">
                      {selectedInvoice.customerDetails.companyName && <div>Company: {selectedInvoice.customerDetails.companyName}</div>}
                      <div>Address: {selectedInvoice.customerDetails.address}, {selectedInvoice.customerDetails.region}</div>
                      <div>TIN Number: {selectedInvoice.customerDetails.tinNumber || 'N/A (Individual)'}</div>
                      {selectedInvoice.customerDetails.vatNumber && <div>VAT Number: {selectedInvoice.customerDetails.vatNumber}</div>}
                      <div>Phone Contact: {selectedInvoice.customerDetails.phone}</div>
                    </div>
                  </div>
                </div>

                {/* Core Invoices Specifics table */}
                <div className="border border-slate-200/60 rounded-xl overflow-hidden mb-6 text-xs bg-white">
                  <table className="w-full text-left">
                    <thead className={tStyles.tableHead}>
                      <tr>
                        <th className="p-3">Product Name spec</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Unit Price (TZS)</th>
                        <th className="p-3 text-right">Discount (TZS)</th>
                        <th className="p-3 text-right">Total (TZS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {selectedInvoice.items.map((it) => (
                        <tr key={it.id}>
                          <td className="p-3">
                            <span className="font-bold block">{it.productName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">SKU: {it.sku} | Barcode: {it.barcode}</span>
                          </td>
                          <td className="p-3 text-center font-bold">{it.quantity}</td>
                          <td className="p-3 text-right font-mono">{it.unitPrice.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-rose-500">-{it.discount.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold tracking-tight">{(it.total).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals calculations row matching ERP outputs */}
                <div className="flex justify-end mb-6 text-xs">
                  <div className="w-72 space-y-1.5 border-t border-slate-200 pt-3">
                    <div className="flex justify-between text-slate-500"><span>Gross Subtotal:</span> <span className="font-mono">TZS {selectedInvoice.subTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-rose-600"><span>Rebates Discount:</span> <span className="font-mono">- TZS {selectedInvoice.discountTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Value Added Tax (18%):</span> <span className="font-mono">TZS {selectedInvoice.taxTotal.toLocaleString()}</span></div>
                    <div className="flex justify-between border-t border-slate-500 font-black text-slate-900 border-double pt-1.5 text-sm dark:text-white">
                      <span>Grand Absolute Total:</span> 
                      <span className="font-mono text-indigo-750 dark:text-indigo-400">TZS {selectedInvoice.grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Digital Stamps Seals & Signature Pad values render */}
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-dashed border-slate-200 text-[10px] text-slate-400">
                  <div className="text-center font-serif">
                    <span className="block mb-6 uppercase tracking-wider text-[9px] text-slate-400">Buyer Digital Receipt</span>
                    <div className="border border-slate-100 p-3 rounded bg-slate-50/50 italic text-stone-700 font-bold font-serif text-center relative pointer-events-none select-none">
                      {selectedInvoice.customerSignature || 'UNSIGNED'}
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="block mb-6 uppercase tracking-wider text-[9px] text-slate-400">ERP Official Seal</span>
                    {profileConfig?.companyStamp ? (
                      <div className="flex items-center justify-center p-2 rounded bg-indigo-50/20 border border-indigo-400/20 max-w-[120px] mx-auto min-h-12 text-center text-[10px] font-bold uppercase italic text-indigo-800">
                        {profileConfig.companyStamp}
                      </div>
                    ) : (
                      <div className="border border-green-500/20 text-green-700 p-2 font-mono rounded font-bold uppercase italic max-w-[120px] mx-auto min-h-12 flex items-center justify-center">
                        SECURE PAY-OK
                      </div>
                    )}
                  </div>

                  <div className="text-center font-serif">
                    <span className="block mb-6 uppercase tracking-wider text-[9px] text-slate-400">Authorized Accountant</span>
                    <div className="border border-slate-100 p-3 rounded bg-slate-50/50 italic text-stone-700 font-bold font-serif text-center relative pointer-events-none select-none">
                      {selectedInvoice.sellerSignature || 'VERIFIED ELECTRONIC'}
                    </div>
                  </div>
                </div>

                {/* Security tracking licenses footer */}
                <div className="text-center text-[9px] font-mono text-slate-400 mt-8 pt-6 border-t border-slate-100 uppercase tracking-widest leading-none">
                  ERP Pro Max Authentic Invoice - Secure Digital signature ledger keys synchronised.
                </div>

              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border border-dashed rounded-xl p-16 text-center">
              <FileSpreadsheet className="h-10 w-10 text-slate-350 mb-2" />
              <p className="font-bold text-xs uppercase text-slate-600">No Invoice Selected</p>
              <p className="text-[10px] text-slate-405 mt-1">Tap any invoice on the left list to review its PDF/Excel templates design room.</p>
            </div>
          )}
        </div>

      </div>

      {/* WhatsApp Sharing Dialog Modal */}
      {isWhatsAppModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/85 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-lg">
                  <Send className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-tight text-[11px]">
                    {language === 'SW' ? 'Tuma Kupitia WhatsApp' : 'Dispatch via WhatsApp'}
                  </h3>
                  <p className="text-[9.5px] text-slate-400 font-medium">
                    Invoice: <strong className="font-mono text-emerald-500">{selectedInvoice.invoiceNumber}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              
              {/* Phone target input */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider block">
                  {language === 'SW' ? 'Nambari ya WhatsApp ya Mteja:' : 'Client WhatsApp Line:'}
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 255712345678"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[9px] text-slate-405 block leading-normal italic">
                  * Pre-seed international formats with country indices (e.g., 255 for TZ: 2557XXXXXXXX).
                </span>
              </div>

              {/* Format Select buttons */}
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider block">
                  {language === 'SW' ? 'Chagua Umbizo la Nyaraka:' : 'Select Share Format:'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWhatsappFormat('pdf')}
                    className={`p-3 rounded-xl border font-bold text-[10.5px] text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      whatsappFormat === 'pdf'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-450 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                    <span>{language === 'SW' ? 'Link ya Cheti cha PDF' : 'PDF Certificate Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsappFormat('summary')}
                    className={`p-3 rounded-xl border font-bold text-[10.5px] text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      whatsappFormat === 'summary'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-450 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>{language === 'SW' ? 'Muhtasari wa Maandishi' : 'Text Summary Report'}</span>
                  </button>
                </div>
              </div>

              {/* Preview block */}
              <div className="space-y-1 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-805">
                <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 block pb-1 border-b border-dashed border-slate-200 dark:border-slate-800">
                  {language === 'SW' ? 'Hakiki Ujumbe Utakaotuma:' : 'Live Message Preview:'}
                </span>
                <div className="pt-2 text-[10px] text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed select-text overflow-y-auto max-h-[120px]">
                  {(() => {
                    const qrUrl = `${window.location.origin}/verify?type=invoice&ref=${selectedInvoice.refNumber || selectedInvoice.id}&amount=${selectedInvoice.grandTotal}&date=${selectedInvoice.invoiceDate}&client=${encodeURIComponent(selectedInvoice.customerDetails?.fullName || '')}`;
                    if (whatsappFormat === 'pdf') {
                      return language === 'SW'
                        ? `*ANKARA ILIYOTHIBITISHWA - ${selectedInvoice.invoiceNumber}*\n\nHabari ${selectedInvoice.customerDetails?.fullName || 'Mteja'},\nHapa kuna ankara yako thabiti iliyosajiliwa kielektroniki.\n\n*Kiasi:* TZS ${selectedInvoice.grandTotal.toLocaleString()}\n*Tarehe:* ${selectedInvoice.dueDate}\n\nPakua au Hakiki nyaraka yako ya PDF hapa:\n🔗 ${qrUrl}`
                        : `*OFFICIAL REGISTERED INVOICE - ${selectedInvoice.invoiceNumber}*\n\nHello ${selectedInvoice.customerDetails?.fullName || 'Valued Client'},\nPlease find your secure digital invoice details listed below.\n\n*Total Due:* TZS ${selectedInvoice.grandTotal.toLocaleString()}\n*Due Date:* ${selectedInvoice.dueDate}\n\nVerify and download your PDF statement here:\n🔗 ${qrUrl}`;
                    } else {
                      const listItemsText = selectedInvoice.items.slice(0, 3).map(it => {
                        const prod = products.find(p=>p.id === it.productId);
                        return `• ${prod ? prod.name : 'Item'} x${it.qty} = TZS ${(it.sellingPrice * it.qty).toLocaleString()}`;
                      }).join('\n');
                      const dots = selectedInvoice.items.length > 3 ? '\n• ...' : '';

                      return language === 'SW'
                        ? `*MUHTASARI WA ANKARA - ${selectedInvoice.invoiceNumber}*\n\nMteja: ${selectedInvoice.customerDetails?.fullName || 'Mteja'}\n\n*MCHANGANUO WA BIDHAA:*\n${listItemsText}${dots}\n\n*Jumla Kuu:* TZS ${selectedInvoice.grandTotal.toLocaleString()}\n*Hali:* ${selectedInvoice.status}\n\n🔗 ${qrUrl}`
                        : `*INVOICE SUMMARY - ${selectedInvoice.invoiceNumber}*\n\nClient: ${selectedInvoice.customerDetails?.fullName || 'Client'}\n\n*ITEMS PURHASED:*\n${listItemsText}${dots}\n\n*Grand Total:* TZS ${selectedInvoice.grandTotal.toLocaleString()}\n*Status:* ${selectedInvoice.status}\n\n🔗 ${qrUrl}`;
                    }
                  })()}
                </div>
              </div>

            </div>

            {/* Modal Footer actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-300 font-extrabold uppercase rounded-lg tracking-wider cursor-pointer"
              >
                {language === 'SW' ? 'Ghairi' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const cleanedPhone = whatsappPhone.replace(/\D/g, '');
                  if (!cleanedPhone) {
                    alert(language === 'SW' ? 'Tafadhali jaza namba sahihi!' : 'Please fill a valid phone line number!');
                    return;
                  }
                  
                  // Construct dynamic payload
                  let fullTextStr = '';
                  const webOrigin = window.location.origin;
                  const targetQR = `${webOrigin}/verify?type=invoice&ref=${selectedInvoice.refNumber || selectedInvoice.id}&amount=${selectedInvoice.grandTotal}&date=${selectedInvoice.invoiceDate}&client=${encodeURIComponent(selectedInvoice.customerDetails?.fullName || '')}`;

                  if (whatsappFormat === 'pdf') {
                    fullTextStr = language === 'SW'
                      ? `*ANKARA ILIYOTHIBITISHWA - ${selectedInvoice.invoiceNumber}*\n\nHabari ${selectedInvoice.customerDetails?.fullName || 'Mteja'},\nHapa kuna ankara yako thabiti iliyosajiliwa kielektroniki kwenye mfumo wetu mkuu wa biashara.\n\n*Kiasi:* TZS ${selectedInvoice.grandTotal.toLocaleString()}\n*Tarehe ya Malipo:* ${selectedInvoice.dueDate}\n\nPakua nauhakiki nyaraka yako ya PDF hapo chini:\n🔗 ${targetQR}\n\nAsante kwa kufanya biashara nasi.`
                      : `*OFFICIAL REGISTERED INVOICE - ${selectedInvoice.invoiceNumber}*\n\nHello ${selectedInvoice.customerDetails?.fullName || 'Valued Client'},\nPlease find your secure digital invoice details listed below.\n\n*Total Due:* TZS ${selectedInvoice.grandTotal.toLocaleString()}\n*Due Date:* ${selectedInvoice.dueDate}\n\nVerify and download your PDF statement here:\n🔗 ${targetQR}\n\nThank you for choosing us!`;
                  } else {
                    const completeItemsText = selectedInvoice.items.map(it => {
                      const prod = products.find(p=>p.id === it.productId);
                      return `• ${prod ? prod.name : 'Bidhaa'} x${it.qty} = TZS ${(it.sellingPrice * it.qty).toLocaleString()}`;
                    }).join('\n');

                    fullTextStr = language === 'SW'
                      ? `*MUHTASARI WA ANKARA - ${selectedInvoice.invoiceNumber}*\n\nMteja: ${selectedInvoice.customerDetails?.fullName || 'Mteja'}\nNamba ya Simu: ${selectedInvoice.customerDetails?.phone || 'Hajajaza'}\n\n*MCHANGANUO WA BIDHAA:*\n${completeItemsText}\n\n*Jumla Kuu:* TZS ${selectedInvoice.grandTotal.toLocaleString()}\n*Hali Malipo:* ${selectedInvoice.status}\n\nAngalia PDF kielektroniki:\n🔗 ${targetQR}`
                      : `*INVOICE SUMMARY - ${selectedInvoice.invoiceNumber}*\n\nClient: ${selectedInvoice.customerDetails?.fullName || 'Client'}\nPhone Contact: ${selectedInvoice.customerDetails?.phone || 'N/A'}\n\n*ITEMS PURCHASED:*\n${completeItemsText}\n\n*Grand Total:* TZS ${selectedInvoice.grandTotal.toLocaleString()}\n*Status:* ${selectedInvoice.status}\n\nSecure PDF verification link:\n🔗 ${targetQR}`;
                  }

                  const outboundWhatsAppUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(fullTextStr)}`;
                  window.open(outboundWhatsAppUrl, '_blank');
                  setIsWhatsAppModalOpen(false);
                }}
                className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase rounded-lg flex items-center gap-1.5 tracking-wider cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{language === 'SW' ? 'Tuma Sasa' : 'Send Whatsapp'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
