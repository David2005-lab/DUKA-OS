/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table, ChevronDown } from 'lucide-react';

interface ExportButtonProps {
  onExportPDF: () => void;
  onExportCSV: () => void;
  language?: 'EN' | 'SW';
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExportPDF,
  onExportCSV,
  language = 'EN',
  label,
  className = '',
  variant = 'secondary',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSW = language === 'SW';

  const defaultLabel = label || (isSW ? 'Pakua Ripoti' : 'Export');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow border border-indigo-500';
      case 'outline':
        return 'bg-transparent border border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40';
      case 'secondary':
      default:
        return 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 shadow-xs';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${getVariantStyles()} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span>{defaultLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in focus:outline-none overflow-hidden">
          <div className="p-1.5 space-y-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportPDF();
              }}
              className="w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-800 dark:text-slate-100 font-medium transition-colors cursor-pointer group"
            >
              <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 transition-colors">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <span className="font-extrabold block text-slate-900 dark:text-white">
                  {isSW ? 'Pakua Ripoti ya PDF' : 'Download PDF Report'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {isSW ? 'Muundo wa kuchapa na stempu' : 'Formatted printable document'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportCSV();
              }}
              className="w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-800 dark:text-slate-100 font-medium transition-colors cursor-pointer group"
            >
              <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 transition-colors">
                <Table className="h-4 w-4" />
              </div>
              <div>
                <span className="font-extrabold block text-slate-900 dark:text-white">
                  {isSW ? 'Pakua Faili la CSV' : 'Download CSV File'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {isSW ? 'Inafaa kwa Excel na lahajedwali' : 'Spreadsheet raw data format'}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
