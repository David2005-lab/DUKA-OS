/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Invoicing from './components/Invoicing';
import CRM from './components/CRM';
import SupplierStaff from './components/SupplierStaff';
import Accounting from './components/Accounting';
import EcommerceStore from './components/EcommerceStore';
import AIAssistant from './components/AIAssistant';
import SettingsAudit from './components/SettingsAudit';
import PriceCatalog from './components/PriceCatalog';
import DocumentCenter from './components/DocumentCenter';
import BackupHub from './components/BackupHub';
import PrintPreviewModal from './components/PrintPreviewModal';
import GuidedTour from './components/GuidedTour';
import ReorderToast from './components/ReorderToast';
import QuickUploadHub from './components/QuickUploadHub';
import CommandPalette from './components/CommandPalette';
import ThemeStudioModal from './components/ThemeStudioModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { ExportButton } from './components/ExportButton';
import { exportLedgerToCSV, exportLedgerToPDF } from './utils/exportHelpers';

import { 
  LanguageCode, 
  ThemeMode, 
  UserRole, 
  Branch, 
  Product, 
  Invoice, 
  Transaction 
} from './types';
import { db } from './db';
import { translations } from './translations';
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  FileSpreadsheet, 
  BookOpen, 
  Clock, 
  Building2,
  CheckCircle2,
  GripVertical,
  Settings,
  Eye,
  EyeOff,
  Home,
  ChevronRight,
  RefreshCw,
  Info
} from 'lucide-react';

export default function App() {
  // Settings Default States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState<LanguageCode>('EN');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [currentBranch, setCurrentBranch] = useState('branch-main');
  const [currentUser, setCurrentUser] = useState<{ email: string; role: UserRole }>({
    email: 'admin@enterprise-erp.com',
    role: 'Super Admin'
  });

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showThemeStudio, setShowThemeStudio] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [showTour, setShowTour] = useState(false);
  const [showReorderToast, setShowReorderToast] = useState(false);
  const [hasDismissedReorder, setHasDismissedReorder] = useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('SmartERP_DismissedReorder') === 'true';
  });

  // Custom KPI Widgets list ordering state (reordering with HTML5 drag and drop)
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('SmartERP_KPI_Order');
    return saved ? JSON.parse(saved) : ['grossIncome', 'registeredCustomers', 'pendingBills', 'stockAlerts'];
  });

  // KPI individual card visibility toggles
  const [kpiVisibility, setKpiVisibility] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('SmartERP_KPI_Visibility');
    return saved ? JSON.parse(saved) : {
      grossIncome: true,
      registeredCustomers: true,
      pendingBills: true,
      stockAlerts: true
    };
  });

  const [showUserSettingsMenu, setShowUserSettingsMenu] = useState(false);
  const [draggedKpiId, setDraggedKpiId] = useState<string | null>(null);
  const [dragOverKpiId, setDragOverKpiId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedKpiId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedKpiId !== id) {
      setDragOverKpiId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedKpiId || draggedKpiId === targetId) return;

    const sourceIndex = kpiOrder.indexOf(draggedKpiId);
    const targetIndex = kpiOrder.indexOf(targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...kpiOrder];
      newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, draggedKpiId);
      setKpiOrder(newOrder);
      localStorage.setItem('SmartERP_KPI_Order', JSON.stringify(newOrder));
    }
    setDraggedKpiId(null);
    setDragOverKpiId(null);
  };

  const handleDragEnd = () => {
    setDraggedKpiId(null);
    setDragOverKpiId(null);
  };

  // Verification QR data states
  const [verifyType, setVerifyType] = useState<string | null>(null);
  const [verifyId, setVerifyId] = useState<string>('');
  const [verifyRef, setVerifyRef] = useState<string>('');
  const [verifyAmount, setVerifyAmount] = useState<string>('');
  const [verifyDate, setVerifyDate] = useState<string>('');
  const [verifyClient, setVerifyClient] = useState<string>('');
  const [verifySales, setVerifySales] = useState<string>('');
  const [verifyItems, setVerifyItems] = useState<string>('');
  const [verifyPlainTextMode, setVerifyPlainTextMode] = useState<boolean>(false);

  const loadData = () => {
    // Dynamic bootstrap
    setBranches(db.getBranches());
    setProducts(db.getProducts());
    setInvoices(db.getInvoices());
    setTransactions(db.getTransactions());
    
    // Sync UI overrides values
    setLanguage(db.getLanguage());
    setTheme(db.getThemeMode());
    setCurrentBranch(db.getCurrentBranch());
    
    const u = db.getCurrentUser();
    if (u) {
      setCurrentUser(u);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setTimeout(() => {
      setIsDataLoading(false);
    }, 500);

    // Parse query params for direct QR scan verification
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    if (type) {
      setVerifyType(type);
      setVerifyId(params.get('id') || '');
      setVerifyRef(params.get('ref') || '');
      setVerifyAmount(params.get('amount') || params.get('total') || '');
      setVerifyDate(params.get('date') || '');
      setVerifyClient(params.get('client') || params.get('customer') || '');
      setVerifySales(params.get('sales') || '');
      setVerifyItems(params.get('items') || '');
    }

    // Instantly sync when database changes in any component
    const handleDbUpdate = () => {
      setProducts(db.getProducts());
      setInvoices(db.getInvoices());
      setTransactions(db.getTransactions());
    };
    window.addEventListener('db-update', handleDbUpdate);

    // Passive fallback interval (15s instead of 2.5s) to save CPU & avoid freezing
    const interval = setInterval(() => {
      setProducts(db.getProducts());
      setInvoices(db.getInvoices());
      setTransactions(db.getTransactions());
    }, 15000);

    return () => {
      window.removeEventListener('db-update', handleDbUpdate);
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  // Handle HTML document styles dynamically - locked to clean light mode
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'luxury-gold', 'neon-cyan', 'high-density', 'glass-future', 'emerald-eco', 'sunset-rose');
  }, [theme]);

  // Handle first login / first-run guided tour and replay actions
  useEffect(() => {
    const tourCompleted = localStorage.getItem('SmartERP_GuidedTour_Completed');
    if (!tourCompleted) {
      setShowTour(true);
    }

    const handleStartTour = () => {
      setShowTour(true);
    };
    const handleOpenThemeStudio = () => {
      setShowThemeStudio(true);
    };

    window.addEventListener('start-guided-tour', handleStartTour);
    window.addEventListener('open-theme-studio', handleOpenThemeStudio);
    return () => {
      window.removeEventListener('start-guided-tour', handleStartTour);
      window.removeEventListener('open-theme-studio', handleOpenThemeStudio);
    };
  }, []);

  // Global Keyboard Shortcuts (hotkeys) inside App root
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // 1) Trigger Command Palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(open => !open);
        return;
      }

      // Check if target is an interactive input to avoid double triggers while typing
      const target = e.target as HTMLElement;
      if (
        target?.tagName === 'INPUT' || 
        target?.tagName === 'TEXTAREA' || 
        target?.isContentEditable
      ) {
        return;
      }

      // 2) Navigation Hotkeys: Alt + Digit / Letter keys
      if (e.altKey) {
        let handled = true;
        switch (e.key) {
          case '1':
            setActiveTab('dashboard');
            break;
          case '2':
            setActiveTab('pos');
            break;
          case '3':
            setActiveTab('invoices');
            break;
          case '4':
            setActiveTab('inventory');
            break;
          case '5':
            setActiveTab('crm');
            break;
          case '6':
            setActiveTab('suppliers');
            break;
          case '7':
            setActiveTab('accounting');
            break;
          case '8':
            setActiveTab('aiAssistant');
            break;
          case '9':
            setActiveTab('settings');
            break;
          case '0':
            setActiveTab('backup');
            break;
          case 'l':
          case 'L':
            setLanguage(lang => {
              const next = lang === 'EN' ? 'SW' : 'EN';
              db.setLanguage(next);
              return next;
            });
            break;
          case 't':
          case 'T':
            setTheme(currentTheme => {
              const themes: ThemeMode[] = ['light', 'dark', 'glass-future', 'luxury-gold', 'neon-cyan', 'high-density'];
              const currentIdx = themes.indexOf(currentTheme);
              const nextTheme = themes[(currentIdx + 1) % themes.length];
              db.setThemeMode(nextTheme);
              return nextTheme;
            });
            break;
          case 's':
          case 'S':
            setSidebarCollapsed(collapsed => !collapsed);
            break;
          default:
            handled = false;
        }
        if (handled) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // Alert toast trigger system on navigating to the dashboard
  useEffect(() => {
    if (hasDismissedReorder) {
      setShowReorderToast(false);
      return;
    }
    if (activeTab === 'dashboard') {
      const depletedItems = products.filter((p) => {
        const bQty = p.branchStock[currentBranch] ?? 0;
        return bQty <= p.reorderLevel;
      });
      if (depletedItems.length > 0) {
        // Delay slightly for smooth entrance animation after loading or layout transitions
        const timer = setTimeout(() => {
          setShowReorderToast(true);
        }, 300);
        return () => clearTimeout(timer);
      } else {
        setShowReorderToast(false);
      }
    } else {
      setShowReorderToast(false);
    }
  }, [activeTab, products, currentBranch, hasDismissedReorder]);

  const t = translations[language];

  // Calculations for executive summary metrics
  const paidInvoices = invoices.filter((i) => i.status === 'Paid');
  const totalRevenueSum = paidInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

  // Depleted products trackers
  const lowStockProducts = products.filter((p) => {
    const bQty = p.branchStock[currentBranch] ?? 0;
    return bQty <= p.reorderLevel;
  });
  const lowStockCount = lowStockProducts.length;

  const totalRegisteredClients = db.getCustomers().length;
  const totalPendingBills = invoices.filter((i) => i.status === 'Pending').length;

  const getLastFiveDaysMetrics = () => {
    const days = [];
    const today = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayTxns = transactions.filter((tx) => tx.date === dateStr);
      const sales = dayTxns.filter((tx) => tx.type === 'Sale').reduce((sum, tx) => sum + tx.amount, 0);
      const expenses = dayTxns.filter((tx) => tx.type === 'Expense').reduce((sum, tx) => sum + tx.amount, 0);
      
      const label = d.toLocaleDateString(language === 'SW' ? 'sw-TZ' : 'en-US', { month: 'short', day: 'numeric' });
      days.push({ label, sales, expenses });
    }
    return days;
  };

  // View Router helper
  const renderTabContent = () => {
    switch (activeTab) {
      case 'pos':
        return <POS language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'prices':
        return <PriceCatalog language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'inventory':
        return <Inventory language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'invoices':
        return <Invoicing language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'documents':
        return <DocumentCenter language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'crm':
        return <CRM language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'suppliers':
        return <SupplierStaff language={language} currentBranch={currentBranch} userEmail={currentUser.email} />;
      case 'accounting':
        return <Accounting language={language} currentBranch={currentBranch} />;
      case 'ecommerce':
        return <EcommerceStore language={language} currentBranch={currentBranch} />;
      case 'aiAssistant':
        return <AIAssistant language={language} />;
      case 'settings':
        return <SettingsAudit language={language} userEmail={currentUser.email} />;
      case 'backup':
        return <BackupHub language={language} userEmail={currentUser.email} />;
      default: // 'dashboard' Core widgets overview
        return (
          <div className="space-y-6 animate-fade-in text-xs">
            
            {/* Context bar with welcome branding */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl gap-2 shadow-sm">
              <div>
                <strong className="text-sm font-serif text-slate-900 dark:text-white uppercase leading-none block">
                  {language === 'SW' ? 'Eneo la Utawala la ERP' : 'Intelligence ERP Master Console'}
                </strong>
                <span className="text-[10.5px] text-slate-400 mt-1 block font-extrabold">
                  {language === 'SW' ? 'Mfumo wa Kisasa wa Kusimamia Mauzo na Stoki (Duka OS)' : 'Advanced real-time sales and inventory management console.'}
                </span>
              </div>

              <div className="bg-indigo-600/10 border border-indigo-400/20 text-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 uppercase font-extrabold text-[10px]">
                <Clock className="h-4 w-4" />
                <span>UTC Active Node</span>
              </div>
            </div>

            {/* Personalization hint, User Settings, & Reset helper controls */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-205 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                <span className="text-slate-550 dark:text-slate-400 text-[10.5px] font-bold flex items-center gap-1.5">
                  <span className="animate-bounce text-xs">💡</span>
                  <span>
                    {language === 'SW' 
                      ? 'Hariri dashboard yako: Kokota kadi kubadilisha mpangilio, au tumia "User Settings" kuficha ripoti fulani.' 
                      : 'Personalize dashboard: Drag & drop to reorder cards, or use "User Settings" to hide specific widgets.'}
                  </span>
                </span>
                
                <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowUserSettingsMenu(!showUserSettingsMenu)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-extrabold uppercase tracking-wide transition-all duration-155 cursor-pointer ${
                      showUserSettingsMenu
                        ? 'bg-indigo-600 border-indigo-755 text-white shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Settings className={`h-3.5 w-3.5 ${showUserSettingsMenu ? 'animate-spin' : ''}`} />
                    <span>{language === 'SW' ? 'Mipangilio ya Kadi' : 'User Settings'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const defaultOrder = ['grossIncome', 'registeredCustomers', 'pendingBills', 'stockAlerts'];
                      setKpiOrder(defaultOrder);
                      localStorage.setItem('SmartERP_KPI_Order', JSON.stringify(defaultOrder));
                      
                      const defaultVisibility = {
                        grossIncome: true,
                        registeredCustomers: true,
                        pendingBills: true,
                        stockAlerts: true
                      };
                      setKpiVisibility(defaultVisibility);
                      localStorage.setItem('SmartERP_KPI_Visibility', JSON.stringify(defaultVisibility));
                    }}
                    className="text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wide text-[10px] hover:underline cursor-pointer"
                  >
                    {language === 'SW' ? 'Rudisha Mpangilio' : 'Reset Dashboard'}
                  </button>
                </div>
              </div>

              {/* Collapsible settings panel */}
              {showUserSettingsMenu && (
                <div className="bg-white dark:bg-slate-950 p-4 border border-slate-201 dark:border-slate-850 rounded-lg animate-fade-in space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-905 pb-2.5">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                      {language === 'SW' ? 'Dhibiti Mwonekano wa Kadi za KPI' : 'Control KPI Card Visibility'}
                    </span>
                    <span className="text-[9px] text-slate-450 font-semibold">
                      {language === 'SW' ? '* Mipangilio inahifadhiwa kwenye kivinjari hiki pekee' : '* Settings are saved directly in your web profile session'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Gross Income toggle */}
                    <label className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-900/60 transition-colors select-none">
                      <div className="flex items-center gap-2">
                        <div className="p-1 px-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-md">
                          <TrendingUp className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10.5px] font-extrabold text-slate-700 dark:text-slate-200 leading-tight">
                            {language === 'SW' ? 'Pato la Jumla' : 'Gross Income'}
                          </span>
                          <span className="text-[8.5px] text-slate-400 font-medium">
                            {language === 'SW' ? 'Ripoti ya Mauzo' : 'Revenue overview'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={kpiVisibility.grossIncome}
                        onChange={(e) => {
                          const updated = { ...kpiVisibility, grossIncome: e.target.checked };
                          setKpiVisibility(updated);
                          localStorage.setItem('SmartERP_KPI_Visibility', JSON.stringify(updated));
                        }}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                    </label>

                    {/* Registered Customers toggle */}
                    <label className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-900/60 transition-colors select-none">
                      <div className="flex items-center gap-2">
                        <div className="p-1 px-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-md">
                          <Users className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10.5px] font-extrabold text-slate-700 dark:text-slate-200 leading-tight">
                            {language === 'SW' ? 'Ripoti ya Wateja' : 'Registered Customers'}
                          </span>
                          <span className="text-[8.5px] text-slate-400 font-medium font-sans">
                            {language === 'SW' ? 'Anwani na Wasifu' : 'CRM profile count'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={kpiVisibility.registeredCustomers}
                        onChange={(e) => {
                          const updated = { ...kpiVisibility, registeredCustomers: e.target.checked };
                          setKpiVisibility(updated);
                          localStorage.setItem('SmartERP_KPI_Visibility', JSON.stringify(updated));
                        }}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                    </label>

                    {/* Pending Bills toggle */}
                    <label className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-900/60 transition-colors select-none">
                      <div className="flex items-center gap-2">
                        <div className="p-1 px-1.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-md">
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10.5px] font-extrabold text-slate-700 dark:text-slate-200 leading-tight">
                            {language === 'SW' ? 'Ankara Rasimu' : 'Pending Invoices'}
                          </span>
                          <span className="text-[8.5px] text-slate-400 font-medium">
                            {language === 'SW' ? 'Bili za wateja' : 'Awaiting payment'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={kpiVisibility.pendingBills}
                        onChange={(e) => {
                          const updated = { ...kpiVisibility, pendingBills: e.target.checked };
                          setKpiVisibility(updated);
                          localStorage.setItem('SmartERP_KPI_Visibility', JSON.stringify(updated));
                        }}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                    </label>

                    {/* Stock Alerts toggle */}
                    <label className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 border border-slate-205 dark:border-slate-800 rounded-lg cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-900/60 transition-colors select-none">
                      <div className="flex items-center gap-2">
                        <div className="p-1 px-1.5 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 rounded-md">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10.5px] font-extrabold text-slate-700 dark:text-slate-200 leading-tight">
                            {language === 'SW' ? 'Tahadhari za Stoki' : 'Stock Warnings'}
                          </span>
                          <span className="text-[8.5px] text-slate-400 font-medium">
                            {language === 'SW' ? 'Akiba iliyopungua' : 'Below branch limits'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={kpiVisibility.stockAlerts}
                        onChange={(e) => {
                          const updated = { ...kpiVisibility, stockAlerts: e.target.checked };
                          setKpiVisibility(updated);
                          localStorage.setItem('SmartERP_KPI_Visibility', JSON.stringify(updated));
                        }}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* KPI Executive metrics cards grid (Custom Drag & Drop Reordered) */}
            {(() => {
              const salesTxList = transactions.filter(t => t.type === 'Sale');
              const totalSalesCount = salesTxList.length;
              const avgTicketValue = totalSalesCount > 0 ? Math.round(totalRevenueSum / totalSalesCount) : 0;

              const activeCustomersCount = new Set(salesTxList.map(t => t.description || 'General')).size;
              const avgRevenuePerCustomer = totalRegisteredClients > 0 ? Math.round(totalRevenueSum / totalRegisteredClients) : 0;

              const pendingInvoicesList = invoices.filter(i => i.status === 'Unpaid' || i.status === 'Sent' || i.status === 'Draft');
              const pendingInvoicesTotal = pendingInvoicesList.reduce((sum, inv) => sum + (inv.total || 0), 0);

              const zeroStockCount = products.filter(p => p.stock <= 0).length;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
                  {isDataLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="relative bg-white dark:bg-slate-950 p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between animate-pulse"
                      >
                        <div className="space-y-3 w-full pr-3">
                          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                          <div className="h-7 w-32 bg-slate-300 dark:bg-slate-700 rounded-lg"></div>
                          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                        </div>
                        <div className="flex flex-col items-end justify-between h-full gap-4 shrink-0">
                          <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                          <div className="h-12 w-12 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    kpiOrder.filter((cardId) => kpiVisibility[cardId] !== false).map((cardId) => {
                    const isDragging = draggedKpiId === cardId;
                    const isOver = dragOverKpiId === cardId;

                    const dragProps = {
                      draggable: true,
                      onDragStart: (e: React.DragEvent) => handleDragStart(e, cardId),
                      onDragOver: (e: React.DragEvent) => handleDragOver(e, cardId),
                      onDrop: (e: React.DragEvent) => handleDrop(e, cardId),
                      onDragEnd: handleDragEnd,
                    };

                    const cardStyle = `relative group bg-white dark:bg-slate-950 p-6 sm:p-7 border rounded-2xl shadow-xs flex items-center justify-between transition-all duration-300 ease-out cursor-grab active:cursor-grabbing ${
                      isDragging ? 'opacity-30 scale-95 border-dashed border-indigo-500 bg-indigo-50/10' : ''
                    } ${
                      isOver ? 'border-indigo-600 scale-[1.02] ring-2 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-800'
                    } hover:border-indigo-400 dark:hover:border-indigo-900/60 hover:shadow-md hover:-translate-y-1 dark:hover:shadow-indigo-950/20`;

                    switch (cardId) {
                      case 'grossIncome':
                        return (
                          <div key="grossIncome" {...dragProps} className={cardStyle}>
                            {/* Rich Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3.5 bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/80 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 pointer-events-none">
                              <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
                                <span className="font-extrabold text-slate-200 flex items-center gap-1">
                                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                                  {language === 'SW' ? 'Mchanganuo wa Mauzo' : 'Revenue Breakdown'}
                                </span>
                                <span className="text-[10px] text-emerald-400 font-mono font-bold">Audit OK</span>
                              </div>
                              <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Jumla ya Miamala' : 'Sales Completed'}:</span>
                                  <strong className="font-mono text-white">{totalSalesCount} {language === 'SW' ? 'Miamala' : 'txns'}</strong>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Wastani wa Muamala' : 'Average Sale'}:</span>
                                  <strong className="font-mono text-emerald-300">TZS {avgTicketValue.toLocaleString()}</strong>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Ankara za Mauzo' : 'Invoiced Sales'}:</span>
                                  <strong className="font-mono text-white">{invoices.length} {language === 'SW' ? 'Hati' : 'invoices'}</strong>
                                </div>
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95 dark:border-t-slate-800/95"></div>
                            </div>

                            <div className="space-y-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-400 block">{t.totalSales}</span>
                                <Info className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <strong className="text-xl sm:text-2xl font-mono font-black tracking-tight text-slate-900 dark:text-white block">TZS {totalRevenueSum.toLocaleString()}</strong>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                ✓ Paid & Verified
                              </span>
                            </div>
                            <div className="flex flex-col items-end justify-between h-full gap-4 shrink-0">
                              <GripVertical className="h-4 w-4 text-slate-300 cursor-grab shrink-0 opacity-40 hover:opacity-100" />
                              <div className="h-12 w-12 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-800/60 shadow-2xs">
                                <TrendingUp className="h-5 w-5" />
                              </div>
                            </div>
                          </div>
                        );
                      case 'registeredCustomers':
                        return (
                          <div key="registeredCustomers" {...dragProps} className={cardStyle}>
                            {/* Rich Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3.5 bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/80 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 pointer-events-none">
                              <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
                                <span className="font-extrabold text-slate-200 flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                                  {language === 'SW' ? 'Mchanganuo wa Wateja' : 'Customer Metrics'}
                                </span>
                                <span className="text-[10px] text-indigo-300 font-mono font-bold">CRM Active</span>
                              </div>
                              <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Wateja Walioandikishwa' : 'Total Registered'}:</span>
                                  <strong className="font-mono text-white">{totalRegisteredClients} {language === 'SW' ? 'Watu' : 'clients'}</strong>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Waliowahi Kununua' : 'Active Spenders'}:</span>
                                  <strong className="font-mono text-indigo-300">{activeCustomersCount} {language === 'SW' ? 'Wateja' : 'buyers'}</strong>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Wastani wa Matumizi' : 'Avg Spend/Client'}:</span>
                                  <strong className="font-mono text-white">TZS {avgRevenuePerCustomer.toLocaleString()}</strong>
                                </div>
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95 dark:border-t-slate-800/95"></div>
                            </div>

                            <div className="space-y-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-400 block">Registered Customers</span>
                                <Info className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <strong className="text-xl sm:text-2xl font-mono font-black tracking-tight text-slate-900 dark:text-white block">{totalRegisteredClients} Profiles</strong>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9.5px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                CRM Client Base
                              </span>
                            </div>
                            <div className="flex flex-col items-end justify-between h-full gap-4 shrink-0">
                              <GripVertical className="h-4 w-4 text-slate-300 cursor-grab shrink-0 opacity-40 hover:opacity-100" />
                              <div className="h-12 w-12 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800/60 shadow-2xs">
                                <Users className="h-5 w-5" />
                              </div>
                            </div>
                          </div>
                        );
                      case 'pendingBills':
                        return (
                          <div key="pendingBills" {...dragProps} className={cardStyle}>
                            {/* Rich Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3.5 bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/80 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 pointer-events-none">
                              <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
                                <span className="font-extrabold text-slate-200 flex items-center gap-1">
                                  <FileSpreadsheet className="h-3.5 w-3.5 text-amber-400" />
                                  {language === 'SW' ? 'Mchanganuo wa Ankara' : 'Receivables Insight'}
                                </span>
                                <span className="text-[10px] text-amber-300 font-mono font-bold">Unpaid</span>
                              </div>
                              <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Ankara Zinazosubiri' : 'Pending Invoices'}:</span>
                                  <strong className="font-mono text-amber-300">{totalPendingBills} {language === 'SW' ? 'Hati' : 'bills'}</strong>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Jumla ya Madeni' : 'Outstanding Value'}:</span>
                                  <strong className="font-mono text-white">TZS {pendingInvoicesTotal.toLocaleString()}</strong>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Hatua' : 'Status'}:</span>
                                  <strong className="font-mono text-slate-300">{language === 'SW' ? 'Inasubiri Malipo' : 'Awaiting Payment'}</strong>
                                </div>
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95 dark:border-t-slate-800/95"></div>
                            </div>

                            <div className="space-y-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-400 block">Draft / Pending Invoices</span>
                                <Info className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <strong className="text-xl sm:text-2xl font-mono font-black tracking-tight text-slate-900 dark:text-white block">{totalPendingBills} Pending</strong>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9.5px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                Awaiting Payment
                              </span>
                            </div>
                            <div className="flex flex-col items-end justify-between h-full gap-4 shrink-0">
                              <GripVertical className="h-4 w-4 text-slate-300 cursor-grab shrink-0 opacity-40 hover:opacity-100" />
                              <div className="h-12 w-12 bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 rounded-2xl flex items-center justify-center border border-amber-100 dark:border-amber-800/60 shadow-2xs">
                                <FileSpreadsheet className="h-5 w-5" />
                              </div>
                            </div>
                          </div>
                        );
                      case 'stockAlerts':
                        return (
                          <div key="stockAlerts" {...dragProps} className={cardStyle}>
                            {/* Rich Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3.5 bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/80 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 pointer-events-none">
                              <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
                                <span className="font-extrabold text-slate-200 flex items-center gap-1">
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                                  {language === 'SW' ? 'Afya ya Stoki' : 'Inventory Health'}
                                </span>
                                <span className={`text-[10px] font-mono font-bold ${lowStockCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {lowStockCount > 0 ? 'Action Needed' : 'Optimal'}
                                </span>
                              </div>
                              <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Bidhaa Chini ya Kiwango' : 'Below Min Limit'}:</span>
                                  <strong className="font-mono text-red-400">{lowStockCount} {language === 'SW' ? 'Aina' : 'SKUs'}</strong>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Bidhaa Zilizokwisha Kabisa' : 'Zero Stock (Depleted)'}:</span>
                                  <strong className="font-mono text-rose-300">{zeroStockCount} {language === 'SW' ? 'items' : 'items'}</strong>
                                </div>
                                <div className="flex justify-between text-slate-300">
                                  <span>{language === 'SW' ? 'Jumla ya Katalogi' : 'Total Catalog Items'}:</span>
                                  <strong className="font-mono text-white">{products.length} {language === 'SW' ? 'Aina' : 'products'}</strong>
                                </div>
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95 dark:border-t-slate-800/95"></div>
                            </div>

                            <div className="space-y-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-400 block">Depleted / Stock Warnings</span>
                                <Info className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <strong className={`text-xl sm:text-2xl font-mono font-black tracking-tight block ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{lowStockCount} Items Alerts</strong>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9.5px] font-bold ${lowStockCount > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                {lowStockCount > 0 ? 'Requires Reorder' : 'Stock Levels Good'}
                              </span>
                            </div>
                            <div className="flex flex-col items-end justify-between h-full gap-4 shrink-0">
                              <GripVertical className="h-4 w-4 text-slate-300 cursor-grab shrink-0 opacity-40 hover:opacity-100" />
                              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border shadow-2xs ${lowStockCount > 0 ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 animate-pulse' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900/60'}`}>
                                <AlertTriangle className="h-5 w-5" />
                              </div>
                            </div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  }))}
                  {!isDataLoading && kpiOrder.filter((cardId) => kpiVisibility[cardId] !== false).length === 0 && (
                    <div className="col-span-1 sm:col-span-2 lg:col-span-4 p-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500 animate-fade-in flex flex-col items-center justify-center py-10 w-full">
                      <EyeOff className="h-8 w-8 text-slate-400 mb-2 animate-pulse" />
                      <strong className="text-xs uppercase tracking-wider block font-black text-slate-700 dark:text-slate-350 mb-1">
                        {language === 'SW' ? 'Kadi Zote za KPI Zimefichwa' : 'All KPI Cards Hidden'}
                      </strong>
                      <p className="text-[10px] text-slate-400 font-medium max-w-xs leading-relaxed">
                        {language === 'SW'
                          ? 'Nenda kwenye kitufe cha "Mipangilio ya Kadi" hapo juu au wenye Mipangilio ili kurejesha utazamaji wa takwimu zako za kibiashara.'
                          : 'Toggle the checkmarks inside the "User Settings" configuration panel above to reveal specific metrics and statistics.'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Split Grid row: Analytics graph chart on the left, interactive drag-and-drop upload hub on the right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              <div className="lg:col-span-7">
                {/* PAST FIVE DAYS TRANSACTION CHART */}
                {(() => {
                  const chartData = getLastFiveDaysMetrics();
                  const maxVal = Math.max(...chartData.map(d => Math.max(d.sales, d.expenses)), 100000);
                  return (
                    <div className="bg-white dark:bg-slate-950 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs h-full flex flex-col justify-between">
                      <div className="flex justify-between items-center border-b pb-3 mb-1 border-slate-100 dark:border-slate-800">
                        <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1.5 matches-font">
                          <TrendingUp className="h-4 w-4 text-emerald-600 animate-pulse" />
                          <span>{language === 'SW' ? 'Mienendo ya Kifedha ya Siku 5 (Mauzo vs Gharama)' : '5-Day Financial Trend Analytics (Sales vs Expenses)'}</span>
                        </span>
                        <div className="flex items-center gap-3 text-[10px] font-extrabold">
                          <span className="flex items-center gap-1 text-slate-650 dark:text-slate-300">
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
                            <span>{language === 'SW' ? 'Mauzo' : 'Sales Revenue'}</span>
                          </span>
                          <span className="flex items-center gap-1 text-slate-650 dark:text-slate-300">
                            <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span>
                            <span>{language === 'SW' ? 'Gharama' : 'Expenses'}</span>
                          </span>
                        </div>
                      </div>

                      {transactions.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 font-medium my-auto">
                          {language === 'SW' ? 'Fanya uuzaji au manunuzi ili kusasisha grafu ya mienendo' : 'Log a POS sale or inventory purchase to generate dynamic trend series here.'}
                        </div>
                      ) : (
                        <div className="pt-4 pb-2">
                          {/* Custom SVG/CSS Flex Columns Bar Chart */}
                          <div className="relative h-44 flex items-end justify-between gap-4 border-b border-l border-slate-100 dark:border-slate-800 px-4 pb-1">
                            
                            {/* Background guide lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40 pr-4">
                              <div className="border-b border-slate-100 dark:border-slate-850 h-0"></div>
                              <div className="border-b border-slate-100 dark:border-slate-850 h-0"></div>
                              <div className="border-b border-slate-100 dark:border-slate-850 h-0"></div>
                              <div className="h-0"></div>
                            </div>

                            {chartData.map((day, dIdx) => {
                              const salesPercent = (day.sales / maxVal) * 100;
                              const expensesPercent = (day.expenses / maxVal) * 100;

                              return (
                                <div key={dIdx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                                  
                                  {/* Enhanced Bar Tooltip on hover */}
                                  <div className="absolute -top-24 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 bg-slate-900/95 dark:bg-slate-800/95 text-white p-3 rounded-xl shadow-2xl text-[10px] z-30 pointer-events-none flex flex-col gap-1 border border-slate-700/80 w-44 backdrop-blur-xs">
                                    <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-0.5">
                                      <span className="font-extrabold text-slate-200">{day.label}</span>
                                      <span className="text-[9px] text-slate-400 font-mono">{day.sales >= day.expenses ? 'Profit' : 'Loss'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-emerald-400 font-mono font-bold">
                                      <span>{language === 'SW' ? 'Mauzo' : 'Sales'}:</span>
                                      <span>TZS {day.sales.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-rose-400 font-mono font-bold">
                                      <span>{language === 'SW' ? 'Gharama' : 'Expenses'}:</span>
                                      <span>TZS {day.expenses.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-slate-700/60 font-mono font-extrabold text-white">
                                      <span>{language === 'SW' ? 'Faida' : 'Net Margin'}:</span>
                                      <span className={day.sales >= day.expenses ? 'text-emerald-300' : 'text-rose-300'}>
                                        {day.sales >= day.expenses ? '+' : ''}TZS {(day.sales - day.expenses).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95 dark:border-t-slate-800/95"></div>
                                  </div>

                                  {/* Dual Bars stack */}
                                  <div className="flex gap-1.5 items-end w-full justify-center flex-1 max-w-[80px] z-10 h-full">
                                    {/* Sales Bar */}
                                    <div className="w-1/2 flex flex-col justify-end h-full">
                                      <div 
                                        style={{ height: day.sales > 0 ? `${Math.max(4, salesPercent)}%` : '0%' }}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 hover:dark:bg-emerald-500 rounded-t transition-all duration-300 shadow-xs cursor-pointer"
                                      ></div>
                                    </div>

                                    {/* Expenses Bar */}
                                    <div className="w-1/2 flex flex-col justify-end h-full">
                                      <div 
                                        style={{ height: day.expenses > 0 ? `${Math.max(4, expensesPercent)}%` : '0%' }}
                                        className="w-full bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 hover:dark:bg-rose-500 rounded-t transition-all duration-300 shadow-xs cursor-pointer"
                                      ></div>
                                    </div>
                                  </div>

                                  {/* Axis Day label */}
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-tight mt-1 truncate max-w-full">
                                    {day.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Side drag and drop uploader hub card */}
              <div className="lg:col-span-5">
                <QuickUploadHub 
                  language={language}
                  userEmail={currentUser.email}
                  currentBranch={currentBranch}
                  onRefreshData={loadData}
                />
              </div>

            </div>

            {/* Visual rows layout - Main stats grids */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column Ledger ledger trail - Col 8 */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-950 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
                <div className="border-b pb-2.5 flex items-center justify-between border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                  <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-indigo-650" />
                    <span>HQ General Ledger transactions feeds</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <ExportButton
                      onExportPDF={() => exportLedgerToPDF(transactions, language)}
                      onExportCSV={() => exportLedgerToCSV(transactions, language)}
                      language={language}
                      label={language === 'SW' ? 'Pakua Ledger' : 'Export Ledger'}
                    />
                    <button
                      onClick={() => {
                        setIsDataLoading(true);
                        loadData();
                        setTimeout(() => setIsDataLoading(false), 450);
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors cursor-pointer border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg"
                      title={language === 'SW' ? 'Sasisha Hatifahali' : 'Sync Ledger Data'}
                    >
                      <RefreshCw className={`h-3 w-3 ${isDataLoading ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
                      <span>{isDataLoading ? (language === 'SW' ? 'Inapakia...' : 'Syncing...') : (language === 'SW' ? 'Sasisha' : 'Sync')}</span>
                    </button>
                  </div>
                </div>

                {isDataLoading ? (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-3.5 bg-slate-100/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between animate-pulse">
                        <div className="space-y-2">
                          <div className="h-4 w-44 bg-slate-300 dark:bg-slate-700 rounded-md"></div>
                          <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                        </div>
                        <div className="h-5 w-24 bg-slate-300 dark:bg-slate-700 rounded-md"></div>
                      </div>
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <p className="text-center text-slate-400 py-12">No operations logged yet. Complete POS register checkouts or procure stocks to inflate journals.</p>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {transactions.slice(0, 10).map((tx) => (
                      <div key={tx.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between hover:bg-slate-100/60 dark:hover:bg-slate-900 transition-all text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-white font-bold block">{tx.description || tx.categoryId}</strong>
                          <span className="text-[9.5px] text-slate-405 font-mono">{tx.date} | Branch: {tx.branchId === 'branch-main' ? 'HQ' : 'Branch Node'}</span>
                        </div>

                        <strong className={`font-mono font-black ${tx.type === 'Sale' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {tx.type === 'Sale' ? '+' : '-'} TZS {tx.amount.toLocaleString()}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column Warnings side block - Col 4 */}
              <div className="lg:col-span-4 space-y-4">
                
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4 shadow-xs">
                  <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block border-b pb-2.5 border-slate-100 dark:border-slate-800">Depleted Stocks Warning panel</span>
                  
                  {products.length === 0 ? (
                    <p className="text-slate-400 text-center py-6">Stock catalogues empty. Register products.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {products.map((p) => {
                        const bQty = p.branchStock[currentBranch] ?? 0;
                        const isWarning = bQty <= p.reorderLevel;
                        return (
                          <div key={p.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border flex justify-between items-center">
                            <div className="flex-1 pr-2">
                              <span className="font-black text-slate-805 dark:text-slate-100 block line-clamp-1">{p.name}</span>
                              <span className="text-[9.5px] font-mono text-slate-450 block mt-0.5">SKU: {p.sku} | Buf: {p.reorderLevel} pcs</span>
                            </div>

                            <span className={`font-mono font-black text-xs px-2 py-0.5 rounded ${bQty <= 0 ? 'bg-red-100 text-red-900' : isWarning ? 'bg-amber-100 text-amber-900' : 'bg-slate-100'}`}>
                              {bQty} pcs
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        );
    }
  };

  const getBreadcrumbInfo = (tab: string) => {
    const map: Record<string, { categoryEN: string; categorySW: string; labelEN: string; labelSW: string }> = {
      dashboard: { categoryEN: 'Overview', categorySW: 'Muhtasari', labelEN: 'Dashboard', labelSW: 'Mwanzo' },
      pos: { categoryEN: 'Operations', categorySW: 'Shughuli', labelEN: 'Point of Sale (POS)', labelSW: 'Mauzo ya Haraka (POS)' },
      inventory: { categoryEN: 'Operations', categorySW: 'Shughuli', labelEN: 'Inventory Management', labelSW: 'Usimamizi wa Stoki' },
      invoicing: { categoryEN: 'Operations', categorySW: 'Shughuli', labelEN: 'Invoices & Receipts', labelSW: 'Ankara na Risiti' },
      crm: { categoryEN: 'Relationships', categorySW: 'Wateja', labelEN: 'CRM & Accounts', labelSW: 'Wateja na Mawasiliano' },
      suppliers: { categoryEN: 'Relationships', categorySW: 'Wafanyakazi', labelEN: 'Suppliers & Staff HR', labelSW: 'Mawakala na HR' },
      accounting: { categoryEN: 'Financials', categorySW: 'Fedha', labelEN: 'Accounting & Ledger', labelSW: 'Hesabu na Ripoti' },
      ecommerce: { categoryEN: 'Financials', categorySW: 'Biashara', labelEN: 'Online Storefront', labelSW: 'Duka la Mtandaoni' },
      pricing: { categoryEN: 'Catalog', categorySW: 'Katalogi', labelEN: 'Price Catalog', labelSW: 'Orodha ya Bei' },
      documents: { categoryEN: 'Vault', categorySW: 'Makabrasha', labelEN: 'Document Center', labelSW: 'Hati na Makabrasha' },
      backup: { categoryEN: 'System', categorySW: 'Mfumo', labelEN: 'Cloud Backup & Sync', labelSW: 'Hifadhi na Kurejesha' },
      ai: { categoryEN: 'Intelligence', categorySW: 'Akili Bandia', labelEN: 'AI Business Assistant', labelSW: 'Msaidizi wa AI' },
      settings: { categoryEN: 'System', categorySW: 'Mfumo', labelEN: 'Settings & Audit Logs', labelSW: 'Mipangilio na Audit' }
    };

    const info = map[tab] || { categoryEN: 'Workspace', categorySW: 'Kituo', labelEN: tab.toUpperCase(), labelSW: tab.toUpperCase() };
    return {
      category: language === 'SW' ? info.categorySW : info.categoryEN,
      label: language === 'SW' ? info.labelSW : info.labelEN
    };
  };

  const currentBreadcrumb = getBreadcrumbInfo(activeTab);

  return (
    verifyType ? (
      <div className="min-h-screen bg-slate-900 border-t-4 border-indigo-600 flex flex-col items-center justify-center p-4 selection:bg-indigo-600 select-none font-sans text-xs">
        <div className="max-w-md w-full bg-slate-950 rounded-2xl border border-slate-805 dark:border-slate-800 p-6 space-y-5 shadow-2xl relative text-slate-200">
          
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse absolute -mt-5 -mr-5"></span>
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-sm font-black text-white uppercase tracking-wider">
              {language === 'SW' ? 'Uhakiki wa Mfumo Umekamilika' : 'System Verification Secure Code'}
            </h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1 justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>{language === 'SW' ? 'Sahihi na Imethibitishwa' : 'Verified & Registered'}</span>
            </p>
          </div>

          {/* Tabs for Verification Mode */}
          <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setVerifyPlainTextMode(false)}
              className={`py-1.5 rounded-lg font-black text-[9.5px] uppercase tracking-wider transition-all cursor-pointer ${
                !verifyPlainTextMode
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-300'
              }`}
            >
              {language === 'SW' ? 'Uhakiki kamili (GUI)' : 'Interactive GUI'}
            </button>
            <button
              type="button"
              onClick={() => setVerifyPlainTextMode(true)}
              className={`py-1.5 rounded-lg font-black text-[9.5px] uppercase tracking-wider transition-all cursor-pointer ${
                verifyPlainTextMode
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-300'
              }`}
            >
              {language === 'SW' ? 'Maandishi Tu (Plain Text)' : 'Plain Text Only'}
            </button>
          </div>

          {!verifyPlainTextMode ? (
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2.5 font-mono text-[10.5px]">
              <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                <span className="text-slate-455 font-bold">{language === 'SW' ? 'Aina ya Nyaraka' : 'Document Type'}</span>
                <span className="font-extrabold text-white text-right uppercase font-sans tracking-wide">
                  {verifyType === 'receipt' ? (language === 'SW' ? 'Lisiti ya Malipo (Receipt)' : 'Cash Receipt') :
                   verifyType === 'invoice' ? (language === 'SW' ? 'Ankara Rasmi (Invoice)' : 'Commercial Invoice') :
                   verifyType === 'quotation' ? (language === 'SW' ? 'Makadirio ya Bei (Quotation)' : 'Price Estimate') :
                   verifyType === 'product' ? (language === 'SW' ? 'Taarifa za Bidhaa (Product)' : 'Verified Product Card') :
                   verifyType === 'backupReport' ? (language === 'SW' ? 'Hifadhi ya Mfumo (System Backup)' : 'System Audit Backup') :
                   verifyType}
                </span>
              </div>

              {verifyRef && (
                <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-450 font-bold">{verifyType === 'product' ? 'SKU / Barcode' : 'Ref No / Hash'}</span>
                  <span className="font-bold text-white text-right select-all">{verifyRef}</span>
                </div>
              )}

              {verifyId && verifyId !== verifyRef && (
                <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-450 font-bold">Document ID</span>
                  <span className="font-bold text-white text-right font-mono text-[9px] truncate max-w-[180px]">{verifyId}</span>
                </div>
              )}

              {verifyClient && (
                <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-455 font-bold">
                    {verifyType === 'product'
                      ? (language === 'SW' ? 'Jina la Bidhaa' : 'Product Name')
                      : (language === 'SW' ? 'Mteja' : 'Customer / Client')}
                  </span>
                  <span className="font-bold text-yellow-500 text-right">{decodeURIComponent(verifyClient)}</span>
                </div>
              )}

              {verifyAmount && (
                <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-455 font-bold">
                    {verifyType === 'product'
                      ? (language === 'SW' ? 'Bei Kuu ya Reja' : 'Retail Selling Price')
                      : (language === 'SW' ? 'Kiasi Kamili' : 'Amount Total')}
                  </span>
                  <span className="font-black text-emerald-400 text-right text-xs">TZS {Number(verifyAmount).toLocaleString()}</span>
                </div>
              )}

              {verifySales && (
                <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-455 font-bold">{language === 'SW' ? 'Miamala ya Wiki' : 'Weekly Revenues'}</span>
                  <span className="font-black text-emerald-400 text-right">TZS {Number(verifySales).toLocaleString()}</span>
                </div>
              )}

              {verifyItems && (
                <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-455 font-bold">{language === 'SW' ? 'Bidhaa Stoki' : 'SKU Count'}</span>
                  <span className="font-bold text-white text-right">{verifyItems} Items</span>
                </div>
              )}

              {verifyDate && (
                <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                  <span className="text-slate-455 font-bold">
                    {verifyType === 'product'
                      ? (language === 'SW' ? 'Kundi la Bidhaa' : 'Product Category')
                      : (language === 'SW' ? 'Saa na Tarehe' : 'Created Date')}
                  </span>
                  <span className="font-bold text-indigo-450 text-right">{decodeURIComponent(verifyDate)}</span>
                </div>
              )}

              <div className="flex justify-between pt-1">
                <span className="text-slate-450 font-bold">Status</span>
                <span className="font-extrabold text-emerald-400 text-right uppercase">COMMERCIAL AUTHENTIC / SAHIHI</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[10.5px] leading-relaxed text-emerald-400 select-all overflow-x-auto whitespace-pre">
                {`==================================\n` +
                 `      DUKA OS AUTHENTIC TEXT      \n` +
                 `==================================\n` +
                 `Nyaraka: ${verifyType === 'receipt' ? 'RISITI' : verifyType === 'product' ? 'TAARIFA YA BIDHAA' : 'ANKARA'}\n` +
                 (verifyRef ? `Kumbukumbu: ${verifyRef}\n` : '') +
                 (verifyClient ? `${verifyType === 'product' ? 'Bidhaa' : 'Mteja'}: ${decodeURIComponent(verifyClient)}\n` : '') +
                 (verifyAmount ? `${verifyType === 'product' ? 'Bei' : 'Kiasi'}: TZS ${Number(verifyAmount).toLocaleString()}\n` : '') +
                 (verifyDate ? `${verifyType === 'product' ? 'Kundi' : 'Tarehe'}: ${decodeURIComponent(verifyDate)}\n` : '') +
                 `Hali: SAHIHI NA THABITI\n` +
                 `==================================\n` +
                 `      DEV TEK INNOVATION ERP      `}
              </pre>
              <p className="text-[9px] text-slate-455 italic text-center">
                {language === 'SW' ? 'Unaweza kunakili maandishi haya moja kwa moja' : 'Press hold on terminal block to select and copy raw text'}
              </p>
            </div>
          )}

          <div className="p-3 bg-slate-905 rounded-xl border border-rose-500/10 text-slate-400 text-[9px] leading-relaxed">
            🛡️ <strong>Certified Digital Verification Ledger Node</strong><br/>
            This snapshot document captures a secure digital signature registered in your local ERP database store. Scanning verifies the validation parameters were computed strictly within active certified modules.
          </div>

          <div className="flex justify-center gap-2">
            <button
              onClick={() => {
                window.location.href = window.location.origin;
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase rounded-xl text-[10px] tracking-wider cursor-pointer"
            >
              {language === 'SW' ? 'Funga & Nenda Kwenye ERP' : 'Close & Return to Workspaces'}
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Upper Navigation Row with dynamic triggers */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        language={language} 
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        currentBranch={currentBranch}
        setCurrentBranch={setCurrentBranch}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        branches={branches}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />

      {/* Main Core Router container - Sidebar offset layout */}
      <main className={`transition-all duration-300 pt-14 md:pt-6 p-4 md:p-6 lg:p-8 animate-fade-in ${
        sidebarCollapsed ? 'md:pl-20' : 'md:pl-72'
      }`}>
        <div className="w-full max-w-7xl mx-auto space-y-6">
          {/* Lightweight Modern Breadcrumb Navigation */}
          <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200/60 dark:border-slate-800/80">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-slate-700 dark:text-slate-200 font-bold"
              title={language === 'SW' ? 'Rudi Kwenye Mwanzo' : 'Return to Dashboard'}
            >
              <Home className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>DUKA OS</span>
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-slate-350 dark:text-slate-600 shrink-0" />
            <span className="text-slate-400 dark:text-slate-500">{currentBreadcrumb.category}</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-350 dark:text-slate-600 shrink-0" />
            <span className="font-extrabold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50 text-[11px] shadow-2xs">
              {currentBreadcrumb.label}
            </span>
          </nav>

          {renderTabContent()}
        </div>
      </main>

      {/* Global interactive Print Preview and Diagnostics Console Modal */}
      <PrintPreviewModal language={language} theme={theme} />

      {/* Guided Tour Modal overlay for first login or user replay on demand */}
      <GuidedTour 
        show={showTour} 
        onClose={() => setShowTour(false)} 
        setActiveTab={setActiveTab} 
        language={language} 
      />

      {/* Toast Alert System for low stock items below reorder warning limits */}
      <ReorderToast
        show={showReorderToast}
        onClose={() => {
          setShowReorderToast(false);
          setHasDismissedReorder(true);
          sessionStorage.setItem('SmartERP_DismissedReorder', 'true');
        }}
        lowStockProducts={lowStockProducts}
        currentBranch={currentBranch}
        language={language}
        onNavigateToInventory={() => setActiveTab('inventory')}
      />

      {/* Global Hidden Keyboard Command Palette Triggered via Cmd/Ctrl + K */}
      <CommandPalette 
        isOpen={commandPaletteOpen}
        setIsOpen={setCommandPaletteOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        currentUser={currentUser}
      />

      {/* Interactive Theme & Visual Design Studio Modal */}
      <ThemeStudioModal
        isOpen={showThemeStudio}
        onClose={() => setShowThemeStudio(false)}
        currentTheme={theme}
        setTheme={setTheme}
        language={language}
      />

      {/* PWA Floating Install Prompt for Mobile (Android / iOS) and Desktop */}
      <PWAInstallPrompt language={language} />

    </div>)
  );
}
