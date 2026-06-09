/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  HelpCircle, 
  AlertCircle, 
  Compass, 
  FilePieChart,
  Lightbulb,
  CheckCircle,
  Database,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Clock,
  ArrowUpRight,
  Percent,
  Award
} from 'lucide-react';
import { db } from '../db';
import { translations } from '../translations';

interface AIAssistantProps {
  language: 'EN' | 'SW';
}

export default function AIAssistant({ language }: AIAssistantProps) {
  const t = translations[language];

  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [auditData, setAuditData] = useState<{
    totalSales: number;
    totalExpenses: number;
    netCash: number;
    cashSales: number;
    mobileSales: number;
    bankSales: number;
    totalProducts: number;
    lowStock: any[];
    highMargin: any[];
    advice1: string;
    advice2: string;
    advice3: string;
  } | null>(null);

  const runAiAudit = async () => {
    setLoading(true);
    setErrorMsg('');
    setRecommendations('');

    // Artificially delay for ~600ms to give realistic computing feel
    await new Promise((resolve) => setTimeout(resolve, 600));

    const products = db.getProducts();
    const transactions = db.getTransactions();
    const invoices = db.getInvoices();

    try {
      // Perform robust local analytics calculations
      const totalProducts = products.length;
      
      // Transactions financial metrics
      let totalSales = 0;
      let totalExpenses = 0;
      let cashSales = 0;
      let bankSales = 0;
      let mobileSales = 0;

      transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'Sale') {
          totalSales += amt;
          const pm = (t.paymentMethod || 'Cash').toLowerCase();
          if (pm.includes('cash') || pm.includes('taslim')) {
            cashSales += amt;
          } else if (pm.includes('mobile') || pm.includes('tigopesa') || pm.includes('mpesa') || pm.includes('m-pesa') || pm.includes('airtel') || pm.includes('money')) {
            mobileSales += amt;
          } else {
            bankSales += amt;
          }
        } else if (t.type === 'Expense') {
          totalExpenses += amt;
        }
      });

      const netCash = totalSales - totalExpenses;

      // Inventory warning level items (low stock / out of stock)
      const lowStockProducts = products.filter(p => {
        const level = typeof p.reorderLevel === 'number' ? p.reorderLevel : 5;
        return p.quantity <= level;
      });

      // High Margin products calculation
      const marginProducts = products
        .map(p => {
          const bp = Number(p.costPrice) || 0;
          const rp = Number(p.sellingPrice) || 0;
          let margin = 0;
          if (rp > 0 && bp > 0) {
            margin = ((rp - bp) / rp) * 100;
          } else if (rp > 0 && bp === 0) {
            margin = 100; // free buying price
          }
          return { ...p, margin, bp, rp };
        })
        .filter(p => p.margin > 0)
        .sort((a, b) => b.margin - a.margin);

      const highMarginProducts = marginProducts.slice(0, 4);

      // Contextual Strategic advice based on results and logic triggers
      let advice1 = '';
      let advice2 = '';
      let advice3 = '';

      if (language === 'SW') {
        // Swahili Advice Logic
        if (netCash > 0 && lowStockProducts.length > 0) {
          advice1 = `**Uboreshaji wa Stoki:** Una mtiririko chanya wa fedha (\`TZS ${netCash.toLocaleString()}\`). Una bidhaa zenye mzunguko mdogo sasaivi. Tumia asilimia ya faida kuagiza upya bidhaa zenye faida kubwa kama vile **${highMarginProducts[0]?.name || 'bidhaa zako thabiti'}** kwanza kabisa.`;
        } else if (netCash <= 0) {
          advice1 = `**Uangalifu wa Mtiririko wa Fedha:** Mtiririko wa fedha ni \`TZS ${netCash.toLocaleString()}\`. Zingatia kwa umakini kupunguza matumizi ya uendeshaji yasiyo ya lazima na fanya kampeni za kuuza bidhaa zilizopo stoki kwa kupitia ofa ili kuongeza ukwasi wa haraka.`;
        } else {
          advice1 = `**Uboreshaji wa Ghala:** Mzunguko wako wa stoki upo salama bila alarms zozote kwa bidhaa zako zilizosajiliwa. Endelea kudumisha viwango hivi vya utendaji!`;
        }

        if (highMarginProducts.length > 0) {
          advice2 = `**Kupandisha Thamani (Margin Focus):** Bidhaa yako ya **${highMarginProducts[0]?.name || ''}** ina faida kubwa ya \`${highMarginProducts[0]?.margin.toFixed(1)}%\`. Weka mikakati ya kuipromoti zaidi kwenye ukurasa wa mbele au fanya vifurushi (bundles) ili kuwashawishi wateja wetu kuinunua zaidi.`;
        } else {
          advice2 = `**Mkakati wa Bei:** Bidhaa zako hazina rekodi za bei za kununulia au kuuzia ili kukokotoa faida. Tafadhali hakikisha unasajili bei ya ununuzi na ya mauzo kwa usahihi kwa bidhaa zote kwenye kitalu/bei.`;
        }

        const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Draft');
        if (unpaidInvoices.length > 0) {
          const debtValue = unpaidInvoices.reduce((sum, inv) => sum + (inv.grandTotal - inv.amountPaid), 0);
          advice3 = `**Kukusanya Madeni kwa Wateja:** Kuna ankara ambazo hazijalipwa kikamilifu zenye thamani ya \`TZS ${debtValue.toLocaleString()}\`. Tuma vikumbusho vya malipo kwa wateja ili kuhakikisha mtiririko thabiti vya fedha.`;
        } else {
          advice3 = `**Udhibiti wa Madeni:** Hongera! Anwani za wateja na ankara zote zinasimamiwa vizuri, huna upotevu wa fedha kwenye risiti zilizoripotiwa.`;
        }

      } else {
        // English Advice Logic
        if (netCash > 0 && lowStockProducts.length > 0) {
          advice1 = `**Inventory Optimization:** You have a healthy net cash flow of \`TZS ${netCash.toLocaleString()}\`. Since you have items currently running low, immediately re-allocate capital to restock top-sellers, particularly high-margin products like **${highMarginProducts[0]?.name || 'your key items'}**.`;
        } else if (netCash <= 0) {
          advice1 = `**Cash Flow Alert:** Net operational cash flow is \`TZS ${netCash.toLocaleString()}\`. Focus on decreasing overheads, halting non-critical spending, and running clearance promotions to unlock immediate liquid cash.`;
        } else {
          advice1 = `**Warehouse Stability:** Your registered products are well-balanced with no depletion alerts. Keep tracking transaction cycles to maintain this efficiency.`;
        }

        if (highMarginProducts.length > 0) {
          advice2 = `**Margin Multiplication:** Your product **${highMarginProducts[0]?.name || ''}** yields a stellar gross margin of \`${highMarginProducts[0]?.margin.toFixed(1)}%\`. Maximize stock placement, run bundle campaigns, or prioritize its placement in retail screens to lift overall ROI.`;
        } else {
          advice2 = `**Pricing Engine Alert:** Product acquisition costs are incomplete. Register buying prices along with sell rates in catalog workspace to enable dynamic automated margin auditing.`;
        }

        const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Draft');
        if (unpaidInvoices.length > 0) {
          const debtValue = unpaidInvoices.reduce((sum, inv) => sum + (inv.grandTotal - inv.amountPaid), 0);
          advice3 = `**Receivables & Ledger Leakage:** You have outstanding invoiced receivables of \`TZS ${debtValue.toLocaleString()}\`. Send instant automated system reminders to your pending accounts to avoid liquidity traps.`;
        } else {
          advice3 = `**Receivables Management:** Perfect record! All invoicing records are fully collected or in draft phase with zero current cash leaks.`;
        }
      }

      // Compose fully dynamic local custom report
      let reportText = '';

      if (language === 'SW') {
        reportText = `# 📊 RIPOTI KIPEKEE YA UCHUNGUZI WA BIASHARA (DUKA OS CONSULTANT)
---
### 1. MTIRIRIKO WA FEDHA NA MZUNGUKO WA MAPATO
*   **Jumla ya Mapato ya Mauzo:** \`TZS ${totalSales.toLocaleString()}\`
*   **Jumla ya Matumizi ya Uendeshaji:** \`TZS ${totalExpenses.toLocaleString()}\`
*   **Faida Safi ya Kazi (Net Operational Cash):** **\`TZS ${netCash.toLocaleString()}\`** ${netCash >= 0 ? '📈' : '📉'}
*   **Mgawanyo wa Malipo kulingana na Kumbukumbu:**
    *   *Fedha Taslimu (Cash):* \`TZS ${cashSales.toLocaleString()}\`
    *   *Mitandao ya Simu (Mobile Money):* \`TZS ${mobileSales.toLocaleString()}\`
    *   *Njia Nyingine / Benki:* \`TZS ${bankSales.toLocaleString()}\`

### 2. UHITAJI WA STOKI NA ALAM ZA GHALA (INVENTORY FORECASTS)
*   **Idadi ya Bidhaa Kwenye Orodha:** \`${totalProducts}\` bidhaa tofauti zilizoorodheshwa.
*   **Hali ya Bidhaa Zinazoisha (Low Stock Warning):** ${lowStockProducts.length > 0 ? `⚠️ Kuna bidhaa \`${lowStockProducts.length}\` zenye stoki ya dharura:` : '✅ Salama kabisa! Hakuna bidhaa iliyo chini ya reorder level.'}
${lowStockProducts.slice(0, 5).map(p => `    *   **${p.name}** (SKU: ${p.sku}) | Zilizobaki: \`${p.quantity}\` (Kiwango cha kuagiza: \`${p.reorderLevel || 5}\`)`).join('\n')}

### 3. BIDHAA ZENYE KIWANGO CHA JUU CHA FAIDA (HIGH-MARGIN CHAMPIONS)
*Uchanganuzi huu umepangwa kulingana na asilimia ya faida (Retail Margin Rate):*
${highMarginProducts.length > 0 ? highMarginProducts.map((p, idx) => `    ${idx + 1}. **${p.name}** | Faida: \`${p.margin.toFixed(1)}%\` (Bei ya Ununuzi: \`TZS ${p.bp.toLocaleString()}\` -> Kuuza: \`TZS ${p.rp.toLocaleString()}\`)`).join('\n') : '    *Hakuna bidhaa zenye kumbukumbu za bei ya kununulia sasa hivi kutoa margin.*'}

### 4. USHAURI WA MBINU KULINGANA NA TAKWIMU HALISI (STRATEGIC ACTION CODES)
*   🟢 ${advice1}
*   🔵 ${advice2}
*   ⚡ ${advice3}

---
*Uchanganuzi huu sasa hufanyika papo hapo kienyeji (Locally & Off-Line) ukitumia data halisi ya biashara iliyohifadhiwa. Hakuna kutegemea mtandao au API ya nje.*`;
      } else {
        reportText = `# 📊 REAL-TIME AUTONOMOUS BUSINESS PERFORMANCE AUDIT
---
### 1. FINANCIAL FLOW & CASH CYCLES
*   **Total Checked Sales (Revenue):** \`TZS ${totalSales.toLocaleString()}\`
*   **Total Checked Expenses (Ops Cost):** \`TZS ${totalExpenses.toLocaleString()}\`
*   **Net Cash Flow Balance:** **\`TZS ${netCash.toLocaleString()}\`** ${netCash >= 0 ? '📈' : '📉'}
*   **Payment Gateway Distribution:**
    *   *Cash Sales Volume:* \`TZS ${cashSales.toLocaleString()}\`
    *   *Mobile Money Channels:* \`TZS ${mobileSales.toLocaleString()}\`
    *   *Bank Transfers & Invoiced Ledger:* \`TZS ${bankSales.toLocaleString()}\`

### 2. INVENTORY HEALTH & REORDER LEVELS
*   **Active Catalog Size:** \`${totalProducts}\` registered unique products.
*   **Stock Status (Safety Thresholds):** ${lowStockProducts.length > 0 ? `⚠️ Detected \`${lowStockProducts.length}\` item(s) below reorder levels:` : '✅ Excellent! All items are securely stocked above reorder points.'}
${lowStockProducts.slice(0, 5).map(p => `    *   **${p.name}** (SKU: ${p.sku}) | Current Stock: \`${p.quantity}\` units (Safety Limit: \`${p.reorderLevel || 5}\`)`).join('\n')}

### 3. HIGH-MARGIN PRODUCTS IDENTIFIER (TOP ROI)
*Sorted list of products based on overall retail markup margins:*
${highMarginProducts.length > 0 ? highMarginProducts.map((p, idx) => `    ${idx + 1}. **${p.name}** | Margin: \`${p.margin.toFixed(1)}%\` (Acquisition Cost: \`TZS ${p.bp.toLocaleString()}\` -> Selling Price: \`TZS ${p.rp.toLocaleString()}\`)`).join('\n') : '    *No complete item pricing matches present to calculate markup margins.*'}

### 4. EVIDENCE-BASED STRATEGIC ACTIONABLE INSIGHTS
*   🟢 ${advice1}
*   🔵 ${advice2}
*   ⚡ ${advice3}

---
*Report generated purely using secure on-device calculations. Completely offline, safe, and independent from external API systems.*`;
      }

      setAuditData({
        totalSales,
        totalExpenses,
        netCash,
        cashSales,
        mobileSales,
        bankSales,
        totalProducts,
        lowStock: lowStockProducts,
        highMargin: highMarginProducts,
        advice1,
        advice2,
        advice3
      });
      setRecommendations(reportText);
    } catch (err: any) {
      console.error('Failed to analyze local business data:', err);
      setErrorMsg(err.message || 'Error occurred while running local database query.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAiAudit();
  }, [language]);

  return (
    <div className="space-y-6 text-xs max-w-4xl">
      
      {/* Dynamic Header */}
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-6 rounded-xl text-white space-y-3 relative overflow-hidden border">
        <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
        
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-300 animate-pulse" />
          <span className="font-extrabold text-xs uppercase text-indigo-200 block">Smart Business Intelligence Engine</span>
        </div>

        <h2 className="text-lg font-serif tracking-tight font-bold">
          {language === 'SW' ? 'Mshauri wa Kiuchambuzi wa Biashara' : 'Autonomous Business Performance Consultant'}
        </h2>
        <p className="max-w-xl text-[11px] text-indigo-150 leading-relaxed font-normal">
          {language === 'SW' 
            ? 'Zana hii inachanganua mtiririko kamili wa fedha, mzunguko wa bidhaa, na kutoa makadirio sahihi ya faida ili kukusaidia kufanya maamuzi bora.' 
            : 'Automated diagnostic tools focused on cash cycles, inventory forecasting, high-margin items identification, and detailed analytics.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left guidelines info - Col 1 */}
        <div className="space-y-4 bg-white dark:bg-slate-950 p-4 border border-indigo-100 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest block border-b pb-1">
            {language === 'SW' ? 'Mwongozo wa Mshauri' : 'Intelligence Guide'}
          </span>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold block text-slate-800 dark:text-slate-200">
                  {language === 'SW' ? 'Ripoti Salama' : 'Precise Accounting'}
                </strong>
                <span className="text-[10px] text-slate-450 dark:text-slate-400 block">
                  {language === 'SW' ? 'Uchambuzi hutegemea bidhaa na mauzo yako halisi pekee.' : 'The engine calculates diagnostics based purely on real registered datasets.'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Database className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold block text-slate-800 dark:text-slate-200">
                  {language === 'SW' ? 'Mwenendo wa Stoki' : 'Inventory Triggers'}
                </strong>
                <span className="text-[10px] text-slate-450 dark:text-slate-400 block">
                  {language === 'SW' ? 'Kujua ni bidhaa zipi zinaisha haraka na zinazalisha faida zaidi.' : 'Tracks reordering points and alerts the team on cash cycles.'}
                </span>
              </div>
            </div>
          </div>
 
          <button
            onClick={runAiAudit}
            disabled={loading}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-lg flex items-center justify-center gap-1.5 leading-none transition-all cursor-pointer shadow disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{language === 'SW' ? 'Anza Uchanganuzi Mpya ⚡' : 'Generate Intelligence Audit ⚡'}</span>
          </button>
        </div>

        {/* Right main analysis console - Col 3 */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-950 p-6 rounded-xl border shadow-md min-h-[400px]">
          
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 text-slate-450">
              <Sparkles className="h-10 w-10 text-indigo-600 animate-spin" />
              <p className="font-extrabold text-xs">
                {language === 'SW' ? 'Tunaandaa na kupanga uchambuzi wa biashara...' : 'Analyzing warehouse metrics and ledger balances...'}
              </p>
              <p className="text-[10px] text-slate-400">
                {language === 'SW' ? 'Kukokotoa mtiririko wa fedha na mwenendo wa stoki leo...' : 'Calculating real-time cash flows and stock reorder triggers.'}
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-950 border border-red-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-650 animate-bounce" />
                <strong className="font-bold text-xs uppercase block">
                  {language === 'SW' ? 'Zoezi la Kupata Ripoti Limesimama' : 'Diagnostic Audit Interrupted'}
                </strong>
              </div>
              <p className="text-[10.5px] leading-relaxed">{errorMsg}</p>
              <div className="text-[10px] bg-white dark:bg-slate-900 p-2 border rounded font-mono text-slate-500">
                {language === 'SW' 
                  ? 'Tafadhali weka ufunguo wako (process.env.GEMINI_API_KEY) kwenye zana ya Settings / Secrets kwanza.' 
                  : 'Ensure process.env.GEMINI_API_KEY is configured correctly inside AI Studio Secrets tab before starting calls.'}
              </div>
            </div>
          )}

          {!loading && !errorMsg && auditData && (
            <div className="space-y-6 animate-fade-in text-xs">
              <div className="flex justify-between items-center border-b pb-2.5 border-slate-200 dark:border-slate-800">
                <span className="font-extrabold text-xs text-indigo-650 dark:text-indigo-405 uppercase tracking-widest flex items-center gap-1.5">
                  <FilePieChart className="h-4 w-4 text-indigo-650" />
                  <span>{language === 'SW' ? 'Ripoti ya Uchambuzi Mkuu' : 'Autonomous Intelligence Audit Report'}</span>
                </span>
                <span className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 border-dashed text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase">
                  {language === 'SW' ? 'Uchambuzi Salama (Offline)' : 'Local Engine'}
                </span>
              </div>

              {/* Grid 1: Key Financial Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-slate-450 uppercase font-bold text-[9.5px]">
                    <span>{language === 'SW' ? 'Jumla ya Mauzo' : 'TOTAL SALES REVENUE'}</span>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="font-mono font-black text-sm text-slate-800 dark:text-white">
                    TZS {auditData.totalSales.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 block font-normal">
                    {language === 'SW' ? 'Kiasi kamili cha kila mualala' : 'Gross sales registered'}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-slate-450 uppercase font-bold text-[9.5px]">
                    <span>{language === 'SW' ? 'Gharama za Manunuzi' : 'TOTAL EXPENDITURES'}</span>
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="font-mono font-black text-sm text-slate-800 dark:text-white">
                    TZS {auditData.totalExpenses.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 block font-normal">
                    {language === 'SW' ? 'Gharama ya kuagiza stoki mpya' : 'Total restock procurements'}
                  </span>
                </div>

                <div className={`p-4 border rounded-xl space-y-2 ${auditData.netCash >= 0 ? 'bg-emerald-50/55 border-emerald-205 dark:bg-emerald-950/20 dark:border-emerald-900' : 'bg-rose-50/55 border-rose-205 dark:bg-rose-950/20 dark:border-rose-900'}`}>
                  <div className="flex justify-between items-center text-slate-450 uppercase font-bold text-[9.5px]">
                    <span>{language === 'SW' ? 'Ukwasi Halisi' : 'NET OPERATIONAL LIQUIDITY'}</span>
                    <Percent className={`h-4 w-4 ${auditData.netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                  </div>
                  <div className={`font-mono font-black text-sm ${auditData.netCash >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-455'}`}>
                    TZS {auditData.netCash.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-normal">
                    {language === 'SW' ? 'Mapato safi ya mauzo baridi' : 'Surplus cash flow index'}
                  </span>
                </div>
              </div>

              {/* Payment Gateway Distribution Bars */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border rounded-xl space-y-3">
                <span className="font-black text-[9.5px] uppercase text-slate-500 tracking-wider block">
                  {language === 'SW' ? 'Mchanganuo wa Njia za Malipo kwenye Risiti' : 'Payment Route Volumes on Receipts'}
                </span>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-semibold text-slate-705 dark:text-slate-300">
                      <span>{language === 'SW' ? 'Kiingilio cha Taslim' : 'Retail Cash Payments'}</span>
                      <span className="font-mono font-black">TZS {auditData.cashSales.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${auditData.totalSales > 0 ? (auditData.cashSales / auditData.totalSales) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-semibold text-slate-705 dark:text-slate-300">
                      <span>{language === 'SW' ? 'Mitandao ya Simu' : 'Mobile Payments Gateway'}</span>
                      <span className="font-mono font-black">TZS {auditData.mobileSales.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${auditData.totalSales > 0 ? (auditData.mobileSales / auditData.totalSales) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-semibold text-slate-705 dark:text-slate-300">
                      <span>{language === 'SW' ? 'Malipo ya Benki' : 'Bank & Invoiced Volume'}</span>
                      <span className="font-mono font-black">TZS {auditData.bankSales.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${auditData.totalSales > 0 ? (auditData.bankSales / auditData.totalSales) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Warehouse Health */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border rounded-xl space-y-3">
                  <span className="font-black text-[9.5px] uppercase text-amber-600 tracking-wider block flex items-center gap-1.5 border-b pb-1">
                    <Package className="h-4 w-4 animate-pulse" />
                    <span>{language === 'SW' ? 'Ilani za Kiwango cha Stoki (Low Stock)' : 'Inventory Threshold Alerts'}</span>
                  </span>
                  
                  {auditData.lowStock.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <span>{language === 'SW' ? '✅ Bidhaa zote zina viwango salama vya stoki' : '✅ No safety threshold breaches detected.'}</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {auditData.lowStock.map((p, idx) => (
                        <div key={idx} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 flex justify-between items-center text-[11px]">
                          <div>
                            <strong className="text-slate-800 dark:text-slate-200">{p.name}</strong>
                            <p className="text-[10px] text-slate-450 font-mono">SKU ID: {p.sku}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-rose-600 font-bold font-mono text-xs">{p.quantity} items</span>
                            <p className="text-[9px] text-slate-400">{language === 'SW' ? `Kiwango: ${p.reorderLevel || 5}` : `Safety limit: ${p.reorderLevel || 5}`}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Grid 3: High Margin Products */}
                <div className="p-4 bg-white dark:bg-slate-900 border rounded-xl space-y-3">
                  <span className="font-black text-[9.5px] uppercase text-indigo-650 dark:text-indigo-405 tracking-wider block flex items-center gap-1.5 border-b pb-1">
                    <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{language === 'SW' ? 'Bidhaa Zenye Faida Kiboko (High-Margin)' : 'High-Margin Champions'}</span>
                  </span>

                  {auditData.highMargin.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <span>{language === 'SW' ? 'Hakuna bidhaa ya kukokotoa faida kwasasa' : 'No complete margin mappings found.'}</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-[11px]">
                      {auditData.highMargin.map((p, idx) => (
                        <div key={idx} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                          <div>
                            <strong className="text-slate-800 dark:text-slate-200">{idx + 1}. {p.name}</strong>
                            <p className="text-[9px] text-slate-400">{language === 'SW' ? `TZS ${p.bp.toLocaleString()} → ${p.rp.toLocaleString()}` : `Cost: TZS ${p.bp.toLocaleString()} → Sell: ${p.rp.toLocaleString()}`}</p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-990 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded font-mono">
                            {p.margin.toFixed(1)}% {language === 'SW' ? 'Faida' : 'Margin'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Actionable Recommendations */}
              <div className="p-4 bg-indigo-50/40 dark:bg-slate-900/40 border border-indigo-110 dark:border-slate-800 rounded-xl space-y-3">
                <span className="font-black text-[9.5px] uppercase text-indigo-900 dark:text-indigo-405 tracking-widest block flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-yellow-500 animate-pulse" />
                  <span>{language === 'SW' ? 'Miongozo ya Kimkakati ya Kukuza Utendaji' : 'Evidence-Based Action Insignia'}</span>
                </span>

                <div className="space-y-2 text-xs leading-relaxed">
                  <div className="p-3 bg-white dark:bg-slate-950 border rounded-xl flex gap-2 items-start shadow-sm text-slate-700 dark:text-slate-300">
                    <span className="text-emerald-500 shrink-0 mt-0.5 text-base">🟢</span>
                    <div>{auditData.advice1.replace('**Uboreshaji wa Stoki:**', '').replace('**Uangalifu wa Mtiririko wa Fedha:**', '').replace('**Uboreshaji wa Ghala:**', '').replace('**Inventory Optimization:**', '').replace('**Cash Flow Alert:**', '').replace('**Warehouse Stability:**', '')}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-950 border rounded-xl flex gap-2 items-start shadow-sm text-slate-700 dark:text-slate-300">
                    <span className="text-indigo-505 shrink-0 mt-0.5 text-base text-indigo-500">🔵</span>
                    <div>{auditData.advice2.replace('**Kupandisha Thamani (Margin Focus):**', '').replace('**Mkakati wa Bei:**', '').replace('**Margin Multiplication:**', '').replace('**Pricing Engine Alert:**', '')}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-950 border rounded-xl flex gap-2 items-start shadow-sm text-slate-700 dark:text-slate-300">
                    <span className="text-amber-500 shrink-0 mt-0.5 text-base text-amber-500">⚡</span>
                    <div>{auditData.advice3.replace('**Kukusanya Madeni kwa Wateja:**', '').replace('**Udhibiti wa Madeni:**', '').replace('**Receivables & Ledger Leakage:**', '').replace('**Receivables Management:**', '')}</div>
                  </div>
                </div>
              </div>

              {/* Informational Disclaimer */}
              <p className="text-[10px] font-mono italic text-slate-400 text-center pt-2">
                {language === 'SW' 
                  ? '*Uchambuzi hufanyika papo hapo kienyeji ukitumia algorithms salama za DUKA OS. Salama 100% bila kuhitaji API ya nje wala mtandao.*'
                  : '*Diagnostic report generated completely in local sandboxed memory. 100% private and offline business audit.*'}
              </p>
            </div>
          )}

          {!loading && !errorMsg && !recommendations && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 space-y-3 select-none">
              <Compass className="h-10 w-10 text-slate-300 dark:text-slate-800 animate-pulse" />
              <p className="font-black text-xs uppercase text-slate-650">
                {language === 'SW' ? 'Ripoti Salama Ipo Tayari' : 'Autonomous Analyst Ready'}
              </p>
              <p className="text-[10.5px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                {language === 'SW' 
                  ? 'Gonga kitufe kilichopo kushoto ili kuandaa muhtasari thabiti wa mahesabu, kiasi cha mauzo, na ushauri wa bidhaa.' 
                  : 'Click the action button on the left to review automated metrics, pricing matrix trends, and local business audit guides.'}
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
