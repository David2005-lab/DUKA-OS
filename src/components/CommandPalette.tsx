/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  HelpCircle, 
  Sparkles, 
  LayoutDashboard, 
  ShoppingCart, 
  FileSpreadsheet, 
  Package, 
  Users, 
  Contact, 
  TrendingUp, 
  Cpu, 
  Settings, 
  Database,
  Globe,
  Palette,
  Maximize2
} from 'lucide-react';
import { LanguageCode, ThemeMode, UserRole } from '../types';
import { db } from '../db';

interface CommandPaletteProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  currentUser: { email: string; role: UserRole };
}

export default function CommandPalette({
  isOpen,
  setIsOpen,
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  theme,
  setTheme,
  sidebarCollapsed,
  setSidebarCollapsed,
  currentUser
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const items = [
    {
      id: 'dashboard',
      category: language === 'EN' ? 'Navigation' : 'Nenda',
      title: language === 'EN' ? 'Go to Dashboard' : 'Nenda Kwenye Mwanzo',
      desc: language === 'EN' ? 'View real-time business statistics' : 'Angalia takwimu za biashara',
      icon: LayoutDashboard,
      shortcut: 'Alt + 1',
      action: () => setActiveTab('dashboard')
    },
    {
      id: 'pos',
      category: language === 'EN' ? 'Navigation' : 'Nenda',
      title: language === 'EN' ? 'Go to POS Terminal (Sales)' : 'Nenda Sehemu ya Uuzaji (POS)',
      desc: language === 'EN' ? 'Create new retail or wholesale receipts' : 'Tengeneza risiti za mauzo',
      icon: ShoppingCart,
      shortcut: 'Alt + 2',
      action: () => setActiveTab('pos')
    },
    {
      id: 'invoices',
      category: language === 'EN' ? 'Navigation' : 'Nenda',
      title: language === 'EN' ? 'Go to Invoices & QR Center' : 'Nenda Kwenye Ankara za Mauzo (Invoices)',
      desc: language === 'EN' ? 'Review invoices and print compliance receipts' : 'Ukaguzi wa ankara na risiti za serikali',
      icon: FileSpreadsheet,
      shortcut: 'Alt + 3',
      action: () => setActiveTab('invoices')
    },
    {
      id: 'inventory',
      category: language === 'EN' ? 'Navigation' : 'Nenda',
      title: language === 'EN' ? 'Go to Stock & Warehouse' : 'Nenda Sehemu ya Ghala (Inventory)',
      desc: language === 'EN' ? 'Manage product list, categories & store logs' : 'Dhibiti orodha ya bidhaa na stoki waliopo',
      icon: Package,
      shortcut: 'Alt + 4',
      action: () => setActiveTab('inventory')
    },
    {
      id: 'crm',
      category: language === 'EN' ? 'Navigation' : 'Nenda',
      title: language === 'EN' ? 'Go to CRM Leads (Customers)' : 'Nenda Sehemu ya CRM (Wateja)',
      desc: language === 'EN' ? 'Track customer accounts, outstanding debts & loyalty points' : 'Fuatilia madeni ya wateja na alama zao',
      icon: Users,
      shortcut: 'Alt + 5',
      action: () => setActiveTab('crm')
    },
    {
      id: 'suppliers',
      category: language === 'EN' ? 'Navigation' : 'Nenda',
      title: language === 'EN' ? 'Go to Suppliers Desk' : 'Nenda Sehemu ya Wauzaji (Suppliers)',
      desc: language === 'EN' ? 'Manage distributor logs, ledgers and purchase invoices' : 'Dhibiti hesabu za wasambazaji mali',
      icon: Contact,
      shortcut: 'Alt + 6',
      action: () => setActiveTab('suppliers')
    },
    {
      id: 'accounting',
      category: language === 'EN' ? 'Navigation' : 'Nenda',
      title: language === 'EN' ? 'Go to Accounting Hub' : 'Nenda Sehemu ya Uhasibu (Accounting)',
      desc: language === 'EN' ? 'View trial balances, ledger, and cash-flow sheets' : 'Angalia hesabu na taarifa za kibenki',
      icon: TrendingUp,
      shortcut: 'Alt + 7',
      action: () => setActiveTab('accounting')
    },
    {
      id: 'aiAssistant',
      category: language === 'EN' ? 'Navigation' : 'Nenda',
      title: language === 'EN' ? 'Go to Artificial Intelligence Desk' : 'Nenda Sehemu ya AI Msaidizi',
      desc: language === 'EN' ? 'Automated business intelligence advice from Gemini AI' : 'Mshauri wako msaidizi kwa mienendo ya faida',
      icon: Cpu,
      shortcut: 'Alt + 8',
      action: () => setActiveTab('aiAssistant')
    },
    {
      id: 'settings',
      category: language === 'EN' ? 'Navigation' : 'Nenda',
      title: language === 'EN' ? 'Go to Cores & Security logs' : 'Nenda Sehemu ya Settings (Marekebisho)',
      desc: language === 'EN' ? 'Configure TIN, VAT rates, seal styles & review system audit' : 'Marekebisho ya stempu, nembo na usalama',
      icon: Settings,
      shortcut: 'Alt + 9',
      action: () => setActiveTab('settings')
    },
    {
      id: 'backup',
      category: language === 'EN' ? 'Navigation' : 'Nenda',
      title: language === 'EN' ? 'Go to Database Backup & Reports' : 'Nenda Sehemu ya Hifadhi Backup',
      desc: language === 'EN' ? 'Export CSVs, configure automatic system snapshots' : 'Pakua faili za taarifa za mfumo',
      icon: Database,
      shortcut: 'Alt + 0',
      action: () => setActiveTab('backup')
    },
    {
      id: 'toggle-lang',
      category: language === 'EN' ? 'System Actions' : 'Kazi za Mfumo',
      title: language === 'EN' ? 'Toggle Translation (EN ⇆ SW)' : 'Badili Lugha ya Mfumo (English ⇆ Kiswahili)',
      desc: language === 'EN' ? 'Switch instant system workspace language immediately' : 'Pindua lugha ya kazi sasa hivi',
      icon: Globe,
      shortcut: 'Alt + L',
      action: () => {
        const next = language === 'EN' ? 'SW' : 'EN';
        db.setLanguage(next);
        setLanguage(next);
      }
    },
    {
      id: 'toggle-theme',
      category: language === 'EN' ? 'System Actions' : 'Kazi za Mfumo',
      title: language === 'EN' ? 'Cycle Aesthetic Theme Preset' : 'Mzunguko wa Mandhari ya Mfumo',
      desc: language === 'EN' ? 'Toggle active decorative theme layer' : 'Dhibiti rangi zitakazokuwa kwenye kioo chako',
      icon: Palette,
      shortcut: 'Alt + T',
      action: () => {
        const themes: ThemeMode[] = ['light', 'dark', 'glass-future', 'luxury-gold', 'neon-cyan', 'high-density'];
        const currentIdx = themes.indexOf(theme);
        const nextTheme = themes[(currentIdx + 1) % themes.length];
        db.setThemeMode(nextTheme);
        setTheme(nextTheme);
      }
    },
    {
      id: 'toggle-sidebar',
      category: language === 'EN' ? 'System Actions' : 'Kazi za Mfumo',
      title: language === 'EN' ? 'Toggle Sidebar Collapse' : 'Kunja au Kunjua Upande wa Pembeni',
      desc: language === 'EN' ? 'Expand/minimize vertical desktop menu area' : 'Punguza au enua upana wa zana za kushoto',
      icon: Maximize2,
      shortcut: 'Alt + S',
      action: () => {
        setSidebarCollapsed(!sidebarCollapsed);
      }
    }
  ];

  // Filter items matching the query text search
  const filtered = items.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.desc.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Close command palette
  const close = () => {
    setIsOpen(false);
  };

  // Keyboard navigation logic within command list
  useEffect(() => {
    if (!isOpen) return;

    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          close();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isOpen, filtered, selectedIndex]);

  // Adjust scroll position to keep active index in view
  useEffect(() => {
    if (scrollRef.current) {
      const parent = scrollRef.current;
      const activeElement = parent.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (activeElement) {
        const parentRect = parent.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();
        if (activeRect.bottom > parentRect.bottom) {
          parent.scrollTop += (activeRect.bottom - parentRect.bottom);
        } else if (activeRect.top < parentRect.top) {
          parent.scrollTop -= (parentRect.top - activeRect.top);
        }
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/70 z-[10000] flex items-start justify-center pt-24 px-4 backdrop-blur-xs select-none"
      onClick={close}
      id="command-palette-modal"
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col transform transition-all duration-150 scale-100 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Search Input Bar */}
        <div className="relative border-b border-slate-200/60 dark:border-slate-800 p-4">
          <Search className="absolute left-4.5 top-5 h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-10 pr-12 py-1.5 text-xs font-semibold focus:outline-none placeholder-slate-400 text-slate-900 dark:text-white bg-transparent"
            placeholder={language === 'EN' ? "Search for commands, workspaces, settings..." : "Tafuta huduma, zana, au amri..."}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="absolute right-4 top-4.5 px-2 py-0.5 mt-0.5 text-[8.5px] font-mono font-black border rounded bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 select-none">
            ESC
          </kbd>
        </div>

        {/* Categories / Shortcut Hints row inside search panel wrapper */}
        <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-950/30 text-[9px] text-slate-400 font-bold tracking-tight uppercase border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
            <span>{language === 'EN' ? 'Enterprise Keyboard Console' : 'Paneli ya Amri za Keyboard'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-0.5"><span className="border px-1 py-0.2 rounded bg-white dark:bg-slate-800 text-[8px] font-bold">↑↓</span> {language === 'EN' ? 'Navigate' : 'Chagua'}</span>
            <span className="flex items-center gap-0.5"><span className="border px-1 py-0.2 rounded bg-white dark:bg-slate-800 text-[8px] font-bold">ENTER</span> {language === 'EN' ? 'Confirm' : 'Chagua'}</span>
          </div>
        </div>

        {/* Filtered Action Command List */}
        <div 
          ref={scrollRef}
          className="max-h-[300px] overflow-y-auto p-2 space-y-0.5 custom-scrollbar"
        >
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <HelpCircle className="h-6 w-6 text-slate-355" />
              <span>{language === 'EN' ? 'No matching workspaces or actions found' : 'Hakuna huduma inayolingana na neno lako'}</span>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              const isItemActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  data-index={idx}
                  onClick={() => {
                    item.action();
                    close();
                  }}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all duration-75 outline-none select-none ${
                    isSelected 
                      ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isSelected 
                        ? 'bg-white/11 text-white' 
                        : isItemActive
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-left min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold leading-tight truncate ${isSelected ? 'text-white' : 'text-slate-905 dark:text-slate-100'}`}>
                          {item.title}
                        </span>
                        {isItemActive && (
                          <span className={`text-[8px] font-bold px-1 rounded uppercase tracking-wider ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                            {language === 'EN' ? 'Active' : 'Hapo hapo'}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] block mt-0.5 leading-tight truncate ${isSelected ? 'text-white/80' : 'text-slate-450 dark:text-slate-400'}`}>
                        {item.desc}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9.5px] font-mono font-bold tracking-tight uppercase border rounded px-1.5 py-0.5 ${
                      isSelected 
                        ? 'bg-white/20 text-white border-white/25' 
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-450 border-slate-200 dark:border-slate-700'
                    }`}>
                      {item.shortcut}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Bottom Status bar / License check details */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[9px] text-slate-400 font-mono flex items-center justify-between">
          <span>DUKA OS v4.2 ENTERPRISE CORES</span>
          <span>{language === 'EN' ? 'ROLE APPROVED:' : 'IDHINI:'} <strong className="text-blue-500 dark:text-blue-400">{currentUser.role.toUpperCase()}</strong></span>
        </div>
      </div>
    </div>
  );
}
