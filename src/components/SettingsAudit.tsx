/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldAlert, 
  Trash2, 
  CheckSquare, 
  ToggleLeft, 
  Save, 
  FileLock2, 
  EyeOff,
  History
} from 'lucide-react';
import { BusinessConfig, AuditLog } from '../types';
import { db } from '../db';
import { translations } from '../translations';

interface SettingsAuditProps {
  language: 'EN' | 'SW';
  userEmail: string;
}

export default function SettingsAudit({ language, userEmail }: SettingsAuditProps) {
  const t = translations[language];

  // States
  const [profile, setProfile] = useState<BusinessConfig>({
    id: 'biz-node',
    name: 'DUKA OS ENTERPRISE',
    category: 'General Retailer',
    regNumber: 'REG-2026-X01',
    tinNumber: '111-222-333',
    vatNumber: 'VAT-444-555',
    address: 'Kinondoni Plaza, Dar es Salaam',
    region: 'Dar es Salaam',
    district: 'Kinondoni',
    country: 'Tanzania',
    phone: '+255 754 005 111',
    whatsapp: '+255 784 222 333',
    email: 'info@dukaos.co.tz',
    website: 'https://dukaos.co.tz',
    description: 'Modern Retail, Wholesale and Distribution System',
    logoUrl: '',
    unlimitedBranches: true,
    companyStamp: 'OFFICIAL SEAL - DUKA OS',
    qrCodeSeed: 'DUKA-OS-VERIFY',
    verificationCode: 'LICENSE-999-PRO'
  });
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchLogsQuery, setSearchLogsQuery] = useState('');
  const [selectedLogAction, setSelectedLogAction] = useState<string>('All');

  const loadSettingsData = () => {
    const prof = db.getProfile();
    if (prof) {
      setProfile(prof);
    }
    setLogs(db.getLogs()); // newest first is handled by db.getLogs() already
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveProfile(profile, userEmail);
    alert(language === 'SW' ? 'Mipangilio ya Kampuni Imehifadhiwa kikamilifu!' : 'Company business profile successfully updated across the ERP system!');
    loadSettingsData();
    
    // Dispatch instant update storage event to trigger POS/Catalog reload in real-time
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert(language === 'SW' ? 'Nembo ni kubwa sana! Tafadhali tumia picha chini ya 1.5MB' : 'Logo file size exceeds limit! Please choose an image smaller than 1.5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, logoUrl: reader.result as string }));
        db.logAudit('UPDATE', 'BusinessProfile', 'Uploaded active company brand logo', userEmail);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    setProfile((prev) => ({ ...prev, logoUrl: '' }));
    db.logAudit('UPDATE', 'BusinessProfile', 'Cleared company logo configuration', userEmail);
  };

  const handleWipeDatabase = () => {
    if (confirm('CRITICAL WARNING: This will completely wipe all local databases, inventory counts, accounting journals and transaction histories from localStorage. Proceed?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Filter audit logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchLogsQuery.toLowerCase()) ||
                          log.entity.toLowerCase().includes(searchLogsQuery.toLowerCase()) ||
                          (log.user && log.user.toLowerCase().includes(searchLogsQuery.toLowerCase()));
    const matchesAction = selectedLogAction === 'All' || log.action === selectedLogAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 text-xs animate-fade-in">
      
      <div className="flex border-b border-slate-100 dark:border-slate-800 gap-4 flex-wrap pb-1.5 justify-between items-center">
        <h2 className="text-sm font-extrabold uppercase text-indigo-700 flex items-center gap-1.5 leading-none">
          <Settings className="h-4 w-4 text-indigo-600" />
          <span>{language === 'SW' ? 'Nembo, Mipangilio ya Kampuni & Kumbukumbu za Ukaguzi' : 'Enterprise Branding, Profile Settings & Security Audits'}</span>
        </h2>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-105 px-2 py-0.5 rounded border">
          Node Configuration State: Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Profile editor form - Col 7 */}
        <form onSubmit={handleSaveProfile} className="lg:col-span-7 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm text-xs">
          
          <div className="flex justify-between items-center border-b pb-1">
            <span className="font-extrabold text-[10.5px] text-indigo-700 uppercase tracking-widest block">
              {language === 'SW' ? 'Maelezo Kamili ya Biashara na Leseni' : 'Business Registration & Profiling Matrix'}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
              {language === 'SW' ? 'Uhakiki: Amilifu' : 'Status: Secured'}
            </span>
          </div>

          {/* Logo Uploader Widget */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white dark:bg-slate-950 h-20 w-20 rounded-xl border flex items-center justify-center p-2 relative overflow-hidden shrink-0">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} className="h-full w-full object-contain" alt="Current Logo" referrerPolicy="no-referrer" />
              ) : (
                <div className="text-center text-slate-400 text-[10px] uppercase font-bold">
                  {language === 'SW' ? 'Hakuna Nembo' : 'No Logo'}
                </div>
              )}
            </div>
            
            <div className="space-y-1.5 flex-1 w-full text-center sm:text-left">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'SW' ? 'Bofya kupakia Nembo mpya ya Biashara:' : 'Upload Business Brand Logo:'}
              </span>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload-selector"
                />
                <label
                  htmlFor="logo-upload-selector"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-lg cursor-pointer text-[10.5px] transition-colors shadow-sm"
                >
                  {language === 'SW' ? 'Chagua Picha 📁' : 'Choose Logo File 📁'}
                </label>
                {profile.logoUrl && (
                  <button
                    type="button"
                    onClick={handleClearLogo}
                    className="text-[10px] text-red-500 font-bold hover:underline"
                  >
                    {language === 'SW' ? 'Ondoa Nembo' : 'Clear Brand Logo'}
                  </button>
                )}
              </div>
              <p className="text-[9.5px] text-slate-405 leading-none">
                {language === 'SW' ? 'Inasaidia muundo wa JPG, PNG au SVG. Nembo hii itawekwa kwenye ankara, risiti na ripoti.' : 'Supported image formats. This logo populates dynamically across PDF invoices, cash registers, receipts, and headers.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Jina la Kampuni au Huduma *' : 'Registered Business Name *'}</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-bold text-slate-850 dark:text-slate-100"
                placeholder="e.g. DUKA OS ENTERPRISES"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Sekta/Aina ya Huduma' : 'Business Category/Industry'}</label>
              <input
                type="text"
                value={profile.category}
                onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg text-slate-800 dark:text-slate-200"
                placeholder="e.g. Retail and Wholesales"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Namba ya Usajili wa Biashara (BRELA)' : 'Registration License Code (REG)'}</label>
              <input
                type="text"
                value={profile.regNumber}
                onChange={(e) => setProfile({ ...profile, regNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                placeholder="REG-000-XX"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Namba ya TIN (Tanzania VAT) *' : 'Corporate TIN Core Code *'}</label>
              <input
                type="text"
                required
                value={profile.tinNumber}
                onChange={(e) => setProfile({ ...profile, tinNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono font-bold text-slate-850 dark:text-slate-100"
                placeholder="000-000-000"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Namba ya VRN/VAT ya Kampuni *' : 'VAT Registration Number *'}</label>
              <input
                type="text"
                required
                value={profile.vatNumber}
                onChange={(e) => setProfile({ ...profile, vatNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                placeholder="VAT-XXXX"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Barua Pepe ya Kampuni' : 'Corporate Support Email'}</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                placeholder="accounts@business.co.tz"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Tovuti ya Biashara' : 'Company Website URL'}</label>
              <input
                type="text"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                placeholder="https://www.business.co.tz"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Namba Maalum ya WhatsApp ya Kampuni *' : 'Company Broadcast WhatsApp *'}</label>
              <input
                type="text"
                required
                value={profile.whatsapp}
                onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono font-bold text-emerald-600 dark:text-emerald-400"
                placeholder="+255 x-xxxx-xxxx"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Namba ya Simu ya Kupigia ya Kampuni *' : 'Corporate Phone Line Call *'}</label>
              <input
                type="text"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                placeholder="+255 x-xxxx-xxxx"
              />
            </div>

            {/* SEHEMU YA BIASHARA DETAILS (Location, region, district) */}
            <div className="md:col-span-2 border-t pt-3 mt-1">
              <span className="font-extrabold text-[9.5px] text-slate-400 uppercase tracking-widest block mb-2">
                {language === 'SW' ? 'Sehemu ya Biashara na Anwani Lojistiki' : 'Business Location & Logistics Jurisdiction'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">{language === 'SW' ? 'Mkoa (Region) *' : 'Region State *'}</label>
                  <input
                    type="text"
                    required
                    value={profile.region}
                    onChange={(e) => setProfile({ ...profile, region: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-semibold text-slate-800 dark:text-slate-200"
                    placeholder="e.g. Dar es Salaam"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">{language === 'SW' ? 'Wilaya (District) *' : 'Business District *'}</label>
                  <input
                    type="text"
                    required
                    value={profile.district}
                    onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg font-semibold text-slate-800 dark:text-slate-200"
                    placeholder="e.g. Kinondoni"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Anwani kamili ya Posta/Mtaa' : 'HQ Physical Street Address'}</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg text-slate-800 dark:text-slate-200"
                placeholder="Cargo Road Suite X, Kinondoni Near Kinondoni Plaza"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Slogan au Maelezo ya Biashara' : 'Business Slogan / Core Focus Note'}</label>
              <input
                type="text"
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border p-2 mt-1 rounded-lg text-slate-800 dark:text-slate-200 italic"
                placeholder="Slogan, e.g. Quality and Trust first"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">{language === 'SW' ? 'Maneno ya Muhuri we Kielektroniki (Stamp)' : 'Authorized Corporate Signature Stamp Text'}</label>
              <input
                type="text"
                value={profile.companyStamp}
                onChange={(e) => setProfile({ ...profile, companyStamp: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 p-2.5 mt-1 rounded-lg font-serif italic text-sm text-indigo-700 dark:text-indigo-405"
                placeholder="E.g. CERTIFIED CHIEF COMPLIANCE CONTROLLER SEAL SmartBusiness Ltd"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t">
            <button
              onClick={handleWipeDatabase}
              type="button"
              className="text-[#dc2626] border border-red-500/15 hover:bg-red-200/10 p-2 rounded-lg text-[10px] font-bold"
            >
              {language === 'SW' ? 'Futa Data Zote za Mfumo' : 'Wipe localStorage datasets'}
            </button>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-6 rounded-lg leading-none flex items-center gap-1.5 shadow"
            >
              <Save className="h-4 w-4" />
              <span>{language === 'SW' ? 'Hifadhi Maana' : 'Commit Configuration Setup'}</span>
            </button>
          </div>
        </form>

        {/* Audit trail tracker log lists - Col 5 */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm text-[11px] h-[585px] overflow-y-auto">
          <div className="flex items-center gap-1.5 text-slate-400 border-b pb-1.5">
            <History className="h-4 w-4 text-emerald-600 animate-pulse" />
            <span className="font-extrabold text-[10px] uppercase tracking-widest text-slate-720 dark:text-slate-200">
              {language === 'SW' ? 'Kumbukumbu na Ukaguzi Salama' : 'Ledger Security Audits Registry'}
            </span>
          </div>

          <p className="text-[10px] text-slate-400">
            {language === 'SW' 
              ? 'Mabadiliko yote ya bei, kufuta stoki, kufanya mauzo na kuongeza wafanyakazi imeandikwa kwenye leda asilia ya ukaguzi.' 
              : 'All inventory adjustments, POS sales, quotation broadcasts, and stamp alterations trigger persistent ledger registry actions.'}
          </p>

          {/* Search audit box and Filter controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Tafuta logi</label>
              <input 
                type="text" 
                placeholder="e.g. mteja, kufuta..."
                className="w-full bg-white dark:bg-slate-950 border p-1 rounded font-medium text-[10px]"
                value={searchLogsQuery}
                onChange={(e) => setSearchLogsQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Muamala</label>
              <select 
                className="w-full bg-white dark:bg-slate-950 border p-1 rounded text-[10px] font-bold"
                value={selectedLogAction}
                onChange={(e) => setSelectedLogAction(e.target.value)}
              >
                <option value="All">{language === 'SW' ? 'Zote mbili' : 'All Action Types'}</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="TRANSFER">TRANSFER</option>
              </select>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-405">
              {language === 'SW' ? 'Hakuna logi inayolingana' : 'No matching audit records.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 border dark:border-slate-800 rounded-lg space-y-1 relative">
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase text-center ${
                      log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-500/10' : 
                      log.action === 'UPDATE' ? 'bg-indigo-50 text-indigo-850 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-500/10' :
                      log.action === 'DELETE' ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-500/10' :
                      'bg-amber-50 text-amber-805 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-500/10'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-[9.5px] text-slate-405 font-mono">{log.timestamp.substring(11, 19)} PST</span>
                  </div>

                  <p className="font-extrabold text-slate-800 dark:text-slate-200 leading-normal text-[10.5px]">
                    {log.details}
                  </p>
                  <div className="text-[9px] text-slate-400 text-right pt-1.5 border-t border-dashed dark:border-slate-850/50">
                    {language === 'SW' ? 'Maelezo:' : 'Log Account:'} <strong className="text-slate-600 dark:text-slate-350">{log.user || log.operatorEmail || 'System Cashier Node'}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
