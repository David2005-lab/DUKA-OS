/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  FileCode, 
  RefreshCw,
  Terminal,
  FileCheck
} from 'lucide-react';
import { db } from '../db';
import { Product, LanguageCode } from '../types';

interface QuickUploadHubProps {
  language: LanguageCode;
  userEmail: string;
  currentBranch: string;
  onRefreshData: () => void;
}

type Mode = 'logo' | 'excel' | 'product_pic';

export default function QuickUploadHub({ 
  language, 
  userEmail, 
  currentBranch, 
  onRefreshData 
}: QuickUploadHubProps) {
  const [activeMode, setActiveMode] = useState<Mode>('logo');
  const [isDragging, setIsDragging] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importCount, setImportCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 7)]);
  };

  // Process File upload action (reusable for drag & drop or manual file selection)
  const processUploadedFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    addLog(`FAIL_LOADED: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    // MODE 1: company active branding logo
    if (activeMode === 'logo') {
      if (!file.type.startsWith('image/')) {
        addLog(`ERROR: Invalid file type! Logo must be an image.`);
        return;
      }
      if (file.size > 1.5 * 1024 * 1024) {
        addLog(`ERROR: Image too large! Max file size: 1.5MB`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFilePreview(base64);
        
        try {
          // Retrieve current client profile structure and save
          const profile = db.getProfile();
          profile.logoUrl = base64;
          db.saveProfile(profile, userEmail);
          
          addLog(`LEDGER_COMMIT: Logo Base64 stored in company schema successfully.`);
          addLog(`SYSTEM_REFRESH: Global logo headers updated in all nodes.`);
          onRefreshData();
        } catch (err) {
          addLog(`ERROR: Database sync failed during write cycle.`);
        }
      };
      reader.readAsDataURL(file);
    } 

    // MODE 2: inventory Excel / CSV / JSON spreadsheets
    else if (activeMode === 'excel') {
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.json') && !file.name.endsWith('.txt')) {
        addLog(`ERROR: Invalid spreadsheet format! Drag .csv, .json or text sheets.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          if (file.name.endsWith('.json')) {
            const productsList = JSON.parse(text);
            if (Array.isArray(productsList)) {
              let loaded = 0;
              productsList.forEach((item, idx) => {
                if (item.name) {
                  const newProd: Product = {
                    id: `import-${Date.now()}-${idx}`,
                    name: item.name || 'Imported SKU product',
                    description: item.description || 'Auto-imported SKU via file uploader',
                    sku: item.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
                    barcode: item.barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                    qrCode: '',
                    category: item.category || 'General',
                    brand: item.brand || 'Unspecified',
                    supplierId: item.supplierId || '',
                    manufacturer: item.manufacturer || '',
                    serialNumber: item.serialNumber || '',
                    batchNumber: item.batchNumber || '',
                    expiryDate: item.expiryDate || '',
                    costPrice: Number(item.costPrice) || 12000,
                    sellingPrice: Number(item.sellingPrice) || 20000,
                    wholesalePrice: Number(item.wholesalePrice) || 18000,
                    reorderLevel: Number(item.reorderLevel) || 5,
                    taxRate: Number(item.taxRate) || 18,
                    quantity: Number(item.quantity) || 20,
                    branchStock: { [currentBranch]: Number(item.quantity) || 20 },
                    variants: [],
                    unit: item.unit || 'Units',
                    images: [],
                    videos: []
                  };
                  db.addProduct(newProd, userEmail);
                  loaded++;
                }
              });
              setImportCount(loaded);
              addLog(`DB_SUCCESS: Parsed & committed ${loaded} active products from JSON.`);
            } else {
              addLog(`ERROR: JSON file must contain an array of inventory items!`);
            }
          } 
          // Standard CSV parser channel
          else {
            const lines = text.split('\n');
            let loaded = 0;
            // Skip the header
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line) {
                const cols = line.split(',');
                if (cols[0]) {
                  const cleanedName = cols[0].replace(/"/g, '').trim();
                  const cleanedSku = (cols[1] || '').replace(/"/g, '').trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
                  const cleanedBarcode = (cols[2] || '').replace(/"/g, '').trim() || `BC-${Math.floor(10000 + Math.random() * 90000)}`;
                  const cleanedCategory = (cols[3] || '').replace(/"/g, '').trim() || 'General';
                  const costPrice = Number(cols[4]) || 4000;
                  const sellingPrice = Number(cols[5]) || 6500;
                  const quantity = Number(cols[6]) || 15;

                  const newProd: Product = {
                    id: `csv-${Date.now()}-${i}`,
                    name: cleanedName,
                    description: 'Semi-structured SKU parsed from CSV',
                    sku: cleanedSku,
                    barcode: cleanedBarcode,
                    qrCode: '',
                    category: cleanedCategory,
                    brand: 'Local CSV Brand',
                    supplierId: '',
                    manufacturer: '',
                    serialNumber: '',
                    batchNumber: 'BATCH-CSV',
                    expiryDate: '',
                    costPrice,
                    sellingPrice,
                    wholesalePrice: sellingPrice * 0.9,
                    reorderLevel: 3,
                    taxRate: 18,
                    quantity,
                    branchStock: { [currentBranch]: quantity },
                    variants: [],
                    unit: 'Pcs',
                    images: [],
                    videos: []
                  };
                  db.addProduct(newProd, userEmail);
                  loaded++;
                }
              }
            }
            setImportCount(loaded);
            addLog(`DB_SUCCESS: Extracted ${loaded} dynamic SKU records cleanly from CSV.`);
          }
          db.logAudit('CREATE', 'DatabaseImport', `Imported ${file.name} inventory data through dashboard Drag-and-Drop`, userEmail);
          onRefreshData();
        } catch (err) {
          addLog(`ERROR: Failed parsing structured records. Check tabular format.`);
        }
      };
      reader.readAsText(file);
    }

    // MODE 3: Product catalog photos
    else if (activeMode === 'product_pic') {
      if (!file.type.startsWith('image/')) {
        addLog(`ERROR: Invalid file type! Product preview must be an image.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFilePreview(base64);
        
        // Find a random raw product to apply this mockup image for preview
        const products = db.getProducts();
        if (products.length > 0) {
          const target = products[0];
          target.images = [base64];
          db.saveProducts(products);
          addLog(`DB_UPDATE: Set active showcase image for item [${target.name}]`);
          onRefreshData();
        } else {
          addLog(`LEDGER_SIM: Saved base64 product asset. Register items first.`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag handles
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processUploadedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processUploadedFile(file);
    }
  };

  const clearCurrentFileState = () => {
    setFilePreview(null);
    setFileName(null);
    setImportCount(0);
    addLog(`STATE_CLEARED: Cleared file buffers.`);
  };

  // Demo file generator download for quick evaluation
  const downloadSampleCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Product Name,SKU,Barcode,Category,Cost Price,Selling Price,InStock\n';
    csvContent += '"Dar es Salaam Pembe Flour 10kg","DF-10KG","600980001","Flours",14000,18500,22\n';
    csvContent += '"Kili Pure Spring Water 1.5L","KL-WATER-1.5","600980002","Beverages",800,1200,150\n';
    csvContent += '"Super Mo Safi Soap 200g","SM-SOAP-200","600980003","Hygiene",1200,1800,45\n';
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'DukaOS_Inventory_Sample.csv');
    document.body.appendChild(link);
    link.click();
    addLog(`GENERATOR: Sent DukaOS_Inventory_Sample.csv to operator.`);
  };

  return (
    <div className="bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-205 dark:border-slate-800 space-y-4 shadow-sm text-xs">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2.5 gap-2 border-slate-100 dark:border-slate-850">
        <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1.5 matches-font">
          <UploadCloud className="h-4 w-4 text-indigo-600" />
          <span>
            {language === 'SW' ? 'Eneo la Kupakia Faili na Risiti' : 'Interactive Document & Resource Upload Hub'}
          </span>
        </span>
        <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100/30">
          {language === 'SW' ? 'Vipakiaji vya Base64 Imara' : 'High Speed Binary Nodes'}
        </span>
      </div>

      {/* Mode selectors */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 dark:bg-slate-900 rounded-lg">
        <button
          type="button"
          onClick={() => { setActiveMode('logo'); clearCurrentFileState(); }}
          className={`py-2 rounded-md font-bold px-1 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer text-[10px] ${
            activeMode === 'logo'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="truncate">{language === 'SW' ? 'Nembo yetu' : 'Brand Logo'}</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveMode('excel'); clearCurrentFileState(); }}
          className={`py-2 rounded-md font-bold px-1 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer text-[10px] ${
            activeMode === 'excel'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{language === 'SW' ? 'Stoki/Excel' : 'CSV Spreadsheet'}</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveMode('product_pic'); clearCurrentFileState(); }}
          className={`py-2 rounded-md font-bold px-1 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer text-[10px] ${
            activeMode === 'product_pic'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{language === 'SW' ? 'Bidhaa/Picha' : 'Product Photo'}</span>
        </button>
      </div>

      {/* Main Drag-and-Drop Area Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
          isDragging 
            ? 'border-indigo-600 bg-indigo-50/10 scale-[1.01]' 
            : 'border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 hover:border-indigo-400 hover:bg-slate-100/30'
        }`}
      >
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={
            activeMode === 'logo' || activeMode === 'product_pic' 
              ? "image/*" 
              : ".csv,.json,.txt"
          }
          className="hidden"
        />

        {filePreview && (activeMode === 'logo' || activeMode === 'product_pic') ? (
          <div className="relative h-20 w-20 rounded-lg border bg-white dark:bg-slate-950 p-1 group flex items-center justify-center">
            <img src={filePreview} className="h-full w-full object-contain rounded" alt="Preview File" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
              <Trash2 
                className="h-5 w-5 text-red-400 hover:text-red-500" 
                onClick={(e) => { e.stopPropagation(); clearCurrentFileState(); }}
              />
            </div>
          </div>
        ) : fileName && activeMode === 'excel' ? (
          <div className="space-y-1.5 flex flex-col items-center">
            <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <FileCheck className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <strong className="text-[11px] text-slate-850 dark:text-slate-100 block max-w-[250px] truncate">{fileName}</strong>
              {importCount > 0 && (
                <span className="text-[9px] text-emerald-600 font-extrabold block">
                  {language === 'SW' ? `Imepokelewa na kusajili bidhaa ${importCount}!` : `Parsed & registered ${importCount} items successfully!`}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto h-9 w-9 text-slate-400 bg-white dark:bg-slate-950 rounded-lg border flex items-center justify-center shadow-xs">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <strong className="text-[11px] block text-slate-700 dark:text-slate-200">
                {language === 'SW' 
                  ? 'Kokota na uondoshe faili hapa au bofya kuchagua' 
                  : 'Drag & Drop your file here, or click to browse'}
              </strong>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                {activeMode === 'logo' 
                  ? (language === 'SW' ? 'JPG, PNG au SVG - Nembo ya kampuni' : 'JPG, PNG, JPEG, SVG for company brand (Max 1.5MB)')
                  : activeMode === 'excel'
                    ? (language === 'SW' ? 'Mtumia faili la .csv au .json kupakia stoki' : 'Upload tabular .csv or structured .json inventory records')
                    : (language === 'SW' ? 'Picha ya bidhaa ili kusasisha maonyesho' : 'Showcase photos for current inventory items')
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Auxiliary actions/guides */}
      {activeMode === 'excel' && (
        <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100/30">
          <div className="flex items-center gap-1.5 text-[9px] text-indigo-700 dark:text-indigo-400 font-bold">
            <FileCode className="h-4 w-4 shrink-0" />
            <span>
              {language === 'SW' ? 'Je, huna faili la mfano wa CSV/Excel?' : 'Want a pre-formatted template sheet?'}
            </span>
          </div>
          <button
            type="button"
            onClick={downloadSampleCSV}
            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-extrabold text-[8.5px] uppercase tracking-wide cursor-pointer"
          >
            {language === 'SW' ? 'Pakua Mfano' : 'Get CSV sample'}
          </button>
        </div>
      )}

      {/* Live terminal scroll feed for interactive system feedback */}
      <div className="bg-slate-950 text-slate-400 p-2.5 rounded-lg font-mono text-[8.5px] border border-slate-850 space-y-1.5 focus-within:ring-1 focus-within:ring-indigo-500/50">
        <div className="flex justify-between items-center text-slate-500 border-b border-slate-900 pb-1">
          <span className="flex items-center gap-1">
            <Terminal className="h-3 w-3 text-emerald-500" />
            <span>DUKA_OS_UPLOAD_DEBUGLOGS</span>
          </span>
          <span className="text-[7.5px] uppercase tracking-widest font-black text-emerald-700">online</span>
        </div>
        <div className="space-y-0.5 max-h-[80px] overflow-y-auto scrollbar-thin">
          {logs.length === 0 ? (
            <span className="text-slate-550 block italic py-0.5">
              {language === 'SW' ? 'Logi za barubaru zitaonekana hapa ukivuta faili...' : 'Ready for binary streams... Drag files to trigger ledger commits'}
            </span>
          ) : (
            logs.map((log, idx) => (
              <div 
                key={idx} 
                className={`truncate block leading-tight ${
                  log.includes('SUCCESS') || log.includes('COMMIT') 
                    ? 'text-emerald-400' 
                    : log.includes('ERROR') 
                      ? 'text-rose-450 text-red-400 font-bold' 
                      : 'text-slate-400'
                }`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
