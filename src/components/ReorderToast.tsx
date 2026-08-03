/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, ArrowRight, Package, RefreshCw } from 'lucide-react';
import { Product, LanguageCode } from '../types';

interface ReorderToastProps {
  show: boolean;
  onClose: () => void;
  lowStockProducts: Product[];
  currentBranch: string;
  language: LanguageCode;
  onNavigateToInventory: () => void;
}

export default function ReorderToast({
  show,
  onClose,
  lowStockProducts,
  currentBranch,
  language,
  onNavigateToInventory
}: ReorderToastProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [animationClass, setAnimationClass] = useState('translate-y-10 opacity-0');

  useEffect(() => {
    if (show && lowStockProducts.length > 0) {
      setShouldRender(true);
      // Let layout paint first before sliding in
      const renderTimeout = setTimeout(() => {
        setAnimationClass('translate-y-0 opacity-100 scale-100');
      }, 50);

      // Auto-dismiss after 8 seconds of inactivity
      const dismissTimeout = setTimeout(() => {
        handleDismiss();
      }, 8000);

      return () => {
        clearTimeout(renderTimeout);
        clearTimeout(dismissTimeout);
      };
    } else {
      setAnimationClass('translate-y-10 opacity-0 scale-95');
      const hideTimeout = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(hideTimeout);
    }
  }, [show, lowStockProducts]);

  const handleDismiss = () => {
    setAnimationClass('translate-y-10 opacity-0 scale-95');
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!shouldRender || lowStockProducts.length === 0) return null;

  const count = lowStockProducts.length;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full px-4 sm:px-0">
      <div 
        className={`bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 transition-all duration-300 transform ${animationClass}`}
        style={{ contentVisibility: 'auto' }}
      >
        {/* Header section with AlertTriangle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2.5 items-center">
            <div className="p-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-405 rounded-xl shrink-0 animate-pulse">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <strong className="text-[11.5px] text-slate-900 dark:text-white uppercase tracking-wider block font-black">
                {language === 'SW' ? 'Taarifa Urari wa Bidhaa' : 'Low Stock Inventory Alert'}
              </strong>
              <span className="text-[10px] text-slate-405 font-semibold block mt-0.5 leading-none">
                {language === 'SW' 
                  ? `Bidhaa ${count} ziko chini ya kiwango` 
                  : `${count} ${count === 1 ? 'item is' : 'items are'} below reorder levels`}
              </span>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-full transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
            title={language === 'SW' ? 'Funga' : 'Dismiss'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List of sub-items (capped at 3) */}
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden border dark:border-slate-800/40">
          {lowStockProducts.slice(0, 3).map((prod) => {
            const qty = prod.branchStock[currentBranch] ?? 0;
            return (
              <div key={prod.id} className="p-2.5 flex justify-between items-center text-[10.5px]">
                <div className="flex flex-col gap-0.5 truncate max-w-[190px]">
                  <strong className="text-slate-800 dark:text-slate-250 truncate block font-bold leading-snug">
                    {prod.name}
                  </strong>
                  <span className="text-[9px] text-slate-400 font-mono scale-95 origin-left">
                    SKU: {prod.sku}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-red-600 dark:text-red-400 font-black font-mono block">
                    {qty} Left
                  </span>
                  <span className="text-[8.5px] text-slate-450 block font-mono">
                    Limit: {prod.reorderLevel}
                  </span>
                </div>
              </div>
            );
          })}

          {count > 3 && (
            <div className="p-2 bg-slate-100/50 dark:bg-slate-900/80 text-center text-[9px] uppercase tracking-wider font-extrabold text-slate-450">
              {language === 'SW' ? `na nyingine ${count - 3} zaidi...` : `and ${count - 3} more items...`}
            </div>
          )}
        </div>

        {/* Call to action panel */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900/80 pt-2.5 text-[10.5px]">
          <span className="text-slate-450 text-[9.5px]">
            {language === 'SW' ? 'Fungua kupanga restocks' : 'Trigger restocks spools'}
          </span>
          <button
            type="button"
            onClick={() => {
              handleDismiss();
              onNavigateToInventory();
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-md active:scale-95 border border-indigo-700/25"
          >
            <span>{language === 'SW' ? 'Kagua Stoki' : 'Refill Catalog'}</span>
            <ArrowRight className="h-3 w-3 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
