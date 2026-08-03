/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2, Sparkles, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAInstallPromptProps {
  language?: 'EN' | 'SW';
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ language = 'EN' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  const isSW = language === 'SW';

  useEffect(() => {
    // Check if already in standalone app mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      return; // No need to show prompt if already installed and running as standalone app
    }

    // Check if user previously dismissed prompt within 3 days
    const lastDismissed = localStorage.getItem('SmartERP_PWA_Dismissed');
    if (lastDismissed) {
      const dismissedTime = parseInt(lastDismissed, 10);
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < threeDaysMs) {
        // Suppress automatic popup if dismissed recently, unless user clicks a manual trigger
      }
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) || 
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIOS(iosDevice);

    if (iosDevice && !isStandaloneMode) {
      // Show for iOS users if not dismissed recently
      const shouldShow = !lastDismissed || (Date.now() - parseInt(lastDismissed, 10) > 3 * 24 * 60 * 60 * 1000);
      if (shouldShow) {
        setShowPrompt(true);
      }
    }

    // Listen for beforeinstallprompt on Chrome/Android/Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalledSuccess(true);
        setShowPrompt(false);
        setTimeout(() => setInstalledSuccess(false), 5000);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      // Fallback guide for other browsers
      alert(
        isSW 
          ? 'Kusakinisha DUKA OS: Gusa menu ya kivinjari chako (alama ya nukta 3) kisha uchague "Ongeza kwenye Skrini ya Nyumbani" au "Sakinisha Programu".'
          : 'To install DUKA OS: Open your browser menu (3 dots) and select "Add to Home Screen" or "Install App".'
      );
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('SmartERP_PWA_Dismissed', Date.now().toString());
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Toast notification when app install completes */}
      {installedSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-bold text-xs">
              {isSW ? 'Hongera! DUKA OS Imesakinishwa' : 'DUKA OS Installed Successfully!'}
            </p>
            <p className="text-[10px] text-emerald-100">
              {isSW ? 'Inapatikana sasa kwenye skrini yako ya nyumbani' : 'Available on your device home screen now'}
            </p>
          </div>
        </div>
      )}

      {/* Floating PWA Install Bar / Notification */}
      {showPrompt && !showIOSInstructions && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-slide-up">
          <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img 
                    src="/icon.png" 
                    alt="DUKA OS Logo" 
                    className="w-11 h-11 rounded-xl object-cover ring-2 ring-blue-500/50 shadow-md"
                  />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-white tracking-tight">DUKA OS App</h4>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-600/80 text-blue-100 border border-blue-400/30">
                      PWA
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium leading-snug">
                    {isSW 
                      ? 'Sakinisha kwenye simu au kompyuta kwa matumizi ya haraka bila mtandao'
                      : 'Install on Android, iOS, or PC for fast offline access & home screen launch'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                aria-label="Close prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Benefits Bullet Points */}
            <div className="grid grid-cols-3 gap-1.5 py-1 px-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[10px] text-slate-300 font-medium">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                <span>{isSW ? 'Bure & Haraka' : 'Fast & Free'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-3 w-3 text-blue-400 shrink-0" />
                <span>{isSW ? 'Skrini ya Nyumbani' : 'Home Screen'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Monitor className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>{isSW ? 'Bila Intaneti' : 'Offline Ready'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                {isSW ? 'Baadaye' : 'Maybe Later'}
              </button>
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg hover:shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>{isSW ? 'Sakinisha DUKA OS' : 'Install DUKA OS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Modal Instructions for Safari / Mobile Webkit */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 text-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-5 relative">
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <img src="/icon.png" alt="DUKA OS" className="w-12 h-12 rounded-2xl shadow-md border border-blue-500/30" />
              <div>
                <h3 className="font-extrabold text-base text-white">
                  {isSW ? 'Sakinisha DUKA OS (iOS)' : 'Install DUKA OS on iPhone'}
                </h3>
                <p className="text-xs text-slate-400">Dev Tek Innovation PWA</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isSW
                ? 'Kwenye Safari (iPhone/iPad), fuata hatua hizi mbili rahisi kuisakinisha kwenye skrini yako ya nyumbani:'
                : 'In Safari on your iPhone or iPad, follow these simple steps to add DUKA OS to your Home Screen:'}
            </p>

            <div className="space-y-3 bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 text-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-600/30 text-blue-400 shrink-0">
                  <Share className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-bold text-white block">
                    1. {isSW ? 'Gusa Kitufe cha Kushiriki (Share)' : 'Tap the Share Button'}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {isSW ? 'Inapatikana chini ya skrini kwenye Safari browser' : 'Located at the bottom of the Safari screen'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-700/60 pt-3 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 shrink-0">
                  <PlusSquare className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-bold text-white block">
                    2. {isSW ? 'Chagua "Add to Home Screen"' : 'Select "Add to Home Screen"'}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {isSW ? 'Kisha gusa "Add" kona ya juu kuweka icon ya DUKA OS' : 'Then tap "Add" in the top corner to complete'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors cursor-pointer"
            >
              {isSW ? 'Nimeelewa' : 'Got It'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
