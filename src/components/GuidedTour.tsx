/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShoppingCart, 
  Package, 
  FileText, 
  Settings, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  X,
  Play,
  HelpCircle,
  Eye,
  BarChart3,
  Award
} from 'lucide-react';
import { LanguageCode } from '../types';

interface GuidedTourProps {
  show: boolean;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
  language: LanguageCode;
}

interface TourStep {
  id: string;
  tab: string;
  titleEN: string;
  titleSW: string;
  descEN: string;
  descSW: string;
  icon: React.ReactNode;
  visual: React.ReactNode;
}

export default function GuidedTour({ show, onClose, setActiveTab, language }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // When step changes, dynamically switch the background tab to show that module!
  useEffect(() => {
    if (show) {
      const step = steps[currentStep];
      if (step) {
        setActiveTab(step.tab);
      }
    }
  }, [currentStep, show]);

  if (!show) return null;

  const steps: TourStep[] = [
    {
      id: 'welcome',
      tab: 'dashboard',
      titleEN: 'Welcome to DUKA OS! 🛍️',
      titleSW: 'Karibu kwenye Duka OS! 🛍️',
      descEN: 'DUKA OS is your advanced, high-performance retail & enterprise ERP node. Let\'s take a 1-minute interactive tour of your core control panels!',
      descSW: 'Duka OS ni mfumo wako wa kisasa na wenye kasi wa kusimamia mauzo na stoki (ERP). Hebu tuchukue sekunde chache kukupitisha kwenye maeneo muhimu ya kazi!',
      icon: <Sparkles className="h-6 w-6 text-amber-500 animate-pulse" />,
      visual: (
        <div className="h-32 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-4 text-center space-y-2">
          <div className="relative">
            <div className="h-12 w-12 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/30">
              <Award className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 block">DUKA OS v2.0 Enterprise</span>
            <span className="text-[9.5px] text-slate-400 font-medium block">All local databases online & sync active</span>
          </div>
        </div>
      )
    },
    {
      id: 'pos',
      tab: 'pos',
      titleEN: 'Point of Sale (POS) Registry 🛒',
      titleSW: 'Kituo cha Mauzo (POS) 🛒',
      descEN: 'Your frontline revenue engine. Scan barcodes, compile shopping carts, manage quick price tags, execute instant orders, and output professional thermal receipts.',
      descSW: 'Kituo kikuu cha mapato. Kusanya bidhaa kwenye kikapu, weka punguzo la bei haraka, chagua aina ya malipo na uchape risiti za joto (thermal) hapo hapo.',
      icon: <ShoppingCart className="h-6 w-6 text-emerald-500 animate-bounce" />,
      visual: (
        <div className="h-32 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex flex-col justify-between font-mono text-[9px]">
          <div className="flex justify-between items-center border-b pb-1 dark:border-slate-800">
            <span className="font-bold text-slate-400 uppercase">POS REGISTER #01</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 font-extrabold">OPEN</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-slate-650 dark:text-slate-350">
              <span>Dynamic SKU: Rice Super 25kg</span>
              <span>1 pcs x TZS 75,000</span>
            </div>
            <div className="flex justify-between text-slate-650 dark:text-slate-350">
              <span>White Sugar 1kg</span>
              <span>3 pcs x TZS 3,500</span>
            </div>
          </div>
          <div className="flex justify-between border-t border-dashed pt-1 font-bold text-[10.5px] text-slate-800 dark:text-slate-100">
            <span>TOTAL DUE:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-black">TZS 85,500</span>
          </div>
        </div>
      )
    },
    {
      id: 'inventory',
      tab: 'inventory',
      titleEN: 'Smart Inventory & restocks 📦',
      titleSW: 'Meneja wa Stoki na Bidhaa 📦',
      descEN: 'Live catalog tracking. Register unique SKUs, set buffer warnings for minimum reorder points, verify purchase inflow records, and oversee stock levels across multiple branch locations.',
      descSW: 'Usimamizi wa Stoki. Sajili bidhaa zako kwa SKU maalum, weka kikomo cha chini cha alerts ili bidhaa isiishe bila kujua, na dhibiti stoki kwenye tawi hili na matawi mengine.',
      icon: <Package className="h-6 w-6 text-indigo-500" />,
      visual: (
        <div className="h-32 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="font-extrabold text-[10px] text-slate-405 uppercase">Warehouse Catalogue</span>
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">ALERT DEPLETED</span>
          </div>
          <div className="p-2 bg-white dark:bg-slate-950 border rounded flex justify-between items-center">
            <div>
              <strong className="text-slate-850 dark:text-slate-200 block text-[10px]">Premium Wheat Flour 10kg</strong>
              <span className="text-[8.5px] text-slate-400 block font-mono">Reorder Limit: 15 Bags</span>
            </div>
            <span className="font-mono font-black text-xs text-rose-600">8 Bags Left</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: '40%' }}></div>
          </div>
        </div>
      )
    },
    {
      id: 'documents',
      tab: 'documents',
      titleEN: 'Digital Document Center 📄',
      titleSW: 'Kituo Rasmi cha Nyaraka 📄',
      descEN: 'Your enterprise document publisher. Custom-adjust margins, toggle logo positions, enable Eco Ink-Saver mode, and generate high-fidelity vector outputs with integrated security QR authentication codes.',
      descSW: 'Chapisha Nyaraka Rasmi. Rekebisha pembe (margins) za karatasi, badilisha nembo ya kampuni, washa "Eco Ink-Saver" ili kuhifadhi wino wa printa, na andika msimbo salama wa QR kwa uhakiki.',
      icon: <FileText className="h-6 w-6 text-violet-500" />,
      visual: (
        <div className="h-32 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex flex-col gap-2 justify-center">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-405 font-bold text-[9px] flex flex-col items-center justify-center gap-1">
              <span className="text-xs">📄</span> A4 Invoice Standard
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/35 border border-indigo-200 dark:border-indigo-900/55 rounded-lg text-indigo-700 dark:text-indigo-400 font-extrabold text-[9px] flex flex-col items-center justify-center gap-1">
              <span className="text-xs">🧾</span> 80mm Thermal Slip
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] px-1">
            <span className="text-slate-400 font-bold">Eco Ink-Saver Feature</span>
            <span className="text-emerald-600 font-mono font-extrabold">✔ ACTIVE (92% Black text overlay)</span>
          </div>
        </div>
      )
    },
    {
      id: 'settings',
      tab: 'settings',
      titleEN: 'HQ Ledger Audits & Switch-nodes ⚙',
      titleSW: 'Ripoti za Ukaguzi na Mipangilio ⚙',
      descEN: 'Check detailed system activities in real-time, see exact timestamps of print logs, adjust operator login attendance registers, and alter global settings or branches instantly.',
      descSW: 'Ripoti na Ukaguzi wa Mfumo. Tazama kila kitendo cha miamala kikiwa na muda maalum wa sekunde, dhibiti logi za uchapishaji, na badilisha lugha au tawi la biashara yako haraka.',
      icon: <Settings className="h-6 w-6 text-slate-500" />,
      visual: (
        <div className="h-32 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 p-2.5 flex flex-col space-y-1.5 overflow-hidden">
          <span className="text-[8px] font-black uppercase text-slate-405 block">Secure Database Ledger Feed</span>
          <div className="space-y-1 max-h-[85px] overflow-hidden">
            <div className="p-1 bg-white dark:bg-slate-950 rounded border text-[8px] font-mono flex items-center justify-between">
              <span className="text-slate-400">[12:44:03] LOG_IN</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">admin@enterprise.com</span>
            </div>
            <div className="p-1 bg-white dark:bg-slate-950 rounded border text-[8px] font-mono flex items-center justify-between">
              <span className="text-slate-400">[12:44:05] PRINT</span>
              <span className="font-bold text-emerald-600">Thermal_Rec_#POS-9001</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'finish',
      tab: 'dashboard',
      titleEN: 'You are Certified! 🚀',
      titleSW: 'Upo Tayari Kuanza! 🚀',
      descEN: 'Congratulations! You are officially equipped to execute sales with absolute modern digital efficiency. Need more help? Chat with our smart simulated AI Assistant anytime!',
      descSW: 'Kazi nzuri! Sasa umekamilisha mafunzo ya msingi ya kuanza kuendesha biashara yako. Kama una maswali ya kimkakati ya kibiashara, chati na Msaidizi wa AI (AI Assistant) wetu!',
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
      visual: (
        <div className="h-32 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/40 dark:border-indigo-900/20 p-4 flex flex-col items-center justify-center text-center space-y-2">
          <div className="h-10 w-10 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <strong className="text-[11.5px] text-indigo-700 dark:text-indigo-400 block font-serif">Certified Operator Node</strong>
            <span className="text-[9px] text-slate-450 block uppercase tracking-widest font-black">DUKA OS TRUST REGISTERED</span>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('SmartERP_GuidedTour_Completed', 'true');
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 select-none">
      <div className="max-w-md w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 md:p-6 relative text-xs flex flex-col space-y-4 animate-fade-in">
        
        {/* Header Indicator */}
        <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-850">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg">
              {step.icon}
            </div>
            <div>
              <span className="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase font-black tracking-widest block">
                {language === 'SW' ? `Mada ya ${currentStep + 1} ya ${steps.length}` : `Tour Module ${currentStep + 1} of ${steps.length}`}
              </span>
              <strong className="text-[12.5px] text-slate-900 dark:text-white block font-serif">
                {language === 'SW' ? step.titleSW : step.titleEN}
              </strong>
            </div>
          </div>
          <button 
            onClick={handleComplete}
            className="p-1 text-slate-450 hover:text-slate-650 dark:hover:text-slate-350 cursor-pointer rounded-full hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
            title={language === 'SW' ? 'Funga Mwongozo' : 'Exit Tour'}
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Dynamic Concept Visual Box */}
        <div className="overflow-hidden">
          {step.visual}
        </div>

        {/* Text Description */}
        <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-relaxed min-h-[50px]">
          {language === 'SW' ? step.descSW : step.descEN}
        </p>

        {/* Progress Dots and Nav Action Controls */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-850">
          
          {/* Progress dots indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep 
                    ? 'w-5 bg-indigo-600' 
                    : 'w-2 bg-slate-205 dark:bg-slate-800 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          {/* Flow CTA Controller buttons */}
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border hover:bg-slate-100 dark:hover:bg-slate-805 hover:text-slate-900 dark:hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>{language === 'SW' ? 'Nyuma' : 'Prev'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow border border-indigo-700/25"
            >
              <span>
                {currentStep === steps.length - 1 
                  ? (language === 'SW' ? 'Kamilisha' : 'Got it!') 
                  : (language === 'SW' ? 'Mbele' : 'Next')}
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
