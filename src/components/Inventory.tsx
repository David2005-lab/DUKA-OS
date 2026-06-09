/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  TrendingUp, 
  ArrowRightLeft, 
  AlertTriangle, 
  Download, 
  Upload, 
  RotateCcw, 
  SlidersHorizontal,
  FileCheck
} from 'lucide-react';
import { Product, Branch, StockTransfer } from '../types';
import { db } from '../db';
import { translations } from '../translations';

interface InventoryProps {
  language: 'EN' | 'SW';
  currentBranch: string;
  userEmail: string;
}

export default function Inventory({ language, currentBranch, userEmail }: InventoryProps) {
  const t = translations[language];

  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'audit' | 'transfer'>('catalog');
  const [catalogSearch, setCatalogSearch] = useState('');

  // New Product Modal details
  const [showAddForm, setShowAddForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // Form Field bindings
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pSku, setPSku] = useState('');
  const [pBarcode, setPBarcode] = useState('');
  const [pCategory, setPCategory] = useState('General');
  const [pBrand, setPBrand] = useState('');
  const [pSupplier, setPSupplier] = useState('');
  const [pCost, setPCost] = useState(0);
  const [pSell, setPSell] = useState(0);
  const [pWholesale, setPWholesale] = useState(0);
  const [pTax, setPTax] = useState(18);
  const [pQty, setPQty] = useState(0);
  const [pReorder, setPReorder] = useState(5);
  const [pExpiry, setPExpiry] = useState('');
  const [pBatch, setPBatch] = useState('');
  const [pSerial, setPSerial] = useState('');
  const [pUnit, setPUnit] = useState('pcs');
  const [pColor, setPColor] = useState('');
  const [pSize, setPSize] = useState('');

  // Branch Transfer bindings
  const [transferProduct, setTransferProduct] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferQty, setTransferQty] = useState(0);

  // Damage Adjustments bindings
  const [selectedProductAdj, setSelectedProductAdj] = useState('');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState<'Damaged' | 'Returned'>('Damaged');

  const loadData = () => {
    setProducts(db.getProducts());
    setBranches(db.getBranches());
    setTransfers(db.getTransfers());

    const isFilterSku = localStorage.getItem('SmartERP_Inventory_SkuFilter');
    if (isFilterSku) {
      setCatalogSearch(isFilterSku);
      localStorage.removeItem('SmartERP_Inventory_SkuFilter');
    }
  };

  useEffect(() => {
    loadData();
  }, [currentBranch]);

  // Handle Create/Save product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pSku) {
      alert('Product Name and SKU are mandatory requirements!');
      return;
    }

    if (editProduct) {
      // Modify
      const updated: Product = {
        ...editProduct,
        name: pName,
        description: pDesc,
        sku: pSku,
        barcode: pBarcode || pSku,
        category: pCategory,
        brand: pBrand,
        costPrice: pCost,
        sellingPrice: pSell,
        wholesalePrice: pWholesale,
        taxRate: pTax,
        reorderLevel: pReorder,
        expiryDate: pExpiry,
        batchNumber: pBatch,
        serialNumber: pSerial,
        unit: pUnit,
        color: pColor,
        size: pSize
      };
      db.updateProduct(updated, userEmail);
    } else {
      // Create new
      const bStockAlloc: Record<string, number> = {};
      bStockAlloc[currentBranch] = pQty; // initially place it in the current working branch stock

      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        name: pName,
        description: pDesc,
        images: [],
        videos: [],
        sku: pSku,
        barcode: pBarcode || pSku,
        qrCode: `https://verify-product.smartbusinesserp.com/p/${pSku}`,
        category: pCategory,
        brand: pBrand,
        supplierId: pSupplier || 'direct',
        manufacturer: pBrand || 'Generic',
        serialNumber: pSerial,
        batchNumber: pBatch,
        expiryDate: pExpiry,
        costPrice: pCost,
        sellingPrice: pSell,
        wholesalePrice: pWholesale,
        taxRate: pTax,
        quantity: pQty,
        reorderLevel: pReorder,
        branchStock: bStockAlloc,
        variants: [],
        color: pColor,
        size: pSize,
        unit: pUnit
      };
      db.addProduct(newProduct, userEmail);
    }

    resetForm();
    loadData();
  };

  const resetForm = () => {
    setEditProduct(null);
    setShowAddForm(false);
    setPName('');
    setPDesc('');
    setPSku('');
    setPBarcode('');
    setPCategory('General');
    setPBrand('');
    setPSupplier('');
    setPCost(0);
    setPSell(0);
    setPWholesale(0);
    setPTax(18);
    setPQty(0);
    setPReorder(5);
    setPExpiry('');
    setPBatch('');
    setPSerial('');
    setPUnit('pcs');
    setPColor('');
    setPSize('');
  };

  const handleEditClick = (prod: Product) => {
    setEditProduct(prod);
    setPName(prod.name);
    setPDesc(prod.description);
    setPSku(prod.sku);
    setPBarcode(prod.barcode);
    setPCategory(prod.category);
    setPBrand(prod.brand);
    setPSupplier(prod.supplierId);
    setPCost(prod.costPrice);
    setPSell(prod.sellingPrice);
    setPWholesale(prod.wholesalePrice);
    setPTax(prod.taxRate);
    setPQty(prod.branchStock[currentBranch] ?? prod.quantity);
    setPReorder(prod.reorderLevel);
    setPExpiry(prod.expiryDate);
    setPBatch(prod.batchNumber);
    setPSerial(prod.serialNumber);
    setPUnit(prod.unit || 'pcs');
    setPColor(prod.color || '');
    setPSize(prod.size || '');
    setShowAddForm(true);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm(language === 'SW' ? 'Una uhakika unataka kufuta bidhaa hii?' : 'Are you sure you want to delete this product?')) {
      db.deleteProduct(id, userEmail);
      loadData();
    }
  };

  // Adjust Damaged / Damaged write-off inventory levels
  const handleUpdateAdjustments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductAdj || adjustQty <= 0) return;

    const productsDb = db.getProducts();
    const pIdx = productsDb.findIndex((prod) => prod.id === selectedProductAdj);
    
    if (pIdx !== -1) {
      const prod = productsDb[pIdx];
      const curStock = prod.branchStock[currentBranch] ?? 0;

      if (adjustType === 'Damaged') {
        if (adjustQty > curStock) {
          alert(language === 'SW' ? 'Huwezi kupunguza zaidi ya stoki iliyopo tawi hili!' : 'Insufficient branch stock to report damage write-offs!');
          return;
        }
        prod.branchStock[currentBranch] = curStock - adjustQty;
        db.logAudit('UPDATE', 'Product', `REDUCED STOCK FOR SICK/DEFECTIVE DEVIATION: ${prod.name} (-${adjustQty} ${adjustType})`, userEmail);
      } else {
        // Customer Return increases stock back
        prod.branchStock[currentBranch] = curStock + adjustQty;
        db.logAudit('UPDATE', 'Product', `RETURNED CUSTOMER RESTORE: SKU ${prod.sku} increased +${adjustQty}`, userEmail);
      }

      // Balance global quantity
      prod.quantity = Object.values(prod.branchStock).reduce((sum, val) => sum + val, 0);
      db.updateProduct(prod, userEmail);

      alert(language === 'SW' ? 'Marekebisho Yamehifadhiwa!' : 'Stock adjusted successfully and ledger logged!');
      setAdjustQty(0);
      loadData();
    }
  };

  // Create Stock transfer
  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProduct || !transferFrom || !transferTo || transferQty <= 0) return;
    if (transferFrom === transferTo) {
      alert(language === 'SW' ? 'Matawi hayawezi kufanana!' : 'Origin and destination branch cannot be identical!');
      return;
    }

    const productsDb = db.getProducts();
    const pMatch = productsDb.find((p) => p.id === transferProduct);
    if (!pMatch) return;

    const sourceQty = pMatch.branchStock[transferFrom] ?? 0;
    if (transferQty > sourceQty) {
      alert(language === 'SW' ? 'Stoki haitoshi katika tawi linalotoka!' : 'Insufficient stock in originating branch.');
      return;
    }

    const tId = `trf-${Date.now()}`;
    const newTrf: StockTransfer = {
      id: tId,
      date: new Date().toISOString().split('T')[0],
      fromBranchId: transferFrom,
      toBranchId: transferTo,
      productId: transferProduct,
      productName: pMatch.name,
      quantity: transferQty,
      status: 'Pending',
      initiatedBy: userEmail
    };

    db.addTransfer(newTrf, userEmail);
    
    // Automatically complete transfer for ease of representation in SMEs Pro Max UI
    db.completeTransfer(tId, userEmail);

    alert(language === 'SW' ? 'Uhamisho Salama wa Stoki Umekamilika na Matawi Sawa!' : 'Branch Stock Transfer approved and completed instantly!');
    setTransferQty(0);
    loadData();
  };

  // Data Imports / Exports Simulations
  const handleCSVExport = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Product Name,SKU,Barcode,Category,Cost Price,Selling Price,InStock\n';
    products.forEach((p) => {
      csvContent += `"${p.name}","${p.sku}","${p.barcode}","${p.category}",${p.costPrice},${p.sellingPrice},${p.branchStock[currentBranch] ?? p.quantity}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmartERP_ProductInventory_${currentBranch}.csv`);
    document.body.appendChild(link);
    link.click();
    db.logAudit('UPDATE', 'DatabaseExport', `Exported inventory sheets to CSV for branch context ${currentBranch}`, userEmail);
  };

  const handleJSONImport = () => {
    // Inject two mock enterprise supplies for quick demo testing if requested
    const boots: Product = {
      id: 'mock-1',
      name: 'Superb leather workboots',
      description: 'Industrial safety steel-toe workboots',
      sku: 'WKB-902',
      barcode: '600020102030',
      qrCode: '',
      category: 'Footwear',
      brand: 'SafetyPro',
      supplierId: 'sup-1',
      manufacturer: 'Kenya Industrial Co',
      serialNumber: 'SN-901',
      batchNumber: 'BTCH-B',
      expiryDate: '',
      costPrice: 45000,
      sellingPrice: 75000,
      wholesalePrice: 60000,
      reorderLevel: 5,
      taxRate: 18,
      quantity: 50,
      branchStock: { 'branch-main': 50 },
      variants: [],
      color: 'Brown',
      size: '42',
      unit: 'Pairs',
      images: [],
      videos: []
    };

    const laptop: Product = {
      id: 'mock-2',
      name: 'Pro-Book Enterprise Workstation 15',
      description: 'High performance productivity computer workstation',
      sku: 'LT-903',
      barcode: '102030405060',
      qrCode: '',
      category: 'Electronics',
      brand: 'HP-Pro',
      supplierId: 'sup-2',
      manufacturer: 'HP International',
      serialNumber: 'SN-X9201',
      batchNumber: 'B-261',
      expiryDate: '',
      costPrice: 1500000,
      sellingPrice: 1950000,
      wholesalePrice: 1800000,
      reorderLevel: 5,
      taxRate: 18,
      quantity: 12,
      branchStock: { 'branch-main': 12 },
      variants: [],
      unit: 'Pcs',
      images: [],
      videos: []
    };

    db.addProduct(boots, userEmail);
    db.addProduct(laptop, userEmail);
    
    db.logAudit('CREATE', 'DatabaseImport', 'Imported enterprise sample templates to local state database', userEmail);
    alert('Imported 2 Real Products successfully! View catalogs.');
    loadData();
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Subtabs selection */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 gap-1">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`px-4 py-2 text-xs font-bold border-b-2 leading-none flex items-center gap-1.5 ${
            activeSubTab === 'catalog'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Product Master Catalog</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2 text-xs font-bold border-b-2 leading-none flex items-center gap-1.5 ${
            activeSubTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Manual Damages ADJUSTMENTS</span>
        </button>

        <button
          onClick={() => setActiveSubTab('transfer')}
          className={`px-4 py-2 text-xs font-bold border-b-2 leading-none flex items-center gap-1.5 ${
            activeSubTab === 'transfer'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          <span>Branch Stock Transfers</span>
        </button>
      </div>

      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          
          {/* Action Row */}
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-850">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { resetForm(); setShowAddForm(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>{t.addProduct}</span>
              </button>

              <button
                onClick={handleCSVExport}
                className="border border-slate-350 dark:border-slate-800 hover:bg-slate-100 hover:dark:bg-slate-900 text-[11px] font-black p-1.5 rounded-lg px-2.5 flex items-center gap-1 leading-none text-slate-700 dark:text-slate-200 shrink-0"
              >
                <Download className="h-3.5 w-3.5 text-indigo-600" />
                <span>Export CSV</span>
              </button>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter name or SKU..."
                  className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-white pl-2 pr-6"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
                {catalogSearch && (
                  <button 
                    onClick={() => setCatalogSearch('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-[10px]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleJSONImport}
              className="text-stone-700 border border-amber-800/20 bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1"
              title="Bootstraps actual data to verify reports easily if you don't feel like typing today."
            >
              <FileCheck className="h-3.5 w-3.5 text-amber-600" />
              <span>Bootstrap Excel products mock</span>
            </button>
          </div>

          {/* New / Edit Product Overlay Drawer */}
          {showAddForm && (
            <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-w-4xl animate-fade-in">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase">
                  {editProduct ? 'Modify Product Specifications' : t.addProduct}
                </h3>
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-bold underline">
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">{t.bizName} *</label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="E.g. Steel Pipe 2 inch"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">{t.sku} *</label>
                  <input
                    type="text"
                    required
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="E.g. HW-PIP-002"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">{t.barcode}</label>
                  <input
                    type="text"
                    value={pBarcode}
                    onChange={(e) => setPBarcode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 mt-1"
                    placeholder="Barcode string"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Category</label>
                  <input
                    type="text"
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 mt-1"
                    placeholder="Category"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Brand / Manufacturer</label>
                  <input
                    type="text"
                    value={pBrand}
                    onChange={(e) => setPBrand(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Measuring Unit (Unit)</label>
                  <input
                    type="text"
                    value={pUnit}
                    onChange={(e) => setPUnit(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 mt-1"
                    placeholder="E.g. Pcs, Box, Kg, Liter"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">{t.costPrice} (TZS) *</label>
                  <input
                    type="number"
                    required
                    value={pCost || ''}
                    onChange={(e) => setPCost(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">{t.sellingPrice} (TZS) *</label>
                  <input
                    type="number"
                    required
                    value={pSell || ''}
                    onChange={(e) => setPSell(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">{t.wholesalePrice} (TZS)</label>
                  <input
                    type="number"
                    value={pWholesale || ''}
                    onChange={(e) => setPWholesale(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 mt-1"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">VAT Rate (%)</label>
                  <input
                    type="number"
                    value={pTax}
                    onChange={(e) => setPTax(Number(e.target.value))}
                    className="w-full border rounded-lg p-2 bg-slate-50 dark:bg-slate-900 mt-1"
                  />
                </div>
                {!editProduct && (
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400">Opening Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      value={pQty || ''}
                      onChange={(e) => setPQty(Number(e.target.value))}
                      className="w-full border rounded-lg p-2 bg-slate-50 dark:bg-slate-900 mt-1"
                    />
                  </div>
                )}
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">{t.reorder} (alert boundary) *</label>
                  <input
                    type="number"
                    required
                    value={pReorder || ''}
                    onChange={(e) => setPReorder(Number(e.target.value))}
                    className="w-full border rounded-lg p-2 bg-slate-50 dark:bg-slate-900 mt-1"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#b45309] dark:text-slate-400">Expiry Date (N/A if non-perishable)</label>
                  <input
                    type="date"
                    value={pExpiry}
                    onChange={(e) => setPExpiry(e.target.value)}
                    className="w-full border border-amber-300 rounded-lg p-2 mt-1 bg-amber-50/10"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Batch Number</label>
                  <input
                    type="text"
                    value={pBatch}
                    onChange={(e) => setPBatch(e.target.value)}
                    className="w-full border rounded-lg p-2 bg-slate-50 dark:bg-slate-900 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Serial Code</label>
                  <input
                    type="text"
                    value={pSerial}
                    onChange={(e) => setPSerial(e.target.value)}
                    className="w-full border rounded-lg p-2 bg-slate-50 dark:bg-slate-900 mt-1"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Specification Color</label>
                  <input
                    type="text"
                    value={pColor}
                    onChange={(e) => setPColor(e.target.value)}
                    className="w-full border rounded-lg p-2 bg-slate-50 dark:bg-slate-900 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Specification Size</label>
                  <input
                    type="text"
                    value={pSize}
                    onChange={(e) => setPSize(e.target.value)}
                    className="w-full border rounded-lg p-2 bg-slate-50 dark:bg-slate-900 mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-lg shadow-md leading-none"
                  >
                    Save Specifications Spec
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Products Catalog Grid */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-white dark:bg-slate-950 rounded-xl border">
              <Package className="h-10 w-10 text-slate-300 mb-2" />
              <span className="font-extrabold text-sm uppercase text-slate-500">{t.noData}</span>
              <p className="text-xs text-slate-400 mt-1">{t.noDataDesc}</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Cost (TZS)</th>
                    <th className="p-3 text-right">Selling (TZS)</th>
                    <th className="p-3 text-right">My Branch Qty</th>
                    <th className="p-3 text-right">Alert Cap</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {products
                    .filter((p) => {
                      if (!catalogSearch) return true;
                      const term = catalogSearch.toLowerCase().trim();
                      return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
                    })
                    .map((p) => {
                    const bQty = p.branchStock[currentBranch] ?? 0;
                    const isLow = bQty <= p.reorderLevel;
                    const isOut = bQty <= 0;

                    return (
                      <tr 
                        key={p.id}
                        className={`hover:bg-slate-50/30 ${
                          isOut ? 'bg-red-50/20 dark:bg-red-950/5' : isLow ? 'bg-amber-50/20 dark:bg-amber-950/5' : ''
                        }`}
                      >
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          <div className="flex flex-col">
                            <span>{p.name}</span>
                            {p.expiryDate && (
                              <span className="text-[10px] text-amber-600 font-mono mt-0.5">Expires: {p.expiryDate}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono">{p.sku}</td>
                        <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] rounded-full uppercase font-bold text-slate-500">{p.category}</span></td>
                        <td className="p-3 text-right font-mono">{p.costPrice.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-indigo-750 dark:text-indigo-400">{p.sellingPrice.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold">
                          <span className={isOut ? 'text-red-650' : isLow ? 'text-amber-600' : 'text-slate-900 dark:text-white'}>
                            {bQty} {p.unit || 'pcs'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400">{p.reorderLevel}</td>
                        <td className="p-3.5 text-center flex justify-center gap-2">
                          <button onClick={() => handleEditClick(p)} className="p-1 hover:bg-slate-100 rounded text-slate-650" title="Edit specifications">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteClick(p.id)} className="p-1 hover:bg-red-50 rounded text-red-650" title="Delete Specifications">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* Manual Damaged / Adjustments form UI */}
      {activeSubTab === 'audit' && (
        <div className="max-w-2xl bg-white dark:bg-slate-950 rounded-xl border shadow p-6 space-y-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-indigo-650" />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase leading-none">Declare Defectives / Manual Deviation write-off</h3>
          </div>
          <p className="text-xs text-slate-400">Manual adjustments will deduct items from current branch context stock registries without recording Pos sales revenue, automatically appending secure log details and triggers.</p>

          <form onSubmit={handleUpdateAdjustments} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-600">Selected Product</label>
                <select
                  value={selectedProductAdj}
                  onChange={(e) => setSelectedProductAdj(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2.5 mt-1 focus:outline-none"
                  required
                >
                  <option value="">Select SKU...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (My Stock: {p.branchStock[currentBranch] ?? 0})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600">Adjustment Action Type</label>
                <div className="flex gap-2 mt-1">
                  {(['Damaged', 'Returned'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAdjustType(type)}
                      className={`flex-1 py-2 rounded-lg border font-bold text-center ${
                        adjustType === type
                          ? 'bg-rose-50 border-rose-400 text-rose-900 dark:bg-rose-950/20'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {type === 'Damaged' ? 'Damage write-off (-)' : 'Customer Return (+)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-600">Quantity (pcs)</label>
              <input
                type="number"
                value={adjustQty || ''}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                className="w-full md:w-48 bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 mt-1 focus:outline-none"
                placeholder="E.g. 5"
                required
              />
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-6 rounded-lg leading-none shadow"
            >
              Commit Ledger Adjustment
            </button>
          </form>
        </div>
      )}

      {/* Multi-Branch Stock transfers UI */}
      {activeSubTab === 'transfer' && (
        <div className="max-w-3xl bg-white dark:bg-slate-950 rounded-xl border shadow p-6 space-y-5">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase leading-none">Inter-Branch Stock Distribution Panel</h3>
          </div>
          
          <form onSubmit={handleCreateTransfer} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs items-end">
            <div>
              <label className="font-bold text-slate-600">Select Item</label>
              <select
                value={transferProduct}
                onChange={(e) => setTransferProduct(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 py-2.5 mt-1 focus:outline-none"
                required
              >
                <option value="">Select Item SKU...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} [GL: {p.quantity}]</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-600">{t.from}</label>
              <select
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 py-2.5 mt-1"
                required
              >
                <option value="">Origin Branch...</option>
                <option value="branch-main">HQ / Main Branch</option>
                {branches.filter((b) => b.id !== 'branch-main').map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-600">{t.to}</label>
              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 py-2.5 mt-1"
                required
              >
                <option value="">Destination Branch...</option>
                <option value="branch-main">HQ / Main Branch</option>
                {branches.filter((b) => b.id !== 'branch-main').map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-600">Units Trsf</label>
              <input
                type="number"
                value={transferQty || ''}
                onChange={(e) => setTransferQty(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 p-2.5 rounded-lg focus:outline-none mt-1"
                placeholder="Qty..."
                required
              />
            </div>

            <div className="md:col-span-4 flex justify-end">
              <button
                type="submit"
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-black py-2.5 px-6 rounded-lg leading-none shadow"
              >
                Authorize Secure Branch Transfer Transfer
              </button>
            </div>
          </form>

          {/* Transfers Activity logs */}
          <div className="space-y-2 border-t pt-4">
            <h4 className="font-black text-xs text-slate-500 uppercase">Recent Branch Transfers Log</h4>
            {transfers.length === 0 ? (
              <p className="text-xs text-slate-400">No stock distributions recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {transfers.map((tr) => (
                  <div key={tr.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border flex justify-between items-center text-xs">
                    <div>
                      <span className="font-black text-slate-800 dark:text-slate-100">{tr.productName}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Moved {tr.quantity} pcs from {tr.fromBranchId === 'branch-main' ? 'HQ' : 'Branch ID'} to {tr.toBranchId === 'branch-main' ? 'HQ' : 'Branch ID'} on {tr.date}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-green-100 text-green-900 text-[9px] rounded font-mono font-black">COMPLETED</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
