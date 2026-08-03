/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Transaction, Product, BusinessConfig } from '../types';
import { db } from '../db';

/**
 * Exports Ledger Transactions to a formatted CSV file.
 */
export const exportLedgerToCSV = (
  transactions: Transaction[],
  language: 'EN' | 'SW',
  filename?: string
) => {
  const isSW = language === 'SW';
  const headers = [
    isSW ? 'Namba ya Muamala' : 'Transaction ID',
    isSW ? 'Tarehe' : 'Date',
    isSW ? 'Aina' : 'Type',
    isSW ? 'Aina ya Kipengele' : 'Category / Description',
    isSW ? 'Kiasi (TZS)' : 'Amount (TZS)',
    isSW ? 'Tawi' : 'Branch ID'
  ];

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

  transactions.forEach((tx) => {
    const row = [
      `"${tx.id || ''}"`,
      `"${tx.date || ''}"`,
      `"${tx.type || ''}"`,
      `"${(tx.categoryId || tx.description || '').replace(/"/g, '""')}"`,
      tx.amount || 0,
      `"${tx.branchId || 'HQ'}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `General_Ledger_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports Ledger Transactions to a formatted PDF document using jsPDF.
 */
export const exportLedgerToPDF = (
  transactions: Transaction[],
  language: 'EN' | 'SW',
  profile?: BusinessConfig | null
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const bizProfile = profile || db.getProfile();
  const isSW = language === 'SW';
  const leftMargin = 14;
  const rightMargin = 196;
  const pageHeight = 297;
  let y = 18;

  // Colors
  const colPrimary = [30, 58, 138];
  const colTextDark = [15, 23, 42];
  const colTextMuted = [100, 116, 139];
  const colSuccess = [16, 185, 129];
  const colDanger = [225, 29, 72];

  // --- HEADER ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(colPrimary[0], colPrimary[1], colPrimary[2]);
  doc.text((bizProfile?.name || 'DUKA OS ENTERPRISE').toUpperCase(), leftMargin, y);

  doc.setFontSize(13);
  doc.text(
    isSW ? 'RIPOTI YA KUMBUKUMBU KUU (GENERAL LEDGER)' : 'GENERAL LEDGER TRANSACTIONS REPORT',
    rightMargin,
    y,
    { align: 'right' }
  );

  y += 6;

  // Subheaders & Company Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
  const addr = `${bizProfile?.address || 'Dar es Salaam'}, ${bizProfile?.country || 'Tanzania'}`;
  const contacts = `TIN: ${bizProfile?.tinNumber || '111-222-333'} | Tel: ${bizProfile?.phone || '+255 754 000 111'}`;
  doc.text(addr, leftMargin, y);
  doc.text(contacts, leftMargin, y + 4);

  const dateStr = new Date().toLocaleDateString(isSW ? 'sw-TZ' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`${isSW ? 'Tarehe ya Kutolewa:' : 'Generated Date:'} ${dateStr}`, rightMargin, y + 4, { align: 'right' });

  y += 12;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, y, rightMargin, y);

  y += 7;

  // --- EXECUTIVE SUMMARY STATS BLOCK ---
  const salesTxns = transactions.filter(t => t.type === 'Sale');
  const expenseTxns = transactions.filter(t => t.type === 'Expense');
  const refundTxns = transactions.filter(t => t.type === 'Refund');

  const totalSales = salesTxns.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenseTxns.reduce((sum, t) => sum + t.amount, 0);
  const totalRefunds = refundTxns.reduce((sum, t) => sum + t.amount, 0);
  const netEarnings = totalSales - totalRefunds - totalExpenses;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(leftMargin, y, rightMargin - leftMargin, 18, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(leftMargin, y, rightMargin - leftMargin, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);

  const colWidth = (rightMargin - leftMargin) / 4;
  doc.text(isSW ? 'MAUZO YOTE (SALES)' : 'TOTAL SALES', leftMargin + 4, y + 5);
  doc.text(isSW ? 'GHARAMA (EXPENSES)' : 'TOTAL EXPENSES', leftMargin + colWidth + 4, y + 5);
  doc.text(isSW ? 'REJESHO (REFUNDS)' : 'TOTAL REFUNDS', leftMargin + colWidth * 2 + 4, y + 5);
  doc.text(isSW ? 'FAIDA HALISI (NET)' : 'NET INCOME', leftMargin + colWidth * 3 + 4, y + 5);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  doc.setTextColor(colSuccess[0], colSuccess[1], colSuccess[2]);
  doc.text(`TZS ${totalSales.toLocaleString()}`, leftMargin + 4, y + 13);

  doc.setTextColor(colDanger[0], colDanger[1], colDanger[2]);
  doc.text(`TZS ${totalExpenses.toLocaleString()}`, leftMargin + colWidth + 4, y + 13);

  doc.setTextColor(234, 88, 12);
  doc.text(`TZS ${totalRefunds.toLocaleString()}`, leftMargin + colWidth * 2 + 4, y + 13);

  if (netEarnings >= 0) {
    doc.setTextColor(colSuccess[0], colSuccess[1], colSuccess[2]);
  } else {
    doc.setTextColor(colDanger[0], colDanger[1], colDanger[2]);
  }
  doc.text(`TZS ${netEarnings.toLocaleString()}`, leftMargin + colWidth * 3 + 4, y + 13);

  y += 24;

  // --- TABLE HEADER ---
  doc.setFillColor(30, 58, 138);
  doc.rect(leftMargin, y, rightMargin - leftMargin, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  const cDate = 18;
  const cRef = 46;
  const cType = 82;
  const cDesc = 108;
  const cAmount = 192;

  doc.text(isSW ? 'Tarehe' : 'Date', cDate, y + 5.5);
  doc.text(isSW ? 'Namba ya Ref' : 'Transaction Ref', cRef, y + 5.5);
  doc.text(isSW ? 'Aina' : 'Flow Type', cType, y + 5.5);
  doc.text(isSW ? 'Maelezo / Kitengo' : 'Description / Category', cDesc, y + 5.5);
  doc.text(isSW ? 'Kiasi (TZS)' : 'Amount (TZS)', cAmount, y + 5.5, { align: 'right' });

  y += 11;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  transactions.forEach((tx, idx) => {
    if (y > 265) {
      doc.setFontSize(7.5);
      doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
      doc.text('DUKA OS Enterprise Ledger System', leftMargin, pageHeight - 10);
      doc.addPage();
      y = 18;

      // Repeat Table Header
      doc.setFillColor(30, 58, 138);
      doc.rect(leftMargin, y, rightMargin - leftMargin, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(isSW ? 'Tarehe' : 'Date', cDate, y + 5.5);
      doc.text(isSW ? 'Namba ya Ref' : 'Transaction Ref', cRef, y + 5.5);
      doc.text(isSW ? 'Aina' : 'Flow Type', cType, y + 5.5);
      doc.text(isSW ? 'Maelezo / Kitengo' : 'Description / Category', cDesc, y + 5.5);
      doc.text(isSW ? 'Kiasi (TZS)' : 'Amount (TZS)', cAmount, y + 5.5, { align: 'right' });

      y += 11;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(leftMargin, y - 3.5, rightMargin - leftMargin, 6.5, 'F');
    }

    const txRef = tx.id.length > 16 ? `${tx.id.substring(0, 14)}...` : tx.id;
    const txDesc = (tx.categoryId || tx.description || 'N/A');
    const shortDesc = txDesc.length > 42 ? `${txDesc.substring(0, 40)}...` : txDesc;

    doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);
    doc.text(tx.date || '---', cDate, y);
    doc.setFont('helvetica', 'bold');
    doc.text(txRef, cRef, y);
    doc.setFont('helvetica', 'normal');

    // Type styling
    if (tx.type === 'Sale') {
      doc.setTextColor(colSuccess[0], colSuccess[1], colSuccess[2]);
    } else if (tx.type === 'Expense') {
      doc.setTextColor(colDanger[0], colDanger[1], colDanger[2]);
    } else {
      doc.setTextColor(234, 88, 12);
    }
    doc.text(tx.type, cType, y);

    doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);
    doc.text(shortDesc, cDesc, y);

    // Amount
    if (tx.type === 'Sale') {
      doc.setTextColor(colSuccess[0], colSuccess[1], colSuccess[2]);
    } else {
      doc.setTextColor(colDanger[0], colDanger[1], colDanger[2]);
    }
    doc.setFont('helvetica', 'bold');
    const prefix = tx.type === 'Sale' ? '+' : '-';
    doc.text(`${prefix}TZS ${tx.amount.toLocaleString()}`, cAmount, y, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, y + 3, rightMargin, y + 3);

    y += 7;
  });

  // Footer / Compliance
  y += 6;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(leftMargin, y, rightMargin - leftMargin, 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);
  doc.text(isSW ? 'UHAKIKI WA LEDGER & MHUURI WA SERIKALI' : 'LEDGER INTEGRITY & COMPLIANCE STAMP', leftMargin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
  doc.text(
    `${isSW ? 'Stempu ya Kielektroniki:' : 'Electronic Verification Seal:'} "${bizProfile?.companyStamp || 'DUKA OS HQ'}" | Total Records: ${transactions.length}`,
    leftMargin + 4,
    y + 11
  );

  doc.save(`General_Ledger_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Exports Inventory Products list to a formatted CSV file.
 */
export const exportInventoryToCSV = (
  products: Product[],
  currentBranch: string,
  language: 'EN' | 'SW',
  filename?: string
) => {
  const isSW = language === 'SW';
  const headers = [
    'SKU',
    isSW ? 'Jina la Bidhaa' : 'Product Name',
    isSW ? 'Kipengele' : 'Category',
    isSW ? 'Chapa' : 'Brand',
    isSW ? 'Bei ya Ununuzi (TZS)' : 'Cost Price (TZS)',
    isSW ? 'Bei ya Mauzo (TZS)' : 'Selling Price (TZS)',
    isSW ? 'Stoki ya Tawi' : 'Branch Stock',
    isSW ? 'Jumla ya Stoki' : 'Total Stock',
    isSW ? 'Kiwango cha Kuagiza' : 'Reorder Level',
    isSW ? 'Hali' : 'Status'
  ];

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

  products.forEach((p) => {
    const bQty = p.branchStock[currentBranch] ?? p.quantity;
    const status = bQty <= 0 ? (isSW ? 'Imekwisha' : 'Out of Stock') : bQty <= p.reorderLevel ? (isSW ? 'Zimepungua' : 'Low Stock') : (isSW ? 'Ipo Stoki' : 'In Stock');

    const row = [
      `"${p.sku || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.category || 'General').replace(/"/g, '""')}"`,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      p.costPrice || 0,
      p.sellingPrice || 0,
      bQty,
      p.quantity || 0,
      p.reorderLevel || 5,
      `"${status}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `Inventory_Stock_Report_${currentBranch}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports Inventory Products to a formatted PDF document using jsPDF.
 */
export const exportInventoryToPDF = (
  products: Product[],
  currentBranch: string,
  language: 'EN' | 'SW',
  profile?: BusinessConfig | null
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const bizProfile = profile || db.getProfile();
  const isSW = language === 'SW';
  const leftMargin = 14;
  const rightMargin = 196;
  const pageHeight = 297;
  let y = 18;

  // Colors
  const colPrimary = [30, 58, 138];
  const colTextDark = [15, 23, 42];
  const colTextMuted = [100, 116, 139];
  const colSuccess = [16, 185, 129];
  const colDanger = [225, 29, 72];

  // --- HEADER ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(colPrimary[0], colPrimary[1], colPrimary[2]);
  doc.text((bizProfile?.name || 'DUKA OS ENTERPRISE').toUpperCase(), leftMargin, y);

  doc.setFontSize(13);
  doc.text(
    isSW ? 'RIPOTI YA STOKI NA BIDHAA (INVENTORY)' : 'INVENTORY STOCK CATALOG REPORT',
    rightMargin,
    y,
    { align: 'right' }
  );

  y += 6;

  // Subheaders & Company Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
  const addr = `${bizProfile?.address || 'Dar es Salaam'}, ${bizProfile?.country || 'Tanzania'}`;
  const branchInfo = `${isSW ? 'Tawi:' : 'Branch:'} ${currentBranch} | TIN: ${bizProfile?.tinNumber || '111-222-333'}`;
  doc.text(addr, leftMargin, y);
  doc.text(branchInfo, leftMargin, y + 4);

  const dateStr = new Date().toLocaleDateString(isSW ? 'sw-TZ' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`${isSW ? 'Tarehe:' : 'Generated Date:'} ${dateStr}`, rightMargin, y + 4, { align: 'right' });

  y += 12;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, y, rightMargin, y);

  y += 7;

  // --- METRICS SUMMARY ---
  const branchProducts = products.map(p => ({
    ...p,
    branchQty: p.branchStock[currentBranch] ?? p.quantity
  }));

  const totalBuyingVal = branchProducts.reduce((sum, p) => sum + (p.costPrice * p.branchQty), 0);
  const totalSellingVal = branchProducts.reduce((sum, p) => sum + (p.sellingPrice * p.branchQty), 0);
  const lowStockItems = branchProducts.filter(p => p.branchQty <= p.reorderLevel).length;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(leftMargin, y, rightMargin - leftMargin, 18, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(leftMargin, y, rightMargin - leftMargin, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);

  const colWidth = (rightMargin - leftMargin) / 4;
  doc.text(isSW ? 'AINA YA BIDHAA' : 'REGISTERED SKUS', leftMargin + 4, y + 5);
  doc.text(isSW ? 'THAMANI YA UNUNUZI' : 'BUYING VALUE (COST)', leftMargin + colWidth + 4, y + 5);
  doc.text(isSW ? 'THAMANI YA MAUZO' : 'RETAIL SELLING VALUE', leftMargin + colWidth * 2 + 4, y + 5);
  doc.text(isSW ? 'ZIMEPUNGUA STOKI' : 'REORDER ALERT ITEMS', leftMargin + colWidth * 3 + 4, y + 5);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  doc.setTextColor(colPrimary[0], colPrimary[1], colPrimary[2]);
  doc.text(`${products.length} Items`, leftMargin + 4, y + 13);

  doc.setTextColor(colSuccess[0], colSuccess[1], colSuccess[2]);
  doc.text(`TZS ${totalBuyingVal.toLocaleString()}`, leftMargin + colWidth + 4, y + 13);

  doc.setTextColor(colPrimary[0], colPrimary[1], colPrimary[2]);
  doc.text(`TZS ${totalSellingVal.toLocaleString()}`, leftMargin + colWidth * 2 + 4, y + 13);

  if (lowStockItems > 0) {
    doc.setTextColor(colDanger[0], colDanger[1], colDanger[2]);
  } else {
    doc.setTextColor(colSuccess[0], colSuccess[1], colSuccess[2]);
  }
  doc.text(`${lowStockItems} Items`, leftMargin + colWidth * 3 + 4, y + 13);

  y += 24;

  // --- TABLE HEADER ---
  doc.setFillColor(30, 58, 138);
  doc.rect(leftMargin, y, rightMargin - leftMargin, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  const cSku = 18;
  const cName = 48;
  const cCat = 105;
  const cCost = 142;
  const cSell = 168;
  const cQty = 192;

  doc.text('SKU', cSku, y + 5.5);
  doc.text(isSW ? 'Bidhaa' : 'Product Name', cName, y + 5.5);
  doc.text(isSW ? 'Kitengo' : 'Category', cCat, y + 5.5);
  doc.text(isSW ? 'Bei ya Cost' : 'Cost Rate', cCost, y + 5.5, { align: 'right' });
  doc.text(isSW ? 'Bei ya Mauzo' : 'Selling Price', cSell, y + 5.5, { align: 'right' });
  doc.text(isSW ? 'Stoki' : 'Stock Qty', cQty, y + 5.5, { align: 'right' });

  y += 11;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  branchProducts.forEach((p, idx) => {
    if (y > 265) {
      doc.setFontSize(7.5);
      doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
      doc.text('DUKA OS Enterprise Stock Control System', leftMargin, pageHeight - 10);
      doc.addPage();
      y = 18;

      // Repeat Table Header
      doc.setFillColor(30, 58, 138);
      doc.rect(leftMargin, y, rightMargin - leftMargin, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('SKU', cSku, y + 5.5);
      doc.text(isSW ? 'Bidhaa' : 'Product Name', cName, y + 5.5);
      doc.text(isSW ? 'Kitengo' : 'Category', cCat, y + 5.5);
      doc.text(isSW ? 'Bei ya Cost' : 'Cost Rate', cCost, y + 5.5, { align: 'right' });
      doc.text(isSW ? 'Bei ya Mauzo' : 'Selling Price', cSell, y + 5.5, { align: 'right' });
      doc.text(isSW ? 'Stoki' : 'Stock Qty', cQty, y + 5.5, { align: 'right' });

      y += 11;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(leftMargin, y - 3.5, rightMargin - leftMargin, 6.5, 'F');
    }

    const shortName = p.name.length > 32 ? `${p.name.substring(0, 30)}...` : p.name;
    const catLabel = (p.category || 'General');
    const shortCat = catLabel.length > 18 ? `${catLabel.substring(0, 16)}...` : catLabel;

    doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(p.sku || 'N/A', cSku, y);
    doc.setFont('helvetica', 'normal');
    doc.text(shortName, cName, y);
    doc.text(shortCat, cCat, y);
    doc.text(p.costPrice.toLocaleString(), cCost, y, { align: 'right' });
    doc.text(p.sellingPrice.toLocaleString(), cSell, y, { align: 'right' });

    // Highlight quantity if low
    if (p.branchQty <= p.reorderLevel) {
      doc.setTextColor(colDanger[0], colDanger[1], colDanger[2]);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(colSuccess[0], colSuccess[1], colSuccess[2]);
      doc.setFont('helvetica', 'bold');
    }
    doc.text(`${p.branchQty} ${p.unit || 'pcs'}`, cQty, y, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, y + 3, rightMargin, y + 3);

    y += 7;
  });

  // Footer / Compliance
  y += 6;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(leftMargin, y, rightMargin - leftMargin, 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);
  doc.text(isSW ? 'UHAKIKI WA STOKI NA MHUURI WA DUKA' : 'INVENTORY AUDIT INTEGRITY SEAL', leftMargin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
  doc.text(
    `${isSW ? 'Mhuri wa Tawi:' : 'Branch Seal:'} "${bizProfile?.companyStamp || 'DUKA OS HQ'}" | Branch Node: ${currentBranch} | Items: ${products.length}`,
    leftMargin + 4,
    y + 11
  );

  doc.save(`Inventory_Report_${currentBranch}_${new Date().toISOString().split('T')[0]}.pdf`);
};
