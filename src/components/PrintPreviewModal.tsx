import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  Percent, 
  Maximize2, 
  Download, 
  Sliders, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink, 
  Info,
  Scale,
  Feather
} from 'lucide-react';
import { db } from '../db';
import { printElement } from '../utils/print';

interface PrintPreviewEventDetail {
  elementId: string;
  docTitle: string;
  preferredFormat?: 'A4' | 'Thermal';
}

interface PrintPreviewModalProps {
  language: 'EN' | 'SW';
  theme: string;
}

export default function PrintPreviewModal({ language, theme }: PrintPreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialElementId, setInitialElementId] = useState('');
  const [elementId, setElementId] = useState('');
  const [docTitle, setDocTitle] = useState('Document');
  const [selectedFormat, setSelectedFormat] = useState<'A4' | 'Thermal'>('A4');
  const [isTestPageMode, setIsTestPageMode] = useState(false);
  
  // Custom print tunings
  const [paddingMm, setPaddingMm] = useState<number>(8);
  const [inkSaver, setInkSaver] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  
  // HTML source content states
  const [htmlContent, setHtmlContent] = useState('');
  const [elementFound, setElementFound] = useState(false);
  const [elementCount, setElementCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [containsHeavyBackgrounds, setContainsHeavyBackgrounds] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const handleOpenPreview = (e: Event) => {
      const customEvent = e as CustomEvent<PrintPreviewEventDetail>;
      if (customEvent.detail) {
        const { elementId: id, docTitle: title, preferredFormat } = customEvent.detail;
        setInitialElementId(id);
        setElementId(id);
        setDocTitle(title || 'Document');
        if (preferredFormat) {
          setSelectedFormat(preferredFormat);
        } else {
          // Guess based on naming conventions
          const isThermal = id.toLowerCase().includes('receipt') || 
                            id.toLowerCase().includes('pos') || 
                            title.toLowerCase().includes('receipt') || 
                            id.toLowerCase().includes('slip');
          setSelectedFormat(isThermal ? 'Thermal' : 'A4');
        }
        setIsTestPageMode(false);
        setIsOpen(true);
      }
    };

    window.addEventListener('open-print-preview', handleOpenPreview);
    return () => {
      window.removeEventListener('open-print-preview', handleOpenPreview);
    };
  }, []);

  // Dynamically resolve and toggle target element depending on the active format selection
  useEffect(() => {
    if (!isOpen || !initialElementId) return;

    if (selectedFormat === 'Thermal') {
      // Explicitly prioritize the dedicated POS thermal receipt element if available
      const thermalDomElement = document.getElementById('receipt-printable-canvas');
      if (thermalDomElement) {
        setElementId('receipt-printable-canvas');
      } else {
        setElementId(initialElementId);
      }
    } else {
      // Standard A4 layout selected
      if (initialElementId === 'receipt-printable-canvas') {
        const a4Candidates = ['printable-area-canvas', 'doc-printer-canvas', 'quotation-printable-canvas', 'financial-statement-canvas'];
        const foundCandidate = a4Candidates.find(id => document.getElementById(id));
        if (foundCandidate) {
          setElementId(foundCandidate);
        } else {
          setElementId(initialElementId);
        }
      } else {
        setElementId(initialElementId);
      }
    }
  }, [selectedFormat, initialElementId, isOpen]);

  // Update dynamic document preview inside modal whenever inputs change
  useEffect(() => {
    if (!isOpen) return;
    if (!isTestPageMode && !elementId) return;

    if (isTestPageMode) {
      setElementFound(true);
      setElementCount(58);
      setItemCount(12);
      setContainsHeavyBackgrounds(false);

      const buildTestHtml = () => {
        const stylesheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(el => {
            if (el.tagName === 'LINK') {
              const href = el.getAttribute('href');
              if (href && !href.startsWith('http') && !href.startsWith('//')) {
                const absoluteHref = new URL(href, window.location.origin).href;
                return `<link rel="stylesheet" href="${absoluteHref}">`;
              }
            }
            return el.outerHTML;
          })
          .join('\n');

        const paddingStyle = `
          <style>
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: monospace, ui-sans-serif, system-ui;
            }
            .custom-print-canvas {
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #000000 !important;
              width: 100% !important;
              padding: ${paddingMm}mm !important;
            }
            ${inkSaver ? `
              * {
                color: #00050a !important;
                background-color: #ffffff !important;
                background-image: none !important;
                border-color: #000000 !important;
                box-shadow: none !important;
                text-shadow: none !important;
              }
              .border-indigo-600, .border-emerald-600, .border-slate-350 {
                border-color: #475569 !important;
                border-style: solid !important;
              }
            ` : ''}
            
            /* Thermal specifics */
            ${selectedFormat === 'Thermal' ? `
              .custom-print-canvas {
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 auto !important;
                padding: 4mm !important;
              }
            ` : ''}
          </style>
        `;

        const testContent = `
          <div class="space-y-4 text-center font-mono text-[11px] leading-tight text-black bg-white select-none">
            
            <!-- Grid test borders -->
            <div class="border border-black p-2 relative text-center">
              <span class="absolute top-0 left-0 bg-black text-white text-[8px] px-0.5">X:0</span>
              <span class="absolute top-0 right-0 bg-black text-white text-[8px] px-0.5">X:max</span>
              <div class="font-extrabold text-[12px] uppercase">ALIGNMENT TEST PATTERN</div>
              <div class="text-[9px] text-slate-600">80mm Thermal & A4 Config</div>
            </div>

            <!-- Left and Right margin bounds test -->
            <div class="flex justify-between border-b border-dashed border-gray-400 py-1 font-bold text-[9px]">
              <span>[LEFT EDGE LIMIT]</span>
              <span>[RIGHT EDGE LIMIT]</span>
            </div>

            <!-- Centering and target crosshairs guide -->
            <div class="space-y-1">
              <div class="text-[9px] uppercase font-bold text-slate-500">Center Core Alignment Check</div>
              <div class="flex justify-center items-center gap-1 font-bold text-black">
                <span>◀--------- [</span>
                <span class="font-black text-[13px] text-black">┼</span>
                <span>] ---------▶</span>
              </div>
              <div class="text-[8px] text-gray-500">Ensure the crosshair matches exact paper center line</div>
            </div>

            <!-- Line weights & resolutions grid -->
            <div class="space-y-1.5 text-left border-y border-black py-2 my-2">
              <div class="text-[9px] uppercase font-bold text-slate-800 text-center mb-1">Vector Line Weight test patterns</div>
              
              <div class="space-y-1">
                <div class="text-[8px] flex justify-between"><span>0.5pt Hairline Solid</span><span>(Light grid verification)</span></div>
                <div class="h-[0.5px] bg-black w-full" style="height:0.5px; background-color:black;"></div>
              </div>

              <div class="space-y-1">
                <div class="text-[8px] flex justify-between"><span>1.0pt Fine Solid Line</span><span>(Standard receipt borders)</span></div>
                <div class="h-[1px] bg-black w-full" style="height:1px; background-color:black;"></div>
              </div>

              <div class="space-y-1">
                <div class="text-[8px] flex justify-between"><span>2.0pt Medium Solid Line</span><span>(Table header separators)</span></div>
                <div class="h-[2px] bg-black w-full" style="height:2px; background-color:black;"></div>
              </div>

              <div class="space-y-1">
                <div class="text-[8px] flex justify-between"><span>4.0pt Thick Block Accent</span><span>(Heavy density black level test)</span></div>
                <div class="h-[4px] bg-black w-full" style="height:4px; background-color:black;"></div>
              </div>

              <div class="space-y-1">
                <div class="text-[8px] flex justify-between"><span>Dashed Separator Line</span><span>(Tear fold emulation)</span></div>
                <div class="border-t border-dashed border-black w-full"></div>
              </div>

              <div class="space-y-1">
                <div class="text-[8px] flex justify-between"><span>Dotted Ledger Track</span><span>(Tabular column dot leader)</span></div>
                <div class="border-t border-dotted border-black w-full"></div>
              </div>
            </div>

            <!-- Font scale and clarity check block -->
            <div class="space-y-1.5 text-left">
              <div class="text-[9px] uppercase font-bold text-slate-800 text-center mb-1">Typographic Density & scale spectrum</div>
              
              <div class="text-[8px]">8px Micro Font - POS Terms details and serial footprint tracking</div>
              <div class="text-[10px]">10px Compact Font - Receipt product line metadata</div>
              <div class="text-[11px] font-bold">11px Bold Font - Standard transaction totals and codes</div>
              <div class="text-[14px] font-extrabold font-sans">14px Large Font - Receipt Titles</div>
              <div class="text-[18px] font-black tracking-wide text-center uppercase font-sans">18px HEADER</div>
            </div>

            <!-- Contrast & Inversion Test -->
            <div class="bg-black text-white p-2 text-center rounded">
              <div class="font-extrabold text-[10px]">INVERSE HIGH-CONTRAST TONER AUDIT</div>
              <div class="text-[8px]">Tests heat density & drum tension across print head</div>
            </div>

            <!-- Physical paper pitch ruler / grid ticks -->
            <div class="space-y-1">
              <div class="text-[9px] uppercase font-bold text-slate-800 text-center">TICK SCALE INTERCEPT (80mm Width)</div>
              <div class="font-mono text-[9px] tracking-tighter text-center whitespace-nowrap overflow-hidden">
                |...10mm...|...20mm...|...30mm...|...40mm...|...50mm...|...60mm...|...70mm...|
              </div>
              <div class="font-mono text-[7px] text-center text-slate-500">
                0mm -------- 10 -------- 20 -------- 30 -------- 40 -------- 50 -------- 60 -------- 70 ------- 80
              </div>
            </div>

            <!-- QR code block or logo test mockup -->
            <div class="py-2 border-t border-black flex flex-col items-center justify-center space-y-1">
              <div style="width:60px; height:60px; border:2px solid black; display:grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(5, 1fr); gap:1px; padding:4px;" class="mx-auto">
                <!-- Mock qr pixels -->
                <div class="bg-black"></div><div class="bg-black"></div><div class="bg-white"></div><div class="bg-black"></div><div class="bg-black"></div>
                <div class="bg-black"></div><div class="bg-white"></div><div class="bg-black"></div><div class="bg-white"></div><div class="bg-black"></div>
                <div class="bg-white"></div><div class="bg-black"></div><div class="bg-black"></div><div class="bg-black"></div><div class="bg-white"></div>
                <div class="bg-black"></div><div class="bg-white"></div><div class="bg-black"></div><div class="bg-white"></div><div class="bg-black"></div>
                <div class="bg-black"></div><div class="bg-black"></div><div class="bg-white"></div><div class="bg-black"></div><div class="bg-black"></div>
              </div>
              <div class="text-[8px] text-gray-500">Matrix verification frame (QR Mock)</div>
            </div>

            <!-- Compliance footer -->
            <div class="border-t border-dashed border-black pt-2 text-[9px] text-center space-y-1 text-slate-600">
              <div>Swahili/Kizalamu Support Check:</div>
              <div class="font-bold">MABORESHO YA VIPIMO - HARAKA NA SALAMA</div>
              <div>Device: THERMAL/A4 PRINT SPOOL DRIVER v2.1</div>
              <div>Current Time: 2026-06-10 11:27 Z</div>
            </div>

          </div>
        `;

        return `
          <!DOCTYPE html>
          <html class="light bg-white text-black">
            <head>
              <meta charset="utf-8">
              ${stylesheets}
              ${paddingStyle}
            </head>
            <body>
              <div class="custom-print-canvas">
                ${testContent}
              </div>
            </body>
          </html>
        `;
      };

      const finalHtml = buildTestHtml();
      setHtmlContent(finalHtml);

      // Refresh iframe
      if (iframeRef.current) {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(finalHtml);
          iframeDoc.close();
        }
      }
    } else {
      const sourceElem = document.getElementById(elementId);
      if (!sourceElem) {
        setElementFound(false);
        setHtmlContent('');
        return;
      }

      setElementFound(true);
      
      // Perform heuristic checks on source element
      const childNodes = sourceElem.querySelectorAll('*');
      setElementCount(childNodes.length);

      const checkTrs = sourceElem.querySelectorAll('tbody tr');
      setItemCount(checkTrs.length || sourceElem.querySelectorAll('.grid > div').length || 0);

      // Ink level audits
      const hasDarkBg = sourceElem.className.includes('dark:') || 
                        !!sourceElem.querySelector('.bg-slate-900, .bg-slate-950, .bg-black, .bg-indigo-950');
      setContainsHeavyBackgrounds(hasDarkBg);

      // Build the rendered template HTML
      const buildPreviewHtml = () => {
        // Fetch styles
        const stylesheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(el => {
            if (el.tagName === 'LINK') {
              const href = el.getAttribute('href');
              if (href && !href.startsWith('http') && !href.startsWith('//')) {
                const absoluteHref = new URL(href, window.location.origin).href;
                return `<link rel="stylesheet" href="${absoluteHref}">`;
              }
            }
            return el.outerHTML;
          })
          .join('\n');

        // Add print modifiers or scaling classes
        const paddingStyle = `
          <style>
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            .custom-print-canvas {
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #000000 !important;
              width: 100% !important;
              padding: ${paddingMm}mm !important;
            }
            ${inkSaver ? `
              /* Convert elements inline to black and white */
              * {
                color: #00050a !important;
                background-color: #ffffff !important;
                background-image: none !important;
                border-color: #000000 !important;
                box-shadow: none !important;
                text-shadow: none !important;
              }
              .border-indigo-600, .border-emerald-600, .border-slate-350 {
                border-color: #475569 !important;
                border-style: solid !important;
              }
              .bg-indigo-600, .bg-emerald-600, .bg-slate-100 {
                background-color: #f1f5f9 !important;
                color: #000000 !important;
              }
            ` : ''}
            
            /* Thermal specifics */
            ${selectedFormat === 'Thermal' ? `
              .custom-print-canvas {
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 auto !important;
                padding: 2mm !important;
              }
            ` : ''}

            /* Force hide buttons / interactive widgets inside */
            button, .no-print, .no-print-area {
              display: none !important;
            }
          </style>
        `;

        return `
          <!DOCTYPE html>
          <html class="light bg-white text-black">
            <head>
              <meta charset="utf-8">
              ${stylesheets}
              ${paddingStyle}
            </head>
            <body>
              <div class="custom-print-canvas">
                ${sourceElem.innerHTML}
              </div>
            </body>
          </html>
        `;
      };

      const finalHtml = buildPreviewHtml();
      setHtmlContent(finalHtml);

      // Refresh iframe
      if (iframeRef.current) {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(finalHtml);
          iframeDoc.close();
        }
      }
    }
  }, [isOpen, elementId, selectedFormat, paddingMm, inkSaver, isTestPageMode]);

  if (!isOpen) return null;

  // Primary Print execution: trigger print through system print with iframe elements
  const handleIframePrint = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.focus();
        iframeRef.current.contentWindow?.print();
        
        // Log print to the central Print History registry
        db.addPrintLog({
          documentId: isTestPageMode ? 'TEST-PAGE' : (docTitle.split('_')[1] || docTitle || 'N/A'),
          documentTitle: isTestPageMode ? 'Calibration Test Pattern' : docTitle,
          printerType: selectedFormat,
          inkSaver: inkSaver,
          triggeredBy: db.getCurrentUser()?.email || 'System'
        });

        db.logAudit('TRANSFER', 'Printer', `Executed iframe system print for ${docTitle}`, db.getCurrentUser()?.email || 'System');
        
        // Dispatch instant storage update so other panels can live-refresh if open
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error('[Print Preview] Direct iframe print failed, falling back inline', err);
        // Fallback to unified utility
        printElement(elementId, docTitle, true);
        
        db.addPrintLog({
          documentId: isTestPageMode ? 'TEST-PAGE' : (docTitle.split('_')[1] || docTitle || 'N/A'),
          documentTitle: isTestPageMode ? 'Calibration Test (Iframe Fallback)' : docTitle,
          printerType: selectedFormat,
          inkSaver: inkSaver,
          triggeredBy: db.getCurrentUser()?.email || 'System'
        });
        window.dispatchEvent(new Event('storage'));
      }
    } else {
      printElement(elementId, docTitle, true);
      
      db.addPrintLog({
        documentId: isTestPageMode ? 'TEST-PAGE' : (docTitle.split('_')[1] || docTitle || 'N/A'),
        documentTitle: isTestPageMode ? 'Calibration Test (Direct Fallback)' : docTitle,
        printerType: selectedFormat,
        inkSaver: inkSaver,
        triggeredBy: db.getCurrentUser()?.email || 'System'
      });
      window.dispatchEvent(new Event('storage'));
    }
  };

  // The 100% Guaranteed Web-Standard Fallback trigger: Popup window print
  const handlePopupWindowPrint = () => {
    try {
      const printWindow = window.open('', '_blank', 'width=900,height=800,scrollbars=yes');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        
        // Wait briefly for CSS assets inside popup page to parse, then execute print() and auto-close
        printWindow.document.write(`
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 400);
            };
          </script>
        `);
        printWindow.document.close();
        
        db.addPrintLog({
          documentId: isTestPageMode ? 'TEST-PAGE' : (docTitle.split('_')[1] || docTitle || 'N/A'),
          documentTitle: isTestPageMode ? 'Calibration Test Pattern (Backup Popup)' : docTitle,
          printerType: selectedFormat,
          inkSaver: inkSaver,
          triggeredBy: db.getCurrentUser()?.email || 'System'
        });

        db.logAudit('TRANSFER', 'Printer', `Executed fail-safe popup-window print for ${docTitle}`, db.getCurrentUser()?.email || 'System');
        window.dispatchEvent(new Event('storage'));
      } else {
        alert(language === 'SW' 
          ? "Kivinjari chako kilizuia kichujio cha pop-up! Tafadhali ruhusu pop-ups ili kuprint kwa njia hii ya dharura." 
          : "Popup window was blocked by your browser! Please enable popups to print using this backup fail-safe stream.");
      }
    } catch (e) {
      console.error('[Print Preview] Popup windows stream errored:', e);
      // Fallback
      printElement(elementId, docTitle, true);
      
      db.addPrintLog({
        documentId: isTestPageMode ? 'TEST-PAGE' : (docTitle.split('_')[1] || docTitle || 'N/A'),
        documentTitle: isTestPageMode ? 'Calibration Test Pattern (Backup Fallback)' : docTitle,
        printerType: selectedFormat,
        inkSaver: inkSaver,
        triggeredBy: db.getCurrentUser()?.email || 'System'
      });
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleDownloadFile = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle.replace(/\s+/g, '_')}_Printed.html`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    db.addPrintLog({
      documentId: isTestPageMode ? 'TEST-PAGE' : (docTitle.split('_')[1] || docTitle || 'N/A'),
      documentTitle: isTestPageMode ? 'Calibration Test Pattern (Saved File)' : `${docTitle} (Offline Copy)`,
      printerType: selectedFormat,
      inkSaver: inkSaver,
      triggeredBy: db.getCurrentUser()?.email || 'System'
    });

    db.logAudit('TRANSFER', 'Printer', `Downloaded offline high-fidelity vector document file for ${docTitle}`, db.getCurrentUser()?.email || 'System');
    window.dispatchEvent(new Event('storage'));
  };

  const t = {
    modalTitle: language === 'SW' ? 'MTAZAMO WA CHAPA NA UTAMBUZI WA KIKOSI CHAPA' : 'OFFICIAL PRINT PREVIEW & DIAGNOSTICS CONSOLE',
    settingsHeader: language === 'SW' ? 'Mipangilio ya Kuchapa' : 'Print Configurations',
    format: language === 'SW' ? 'Mfumo wa Karatasi:' : 'Paper Format:',
    formatA4: language === 'SW' ? 'A4 Portrait (Kawaida)' : 'A4 Portrait (Standard)',
    formatThermal: language === 'SW' ? 'Karatasi ya Risiti (80mm Thermal)' : 'Thermal Receipt (80mm)',
    margins: language === 'SW' ? 'Upana wa Pambizo (Pande Zote):' : 'Margin Spacing Padding:',
    inkSaverTitle: language === 'SW' ? 'HALI YA ECO INK-SAVER' : 'ECO INK-SAVER CONVERSIONS',
    inkSaverDesc: language === 'SW' ? 'Inabadilisha maandishi meusi kabisa hadi asili safi ya rangi nyeupe, ikiondoa picha za rangi nzito kuokoa wino wetu wa toner.' : 'Forcibly strip gradient backgrounds and dark blocks. Ideal for conserving thermal heads and budget office cartridges.',
    diagnosticsTitle: language === 'SW' ? 'UTAMBUZI WA HARAKA NA HALI YA SAA' : 'LIVE INTEGRITY CHECKS & REALTIME TROUBLESHOOTING',
    diagnosticsCheckNode: language === 'SW' ? 'Ugunduzi wa Kifaa Chapa' : 'Printable Node ID Check',
    diagnosticsElements: language === 'SW' ? 'Kiasi cha Maandiko ya Vector' : 'Vector Markup Data Nodes',
    diagnosticsQuality: language === 'SW' ? 'Audit ya Kukolea Ink ya Rangi' : 'Aesthetic Ink volume Audit',
    diagnosticsItems: language === 'SW' ? 'Line Items / Mistari Iliyogunduliwa' : 'Detected Lines / Table Records',
    diagnosticsRecommend: language === 'SW' ? 'MAPENDEKEZO YA MFUMO YA CHAPA BORA:' : 'RECOMMENDED PRINT STYLING REMEDIATIONS:',
    checkOk: language === 'SW' ? '✓ IMESAJILIWA' : '✓ PARSED OK',
    checkFail: language === 'SW' ? '✗ IMESHINDIKANA' : '✗ NOT MOUNTED',
    checkWarning: language === 'SW' ? '⚠ ANGALIA RANGI' : '⚠ HIGH DENSITY',
    checkNormal: language === 'SW' ? '✓ INAFAA' : '✓ OPTIMAL',
    printPrimary: language === 'SW' ? 'Spool System Print (Njia Kuu)' : 'Spool System Print (Primary)',
    printFallback: language === 'SW' ? 'Chapa kwenye Dirisha Jipya (Fail-Safe)' : 'Print via New Window (Fail-Safe)',
    downloadHTML: language === 'SW' ? 'Pakua Faili ya Hati (PDF/HTML)' : 'Save / Export Vector File',
    close: language === 'SW' ? 'Funga' : 'Close Pane',
    noCanvas: language === 'SW' ? 'Nyaraka haijapatikana kwa sasa. Hakikisha umechagua mteja au nyaraka inayohusika kwanza hapa.' : 'Canvas target could not be resolved in active views. Please invoke active transaction data before spooling.',
    troubleshootNote: language === 'SW' ? 'Ikiwa chapa ya mfumo inafeli au inakaa nusu-karatasi, tumia dharura ya "Chapa kwenye Dirisha Jipya" kwa uhakika wa makadirio ya 100%!' : 'If standard browser spooling locks or gets cropped, choose "Print via New Window" to guarantee error-free printing on physical drivers!'
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsOpen(false);
        }
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
    >
      <div className={`w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-3xl flex flex-col h-[92vh] text-xs transition-colors duration-300 font-sans cursor-default`}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-t-2xl">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 mr-2">
            <div className="p-1 px-2 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 font-black tracking-wider uppercase text-[9px] sm:text-[10px] flex items-center gap-1 shrink-0">
              <Printer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">PREVIEW CONSOLE</span>
            </div>
            <h2 className="font-extrabold text-[10px] sm:text-[12px] md:text-sm text-slate-800 dark:text-slate-100 tracking-tight uppercase truncate flex-1 min-w-0">
              {t.modalTitle}
            </h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-450 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            title={language === 'SW' ? 'Funga' : 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body (Unified Side-by-Side Flex Pane) */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0 bg-slate-100/60 dark:bg-slate-950/30">
          
          {/* Left panel: Interactive Scaled Preview Frame */}
          <div className="flex-1 p-3 md:p-6 flex flex-col justify-center items-center overflow-auto border-r border-slate-200 dark:border-slate-800/80 relative">
            
            {/* Visual Header helper */}
            <div className="w-full max-w-md md:max-w-xl flex justify-between items-center mb-2 px-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest no-print">
              <span>🖥️ WYSIWYG PREVIEW DRIVER</span>
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <Scale className="h-3 w-3" />
                <span>SCALED RENDER (Acrobat/Thermal Mode)</span>
              </span>
            </div>

            {/* Document preview container wrapper */}
            {elementFound ? (
              <div 
                className={`w-full max-w-xl flex-1 flex flex-col items-center justify-start py-2 px-1 scrollbar-thin overflow-auto ${
                  selectedFormat === 'Thermal' ? 'max-w-[380px]' : ''
                }`}
              >
                {/* Physical paper canvas card */}
                <div 
                  className={`w-full bg-white text-black shadow-2xl relative border transition-all duration-300 ${
                    selectedFormat === 'Thermal' 
                      ? 'max-w-[340px] border-slate-300 border-dashed rounded-none min-h-[480px]' 
                      : 'aspect-[1/1.41] md:min-h-[580px] rounded-lg border-slate-200 p-0'
                  }`}
                >
                  {/* Realtime sandbox iframe viewport */}
                  <iframe 
                    ref={iframeRef}
                    id="print-preview-iframe-element"
                    title="SmartERP Print Preview Sandboxing"
                    className="w-full h-full border-none rounded-lg bg-white"
                    src="about:blank"
                  />
                  
                  {/* Subtle thermal Receipt simulated paper edges */}
                  {selectedFormat === 'Thermal' && (
                    <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-slate-200/50 to-transparent pointer-events-none border-b border-dashed border-slate-300"></div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center max-w-sm text-slate-500 dark:text-slate-400 space-y-3">
                <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto animate-bounce" />
                <p className="font-extrabold text-xs">{t.noCanvas}</p>
                <code className="text-[10px] block font-mono bg-slate-200 dark:bg-slate-850 p-1.5 rounded select-all">Canvas ID: {elementId}</code>
              </div>
            )}
          </div>

          {/* Right panel: Advanced Spool config parameters & debugging diagnostic logs */}
          <div className="w-full sm:w-[320px] md:w-[380px] p-4 bg-white dark:bg-slate-900 overflow-y-auto space-y-4 shrink-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-850">
            
            {/* Sec 1: Sizing config fields */}
            <div className="space-y-3 border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wide">
                <Sliders className="h-4 w-4" />
                <span>{t.settingsHeader}</span>
              </div>

              {/* Layout selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider block">{t.format}</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button 
                    onClick={() => setSelectedFormat('A4')}
                    className={`py-2 px-3 rounded-xl font-bold flex flex-col items-center gap-1 justify-center border cursor-pointer transition-all ${
                      selectedFormat === 'A4'
                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-md'
                        : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <FileText className="h-4.5 w-4.5" />
                    <span className="text-[9px] truncate">{t.formatA4}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSelectedFormat('Thermal')}
                    className={`py-2 px-3 rounded-xl font-bold flex flex-col items-center gap-1 justify-center border cursor-pointer transition-all ${
                      selectedFormat === 'Thermal'
                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-md'
                        : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Feather className="h-4.5 w-4.5" />
                    <span className="text-[9px] truncate">{t.formatThermal}</span>
                  </button>
                </div>
              </div>

              {/* Spacing width range */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                  <span>{t.margins}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 leading-none">{paddingMm}mm</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="30" 
                  value={paddingMm}
                  onChange={(e) => setPaddingMm(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 cursor-pointer bg-slate-150 dark:bg-slate-800 rounded-lg"
                />
              </div>

              {/* Ink saver conversions */}
              <label className="flex items-start gap-2 pt-1.5 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={inkSaver}
                  onChange={(e) => setInkSaver(e.target.checked)}
                  className="accent-indigo-600 rounded h-3.5 w-3.5 mt-0.5"
                />
                <div className="text-[10px] leading-tight flex-1">
                  <span className="font-extrabold text-slate-850 dark:text-slate-100 block">{t.inkSaverTitle}</span>
                  <span className="text-slate-450 text-[9.5px] block mt-0.5">{t.inkSaverDesc}</span>
                </div>
              </label>
            </div>

            {/* Sec 1.5: Test & Calibration Pattern Toggle */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-250 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {language === 'SW' ? 'JARIBIO LA MPANGILIO' : 'ALIGNMENT & WEIGHT CALIBRATION'}
                </span>
                <span className={`h-1.5 w-1.5 rounded-full ${isTestPageMode ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></span>
              </div>
              <p className="text-[9.5px] text-slate-450 leading-tight">
                {language === 'SW'
                  ? 'Wezesha ili kuprint mwonekano wa majaribio wa 80mm/A4 ili kuhakiki pambizo na unene wa mistari ya mashine yako.'
                  : 'Toggle to test physical margins, alignments, and vector line weights on your actual thermal or desktop driver.'}
              </p>
              <button
                type="button"
                onClick={() => setIsTestPageMode(!isTestPageMode)}
                className={`w-full py-1.5 px-3 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isTestPageMode
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md'
                    : 'bg-indigo-50 dark:bg-slate-900 border border-indigo-200/50 dark:border-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400'
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {isTestPageMode
                    ? (language === 'SW' ? 'RUDI KWENYE RISITI' : 'RETURN TO REGISTER')
                    : (language === 'SW' ? 'PANGA UKURASA WA JARIBIO' : 'LOAD CALIBRATION TEST')}
                </span>
              </button>
            </div>

            {/* Sec 2: Physical hardware helper warning check */}
            {showDiagnostics && (
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-[10px] text-slate-700 dark:text-slate-350 tracking-wide uppercase">{t.diagnosticsTitle}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                </div>

                <div className="space-y-1.5 text-[11px] leading-relaxed">
                  <div className="flex justify-between py-0.5 border-b border-slate-200/40">
                    <span className="text-slate-400 font-medium">{t.diagnosticsCheckNode}</span>
                    <span className={`font-bold ${elementFound ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {elementFound ? t.checkOk : t.checkFail}
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-200/40">
                    <span className="text-slate-400 font-medium">{t.diagnosticsElements}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-250 font-mono text-[10px]">{elementCount} tags</span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-200/40">
                    <span className="text-slate-400 font-medium">{t.diagnosticsQuality}</span>
                    <span className={`font-bold ${containsHeavyBackgrounds ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {containsHeavyBackgrounds ? t.checkWarning : t.checkNormal}
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-200/40">
                    <span className="text-slate-400 font-medium">{t.diagnosticsItems}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">{itemCount} lines</span>
                  </div>
                </div>

                <div className="text-[8.5px] leading-tight text-slate-500 border-t border-slate-200/60 dark:border-slate-800/60 pt-2 italic">
                  <span className="font-bold text-slate-600 dark:text-slate-300 block uppercase mb-1">{t.diagnosticsRecommend}</span>
                  <ul className="list-disc pl-3.5 space-y-0.5">
                    {containsHeavyBackgrounds && (
                      <li className="text-amber-600 dark:text-amber-400 font-semibold">Toner Warning: Turn on Eco Ink-Saver to safeguard printer and budget!</li>
                    )}
                    {itemCount > 15 && selectedFormat === 'A4' && (
                      <li>Multi-page detected. Set margin to 5mm to tightly group the footer summary elements.</li>
                    )}
                    <li>{t.troubleshootNote}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Fail-Safe Payment checkout notice box if printing fails */}
            <div className="bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 space-y-2 text-[10.5px] leading-relaxed select-none">
              <div className="flex items-center gap-1.5 font-extrabold text-rose-700 dark:text-rose-400 uppercase">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 animate-pulse" />
                <span>{language === 'SW' ? 'UKISHINDWA KUPRINT RISITI:' : 'IF RECEIPT PRINTING FAILS:'}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-350">
                {language === 'SW' 
                  ? 'Kama mteja amemaliza kulipa kisha unashindwa kuchapa risiti, usihofu mteja asisubiri! Chagua njia mbadala ya dharura hapa chini ili kumaliza kielektroniki.'
                  : 'If checkout payment went through but physical printing is stuck or non-responsive, do not panic! Use these instant, reliable alternatives below.'
                }
              </p>
              <div className="space-y-1 text-[9.5px] font-bold text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-amber-600 dark:text-amber-500">● 1. </span>
                  {language === 'SW' 
                    ? 'Bofya "Chapa kwenye Dirisha Jipya (Fail-Safe)" ili kukwepa vizuizi vyote vya kivinjari.'
                    : 'Click "Print via New Window (Fail-Safe)" to bypass sandbox iframe locks.'
                  }
                </div>
                <div>
                  <span className="text-amber-600 dark:text-amber-500">● 2. </span>
                  {language === 'SW' 
                    ? 'Bofya "Pakua Faili" na ulifungue kwenye kisaidizi au kompyuta yako ili uchape dharura.'
                    : 'Click "Save / Export Vector File" to export as document on desktop and print directly.'
                  }
                </div>
              </div>
            </div>

            {/* Sec 3: Trigger pathways buttons grouping */}
            <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800/80">
              
              {/* Trigger Direct System Spool */}
              <button
                type="button"
                onClick={handleIframePrint}
                disabled={!elementFound}
                className={`w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold uppercase rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-indigo-500/10 text-[11px] tracking-wide`}
              >
                <Printer className="h-4.5 w-4.5 animate-pulse" />
                <span>{t.printPrimary}</span>
              </button>

              {/* THE FAIL-SAFE POPUP PATHWAY BUTTON */}
              <button
                type="button"
                onClick={handlePopupWindowPrint}
                disabled={!elementFound}
                className="w-full py-2 px-4 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-extrabold uppercase rounded-xl flex items-center justify-center gap-2 border border-amber-200/50 dark:border-amber-900/30 cursor-pointer transition-all text-[10px] tracking-wide"
                title="Creates a standalone document pop-up window in standard sandboxed HTML format and instantly calls print(). Bridges all iframe print blockades."
              >
                <ExternalLink className="h-4 w-4 text-amber-500" />
                <span>{t.printFallback}</span>
              </button>

              {/* Vector Document offline fallback saver */}
              <button
                type="button"
                onClick={handleDownloadFile}
                disabled={!elementFound}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold uppercase rounded-r rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-[10px] tracking-wide"
              >
                <Download className="h-4 w-4" />
                <span>{t.downloadHTML}</span>
              </button>

              {/* Close Button details */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-1.5 px-3 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-850/60 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold transition-all text-center uppercase tracking-wide cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800 rounded-xl"
              >
                {t.close}
              </button>
            </div>
            
          </div>

        </div>

      </div>
    </div>
  );
}
