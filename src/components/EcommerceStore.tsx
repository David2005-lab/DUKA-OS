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
  Info
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
  
  // Cart
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  // Delivery configuration
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddr, setClientAddr] = useState('');

  useEffect(() => {
    setProducts(db.getProducts().filter((p) => (p.branchStock[currentBranch] ?? 0) > 0)); // Only display available positive stock
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
    const existing = cart.find((item) => item.product.id === product.id);
    const branchStockQty = product.branchStock[currentBranch] ?? 0;

    if (existing) {
      if (existing.qty + 1 > branchStockQty) {
        alert(language === 'SW' ? 'Stoki iliyobaki haitoshi!' : 'Not enough warehouse stock available for ecommerce allocation!');
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
        alert(language === 'SW' ? 'Kiwango cha juu cha stoki kimefikiwa!' : 'Requested quantity exceeds available branch reserves!');
        return;
      }
      setCart(cart.map((item) => item.product.id === pId ? { ...item, qty: newQty } : item));
    }
  };

  const handleOnlineCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !clientName || !clientPhone) {
      alert('Please fill out Client contacts and shopping bag first!');
      return;
    }

    // Process ecommerce transaction triggers
    const invoiceNum = `ECOMM-${Date.now().toString().substring(5)}`;
    const subTotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.qty), 0);
    const taxTotal = Math.round(subTotal * 0.18);
    const gTotal = subTotal + taxTotal;

    // Trigger local db decrements directly
    db.completeOnlineOrder({
      id: `online-${Date.now()}`,
      orderId: invoiceNum,
      customerName: clientName,
      customerPhone: clientPhone,
      deliveryAddress: clientAddr,
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
    setShowCartDrawer(false);
    
    // Reload storefront available stock
    setProducts(db.getProducts().filter((p) => (p.branchStock[currentBranch] ?? 0) > 0));
    
    alert(language === 'SW' ? 'Malipo Mtandaoni Yamekamilika! Stoki imepunguzwa salama.' : 'B2B Electronic payment checkout confirmed! Stocks depleted and order placed.');
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.qty), 0);

  return (
    <div className="space-y-6 text-xs relative">
      
      {/* Visual B2B ecommerce header banner */}
      <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="h-5 w-5 text-indigo-600 animate-pulse" />
            <h2 className="text-sm font-extrabold uppercase text-slate-900 dark:text-white leading-none">Smart Business Pro Store</h2>
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1 font-medium">Customer-facing B2B checkout catalog. Subtracts stocks from corresponding warehouses automatically.</p>
        </div>

        {/* Floating Cart Button indicator with animation */}
        <button
          onClick={() => setShowCartDrawer(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-lg leading-none transition-transform active:scale-95"
          id="digital-shop-cart-header"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Shopping bag ({cartCount})</span>
        </button>
      </div>

      {/* Grid of contents & filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        
        {/* Left Side menu filters */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-950 p-4 border rounded-xl space-y-3 shadow-sm">
            <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block border-b pb-1">Shop Categories</span>
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-left p-2 rounded-lg font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/25'
                      : 'hover:bg-slate-50/50 text-slate-650'
                  }`}
                >
                  {cat === 'All' ? 'View All stocks' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-amber-900 leading-tight">These listed prices dynamically mirror your core hardware, grocery, or fashion inventory catalogs automatically.</p>
          </div>
        </div>

        {/* Right side catalog products feed */}
        <div className="md:col-span-3 space-y-4">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search store by Name, Material, SKU, Barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-slate-950 border w-full rounded-xl pl-9 p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-semibold"
            />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center border bg-white dark:bg-slate-950 rounded-xl text-slate-450">
              {t.noData}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((p) => {
                const stockLeft = p.branchStock[currentBranch] ?? 0;
                return (
                  <div key={p.id} className="bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:shadow-md transition-all">
                    
                    <div>
                      {/* Fake placeholder graphic styled like a minimalist hardware box */}
                      <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg aspect-square mb-3 flex flex-col items-center justify-center p-3 text-center border relative overflow-hidden">
                        <ShoppingBag className="h-10 w-10 text-indigo-400/30 font-light" />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 mt-2 block break-all">{p.sku}</span>
                        
                        {/* Status absolute indicator */}
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-indigo-600/15 text-indigo-650 text-[9.5px] rounded-full font-black">
                          {stockLeft} {p.unit || 'pcs'} left
                        </span>
                      </div>

                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">{p.category}</span>
                      <strong className="text-slate-850 dark:text-white font-bold text-xs leading-none hover:text-indigo-600">{p.name}</strong>
                      <p className="text-[10px] text-slate-450 line-clamp-1 mt-1">{p.description || 'Enterprise industrial specifications'}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                      <span className="font-mono font-black text-indigo-750 dark:text-indigo-400 text-xs">TZS {p.sellingPrice.toLocaleString()}</span>
                      <button
                        onClick={() => addToCart(p)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black p-2 py-1.5 rounded-lg flex items-center gap-1 leading-none shadow-sm text-[11px]"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Bag</span>
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
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end animate-fade-in text-xs">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <span className="font-extrabold text-sm uppercase text-slate-800 dark:text-white flex items-center gap-1.5">
                  <ShoppingCart className="h-5 w-5 text-indigo-600" />
                  Your Shopping Bag
                </span>
                <button onClick={() => setShowCartDrawer(false)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="text-center text-slate-400 py-10">Add products to see prices, taxes and check out.</p>
              ) : (
                <div className="space-y-4">
                  
                  {/* Cart Items list */}
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.product.id} className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center">
                        <div className="flex-1 pr-3">
                          <strong className="text-slate-900 block font-bold leading-tight">{item.product.name}</strong>
                          <span className="font-mono text-[10px] text-slate-500">TZS {item.product.sellingPrice.toLocaleString()} × {item.qty}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateCartQty(item.product.id, -1)} className="p-1 border rounded bg-white"><Minus className="h-3 w-3" /></button>
                          <span className="font-extrabold font-mono">{item.qty}</span>
                          <button onClick={() => updateCartQty(item.product.id, 1)} className="p-1 border rounded bg-white"><Plus className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculations invoice */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 border">
                    <div className="flex justify-between"><span>Bag Subtotal:</span> <span className="font-mono">TZS {cartSubtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-slate-450"><span>Value Added Tax (18% on gross):</span> <span className="font-mono">TZS {(cartSubtotal * 0.18).toLocaleString()}</span></div>
                    <div className="flex justify-between border-t border-slate-300 font-black text-slate-950 text-sm pt-2">
                      <span>Total Invoice:</span>
                      <span className="font-mono text-indigo-750">TZS {(cartSubtotal + cartSubtotal * 0.18).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Delivery Info form */}
                  <form onSubmit={handleOnlineCheckout} className="space-y-3.5 border-t pt-4">
                    <span className="font-extrabold text-[10px] text-indigo-600 uppercase tracking-widest block">Checkout Delivery Coordinates</span>
                    <div>
                      <label className="font-bold text-slate-600">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full bg-slate-50 border p-2 mt-1 rounded-lg"
                        placeholder="e.g. Salim Swedi"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600">Delivery Phone Whatsapp *</label>
                      <input
                        type="text"
                        required
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full bg-slate-50 border p-2 mt-1 rounded-lg font-semibold"
                        placeholder="e.g. +255 712 000 000"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600">Physical Address Destination</label>
                      <input
                        type="text"
                        value={clientAddr}
                        onChange={(e) => setClientAddr(e.target.value)}
                        className="w-full bg-slate-50 border p-2 mt-1 rounded-lg"
                        placeholder="Cargo Road, Dar es Salaam"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10 leading-none"
                    >
                      <span>Authorize Secure checkout</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>

                </div>
              )}

            </div>

            <div className="text-center text-[9px] text-slate-400 mt-6 pt-4 border-t uppercase tracking-wider">
              Secure Online store checkout - ERP stock synced
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
