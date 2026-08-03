/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Palette, 
  X, 
  Check, 
  Sparkles, 
  Sun, 
  Moon, 
  Gem, 
  Zap, 
  Layout, 
  Sliders, 
  Eye, 
  CheckCircle2, 
  Layers, 
  ShoppingBag, 
  TrendingUp, 
  Package, 
  RotateCcw,
  Monitor,
  Leaf,
  Sunset
} from 'lucide-react';
import { ThemeMode, LanguageCode } from '../types';
import { db } from '../db';

interface ThemeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  language: LanguageCode;
}

export interface ThemeOption {
  id: ThemeMode;
  nameEN: string;
  nameSW: string;
  descEN: string;
  descSW: string;
  badge: string;
  icon: React.ElementType;
  bgGradient: string;
  previewBg: string;
  previewCardBg: string;
  previewBorder: string;
  previewText: string;
  accentColor: string;
  tagColor: string;
}

export default function ThemeStudioModal({
  isOpen,
  onClose,
  currentTheme,
  setTheme,
  language
}: ThemeStudioModalProps) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(currentTheme);
  const [activeTab, setActiveTab] = useState<'themes' | 'customizer'>('themes');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Custom accent preference state
  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem('SmartERP_ThemeAccent') || 'indigo';
  });
  
  // Custom radius state
  const [radiusStyle, setRadiusStyle] = useState<string>(() => {
    return localStorage.getItem('SmartERP_ThemeRadius') || 'rounded-xl';
  });

  if (!isOpen) return null;

  const themesList: ThemeOption[] = [
    {
      id: 'light',
      nameEN: 'Executive Clean Light',
      nameSW: '☀️ Mwanga wa Biashara',
      descEN: 'Bright, clean off-white layout with rich blue accents and maximum daytime legibility.',
      descSW: 'Muonekano msafi wa kijivu chepesi na bluu kwa ajili ya usomaji rahisi mchana.',
      badge: 'Classic',
      icon: Sun,
      bgGradient: 'from-slate-100 to-slate-200',
      previewBg: '#f8fafc',
      previewCardBg: '#ffffff',
      previewBorder: '#e2e8f0',
      previewText: '#0f172a',
      accentColor: '#3b82f6',
      tagColor: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      id: 'dark',
      nameEN: 'Obsidian Midnight Dark',
      nameSW: '🌙 Giza la Obsidian',
      descEN: 'Deep midnight charcoal canvas reducing eye strain during night shifts and long operation.',
      descSW: 'Giza nene la usiku linalolinda macho kwa saa nyingi za kazi na shift za usiku.',
      badge: 'Pro Dark',
      icon: Moon,
      bgGradient: 'from-slate-900 to-slate-950',
      previewBg: '#0f172a',
      previewCardBg: '#1e293b',
      previewBorder: '#334155',
      previewText: '#f8fafc',
      accentColor: '#60a5fa',
      tagColor: 'bg-slate-800 text-slate-200 border-slate-700'
    },
    {
      id: 'glass-future',
      nameEN: 'Glassmorphism Future',
      nameSW: '💎 Kioo Cha Kidigitali (Glass)',
      descEN: 'Cyber violet radial gradient backdrop with frosted glass panels and glowing translucent borders.',
      descSW: 'Kioo chenye mwanga wa zambarau na paneli za kipekee za kidigitali.',
      badge: 'Modern UI',
      icon: Gem,
      bgGradient: 'from-indigo-950 via-slate-900 to-purple-950',
      previewBg: '#0c0a21',
      previewCardBg: 'rgba(30, 27, 75, 0.6)',
      previewBorder: 'rgba(139, 92, 246, 0.4)',
      previewText: '#ffffff',
      accentColor: '#a78bfa',
      tagColor: 'bg-purple-950 text-purple-200 border-purple-700'
    },
    {
      id: 'luxury-gold',
      nameEN: 'Executive Gold Luxury',
      nameSW: '✨ Dhahabu ya Kifahari',
      descEN: 'Rich metallic gold accents paired with deep obsidian black for high-end retail brands.',
      descSW: 'Muonekano wa Dhahabu wa kifahari na mweusi mzito kwa biashara za viwango vya juu.',
      badge: 'Premium',
      icon: Sparkles,
      bgGradient: 'from-amber-950 via-neutral-900 to-stone-950',
      previewBg: '#090807',
      previewCardBg: '#1c1917',
      previewBorder: '#78350f',
      previewText: '#fbbf24',
      accentColor: '#f59e0b',
      tagColor: 'bg-amber-950 text-amber-300 border-amber-800'
    },
    {
      id: 'neon-cyan',
      nameEN: 'Cyber Neon Cyan',
      nameSW: '⚡ Cyber Cyan Neon',
      descEN: 'Electric neon cyan accents and high-tech futuristic layout for modern electronic & tech hubs.',
      descSW: 'Rangi ya cyan yenye mwanga wa umeme kwa ajili ya maduka ya teknolojia na vifaa.',
      badge: 'High-Tech',
      icon: Zap,
      bgGradient: 'from-cyan-950 via-slate-950 to-blue-950',
      previewBg: '#04111d',
      previewCardBg: '#0b1d31',
      previewBorder: '#0891b2',
      previewText: '#22d3ee',
      accentColor: '#06b6d4',
      tagColor: 'bg-cyan-950 text-cyan-300 border-cyan-800'
    },
    {
      id: 'high-density',
      nameEN: 'Compact Spreadsheet HD',
      nameSW: '📊 Hesabu HD (Ultra Compact)',
      descEN: 'Compressed padding and maximum row density optimized for high-volume POS and fast inventory tracking.',
      descSW: 'Muonekano wa hesabu uliodhibitiwa kuonyesha taarifa nyingi kwa wakati mmoja.',
      badge: 'Spreadsheet',
      icon: Layout,
      bgGradient: 'from-blue-950 to-slate-900',
      previewBg: '#0f172a',
      previewCardBg: '#1e293b',
      previewBorder: '#2563eb',
      previewText: '#60a5fa',
      accentColor: '#2563eb',
      tagColor: 'bg-blue-950 text-blue-300 border-blue-800'
    },
    {
      id: 'emerald-eco',
      nameEN: 'Emerald Eco Business',
      nameSW: '🌿 Kijani cha Kiasili (Eco ERP)',
      descEN: 'Refreshing natural emerald theme crafted for agribusiness, health, eco-friendly retail, and organic stores.',
      descSW: 'Muonekano mpya wa kijani kibichi uliotengenezwa kwa biashara za kilimo, afya na mazao ya asili.',
      badge: 'Eco Friendly',
      icon: Leaf,
      bgGradient: 'from-emerald-950 via-teal-950 to-slate-950',
      previewBg: '#022c22',
      previewCardBg: '#064e3b',
      previewBorder: '#059669',
      previewText: '#6ee7b7',
      accentColor: '#10b981',
      tagColor: 'bg-emerald-950 text-emerald-300 border-emerald-800'
    },
    {
      id: 'sunset-rose',
      nameEN: 'Sunset Rose Gold Luxury',
      nameSW: '🌅 Rosé Gold ya Kifahari',
      descEN: 'Warm blush crimson luxury theme for high-end fashion boutiques, cosmetics, spa, and beauty brands.',
      descSW: 'Dhahabu ya Rosé ya kifahari kwa ajili ya maduka ya mavazi ya kiwango cha juu na urembo.',
      badge: 'Boutique',
      icon: Sunset,
      bgGradient: 'from-rose-950 via-slate-950 to-stone-950',
      previewBg: '#1c050e',
      previewCardBg: '#4c0519',
      previewBorder: '#e11d48',
      previewText: '#fda4af',
      accentColor: '#f43f5e',
      tagColor: 'bg-rose-950 text-rose-300 border-rose-800'
    }
  ];

  const handleApplyTheme = () => {
    // 1. Save theme mode to DB & State
    db.setThemeMode(selectedTheme);
    setTheme(selectedTheme);
    
    // 2. Save accent color & radius preference
    localStorage.setItem('SmartERP_ThemeAccent', accentColor);
    localStorage.setItem('SmartERP_ThemeRadius', radiusStyle);

    // 3. Update root document class
    const root = document.documentElement;
    root.classList.remove('dark', 'luxury-gold', 'neon-cyan', 'high-density', 'glass-future', 'emerald-eco', 'sunset-rose');
    if (selectedTheme !== 'light') {
      root.classList.add(selectedTheme);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const selectedOption = themesList.find(t => t.id === selectedTheme) || themesList[0];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-white relative">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Palette className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{language === 'SW' ? 'Kituo cha Mandhari na Muonekano' : 'Theme & Visual Design Studio'}</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  v4.5
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'SW' 
                  ? 'Chagua na rekebisha muonekano wa mfumo wako mzima kwa kubofya moja tu.' 
                  : 'Select curated theme presets or customize colors and layout density for your ERP.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation & Mode Switcher */}
        <div className="px-5 pt-3 bg-slate-950/40 border-b border-slate-800/80 flex justify-between items-center shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('themes')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-t border-x ${
                activeTab === 'themes'
                  ? 'bg-slate-900 border-slate-800 text-indigo-400 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>{language === 'SW' ? '1. Chagua Theme Preset (8)' : '1. Theme Presets (8)'}</span>
            </button>

            <button
              onClick={() => setActiveTab('customizer')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer border-t border-x ${
                activeTab === 'customizer'
                  ? 'bg-slate-900 border-slate-800 text-indigo-400 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>{language === 'SW' ? '2. Urekebishaji wa Layout' : '2. Layout & Accent Adjuster'}</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
            {language === 'SW' ? 'Mandhari ya Sasa:' : 'Active Theme:'} <strong className="text-indigo-400">{selectedOption.nameEN}</strong>
          </div>
        </div>

        {/* Modal Main Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {activeTab === 'themes' && (
            <div className="space-y-6">
              
              {/* Theme Selector Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {themesList.map((item) => {
                  const isSelected = selectedTheme === item.id;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedTheme(item.id)}
                      className={`relative rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-slate-800/90 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg scale-[1.01]'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                      }`}
                    >
                      {/* Top Row: Icon + Badge + Selection Check */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg border ${item.tagColor}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${item.tagColor}`}>
                            {item.badge}
                          </span>
                        </div>

                        <div className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700 text-transparent'
                        }`}>
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      </div>

                      {/* Theme Titles & Description */}
                      <div className="space-y-1 mb-3">
                        <h3 className="font-extrabold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors">
                          {language === 'SW' ? item.nameSW : item.nameEN}
                        </h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {language === 'SW' ? item.descSW : item.descEN}
                        </p>
                      </div>

                      {/* Mini Theme Swatch Graphic Preview */}
                      <div className="h-10 w-full rounded-lg border overflow-hidden relative flex items-center px-3 justify-between"
                        style={{ backgroundColor: item.previewBg, borderColor: item.previewBorder }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="h-4 w-4 rounded-full shadow-xs" style={{ backgroundColor: item.accentColor }} />
                          <div className="h-2 w-12 rounded" style={{ backgroundColor: item.previewText, opacity: 0.6 }} />
                        </div>
                        <div className="h-4 px-2 rounded text-[8px] font-mono font-bold flex items-center" style={{ backgroundColor: item.previewCardBg, color: item.previewText, border: `1px solid ${item.previewBorder}` }}>
                          PREVIEW
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* LIVE SIMULATION PREVIEW PANEL */}
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                      {language === 'SW' ? 'Uhakiki wa Mfumo Katika Theme Hii (Live Preview)' : 'Live Theme Canvas Preview'}
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {language === 'SW' ? 'Inaonyesha jinsi kadi za POS & Stoki zitakavyoonekana' : 'Simulating POS checkout & stock modules'}
                  </span>
                </div>

                {/* Simulated UI Card container with selected theme styles applied */}
                <div 
                  className="p-4 rounded-xl border transition-all duration-300 space-y-3 shadow-xl overflow-hidden"
                  style={{ 
                    backgroundColor: selectedOption.previewBg, 
                    borderColor: selectedOption.previewBorder,
                    color: selectedOption.previewText 
                  }}
                >
                  {/* Top Bar snippet */}
                  <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: selectedOption.previewBorder }}>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md flex items-center justify-center font-black text-[10px] text-white" style={{ backgroundColor: selectedOption.accentColor }}>
                        OS
                      </div>
                      <span className="font-black text-xs" style={{ color: selectedOption.previewText }}>
                        DUKA OS ENTERPRISE
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: selectedOption.previewCardBg, border: `1px solid ${selectedOption.previewBorder}` }}>
                        HQ Main Branch
                      </span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                    </div>
                  </div>

                  {/* 3 Grid preview cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Mock Card 1: Sales POS */}
                    <div className="p-3 rounded-lg border space-y-1.5" style={{ backgroundColor: selectedOption.previewCardBg, borderColor: selectedOption.previewBorder }}>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold opacity-75">POS Terminal</span>
                        <ShoppingBag className="h-3.5 w-3.5" style={{ color: selectedOption.accentColor }} />
                      </div>
                      <div className="text-sm font-black" style={{ color: selectedOption.accentColor }}>
                        TZS 1,450,000
                      </div>
                      <div className="text-[9px] opacity-60">14 Orders completed today</div>
                    </div>

                    {/* Mock Card 2: Inventory */}
                    <div className="p-3 rounded-lg border space-y-1.5" style={{ backgroundColor: selectedOption.previewCardBg, borderColor: selectedOption.previewBorder }}>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold opacity-75">Stoki ya Ghala</span>
                        <Package className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <div className="text-sm font-black text-emerald-400">
                        248 Items Active
                      </div>
                      <div className="text-[9px] opacity-60">3 items low stock alert</div>
                    </div>

                    {/* Mock Card 3: Financial Growth */}
                    <div className="p-3 rounded-lg border space-y-1.5" style={{ backgroundColor: selectedOption.previewCardBg, borderColor: selectedOption.previewBorder }}>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold opacity-75">Net Profit</span>
                        <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <div className="text-sm font-black text-amber-400">
                        +28.4% Growth
                      </div>
                      <div className="text-[9px] opacity-60">TIN & VAT Compliant</div>
                    </div>
                  </div>

                  {/* Mock Action button */}
                  <div className="flex justify-end pt-1">
                    <button 
                      className="px-3 py-1.5 rounded-lg text-xs font-black text-white shadow-sm flex items-center gap-1.5"
                      style={{ backgroundColor: selectedOption.accentColor }}
                    >
                      <span>{language === 'SW' ? 'Tengeneza Ankara' : 'Generate Invoice'}</span>
                    </button>
                  </div>

                </div>
              </div>

            </div>
          )}

          {activeTab === 'customizer' && (
            <div className="space-y-6">
              {/* Accent Color Selection */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>{language === 'SW' ? 'Rangi ya Mkazo (Primary Accent Tint)' : 'Primary Accent Color Tint'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'SW' ? 'Chagua rangi kuu inayotumika kwa vitufe, mistari na viashiria vya mfumo:' : 'Choose the primary accent color for buttons, active indicators, and highlight elements:'}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {[
                    { id: 'indigo', name: 'Royal Indigo', color: '#6366f1' },
                    { id: 'blue', name: 'Enterprise Blue', color: '#3b82f6' },
                    { id: 'emerald', name: 'Emerald Green', color: '#10b981' },
                    { id: 'amber', name: 'Golden Amber', color: '#f59e0b' },
                    { id: 'cyan', name: 'Cyber Cyan', color: '#06b6d4' },
                    { id: 'rose', name: 'Crimson Rose', color: '#f43f5e' },
                    { id: 'purple', name: 'Deep Purple', color: '#8b5cf6' },
                    { id: 'slate', name: 'Minimal Slate', color: '#64748b' },
                  ].map((acc) => {
                    const isAccSelected = accentColor === acc.id;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setAccentColor(acc.id)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                          isAccSelected
                            ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20 text-white'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="h-5 w-5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: acc.color }} />
                        <span className="text-xs font-bold">{acc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Density & Layout Style */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Layout className="h-4 w-4 text-emerald-400" />
                  <span>{language === 'SW' ? 'Muonekano wa Pembe na Ukubwa wa Kadi (Corner Style & Density)' : 'Card Radius & Spatial Density'}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {[
                    { id: 'rounded-xl', label: language === 'SW' ? 'Modern Rounded (12px)' : 'Modern Soft (12px)', desc: 'Standard comfortable spacing & rounded cards' },
                    { id: 'rounded-md', label: language === 'SW' ? 'Compact Sharp (6px)' : 'Compact Sharp (6px)', desc: 'Sleek spreadsheet feel with sharp edges' },
                    { id: 'rounded-2xl', label: language === 'SW' ? 'Curved Soft (18px)' : 'Curved Soft (18px)', desc: 'Soft floating cards with pill-shaped accents' },
                  ].map((rad) => (
                    <button
                      key={rad.id}
                      onClick={() => setRadiusStyle(rad.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                        radiusStyle === rad.id
                          ? 'bg-slate-800 border-indigo-500 text-white ring-2 ring-indigo-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-extrabold text-xs text-slate-100">{rad.label}</div>
                      <div className="text-[10px] text-slate-400">{rad.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setSelectedTheme('light');
              setAccentColor('indigo');
              setRadiusStyle('rounded-xl');
            }}
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{language === 'SW' ? 'Rudisha za Kawaida (Reset Defaults)' : 'Reset Default Theme'}</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-850 hover:bg-slate-800 text-slate-300 font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {language === 'SW' ? 'Ghairi' : 'Cancel'}
            </button>

            <button
              onClick={handleApplyTheme}
              className={`w-1/2 sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 shadow-emerald-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{language === 'SW' ? 'Imewekwa Kikamilifu!' : 'Theme Applied!'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{language === 'SW' ? 'Weka Theme Hii Sasa' : 'Apply Theme System-Wide'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
