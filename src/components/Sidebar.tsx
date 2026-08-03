/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  FileSpreadsheet, 
  FileText,
  Users, 
  Contact, 
  TrendingUp, 
  Cpu, 
  ShieldAlert, 
  Globe, 
  Palette, 
  Bell, 
  Settings, 
  UserSquare2, 
  Menu, 
  X,
  Lock,
  ChevronDown,
  LayoutGrid,
  Search,
  ArrowRight,
  UserCheck,
  Tag,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { LanguageCode, ThemeMode, UserRole, Branch, Notification } from '../types';
import { db } from '../db';
import { translations } from '../translations';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  currentBranch: string;
  setCurrentBranch: (branch: string) => void;
  currentUser: { email: string; role: UserRole };
  setCurrentUser: (usr: { email: string; role: UserRole }) => void;
  branches: Branch[];
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  theme,
  setTheme,
  currentBranch,
  setCurrentBranch,
  currentUser,
  setCurrentUser,
  branches,
  isCollapsed,
  setIsCollapsed
}: SidebarProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [menuAndBrandsVisible, setMenuAndBrandsVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Layout states for smooth tucked-on-tablet and collapsible hover-expanded layouts
  const [isHovered, setIsHovered] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // 1024px is standard Tailwind 'lg' breakpoint. Width is tucked below 1024px.
      setIsTablet(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectivelyCollapsed = isCollapsed || isTablet;
  const showText = !effectivelyCollapsed || isHovered;

  // Cashier and shift state persistence
  const [activeOperator, setActiveOperator] = useState(() => localStorage.getItem('SmartERP_ActiveOperator') || '');
  const [activeShift, setActiveShift] = useState(() => localStorage.getItem('SmartERP_ActiveShift') || 'Shift ya Asubuhi');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [customOperatorInput, setCustomOperatorInput] = useState('');
  const [customShiftSelect, setCustomShiftSelect] = useState('Shift ya Asubuhi');
  const [cashierRoster, setCashierRoster] = useState<{name: string, shift: string}[]>(() => {
    const saved = localStorage.getItem('SmartERP_CashierRoster');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return []; // Empty by default per user request to reject fake preloads
  });

  useEffect(() => {
    // No mock default setters
  }, []);

  const handleConfirmShift = (name: string, shift: string) => {
    localStorage.setItem('SmartERP_ActiveOperator', name);
    localStorage.setItem('SmartERP_ActiveShift', shift);
    setActiveOperator(name);
    setActiveShift(shift);
    db.logAudit('LOGIN', 'UserSession', `Supermarket Shift active sign-on updated to ${name} for ${shift}`, currentUser.email);
    setShowShiftModal(false);
    
    // Dispatch instant notification event for active POS or invoicing receipts on screen
    window.dispatchEvent(new Event('storage'));
  };

  const t = translations[language];

  useEffect(() => {
    // Poll notifications every 15 seconds as a fallback, and listen to instant db-update events
    const loadNotif = () => {
      setNotifications(db.getNotifications());
    };
    loadNotif();
    
    window.addEventListener('db-update', loadNotif);
    const interval = setInterval(loadNotif, 15000);
    
    return () => {
      window.removeEventListener('db-update', loadNotif);
      clearInterval(interval);
    };
  }, []);

  // Close menus & search on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMegaMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Safe global search query execution
  const queryAll = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return { products: [], customers: [], invoices: [] };

    const matchedProducts = db.getProducts().filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    ).slice(0, 4);

    const matchedCustomers = db.getCustomers().filter(c => 
      c.fullName.toLowerCase().includes(q) || 
      c.phone.includes(q) || 
      (c.companyName && c.companyName.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 4);

    const matchedInvoices = db.getInvoices().filter(i => 
      i.invoiceNumber.toLowerCase().includes(q) || 
      i.customerDetails.fullName.toLowerCase().includes(q) ||
      (i.customerDetails.companyName && i.customerDetails.companyName.toLowerCase().includes(q)) ||
      i.status.toLowerCase().includes(q)
    ).slice(0, 4);

    return { 
      products: matchedProducts, 
      customers: matchedCustomers, 
      is: matchedInvoices 
    };
  };

  const searchResults = queryAll();
  const hasSearchResults = searchQuery.trim().length > 0 && 
    (searchResults.products.length > 0 || searchResults.customers.length > 0 || searchResults.is.length > 0);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roles: UserRole[] = [
    'Super Admin',
    'Owner',
    'Manager',
    'Accountant',
    'Cashier',
    'Salesperson',
    'Storekeeper'
  ];

  const handleRoleChange = (role: UserRole) => {
    const email = role.toLowerCase().replace(' ', '') + '@enterprise-erp.com';
    db.setCurrentUser(email, role);
    setCurrentUser({ email, role });
    db.logAudit('LOGIN', 'UserSession', `Switched security persona role to ${role}`, email);
  };

  const profile = db.getProfile();

  const handleMarkRead = () => {
    db.markNotificationsAsRead();
    setNotifications(db.getNotifications());
    setShowNotifications(false);
  };

  const handleSelectProductPOS = (product: any) => {
    localStorage.setItem('SmartERP_AddProductToPOSId', product.id);
    setActiveTab('pos');
    setSearchQuery('');
    setSearchFocused(false);
  };

  const handleSelectProductInventory = (product: any) => {
    localStorage.setItem('SmartERP_Inventory_SkuFilter', product.sku);
    setActiveTab('inventory');
    setSearchQuery('');
    setSearchFocused(false);
  };

  const handleSelectCustomer = (customer: any) => {
    localStorage.setItem('SmartERP_CRM_SelectedCustomerId', customer.id);
    setActiveTab('crm');
    setSearchQuery('');
    setSearchFocused(false);
  };

  const handleSelectInvoice = (invoice: any) => {
    localStorage.setItem('SmartERP_SelectedInvoiceId', invoice.id);
    setActiveTab('invoices');
    setSearchQuery('');
    setSearchFocused(false);
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-slate-950 border-slate-800 text-slate-100';
      case 'luxury-gold':
        return 'bg-stone-950 border-amber-950 text-stone-100';
      case 'neon-cyan':
        return 'bg-zinc-950 border-cyan-950 text-zinc-100';
      case 'high-density':
        return 'bg-slate-900 border-slate-800 text-slate-100';
      case 'glass-future':
        return 'bg-slate-900/70 border-slate-700/40 text-slate-100 backdrop-blur-xl saturate-150 shadow-lg';
      default:
        return 'bg-white border-slate-200 text-slate-900';
    }
  };

  const getMegaMenuTheme = () => {
    switch (theme) {
      case 'dark':
        return 'bg-slate-900 border-slate-800 text-slate-150';
      case 'luxury-gold':
        return 'bg-stone-950 border-amber-950/50 text-stone-200';
      case 'neon-cyan':
        return 'bg-zinc-950 border-cyan-100/10 text-zinc-200';
      case 'high-density':
        return 'bg-slate-950 border-slate-800 text-slate-300';
      case 'glass-future':
        return 'bg-slate-950/90 border-slate-700/50 text-slate-100 backdrop-blur-2xl shadow-xl shadow-black/60';
      default:
        return 'bg-white border-slate-200 text-slate-800 shadow-2xl';
    }
  };

  const groups = [
    {
      title: language === 'EN' ? 'RETAIL & COMMERCE' : 'MAUZO & MFUMO POS',
      subtitle: language === 'EN' ? 'Customer checkout, invoicing & digital shop' : 'Katiba ya mauzo, ankara na duka la mtandao',
      color: 'text-blue-500',
      items: [
        { id: 'dashboard', label: t.dashboard, desc: language === 'EN' ? 'Business status & performance charts' : 'Profaili na grafu za biashara leo', icon: LayoutDashboard, roles: ['Super Admin', 'Owner', 'Manager', 'Accountant', 'Cashier', 'Salesperson', 'Storekeeper'] },
        { id: 'pos', label: t.pos, desc: language === 'EN' ? 'High-speed cashier checkout terminal' : 'Chombo cha mauzo ya reja reja haraka', icon: ShoppingCart, roles: ['Super Admin', 'Owner', 'Manager', 'Cashier', 'Salesperson'] },
        { id: 'prices', label: language === 'EN' ? 'Price Menu' : 'Orodha ya Bei 🏷️', desc: language === 'EN' ? 'Broadcast wholesale & retail price list' : 'Katalugu ya bei za Jumla na Reja Reja', icon: Tag, roles: ['Super Admin', 'Owner', 'Manager', 'Accountant', 'Cashier', 'Salesperson'] },
        { id: 'invoices', label: t.invoices, desc: language === 'EN' ? 'TIN/VAT compliant custom invoices' : 'Mhariri wa ankara na kodi za Serikali', icon: FileSpreadsheet, roles: ['Super Admin', 'Owner', 'Manager', 'Accountant', 'Cashier', 'Salesperson'] },
        { id: 'documents', label: language === 'EN' ? 'Document Center' : 'Maktaba ya Nyaraka 📁', desc: language === 'EN' ? 'Access invoice, receipt & quotation PDFs' : 'Kikasha cha risiti, ankara na makadirio katika PDF/Excel', icon: FileText, roles: ['Super Admin', 'Owner', 'Manager', 'Accountant', 'Cashier', 'Salesperson'] },
        { id: 'ecommerce', label: t.ecommerce, desc: language === 'EN' ? 'Live public catalog and web orders' : 'Duka la mtandaoni lililounganishwa na stoki', icon: Globe, roles: ['Super Admin', 'Owner', 'Manager', 'Accountant', 'Cashier', 'Salesperson', 'Storekeeper'] },
      ]
    },
    {
      title: language === 'EN' ? 'LOGISTICS & RELATIONS' : 'STOKI, GHARA & MAHUSIANO',
      subtitle: language === 'EN' ? 'Inventory control, suppliers and CRM leads' : 'Usimamizi wa ghala, watumishi na wateja wako',
      color: 'text-emerald-500',
      items: [
        { id: 'inventory', label: t.inventory, desc: language === 'EN' ? 'Stock balancing & branch transfers' : 'Usimamizi wa stoki na uhamisho tawi', icon: Package, roles: ['Super Admin', 'Owner', 'Manager', 'Storekeeper', 'Accountant'] },
        { id: 'crm', label: t.crm, desc: language === 'EN' ? 'Manage customer debt & sales record' : 'Fuatilia madeni ya wateja na masoko', icon: Users, roles: ['Super Admin', 'Owner', 'Manager', 'Accountant', 'Cashier', 'Salesperson'] },
        { id: 'suppliers', label: t.suppliers, desc: language === 'EN' ? 'Supplier ledgers & staff attendance' : 'Hesabu za wauzaji na mahudhurio ya kazi', icon: Contact, roles: ['Super Admin', 'Owner', 'Manager', 'Accountant', 'Storekeeper'] },
      ]
    },
    {
      title: language === 'EN' ? 'FINANCE & SYSTEM CORES' : 'UHASIBU, AI NA UKAGUZI',
      subtitle: language === 'EN' ? 'Financial sheets, AI analyst advice and settings' : 'Laha za hesabu, akili ya AI na ukaguzi mfumo',
      color: 'text-indigo-500',
      items: [
        { id: 'accounting', label: t.accounting, desc: language === 'EN' ? 'Trial balances, Cash-flow & ledger' : 'Taarifa za hesabu na mtiririko wa fedha', icon: TrendingUp, roles: ['Super Admin', 'Owner', 'Manager', 'Accountant'] },
        { id: 'aiAssistant', label: t.aiAssistant, desc: language === 'EN' ? 'Virtual executive business intelligence' : 'Mshauri wa AI wa mienendo ya faida', icon: Cpu, roles: ['Super Admin', 'Owner', 'Manager', 'Accountant'] },
        { id: 'settings', label: t.settings, desc: language === 'EN' ? 'TIN settings, signatures, logs & seal' : 'Nembo ya biashara na kumbukumbu za ulinzi', icon: Settings, roles: ['Super Admin', 'Owner', 'Manager'] },
        { id: 'backup', label: language === 'EN' ? 'Backup & Reports' : 'Hifadhi Backup 💾', desc: language === 'EN' ? 'Configure auto-backups and reports' : 'Meneja wa hifadhi ya stoki, mauzo na login', icon: Database, roles: ['Super Admin', 'Owner', 'Manager'] }
      ]
    }
  ];

  // Quick desktop shortcuts on the main bar to improve speed
  const quickShortcuts = [
    { id: 'dashboard', label: language === 'EN' ? 'Dashboard' : 'Mwanzo', icon: LayoutDashboard },
    { id: 'pos', label: language === 'EN' ? 'POS' : 'Uuzaji', icon: ShoppingCart },
    { id: 'invoices', label: language === 'EN' ? 'Invoices' : 'Ankara', icon: FileSpreadsheet },
    { id: 'inventory', label: language === 'EN' ? 'Stock' : 'Ghala', icon: Package },
  ];

  const handleSelectTab = (tabId: string, hasAuth: boolean) => {
    if (!hasAuth) return;
    setActiveTab(tabId);
    setMegaMenuOpen(false);   // Auto-minimize the mega menu!
    setMobileMenuOpen(false); // Auto-minimize mobile drawer!
  };

  return (
    <div ref={menuRef} className="contents">
      {/* FLOATING MOBILE MENU TRIGGER BUTTON - No top header bar */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-md active:scale-95 transition-all cursor-pointer"
        id="mobile-nav-toggle"
        title={language === 'EN' ? 'Navigation Menu' : 'Menyu ya Huduma'}
      >
        <Menu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </button>

      {/* DESKTOP PERSISTENT VERTICAL SIDEBAR (FULL HEIGHT top-0 left-0 bottom-0) */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 border-r transition-all duration-300 ease-in-out ${
          effectivelyCollapsed 
            ? (isHovered ? 'w-64 z-50 shadow-2xl backdrop-blur-md bg-opacity-95' : 'w-16 z-30') 
            : 'w-64 z-30'
        } ${getThemeClasses()} overflow-hidden justify-between`}
      >
        {/* Top Header inside Sidebar: Branding, Version & Collapse Toggle */}
        <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              {profile?.logoUrl ? (
                <img src={profile.logoUrl} className="h-8 w-8 object-contain rounded-md shadow-sm border border-slate-200/50 shrink-0" alt="Logo" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-8 w-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-500/10 shrink-0">
                  DK
                </div>
              )}
              {showText && (
                <div className="leading-tight shrink-0">
                  <h1 className="font-sans font-black text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="text-blue-600 dark:text-blue-400">DUKA OS</span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">v4.2</span>
                  </h1>
                  <span className="text-[9px] font-bold text-slate-400 block truncate">
                    Enterprise Management
                  </span>
                </div>
              )}
            </div>

            {/* Collapse Toggle Button */}
            {!isTablet && showText && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </button>
            )}
          </div>

          {/* Predictive Search Bar in Sidebar */}
          {showText && (
            <div ref={searchRef} className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'EN' ? "Search..." : "Tafuta..."}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                onFocus={() => setSearchFocused(true)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}

              {/* Search results overlay */}
              {searchFocused && searchQuery.trim() && (
                <div className={`absolute top-full left-0 right-0 mt-1 max-h-[300px] overflow-y-auto rounded-xl border shadow-xl p-2 space-y-2 z-50 ${getMegaMenuTheme()}`}>
                  {!hasSearchResults ? (
                    <p className="text-center py-4 text-slate-400 text-[11px]">{language === 'EN' ? 'No matches' : 'Hakuna matokeo'}</p>
                  ) : (
                    <div className="space-y-2 text-[11px]">
                      {searchResults.products.map(p => (
                        <div key={p.id} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-between items-center">
                          <span className="font-bold truncate text-slate-800 dark:text-slate-100 max-w-[120px]">{p.name}</span>
                          <button onClick={() => handleSelectProductPOS(p)} className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">POS</button>
                        </div>
                      ))}
                      {searchResults.customers.map(c => (
                        <div key={c.id} onClick={() => handleSelectCustomer(c)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-bold text-blue-600 dark:text-blue-400 truncate">
                          {c.fullName}
                        </div>
                      ))}
                      {searchResults.is.map(inv => (
                        <div key={inv.id} onClick={() => handleSelectInvoice(inv)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex justify-between">
                          <span className="font-mono text-slate-700 dark:text-slate-300">{inv.invoiceNumber}</span>
                          <span className="text-[9px] text-slate-400">TZS {inv.grandTotal.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation List Container */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3 select-none custom-scrollbar">
          {groups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {/* Group Section Header */}
              <div className={`overflow-hidden transition-all duration-350 ease-in-out ${showText ? 'opacity-100 max-h-10 mt-2 mb-1 px-3' : 'opacity-0 max-h-0'}`}>
                <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase block whitespace-nowrap">
                  {group.title}
                </span>
              </div>
              {!showText && groupIdx > 0 && (
                <div className="border-t border-slate-200/40 dark:border-slate-800/40 my-2 mx-1 transition-all duration-300" />
              )}
              
              {group.items.map((item) => {
                const hasAuth = item.roles.includes(currentUser.role);
                const Icon = item.icon;
                const active = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    disabled={!hasAuth}
                    onClick={() => handleSelectTab(item.id, hasAuth)}
                    className={`w-full group/item relative rounded-xl flex items-center transition-all duration-200 p-2.5 ${
                      !hasAuth 
                        ? 'opacity-30 cursor-not-allowed text-slate-400' 
                        : active 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15 font-bold' 
                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                    } ${showText ? 'px-3 gap-3' : 'justify-center'}`}
                    title={effectivelyCollapsed && !isHovered ? item.label : undefined}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-100 group-hover/item:scale-105 ${active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    
                    {/* Item label */}
                    <div className={`leading-tight text-left transition-all duration-350 ease-in-out overflow-hidden ${showText ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}>
                      <span className={`text-[11.5px] font-bold block whitespace-nowrap ${active ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                        {item.label}
                      </span>
                    </div>

                    {/* Smooth collapsed tooltip overlay */}
                    {effectivelyCollapsed && !isHovered && (
                      <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover/item:opacity-100 pointer-events-none transition-all duration-150 transform translate-x-2 group-hover/item:translate-x-0 shadow-xl border border-slate-700/30 z-[100] leading-normal min-w-[150px]">
                        <div className="font-bold text-blue-400 text-xs">{item.label}</div>
                        <div className="text-[9px] text-slate-300 mt-0.5 leading-tight">{item.desc}</div>
                      </div>
                    )}

                    {/* Auth Lock Symbol */}
                    {!hasAuth && (
                      <Lock className={`h-3 w-3 text-slate-400 shrink-0 transition-all duration-200 ${!showText ? 'absolute bottom-1 right-1' : 'ml-auto'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Lower Persistent Controls Panel with User Role, Branch, Operator & System Actions */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 shrink-0 space-y-2.5">
          {/* Active Operator / Cashier Pill */}
          {showText ? (
            <button
              onClick={() => setShowShiftModal(true)}
              className={`w-full p-2 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                activeOperator 
                  ? 'bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/80' 
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-300 dark:bg-rose-950/35 dark:border-rose-900 animate-pulse'
              }`}
              title={language === 'SW' ? 'Badili Muuzaji / Shift' : 'Switch Operator / Shift'}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-sm shrink-0 ${
                  activeOperator ? 'bg-emerald-500' : 'bg-rose-500'
                }`}>
                  {activeOperator ? activeOperator.substring(0, 2).toUpperCase() : '?'}
                </div>
                <div className="leading-tight overflow-hidden">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">CASHIER</div>
                  <div className="text-[10.5px] font-extrabold text-slate-800 dark:text-slate-100 truncate mt-0.5 leading-none">
                    {activeOperator || (language === 'SW' ? 'Weka Muuzaji' : 'Set Cashier')}
                  </div>
                </div>
              </div>
              <UserCheck className={`h-4 w-4 shrink-0 ${activeOperator ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`} />
            </button>
          ) : (
            <div 
              onClick={() => setShowShiftModal(true)}
              className="h-9 w-9 mx-auto rounded-xl bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-emerald-500/20 cursor-pointer transition-all shrink-0 active:scale-95 duration-100"
              title={`${activeOperator || 'Cashier'} | ${activeShift}`}
            >
              {activeOperator ? activeOperator.substring(0, 2).toUpperCase() : '?'}
            </div>
          )}

          {/* Role & Branch Selectors inside Sidebar when expanded */}
          {showText && (
            <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-800 text-left">
              {/* Role Persona Selector */}
              <div className="flex items-center justify-between gap-1 text-[10.5px]">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest shrink-0">{language === 'EN' ? 'ROLE' : 'WAJIBU'}</span>
                <select
                  value={currentUser.role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10.5px] font-extrabold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 max-w-[140px] truncate"
                >
                  {roles.map((r) => (
                    <option key={r} value={r} className="dark:bg-slate-900">{r}</option>
                  ))}
                </select>
              </div>

              {/* Branch Selector */}
              <div className="flex items-center justify-between gap-1 text-[10.5px]">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest shrink-0">{language === 'EN' ? 'BRANCH' : 'TAWI'}</span>
                <select
                  value={currentBranch}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    db.setCurrentBranch(nextVal);
                    setCurrentBranch(nextVal);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10.5px] font-extrabold focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 max-w-[140px] truncate"
                >
                  <option value="branch-main" className="dark:bg-slate-900">HQ / Main</option>
                  {branches.filter((b) => b.id !== 'branch-main').map((b) => (
                    <option key={b.id} value={b.id} className="dark:bg-slate-900">{b.name}</option>
                  ))}
                </select>
              </div>

              {/* System Toolbar: Wifi Status + Language Switcher + Notification Bell */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
                {/* Online indicator */}
                <div 
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-extrabold ${
                    isOnline 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                      : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400'
                  }`}
                  title={isOnline ? "Online System Connected" : "Operating Offline"}
                >
                  {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 text-rose-500" />}
                  <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </div>

                {/* Translate EN/SW */}
                <button
                  onClick={() => {
                    const next = language === 'EN' ? 'SW' : 'EN';
                    db.setLanguage(next);
                    setLanguage(next);
                  }}
                  className="px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-[10px] font-black text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Switch Language"
                >
                  {language === 'EN' ? '🇬🇧 EN' : '🇹🇿 SW'}
                </button>

                {/* Notifications Bell with dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-full relative text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-[8px] w-3.5 h-3.5 flex items-center justify-center font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute left-full bottom-0 ml-2 w-72 max-h-80 overflow-y-auto rounded-xl shadow-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 z-50 p-3">
                      <div className="flex items-center justify-between border-b pb-2 mb-2">
                        <span className="font-bold text-xs">Security & Stock Alerts</span>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkRead} className="text-blue-600 hover:underline text-[10px] font-semibold">
                            Mark read
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {notifications.length === 0 ? (
                          <p className="text-center text-xs text-slate-400 py-3">All systems normal.</p>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className={`p-2 rounded border text-[10px] ${n.read ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 text-slate-900 dark:text-slate-100 font-medium'}`}>
                              <div className="font-bold">{n.title}</div>
                              <p className="text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Expand/Collapse Trigger when collapsed */}
          {!isTablet && !showText && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
              title="Expand panel"
            >
              <ArrowRight className="h-4 w-4 text-blue-500" />
            </button>
          )}
        </div>
      </aside>

      {/* FLYOUT MEGA-MENU DROP-DOWN SYSTEM - WITH SMOOTH CSS HIERARCHIAL TRANSITIONS */}
      <div 
        className={`fixed inset-0 top-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300 ${
          megaMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMegaMenuOpen(false)}
      />
      
      <div className={`fixed top-0 left-0 right-0 z-50 border-b shadow-2xl transition-all duration-300 transform origin-top ${
        megaMenuOpen 
          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
          : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
      } ${getMegaMenuTheme()}`}>
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          
          <div className="flex items-center justify-between border-b pb-4 mb-6 border-slate-200/60 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black tracking-wider uppercase text-blue-600 dark:text-blue-400">
                {language === 'EN' ? 'DUKA OS WORKSPACES' : 'DIREKTORI YA HUDUMA DUKA OS'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {language === 'EN' 
                  ? 'Select any portal workspace to activate it. The menu collapses automatically to maximize screen area.'
                  : 'Chagua huduma yoyote hapa chini. Menyu itajifunga yenyewe ili isikuwekee kizuizi kwenye kioo.'}
              </p>
            </div>
            <button 
              onClick={() => setMegaMenuOpen(false)}
              className="p-1 px-2.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-white text-xs font-bold"
            >
              {language === 'EN' ? 'Minimize ✕' : 'Funga ✕'}
            </button>
          </div>

          {/* Grid representation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {groups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-4">
                <div className="border-b pb-1 border-slate-200/40 dark:border-slate-800">
                  <span className={`text-[11px] font-black tracking-widest ${group.color} block`}>
                    {group.title}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">
                    {group.subtitle}
                  </span>
                </div>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const hasAuth = item.roles.includes(currentUser.role);
                    const Icon = item.icon;
                    const active = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        disabled={!hasAuth}
                        onClick={() => handleSelectTab(item.id, hasAuth)}
                        className={`w-full text-left p-2.5 rounded-lg flex items-start gap-3 transition-all duration-150 ${
                          !hasAuth 
                            ? 'opacity-30 cursor-not-allowed text-slate-400' 
                            : active 
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                              : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <div className={`p-1.5 rounded-md ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350'} shrink-0`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="leading-tight">
                          <span className={`text-xs font-bold block ${active ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                            {item.label}
                          </span>
                          <span className={`text-[10px] block mt-0.5 ${active ? 'text-white/80' : 'text-slate-450 dark:text-slate-400'}`}>
                            {item.desc}
                          </span>
                        </div>
                        {!hasAuth && <Lock className="h-3 w-3 text-slate-400 ml-auto self-center" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Lower info strip */}
          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] font-mono text-slate-400 flex flex-wrap justify-between items-center gap-2">
            <div>
              SYSTEM LIC NO: <strong className="text-blue-500">{profile?.verificationCode || 'SMARTERP-COMMERCIAL-PRO'}</strong>
            </div>
            <div>
              SECURE PORTAL CORE • AUTOMATIC RE-PROVISIONING ENABLED
            </div>
          </div>

        </div>
      </div>

      {/* MOBILE FULL-SCREEN DRAWER ON HAMBURGER PRESS */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-55 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className={`w-80 max-w-[85vw] h-full flex flex-col p-4 space-y-3 shadow-2xl transition-transform duration-300 ${getThemeClasses()}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-bold text-xs uppercase tracking-tight text-blue-600 dark:text-blue-400">DUKA OS Workspace Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Mobile search bar */}
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'EN' ? "Search products, customers..." : "Tafuta bidhaa kuanza..."}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-105 dark:bg-slate-800/80 border border-slate-205 dark:border-slate-700/85 rounded-lg text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-450 hover:text-slate-650"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Mobile search matching results quick tray */}
            {searchQuery.trim() && (
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 max-h-48 overflow-y-auto space-y-2 mt-1 text-[11px]">
                {!hasSearchResults ? (
                  <span className="text-slate-400 block text-center p-1 font-semibold">Hamna matokeo</span>
                ) : (
                  <>
                    {/* Products */}
                    {searchResults.products.map(p => (
                      <div key={p.id} className="flex justify-between items-center gap-2 border-b pb-1 dark:border-slate-800/60 font-medium">
                        <span className="font-bold truncate max-w-[120px] text-slate-800 dark:text-slate-200">{p.name}</span>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { handleSelectProductPOS(p); setMobileMenuOpen(false); }} className="bg-blue-600 text-white font-extrabold px-1.5 py-0.5 rounded text-[9px] hover:bg-blue-700">POS</button>
                          <button onClick={() => { handleSelectProductInventory(p); setMobileMenuOpen(false); }} className="bg-slate-200 text-slate-700 dark:bg-slate-805 dark:text-slate-300 font-extrabold px-1.5 py-0.5 rounded text-[9px]">Stoki</button>
                        </div>
                      </div>
                    ))}
                    {/* Customers */}
                    {searchResults.customers.map(c => (
                      <div key={c.id} onClick={() => { handleSelectCustomer(c); setMobileMenuOpen(false); }} className="flex justify-between items-center gap-2 border-b pb-1 dark:border-slate-800/60 cursor-pointer hover:bg-slate-100/60 p-0.5 rounded">
                        <span className="font-bold truncate max-w-[150px] text-blue-600 dark:text-blue-400">{c.fullName}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold shrink-0">Wateja</span>
                      </div>
                    ))}
                    {/* Invoices */}
                    {searchResults.is.map(inv => (
                      <div key={inv.id} onClick={() => { handleSelectInvoice(inv); setMobileMenuOpen(false); }} className="flex justify-between items-center gap-2 border-b pb-1 dark:border-slate-800/60 cursor-pointer hover:bg-slate-100/60 p-0.5 rounded">
                        <span className="font-bold truncate max-w-[130px] text-indigo-650 dark:text-indigo-400">{inv.invoiceNumber}</span>
                        <span className="text-[9px] text-slate-450 font-mono shrink-0">TZS {inv.grandTotal.toLocaleString()}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
            
            <div className="flex-1 space-y-4 overflow-y-auto py-2">
              {groups.map((group, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 block px-1.5 uppercase">
                    {group.title}
                  </span>
                  {group.items.map((item) => {
                    const hasAuth = item.roles.includes(currentUser.role);
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        disabled={!hasAuth}
                        onClick={() => handleSelectTab(item.id, hasAuth)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs ${
                          !hasAuth 
                            ? 'opacity-30 cursor-not-allowed' 
                            : active 
                              ? 'bg-blue-600 text-white font-black shadow' 
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        {!hasAuth && <Lock className="h-3 w-3 text-slate-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Mobile Control Deck & Quick Settings */}
            <div className="p-3 border-t border-slate-150 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl shrink-0">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 block mb-1">
                {language === 'SW' ? 'PANELI YA KUDHIBITI OS' : 'OS CONTROL DECK'}
              </span>

              {/* Branch Selector in Mobile Drawer */}
              {branches.length > 0 && (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[10.5px] text-slate-500 dark:text-slate-400">
                    <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span>{language === 'SW' ? 'Tawi Active' : 'Branch Active'}</span>
                  </div>
                  <select
                    value={currentBranch}
                    onChange={(e) => {
                      db.setCurrentBranch(e.target.value);
                      setCurrentBranch(e.target.value);
                      db.logAudit('TRANSFER', 'UserSession', `Shifted focus tawi to ${e.target.value}`, currentUser.email);
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-extrabold focus:outline-none text-slate-700 dark:text-slate-200"
                  >
                    <option value="branch-main" className="dark:bg-slate-900">HQ / Bidhaa Kuu</option>
                    {branches.filter((b) => b.id !== 'branch-main').map((b) => (
                      <option key={b.id} value={b.id} className="dark:bg-slate-900">{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Active Security Persona Selector in Mobile Drawer */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[10.5px] text-slate-500 dark:text-slate-400">
                  <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{language === 'SW' ? 'Wajibu wako' : 'My Role'}</span>
                </div>
                <select
                  value={currentUser.role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-extrabold focus:outline-none text-slate-700 dark:text-slate-200"
                >
                  {roles.map((r) => (
                    <option key={r} value={r} className="dark:bg-slate-900">{r}</option>
                  ))}
                </select>
              </div>

              {/* Theme Selector in Mobile Drawer */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[10.5px] text-slate-500 dark:text-slate-400">
                  <Palette className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span>{language === 'SW' ? 'Mandhari' : 'Theme Style'}</span>
                </div>
                <select
                  value={theme}
                  onChange={(e) => {
                    const nextVal = e.target.value as ThemeMode;
                    db.setThemeMode(nextVal);
                    setTheme(nextVal);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-extrabold focus:outline-none text-slate-700 dark:text-slate-200"
                >
                  <option value="light">☀️ Light</option>
                  <option value="dark">🌙 Dark</option>
                  <option value="glass-future">💎 Glass Future</option>
                  <option value="luxury-gold">✨ Gold Luxury</option>
                  <option value="neon-cyan">⚡ Cyber Cyan</option>
                  <option value="high-density">📊 Compact HD</option>
                </select>
              </div>

              {/* Language Selector in Mobile Drawer */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[10.5px] text-slate-500 dark:text-slate-400">
                  <Globe className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span>{language === 'SW' ? 'Lugha Active' : 'System Language'}</span>
                </div>
                <button
                  onClick={() => {
                    const next = language === 'EN' ? 'SW' : 'EN';
                    db.setLanguage(next);
                    setLanguage(next);
                  }}
                  className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-705 bg-white dark:bg-slate-800 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 text-slate-700 dark:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
                >
                  <span>{language === 'EN' ? '🇬🇧 English' : '🇹🇿 Kiswahili'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 border-t text-center space-y-1 bg-slate-50 dark:bg-slate-900 rounded shrink-0">
              <span className="text-[9px] font-semibold text-slate-400 block">DUKA OS ENTERPRISE PLATFORM</span>
              <span className="text-[9px] font-mono text-slate-500 block">LICENSE ACTIVE OK</span>
            </div>
          </div>
        </div>
      )}

      {/* SUPERMARKET SHIFT & CASHIER DESK MODAL */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" style={{ zIndex: 9999 }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-205 dark:border-slate-800 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-650" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-white">
                  {language === 'SW' ? 'Usimamizi wa Shifts / Cashiers' : 'Supermarket Shifts & Cashiers'}
                </h3>
              </div>
              <button 
                onClick={() => setShowShiftModal(false)} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  {language === 'SW' ? 'Muuzaji wa Sasa (Shift)' : 'Active Terminal Operator'}
                </label>
                <div className={`rounded-xl p-3 border flex items-center gap-3 ${
                  activeOperator 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/60' 
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-150'
                }`}>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md shrink-0 select-none ${
                    activeOperator ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}>
                    {activeOperator ? activeOperator.substring(0, 2).toUpperCase() : '??'}
                  </div>
                  <div className="leading-tight">
                    <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                      {activeOperator || (language === 'SW' ? 'Hakuna Muuzaji' : 'No Operational Cashier')}
                    </div>
                    <div className={`text-[10px] font-extrabold mt-0.5 ${activeOperator ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
                      {activeOperator ? activeShift : (language === 'SW' ? 'Tafadhali sajili jina chini' : 'Please register a name below')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Select from pre-saved rosters */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  {language === 'SW' ? 'Chagua Muuzaji Aliyesajiliwa' : 'Registered Cashier List'}
                </label>
                
                {cashierRoster.length === 0 ? (
                  <div className="text-center py-4 bg-slate-50 dark:bg-slate-950 text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-medium leading-relaxed">
                      {language === 'SW' 
                        ? 'Hakuna muuzaji aliyesajiliwa.\nAndika jina hapo chini kusajili.' 
                        : 'No profiles registered yet.\nEnter a cashier name below to register.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {cashierRoster.map((cashierOption, index) => (
                      <div
                        key={cashierOption.name + '-' + index}
                        className={`flex items-center justify-between p-1.5 rounded-xl border text-[11px] font-extrabold transition-all ${
                          activeOperator === cashierOption.name
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400/80 text-blue-700 dark:text-blue-400'
                            : 'bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-950 hover:dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleConfirmShift(cashierOption.name, cashierOption.shift)}
                          className="flex-1 text-left flex items-center gap-2 py-1"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${activeOperator === cashierOption.name ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                          <span>{cashierOption.name}</span>
                          <span className="text-[8.5px] opacity-70 uppercase tracking-wider ml-1 font-semibold">({cashierOption.shift})</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = cashierRoster.filter((_, idx) => idx !== index);
                            setCashierRoster(updated);
                            localStorage.setItem('SmartERP_CashierRoster', JSON.stringify(updated));
                            if (activeOperator === cashierOption.name) {
                              localStorage.removeItem('SmartERP_ActiveOperator');
                              setActiveOperator('');
                              window.dispatchEvent(new Event('storage'));
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={language === 'SW' ? 'Futa' : 'Delete'}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Enter custom manual name (Dynamic Shift Change) */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  {language === 'SW' ? 'Sajili Muuzaji Mpya (Wewe Mwenyewe)' : 'Sign up New Operational Cashier'}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder={language === 'SW' ? "Andika jina kamili..." : "Enter full name..."}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={customOperatorInput}
                    onChange={(e) => setCustomOperatorInput(e.target.value)}
                  />
                  <select
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg px-1.5 py-1 text-[11px] text-slate-800 dark:text-white font-extrabold focus:outline-none"
                    value={customShiftSelect}
                    onChange={(e) => setCustomShiftSelect(e.target.value)}
                  >
                    <option value="Shift ya Asubuhi">{language === 'SW' ? 'Asubuhi' : 'Morning'}</option>
                    <option value="Shift ya Mchana">{language === 'SW' ? 'Mchana' : 'Afternoon'}</option>
                    <option value="Shift ya Usiku">{language === 'SW' ? 'Usiku' : 'Night'}</option>
                  </select>
                  <button
                    onClick={() => {
                      if (customOperatorInput.trim()) {
                        const updated = [...cashierRoster, { name: customOperatorInput.trim(), shift: customShiftSelect }];
                        setCashierRoster(updated);
                        localStorage.setItem('SmartERP_CashierRoster', JSON.stringify(updated));
                        handleConfirmShift(customOperatorInput.trim(), customShiftSelect);
                        setCustomOperatorInput('');
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] px-3 rounded-lg flex items-center shrink-0 uppercase tracking-wide"
                  >
                    {language === 'SW' ? 'Weka' : 'Add'}
                  </button>
                </div>
              </div>

              <div className="text-[9.5px] leading-relaxed text-slate-450 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                ⚠️ {language === 'SW' 
                  ? 'Mauzo yote ya risiti (POS) na Ankara yatarekodiwa chini ya jina la muuzaji huyu.' 
                  : 'All sales receipts and Invoices will be registered under this cashier.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
