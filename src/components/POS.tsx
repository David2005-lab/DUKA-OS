/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Barcode, 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Percent, 
  CheckCircle2, 
  Printer, 
  CircleDot, 
  ArrowLeft,
  Coffee,
  Coins,
  History
} from 'lucide-react';
import { Product, POSOrder, Transaction } from '../types';
import { db } from '../db';
import { translations } from '../translations';
import { printElement } from '../utils/print';

interface POSProps {
  language: 'EN' | 'SW';
  currentBranch: string;
  userEmail: string;
}

export default function POS({ language, currentBranch, userEmail }: POSProps) {
  const t = translations[language];

  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<{ product: Product; quantity: number; discount: number }[]>([]);
  const [taxRate, setTaxRate] = useState(18); // Default 18% VAT
  const [globalDiscount, setGlobalDiscount] = useState(0); // overall flat discount
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [splitPayment, setSplitPayment] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState({ Cash: 0, Card: 0, Mobile: 0 });
  const [amountPaid, setAmountPaid] = useState('');
  const [heldCarts, setHeldCarts] = useState<POSOrder[]>([]);
  const [pricingMode, setPricingMode] = useState<'Retail' | 'Wholesale'>(() => {
    return (localStorage.getItem('SmartERP_POSPricingMode') as 'Retail' | 'Wholesale') || 'Retail';
  });
  const [posSection, setPosSection] = useState<'terminal' | 'history'>('terminal');
  const [completedOrder, setCompletedOrder] = useState<{ 
    orderId: string; 
    subTotal: number; 
    grandTotal: number; 
    timestamp: string; 
    invoiceNumber: string; 
    cashierName?: string; 
    shiftName?: string 
  } | null>(null);

  const [activeCashier, setActiveCashier] = useState(() => localStorage.getItem('SmartERP_ActiveOperator') || 'Sada Salim');
  const [activeShift, setActiveShift] = useState(() => localStorage.getItem('SmartERP_ActiveShift') || 'Shift ya Asubuhi');

  useEffect(() => {
    localStorage.setItem('SmartERP_POSPricingMode', pricingMode);
  }, [pricingMode]);

  useEffect(() => {
    const handleStorageChange = () => {
      setActiveCashier(localStorage.getItem('SmartERP_ActiveOperator') || 'Sada Salim');
      setActiveShift(localStorage.getItem('SmartERP_ActiveShift') || 'Shift ya Asubuhi');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load products & held cards
  const loadPOSData = () => {
    setProducts(db.getProducts());
    setHeldCarts(loadHeldCarts());
  };

  useEffect(() => {
    loadPOSData();
    const addProdId = localStorage.getItem('SmartERP_AddProductToPOSId');
    if (addProdId) {
      const allProds = db.getProducts();
      const match = allProds.find((p) => p.id === addProdId);
      if (match) {
        const bStock = match.branchStock[currentBranch] ?? 0;
        if (bStock > 0) {
          setCart([{ product: match, quantity: 1, discount: 0 }]);
        } else {
          alert(language === 'SW' ? 'Bidhaa hii haina stoki katika tawi hili!' : 'No stock available for this product in current branch!');
        }
      }
      localStorage.removeItem('SmartERP_AddProductToPOSId');
    }
  }, [currentBranch]);

  const loadHeldCarts = (): POSOrder[] => {
    const data = localStorage.getItem('SmartERP_HeldCarts');
    return data ? JSON.parse(data) : [];
  };

  const saveHeldCarts = (carts: POSOrder[]) => {
    localStorage.setItem('SmartERP_HeldCarts', JSON.stringify(carts));
    setHeldCarts(carts);
  };

  // Add to cart utility
  const addToCart = (product: Product) => {
    const branchStock = product.branchStock[currentBranch] ?? 0;
    if (branchStock <= 0) {
      alert(language === 'SW' ? 'Bidhaa hii haina stoki katika tawi hili!' : 'No stock available for this product in current branch!');
      return;
    }

    const existingIndex = cart.findIndex((i) => i.product.id === product.id);
    if (existingIndex !== -1) {
      const curQty = cart[existingIndex].quantity;
      if (curQty >= branchStock) {
        alert(language === 'SW' ? 'Huwezi kuongeza zaidi ya stoki iliyopo!' : 'Cannot sell more than available branch stock!');
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1, discount: 0 }]);
    }
  };

  const updateCartQty = (productId: string, qty: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const branchQty = item.product.branchStock[currentBranch] ?? 0;
    if (qty > branchQty) {
      alert(language === 'SW' ? 'Stoki haitoshi katika tawi hili!' : 'Insufficient branch stock!');
      return;
    }

    if (qty <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
    }
  };

  const updateCartItemDiscount = (productId: string, disc: number) => {
    setCart(cart.map((i) => i.product.id === productId ? { ...i, discount: Math.max(0, disc) } : i));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.product.id !== productId));
  };

  // Auto Calculations
  const subTotal = cart.reduce((sum, item) => {
    const activePrice = pricingMode === 'Wholesale' 
      ? (item.product.wholesalePrice || item.product.sellingPrice) 
      : item.product.sellingPrice;
    const itemTotal = activePrice * item.quantity;
    return sum + itemTotal;
  }, 0);

  const cartDiscounts = cart.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
  const totalDiscount = cartDiscounts + globalDiscount;
  
  const taxableAmount = Math.max(0, subTotal - totalDiscount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

  // Filter Categories
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === 'All') return matchesSearch;
    return matchesSearch && p.category === selectedCategory;
  });

  // Hold Carts logic
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newHold: POSOrder = {
      id: `hold-${Date.now()}`,
      items: cart.map((i) => ({ product: i.product, quantity: i.quantity, discount: i.discount })),
      discountTotal: totalDiscount,
      taxTotal: taxAmount,
      grandTotal: grandTotal,
      status: 'Hold',
      date: new Date().toISOString()
    };
    const updated = [...heldCarts, newHold];
    saveHeldCarts(updated);
    setCart([]);
    db.logAudit('CREATE', 'POSCart', 'On Hold: Suspended current POS shopping queue', userEmail);
    alert(language === 'SW' ? 'Muamala Umesitishwa!' : 'Transaction placed on hold successfully!');
  };

  const handleResumeCart = (held: POSOrder) => {
    // Load back
    setCart(held.items.map((i) => ({ product: i.product, quantity: i.quantity, discount: i.discount })));
    const updated = heldCarts.filter((c) => c.id !== held.id);
    saveHeldCarts(updated);
    db.logAudit('UPDATE', 'POSCart', 'Resumed suspended shopping cart order', userEmail);
  };

  // Complete checkout
  const handleCheckoutSubmit = () => {
    if (cart.length === 0) return;

    if (!activeCashier.trim()) {
      alert(language === 'SW' ? 'Hitilafu: Tafadhali weka jina la Muuzaji (Cashier Name / ID) kabla ya kukamilisha mauzo!' : 'Error: Please specify the Cashier Name / ID before completing the sale!');
      return;
    }
    if (!activeShift.trim()) {
      alert(language === 'SW' ? 'Hitilafu: Tafadhali chagua Shift ya kazi kabla ya kukamilisha mauzo!' : 'Error: Please specify the Work Shift before completing the sale!');
      return;
    }

    // Double Check inventory logs
    const hasError = cart.some((item) => {
      const bStock = item.product.branchStock[currentBranch] ?? 0;
      return item.quantity > bStock;
    });

    if (hasError) {
      alert(language === 'SW' ? 'Hitilafu: Baadhi ya bidhaa hazina stoki ya kutosha!' : 'Error: Selected quantity exceeds branch stock levels.');
      return;
    }

    const orderId = `pos-${Date.now()}`;
    const invoiceNumber = `POS-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(100+Math.random()*900)}`;

    // Decrement inventory automatically inside DB trigger!
    const productsDb = db.getProducts();
    cart.forEach((item) => {
      const pIdx = productsDb.findIndex((p) => p.id === item.product.id);
      if (pIdx !== -1) {
        const prod = productsDb[pIdx];
        const curStock = prod.branchStock[currentBranch] ?? 0;
        
        // Automatic update logic
        prod.branchStock[currentBranch] = Math.max(0, curStock - item.quantity);
        prod.quantity = Object.values(prod.branchStock).reduce((sum, val) => sum + val, 0);
        db.updateProduct(prod, userEmail);
      }
    });

    // Write Sales Ledger Record automatically
    const finalMethod = splitPayment 
      ? `Split (${Object.entries(splitAmounts).filter(([_, v]) => (v as number) > 0).map(([k, v]) => `${k}:${v}`).join(', ')})`
      : paymentMethod;

    db.addTransaction({
      id: `txn-pos-${orderId}`,
      type: 'Sale',
      date: new Date().toISOString().split('T')[0],
      categoryId: 'POS Sales Revenue',
      description: `Completed sale: Invoice ${invoiceNumber} across ${cart.length} unique products. Cashier: ${activeCashier} (${activeShift}). Payment method: ${finalMethod}`,
      amount: grandTotal,
      paymentMethod: finalMethod,
      referenceId: orderId,
      branchId: currentBranch,
      performedBy: `${activeCashier} (${activeShift})`
    }, userEmail);

    // Save as dynamic Completed Invoice as well (Draft or Paid status)
    const profile = db.getProfile();
    const uniqueVerificationHash = `VER-${orderId.substring(4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    db.addInvoice({
      id: orderId,
      invoiceNumber: invoiceNumber,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      poNumber: 'N/A',
      refNumber: uniqueVerificationHash,
      salesperson: `${activeCashier} (${activeShift})`,
      branchId: currentBranch,
      customerId: 'walk-in',
      customerDetails: {
        fullName: 'Walk-In Customer / Mteja wa Kawaida',
        companyName: '',
        tinNumber: '',
        vatNumber: '',
        regNumber: '',
        address: 'POS Register counters',
        region: profile?.region || 'HQ',
        country: profile?.country || 'TZ',
        phone: 'Walk-In',
        email: 'walkin@smartbusiness-receipts.com'
      },
      status: 'Paid',
      items: cart.map((i) => {
        const itemPrice = pricingMode === 'Wholesale' 
          ? (i.product.wholesalePrice || i.product.sellingPrice) 
          : i.product.sellingPrice;
        return {
          id: i.product.id,
          productName: i.product.name,
          sku: i.product.sku,
          barcode: i.product.barcode,
          quantity: i.quantity,
          unitPrice: itemPrice,
          discount: i.discount,
          taxRate: i.product.taxRate || 18,
          total: (itemPrice - i.discount) * i.quantity
        };
      }),
      subTotal: subTotal,
      taxTotal: taxAmount,
      discountTotal: totalDiscount,
      grandTotal: grandTotal,
      amountPaid: grandTotal,
      paymentMethod: finalMethod,
      customerSignature: 'POS Verified',
      sellerSignature: activeCashier,
      verificationId: uniqueVerificationHash,
      qrCodeUrl: `https://verify-invoice.smartbusinesserp.com/receipt/${uniqueVerificationHash}`
    }, userEmail);

    setCompletedOrder({
      orderId,
      subTotal,
      grandTotal,
      timestamp: new Date().toLocaleString(),
      invoiceNumber,
      cashierName: activeCashier,
      shiftName: activeShift
    });

    setCart([]);
    setAmountPaid('');
    setGlobalDiscount(0);
    setSplitPayment(false);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    const match = products.find((p) => p.barcode === searchQuery || p.sku.toLowerCase() === searchQuery.trim().toLowerCase());
    if (match) {
      addToCart(match);
      setSearchQuery('');
    }
  };

  const getSellingStats = () => {
    const list = db.getTransactions().filter(tx => tx.type === 'Sale' && tx.branchId === currentBranch);
    const todayStr = new Date().toISOString().split('T')[0];
    
    const getDiffDays = (dStr: string) => {
      const today = new Date(todayStr);
      const txDate = new Date(dStr);
      const diffTime = today.getTime() - txDate.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const daily = list.filter(tx => tx.date === todayStr);
    const weekly = list.filter(tx => getDiffDays(tx.date) >= 0 && getDiffDays(tx.date) < 7);
    const monthly = list.filter(tx => getDiffDays(tx.date) >= 0 && getDiffDays(tx.date) < 30);

    const getSum = (arr: Transaction[]) => arr.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      dailySum: getSum(daily),
      dailyCount: daily.length,
      weeklySum: getSum(weekly),
      weeklyCount: weekly.length,
      monthlySum: getSum(monthly),
      monthlyCount: monthly.length,
      rawList: list
    };
  };

  const sellingStats = getSellingStats();

  return (
    <div className="flex flex-col md:h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)] w-full gap-3 p-1 md:overflow-hidden overflow-y-auto pb-16 md:pb-0">
      
      {/* Top Controller Desk */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-sans font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider leading-none">
              {language === 'SW' ? 'Kituo cha Mauzo cha Duka OS' : 'Duka OS Cashier Hub'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
              <span>{language === 'SW' ? 'Zamu:' : 'Session:'}</span>
              <input 
                type="text"
                placeholder="Cashier Name"
                value={activeCashier}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveCashier(val);
                  localStorage.setItem('SmartERP_ActiveOperator', val);
                  window.dispatchEvent(new Event('storage'));
                }}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded font-extrabold text-blue-600 dark:text-blue-400 text-[10px] w-28 uppercase"
              />
              <select
                value={activeShift}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveShift(val);
                  localStorage.setItem('SmartERP_ActiveShift', val);
                  window.dispatchEvent(new Event('storage'));
                }}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1 py-0.5 rounded font-extrabold text-slate-700 dark:text-slate-300 text-[10px] focus:outline-none"
              >
                <option value="Shift ya Asubuhi">{language === 'SW' ? 'Zamu ya Asubuhi' : 'Morning Shift'}</option>
                <option value="Shift ya Mchana">{language === 'SW' ? 'Zamu ya Mchana' : 'Afternoon Shift'}</option>
                <option value="Shift ya Jioni">{language === 'SW' ? 'Zamu ya Jioni' : 'Evening Shift'}</option>
                <option value="Zamu ya Usiku">{language === 'SW' ? 'Zamu ya Usiku' : 'Night Shift'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Section Switcher and Pricing Mode Indicators */}
        <div className="flex bg-slate-105 dark:bg-slate-905 p-1 rounded-xl gap-1 border border-slate-200/50 dark:border-slate-800/50 shrink-0">
          <button
            type="button"
            onClick={() => setPosSection('terminal')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
              posSection === 'terminal'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>🛒</span>
            <span>{language === 'SW' ? 'Dawati la Mauzo' : 'Sales Counter'}</span>
          </button>
          <button
            type="button"
            onClick={() => setPosSection('history')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
              posSection === 'history'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>📊</span>
            <span>{language === 'SW' ? 'Historia' : 'Analytics History'}</span>
          </button>
        </div>
      </div>

      {posSection === 'terminal' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 flex-1 md:overflow-hidden">
          
          {/* Products Catalog Display - Col 6 on md, 7 on lg */}
          <div className="md:col-span-6 lg:col-span-7 flex flex-col h-[55vh] md:h-full bg-slate-50 dark:bg-slate-900 rounded-xl p-3 sm:p-4 overflow-hidden border border-slate-200 dark:border-slate-800">
            
            {/* Retail vs Wholesale Pricing Select Tool */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 gap-1 mb-3 shrink-0">
              <button
                type="button"
                onClick={() => setPricingMode('Retail')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${
                  pricingMode === 'Retail'
                    ? 'bg-indigo-650 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-805 dark:hover:text-slate-200'
                }`}
              >
                <span>🛒 BEI YA KAWAIDA (REJA REJA)</span>
              </button>
              <button
                type="button"
                onClick={() => setPricingMode('Wholesale')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${
                  pricingMode === 'Wholesale'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-805 dark:hover:text-slate-200'
                }`}
              >
                <span>📦 BEI YA PIPELINE (JUMLA)</span>
              </button>
            </div>

            {/* Search & Scan Row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0">
              <form onSubmit={handleBarcodeSubmit} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={t.barcodeSearch}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 text-slate-900 dark:text-white"
                  />
                  <div className="absolute left-3 top-3 text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase px-4 py-2 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer shadow-sm transition-colors"
                >
                  <Search className="h-4.5 w-4.5" />
                  <span>{language === 'SW' ? 'Tafuta' : 'Search'}</span>
                </button>
              </form>

              {/* Suspend Orders indicator */}
              {heldCarts.length > 0 && (
                <div className="flex gap-2">
                  {heldCarts.map((h, i) => (
                    <button
                      key={h.id}
                      onClick={() => handleResumeCart(h)}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold px-3 py-2 rounded-lg flex items-center gap-1 leading-none"
                    >
                      <History className="h-3.5 w-3.5" />
                      <span>C-{i+1}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Categories Pills Row */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-none mb-3 shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products Matrix */}
            {products.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-white dark:bg-slate-950 rounded-xl border border-slate-100">
                <ShoppingCart className="h-10 w-10 text-slate-300 mb-2" />
                <span className="font-extrabold text-sm uppercase text-slate-500">{t.noData}</span>
                <p className="text-xs text-slate-400 mt-1">{t.noDataDesc}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-405">
                No matching items found. Add items to Inventory or change filters.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1">
                {filteredProducts.map((p) => {
                  const qty = p.branchStock[currentBranch] ?? p.quantity;
                  const isLow = qty <= p.reorderLevel;
                  const isOut = qty <= 0;
                  
                  return (
                    <button
                      key={p.id}
                      disabled={isOut}
                      onClick={() => addToCart(p)}
                      className={`bg-white dark:bg-slate-950 border rounded-xl overflow-hidden p-2 text-left transition-all relative flex flex-col justify-between hover:shadow-md ${
                        isOut 
                          ? 'border-red-200 opacity-50 cursor-not-allowed' 
                          : isLow 
                            ? 'border-amber-300 hover:border-amber-400' 
                            : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Thumbnail / Accent block */}
                      <div className="h-20 w-full mb-2 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 relative overflow-hidden">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} className="h-full w-full object-cover" alt={p.name} referrerPolicy="no-referrer" />
                        ) : (
                          <Barcode className="h-8 w-8 text-slate-300" />
                        )}
                        <div className="absolute top-1 right-1">
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded-full font-bold ${
                            isOut ? 'bg-red-200 text-red-900' : isLow ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-900'
                          }`}>
                            {qty} {p.unit || 'pcs'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-tight">
                          {p.category}
                        </span>
                        <h3 className="font-sans font-bold text-xs text-slate-900 dark:text-white line-clamp-1 mt-0.5 leading-tight">
                          {p.name}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-900 w-full">
                        <span className="text-xs font-bold font-mono text-indigo-700 dark:text-indigo-400">
                          TZS {(pricingMode === 'Wholesale' ? (p.wholesalePrice || p.sellingPrice) : p.sellingPrice).toLocaleString()}
                          {pricingMode === 'Wholesale' && <span className="text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded font-black ml-1 uppercase">Jumla</span>}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">SKU: {p.sku}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* POS Cart Summary - Col 6 on md, 5 on lg (Extra Spacious) */}
          <div className="md:col-span-6 lg:col-span-5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-auto min-h-[45vh] md:h-full overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            
            {/* Header summary info - Extra Spacious */}
            <div className="p-6 border-b border-slate-200/60 dark:border-slate-800 bg-indigo-50/20 dark:bg-slate-900/40 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-sans font-black text-sm tracking-tight text-slate-900 dark:text-white uppercase">
                    {language === 'SW' ? 'KIKAPU CHAKO KIKO HAI' : 'Active Register Cart'}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold flex items-center gap-1 mt-0.5 uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    <span>{cart.length} {language === 'SW' ? 'Bidhaa Zilizochaguliwa' : 'Selected Item(s)'}</span>
                  </p>
                </div>
              </div>
              {cart.length > 0 && (
                <button 
                  onClick={() => setCart([])} 
                  className="px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-955 hover:text-rose-700 hover:border-rose-250 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 transition-all flex items-center gap-1.5 shrink-0"
                  title={language === 'SW' ? 'Futa kikapu chote' : 'Clear all items in cart'}
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  <span>{language === 'SW' ? 'Safisha' : 'Clear'}</span>
                </button>
              )}
            </div>

            {/* Current order successfully transacted feedback block */}
            {completedOrder && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/25 border-b border-emerald-100 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-100 text-xs animate-fade-in flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                  <span>{t.paymentConfirmed}</span>
                </div>
                
                <div id="receipt-printable-canvas" className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-emerald-100/40 font-mono text-[11px] leading-relaxed relative text-slate-800 dark:text-slate-300">
                  <div className="text-center font-bold pb-2 border-b border-dashed uppercase text-indigo-700 dark:text-indigo-400">{t.receipt}</div>
                  <div className="flex justify-between mt-2"><span>Inv No:</span> <span>{completedOrder.invoiceNumber}</span></div>
                  <div className="flex justify-between"><span>Date:</span> <span>{completedOrder.timestamp}</span></div>
                  <div className="flex justify-between">
                    <span>{language === 'SW' ? 'Muuzaji:' : 'Cashier:'}</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">{completedOrder.cashierName || activeCashier} ({completedOrder.shiftName || activeShift})</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white mt-1 pt-1 border-t border-dashed">
                    <span>Total Received:</span> <span>TZS {completedOrder.grandTotal.toLocaleString()}</span>
                  </div>
                  
                  {/* Dynamic QR Code Generator block */}
                  <div className="flex flex-col items-center justify-center py-2.5 border-t border-dashed mt-2.5 bg-slate-50 dark:bg-slate-900/60 rounded">
                    <div className="bg-white p-1 rounded border shadow-xs">
                      <QRCodeSVG 
                        value={`https://dukaos.com/verify?type=receipt&id=${completedOrder.orderId}&invoice=${completedOrder.invoiceNumber}&amount=${completedOrder.grandTotal}&date=${encodeURIComponent(completedOrder.timestamp)}`}
                        size={64}
                        level="M"
                        fgColor="#000000"
                        bgColor="#ffffff"
                      />
                    </div>
                    <span className="text-[7.5px] uppercase text-slate-400 dark:text-slate-500 mt-1 font-black block tracking-wider">SCAN TO VERIFY TRANS LOG</span>
                  </div>

                  <div className="text-[9px] text-center text-slate-400 mt-2 border-t pt-2 max-w-[200px] mx-auto leading-none">
                    QR Invoice Verified OK. Powered by Duka OS Software.
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-1">
                  <button 
                    onClick={() => printElement('receipt-printable-canvas', `Receipt_${completedOrder?.invoiceNumber || completedOrder?.orderId || ''}`)} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded flex items-center gap-1.5 leading-none text-[11px]"
                  >
                    <Printer className="h-3 w-3" />
                    Print / PDF Export
                  </button>
                  <button 
                    onClick={() => setCompletedOrder(null)} 
                    className="text-emerald-605 hover:underline font-bold text-[11px]"
                  >
                    Close Receipt
                  </button>
                </div>
              </div>
            )}

            {/* Cart items panel */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-10">
                  <ShoppingCart className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="font-bold text-xs uppercase text-slate-650">{t.cartEmpty}</p>
                  <p className="text-[10px] text-slate-405 mt-1">Select products or scan barcodes to begin sales ledger logging.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div 
                    key={item.product.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs animate-fade-in"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.product.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        TZS {(pricingMode === 'Wholesale' ? (item.product.wholesalePrice || item.product.sellingPrice) : item.product.sellingPrice).toLocaleString()} {item.product.unit ? '/'+item.product.unit : ''}
                        {pricingMode === 'Wholesale' && <span className="text-[8px] text-amber-600 dark:text-amber-400 font-black ml-1 uppercase">(Jumla)</span>}
                      </span>
                      {item.discount > 0 && <span className="text-[10px] text-rose-500 font-bold ml-1.5">(- TZ {item.discount.toLocaleString()})</span>}
                    </div>

                    {/* Adjust Quantities Control */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                        className="p-1 bg-white dark:bg-slate-950 border rounded-lg hover:bg-slate-100"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-bold font-mono text-center w-6">{item.quantity}</span>
                      <button 
                        onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                        className="p-1 bg-white dark:bg-slate-950 border rounded-lg hover:bg-slate-100"
                      >
                        <Plus className="h-3 w-3" />
                      </button>

                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-slate-350 hover:text-red-650 ml-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Adjust Discounts / Payments panel */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 space-y-3 shrink-0">
                
                {/* Discount Adjustment */}
                <div className="flex gap-2">
                  <div className="flex-1 flex gap-1 items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 text-xs">
                    <Percent className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="number"
                      placeholder="Flat global sale rebate discount..."
                      value={globalDiscount || ''}
                      onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                      className="w-full bg-transparent py-1.5 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-1 items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 text-xs w-24">
                    <span className="text-[11px] font-bold text-slate-400">VAT %:</span>
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-full font-bold bg-transparent py-1.5 pr-1 focus:outline-none text-right"
                    />
                  </div>
                </div>

                {/* Structured Payment Mode Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Receipt Payment System</label>
                  
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {['Cash', 'Bank Transfer', 'Visa', 'Mastercard', 'M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Halopesa'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m);
                          setSplitPayment(false);
                        }}
                        className={`text-[11px] px-2.5 py-1.5 rounded-lg font-bold border whitespace-nowrap ${
                          paymentMethod === m && !splitPayment
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSplitPayment(!splitPayment)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg font-bold border whitespace-nowrap ${
                        splitPayment
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Split Payments
                    </button>
                  </div>
                </div>

                {/* Split payments fields */}
                {splitPayment && (
                  <div className="grid grid-cols-3 gap-2 p-2 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-200/30 rounded-lg text-[10px]">
                    <div>
                      <label className="font-bold text-slate-500">Cash Amount</label>
                      <input
                        type="number"
                        value={splitAmounts.Cash || ''}
                        onChange={(e) => setSplitAmounts({ ...splitAmounts, Cash: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-slate-950 border rounded p-1 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500">Card Amount</label>
                      <input
                        type="number"
                        value={splitAmounts.Card || ''}
                        onChange={(e) => setSplitAmounts({ ...splitAmounts, Card: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-slate-950 border rounded p-1 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500">Mobile Money</label>
                      <input
                        type="number"
                        value={splitAmounts.Mobile || ''}
                        onChange={(e) => setSplitAmounts({ ...splitAmounts, Mobile: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-slate-950 border rounded p-1 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Financial Ledger Calculation Summary */}
                <div className="text-xs space-y-1 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <div className="flex justify-between text-slate-450 font-medium">
                    <span>{t.subtotal}</span>
                    <span className="font-mono">TZS {subTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-450 font-medium">
                    <span>{t.discount}</span>
                    <span className="font-mono text-rose-505">- TZS {totalDiscount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-450 font-medium">
                    <span>{t.tax} ({taxRate}%)</span>
                    <span className="font-mono">TZS {taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 dark:text-white font-black text-sm border-t border-slate-100 dark:border-slate-800 pt-1.5">
                    <span>{t.total}</span>
                    <span className="font-mono text-indigo-700 dark:text-indigo-400">
                      TZS {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Footer */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleHoldCart}
                    className="w-full border border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold py-2 rounded-lg text-xs leading-none flex items-center justify-center gap-1.5"
                  >
                    <Coins className="h-4 w-4 text-slate-400" />
                    {t.holdOrder}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCheckoutSubmit}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 rounded-lg text-xs leading-none flex items-center justify-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    {t.checkout}
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-6">
          
          {/* Main Top Header Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Daily card */}
            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 h-16 w-16 bg-indigo-500/5 rounded-bl-full flex items-center justify-center font-black text-xl text-indigo-505 select-none">S</div>
              <div>
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Mauzo ya Leo (Daily)</span>
                <strong className="text-2xl font-mono text-slate-800 dark:text-white block mt-2">TZS {sellingStats.dailySum.toLocaleString()}</strong>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10.5px]">
                <span className="text-slate-400 font-medium">Idadi ya Risiti:</span>
                <span className="font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-mono">{sellingStats.dailyCount} sales</span>
              </div>
            </div>

            {/* Weekly card */}
            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 rounded-bl-full flex items-center justify-center font-black text-xl text-blue-505 select-none">W</div>
              <div>
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block">Mauzo ya Wiki Hii (Weekly)</span>
                <strong className="text-2xl font-mono text-slate-800 dark:text-white block mt-2">TZS {sellingStats.weeklySum.toLocaleString()}</strong>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10.5px]">
                <span className="text-slate-400 font-medium">Idadi ya Risiti:</span>
                <span className="font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-mono">{sellingStats.weeklyCount} sales</span>
              </div>
            </div>

            {/* Monthly card */}
            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 h-16 w-16 bg-amber-500/5 rounded-bl-full flex items-center justify-center font-black text-xl text-amber-505 select-none">M</div>
              <div>
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">Mauzo ya Mwezi Huu (Monthly)</span>
                <strong className="text-2xl font-mono text-slate-800 dark:text-white block mt-2">TZS {sellingStats.monthlySum.toLocaleString()}</strong>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10.5px]">
                <span className="text-slate-400 font-medium">Idadi ya Risiti:</span>
                <span className="font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-mono">{sellingStats.monthlyCount} sales</span>
              </div>
            </div>

          </div>

          {/* Detailed Receipts Ledger List */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">Orodha ya Mauzo Halisi (Sales Transaction Ledger)</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Inajumuisha miamala yote iliyokamilika kwenye daftari la tawi hili hivi karibuni.</p>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Tawi: {currentBranch}</span>
            </div>

            {sellingStats.rawList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {language === 'SW' ? 'Hakuna miamala ya mauzo inayopatikana bado katika tawi hili!' : 'No sales ledger entries created for this branch yet!'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-slate-400 uppercase text-[9px] tracking-wider font-extrabold">
                      <th className="py-2.5">Ref ID</th>
                      <th className="py-2.5">Tarehe</th>
                      <th className="py-2.5">Maelezo (Description)</th>
                      <th className="py-2.5">Keshia & Shift</th>
                      <th className="py-2.5 text-right">Kiasi Kilicholipwa (Amount)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-905 leading-relaxed font-medium">
                    {sellingStats.rawList.slice(0, 50).map((tx) => (
                      <tr key={tx.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="py-2.5 font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{tx.id.replace('txn-pos-', '')}</td>
                        <td className="py-2.5 font-mono text-[10.5px] font-bold whitespace-nowrap">{tx.date}</td>
                        <td className="py-2.5 font-sans">
                          <span className="block font-semibold line-clamp-1 max-w-sm">{tx.description}</span>
                          <span className="text-[9px] text-slate-450 block font-mono">Njia ya Malipo: <strong>{tx.paymentMethod}</strong></span>
                        </td>
                        <td className="py-2.5 font-sans text-[10.5px] whitespace-nowrap">{tx.performedBy || 'Default Agent'}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white text-[12px]">
                          TZS {tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
