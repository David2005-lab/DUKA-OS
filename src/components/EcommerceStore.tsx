/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  SlidersHorizontal,
  ArrowRight,
  Info,
  CheckCircle2,
  Tag,
  MapPin,
  Phone,
  User,
  PackageCheck
} from 'lucide-react';
import { Product } from '../types';
import { db } from '../db';
import { translations } from '../translations';

interface EcommerceStoreProps {
  language: 'EN' | 'SW';
  currentBranch: string;
}

export default function EcommerceStore({ language, currentBranch }: EcommerceStoreProps) {
  const t = translations[language];

  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Cart state
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [checkedOutSuccess, setCheckedOutSuccess] = useState(false);

  // Delivery configuration
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddr, setClientAddr] = useState('');

  const loadProducts = () => {
    // Only display available positive stock
    setProducts(db.getProducts().filter((p) => (p.branchStock[currentBranch] ?? 0) > 0));
  };

  useEffect(() => {
    loadProducts();
  }, [currentBranch]);

  // Filters
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    setCheckedOutSuccess(false);
    const existing = cart.find((item) => item.product.id === product.id);
    const branchStockQty = product.branchStock[currentBranch] ?? 0;

    if (existing) {
      if (existing.qty + 1 > branchStockQty) {
        alert(language === 'SW' ? 'Samahani! Stoki yetu iliyobaki haitoshi kwa oda hii.' : 'Not enough warehouse stock available for ecommerce allocation!');
        return;
      }
      setCart(cart.map((item) => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const updateCartQty = (pId: string, delta: number) => {
    const existing = cart.find((i) => i.product.id === pId);
    if (!existing) return;

    const matchedProd = products.find((p) => p.id === pId);
    if (!matchedProd) return;
    const branchStockQty = matchedProd.branchStock[currentBranch] ?? 0;

    const newQty = existing.qty + delta;
    if (newQty <= 0) {
      setCart(cart.filter((item) => item.product.id !== pId));
    } else {
      if (newQty > branchStockQty) {
        alert(language === 'SW' ? 'Samahani, umefikia kiwango cha juu cha mzingo kwny stoki yetu.' : 'Requested quantity exceeds available branch reserves!');
        return;
      }
      setCart(cart.map((item) => item.product.id === pId ? { ...item, qty: newQty } : item));
    }
  };

  const handleOnlineCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !clientName || !clientPhone) {
      alert(language === 'SW' ? 'Tafadhali ingiza Taarifa za Mteja na Kikapu cha manunuzi!' : 'Please fill out Client contacts and shopping bag first!');
      return;
    }

    // Process ecommerce transaction triggers
    const invoiceNum = `ECOMM-${Date.now().toString().substring(5)}`;
    const subTotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.qty), 0);
    const gTotal = subTotal;
    const taxTotal = Math.round(gTotal - (gTotal / 1.18));

    // Trigger local db decrements directly
    db.completeOnlineOrder({
      id: `online-${Date.now()}`,
      orderId: invoiceNum,
      customerName: clientName,
      customerPhone: clientPhone,
      deliveryAddress: clientAddr || 'HQ Depot delivery',
      items: cart.map((i) => ({
        id: i.product.id,
        productName: i.product.name,
        quantity: i.qty,
        sellingPrice: i.product.sellingPrice,
        taxAmount: i.product.taxRate
      })),
      totalAmount: gTotal,
      status: 'Paid',
      branchId: currentBranch
    }, 'customer-ecommerce-checkout@smartbusiness.com');

    setCart([]);
    setClientName('');
    setClientPhone('');
    setClientAddr('');
    setCheckedOutSuccess(true);
    
    // Reload storefront available stock
    loadProducts();
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.qty), 0);

  return (
    <div className="space-y-6 text-xs relative animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Premium B2B ecommerce header banner */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex justify-between items-center flex-wrap gap-4 shadow-sm">
        <div className="flex gap-3 items-center">
          <div className="h-12 w-12 bg-indigo-650/10 text-indigo-650 dark:text-indigo-400 rounded-xl flex items-center justify-center">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-serif font-black uppercase text-slate-900 dark:text-white leading-none">
              {language === 'SW' ? 'Duka la Mtandao na Agizo la Haraka' : 'Smart Digital Order Storefront'}
            </h2>
            <p className="text-[10.5px] text-slate-400 mt-1 font-medium leading-normal">
              {language === 'SW' 
                ? 'Katalugu ya bidhaa za duka kwa wateja. Kila mauzo yatapunguza stoki moja kwa moja kutoka ghalani.' 
                : 'Customer-facing B2B checkout catalog. Subtracts stocks from corresponding branch warehouses automatically.'}
            </p>
          </div>
        </div>

        {/* Floating Cart Button indicator with animation */}
        <button
          onClick={() => { setCheckedOutSuccess(false); setShowCartDrawer(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-sm uppercase tracking-wider text-[10px] transition-transform active:scale-95 cursor-pointer shrink-0"
          id="digital-shop-cart-header"
        >
          <ShoppingCart className="h-4.5 w-4.5" />
          <span>{language === 'SW' ? 'Kikapu chako' : 'Shopping bag'} ({cartCount})</span>
        </button>
      </div>

      {checkedOutSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          <div>
            <strong className="text-emerald-800 dark:text-emerald-350 uppercase block font-bold text-[11px] select-none">
              {language === 'SW' ? 'AGIZO LIMESHUGHULIKIWA SALAMA!' : 'ECOMMERCE ORDER COMPLETED SECURELY!'}
            </strong>
            <span className="text-slate-500 mt-0.5 block">
              {language === 'SW' ? 'Oda yako imepokelewa kwenye foleni ya duka na stoki imesasishwa moja kwa moja.' : 'Stocks updated in corresponding branch warehouse ledger. Order logs updated.'}
            </span>
          </div>
        </div>
      )}

      {/* Grid of contents & filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        
        {/* Left Side menu categories */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-950 p-4 border rounded-2xl space-y-3 shadow-sm border-slate-200 dark:border-slate-805">
            <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block border-b pb-1 dark:border-slate-800">
              {language === 'SW' ? 'Makundi ya Bidhaa' : 'Shop Categories'}
            </span>
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-left p-2.5 rounded-lg font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350'
                  }`}
                >
                  {cat === 'All' ? (language === 'SW' ? 'Zote Zilizopo Ghalani' : 'View All stocks') : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-amber-900 leading-tight">
              {language === 'SW' ? 'Bei na bidhaa hapa zinaakisi moja kwa moja thamani, kodi na kiwango kilichopo ghalani mwako.' : 'These listed prices dynamically mirror your core hardware, grocery, or fashion inventory catalogs automatically.'}
            </p>
          </div>
        </div>

        {/* Right side catalog products feed */}
        <div className="md:col-span-3 space-y-4">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={language === 'SW' ? 'Tafuta duka kwa Jina la bidhaa au SKU...' : 'Search store by Name, Material, SKU, Barcode...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-slate-950 border w-full rounded-2xl pl-9 p-3 focus:outline-none focus:ring-1 focus:ring-indigo-605 font-semibold text-xs border-slate-205 dark:border-slate-800"
            />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-16 text-center border bg-white dark:bg-slate-950 rounded-2xl border-slate-200 dark:border-slate-800 text-slate-400">
              {language === 'SW' ? 'Hakuna bidhaa inayolingana na ombi lako hivi sasa ghalani.' : 'No matching commercial products available for digital sales. Balance inventory stocks.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((p) => {
                const stockLeft = p.branchStock[currentBranch] ?? 0;
                return (
                  <div key={p.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all">
                    
                    <div>
                      {/* Fake placeholder graphic styled like a minimalist hardware box */}
                      <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl aspect-square mb-3.5 flex flex-col items-center justify-center p-3 text-center border dark:border-slate-850 relative overflow-hidden">
                        <ShoppingBag className="h-10 w-10 text-indigo-405/20 font-light" />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 mt-2 block break-all font-black">{p.sku}</span>
                        
                        {/* Status absolute indicator */}
                        <span className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 bg-indigo-600/10 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 text-[9px] rounded-full font-black">
                          {stockLeft} {p.unit || 'pcs'} left
                        </span>
                      </div>

                      <span className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-wider">{p.category}</span>
                      <strong className="text-slate-850 dark:text-white font-bold text-xs leading-tight hover:text-indigo-600">{p.name}</strong>
                      <p className="text-[10px] text-slate-405 line-clamp-1 mt-1 font-medium">{p.description || 'Enterprise industrial specifications'}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
                      <span className="font-mono font-black text-indigo-750 dark:text-indigo-450 text-xs">TZS {p.sellingPrice.toLocaleString()}</span>
                      <button
                        onClick={() => addToCart(p)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black p-2 py-1.5 rounded-lg flex items-center gap-1 leading-none shadow-sm text-[10.5px] cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>{language === 'SW' ? 'Weka' : 'Add Bag'}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* Slideout Cart Drawer Overlay */}
      {showCartDrawer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end animate-fade-in text-xs select-none">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-3 dark:border-slate-850">
                <span className="font-extrabold text-sm uppercase text-slate-800 dark:text-white flex items-center gap-1.5 font-serif">
                  <ShoppingCart className="h-5 w-5 text-indigo-600" />
                  <span>{language === 'SW' ? 'Kikapu Chako cha Oda' : 'Customer Shopping Bag'}</span>
                </span>
                <button onClick={() => setShowCartDrawer(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  {language === 'SW' ? 'Oda yako haina bidhaa yoyote kwa sasa.' : 'Add products to see prices, taxes and check out.'}
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Cart Items list */}
                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.product.id} className="p-3 bg-slate-50 dark:bg-slate-900/55 rounded-xl border dark:border-slate-800 flex justify-between items-center">
                        <div className="flex-1 pr-3">
                          <strong className="text-slate-900 dark:text-white block font-bold leading-tight line-clamp-1">{item.product.name}</strong>
                          <span className="font-mono text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 block">TZS {item.product.sellingPrice.toLocaleString()} × {item.qty}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateCartQty(item.product.id, -1)} className="p-1.5 border rounded-lg bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"><Minus className="h-3 w-3" /></button>
                          <span className="font-extrabold font-mono text-[11px]">{item.qty}</span>
                          <button onClick={() => updateCartQty(item.product.id, 1)} className="p-1.5 border rounded-lg bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"><Plus className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculations invoice */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-2 border dark:border-slate-800">
                    <div className="flex justify-between"><span>Bag Subtotal:</span> <span className="font-mono font-bold">TZS {cartSubtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-slate-450 select-none"><span>Value Added Tax (18% inclusive):</span> <span className="font-mono">TZS {Math.round(cartSubtotal - (cartSubtotal / 1.18)).toLocaleString()}</span></div>
                    <div className="flex justify-between border-t dark:border-slate-800 border-slate-350 font-black text-slate-950 dark:text-white text-sm pt-2.5">
                      <span>Total Invoice:</span>
                      <span className="font-mono text-indigo-750 dark:text-indigo-400">TZS {cartSubtotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Delivery Info form */}
                  <form onSubmit={handleOnlineCheckout} className="space-y-3.5 border-t dark:border-slate-850 pt-4">
                    <span className="font-extrabold text-[10px] text-indigo-600 uppercase tracking-widest block">
                      {language === 'SW' ? 'MAHALI NA MAWASILIANO YA DELIVERY' : 'Checkout Delivery Coordinates'}
                    </span>
                    <div>
                      <label className="font-bold text-slate-400 block mb-1">Full Name (Jina Kamili) *</label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border pl-8 p-2 rounded-lg font-bold"
                          placeholder="e.g. Salim Swedi"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-400 block mb-1">WhatsApp Delivery PhoneNo *</label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border pl-8 p-2 rounded-lg font-mono font-bold"
                          placeholder="e.g. 255712345678"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-400 block mb-1">Destination Address *</label>
                      <div className="relative">
                        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={clientAddr}
                          onChange={(e) => setClientAddr(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border pl-8 p-2 rounded-lg"
                          placeholder="Cargo Road, Dar es Salaam"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-605 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10 leading-none cursor-pointer uppercase text-[10.5px] tracking-wide"
                    >
                      <PackageCheck className="h-4.5 w-4.5" />
                      <span>{language === 'SW' ? 'Thibitisha malipo na Lipa duka' : 'Authorize Secure checkout'}</span>
                    </button>
                  </form>

                </div>
              )}

            </div>

            <div className="text-center text-[9px] text-slate-400 mt-6 pt-4 border-t border-dashed dark:border-slate-800 uppercase tracking-widest">
              Secure Online store checkout - ERP stock synced
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
