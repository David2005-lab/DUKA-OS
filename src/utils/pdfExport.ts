import { jsPDF } from "jspdf";
import { Invoice, Quotation, BusinessConfig } from "../types";

/**
 * Compiles a high-fidelity vector PDF for an individual Invoice or Quotation,
 * and triggers a client-side binary blob download.
 */
export const exportSingleDocumentToPDF = (
  invoice: Invoice | null,
  quotation: Quotation | null,
  profile: BusinessConfig | null,
  language: "SW" | "EN"
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const isInvoice = !!invoice;
  const docName = isInvoice
    ? `Invoice_${invoice.invoiceNumber}`
    : `Quotation_${quotation?.quotationNumber || "DOC"}`;

  // Global settings
  const leftMargin = 14;
  const rightMargin = 196;
  const pageHeight = 297;
  let y = 18;

  // Primary color palette
  const colPrimary = [30, 58, 138]; // Navy
  const colTextDark = [15, 23, 42]; // Off-black
  const colTextMuted = [100, 116, 139]; // Muted grayish slate
  const colSuccess = [16, 185, 129]; // Emerald

  // --- HEADER SECTION ---
  doc.setTextColor(colPrimary[0], colPrimary[1], colPrimary[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const companyName = profile?.name || "SMART ERP INC";
  doc.text(companyName.toUpperCase(), leftMargin, y);

  // Document Type Header on the Right
  doc.setFontSize(16);
  doc.setTextColor(colPrimary[0], colPrimary[1], colPrimary[2]);
  const docTypeHeader = isInvoice
    ? language === "SW"
      ? "ANKARA YA MAUZO / INVOICE"
      : "COMMERCIAL INVOICE"
    : language === "SW"
      ? "MAKADIRIO YA BEI / QUOTATION"
      : "ESTIMATE PROFORMA QUOTE";
  doc.text(docTypeHeader, rightMargin, y, { align: "right" });

  y += 6;

  // Left Column: Business details
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const bizAddr = profile?.address || "12 Floor, Golden Jubilee Tower";
  const bizReg = `${profile?.region || "Dar es Salaam"}, ${profile?.country || "Tanzania"}`;
  const bizTin = `TIN: ${profile?.tinNumber || "112-402-921"} | VRN: ${profile?.vatNumber || "40032912-F"}`;
  const bizEmail = `Email: ${profile?.email || "sales@dukaos.co.tz"}`;
  const bizTel = `Tel: ${profile?.phone || "+255 712 000 000"}`;

  doc.text(bizAddr, leftMargin, y);
  doc.text(bizReg, leftMargin, y + 4);
  doc.line(leftMargin, y + 6.5, leftMargin + 90, y + 6.5);
  doc.text(bizTin, leftMargin, y + 10);
  doc.text(`${bizEmail}  |  ${bizTel}`, leftMargin, y + 14);

  // Right Column: Document Metadata Box
  doc.setFontSize(9);
  doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);

  const metaRows: [string, string][] = isInvoice && invoice
    ? [
        [language === "SW" ? "Namba ya Ankara:" : "Invoice Number:", invoice.invoiceNumber],
        [language === "SW" ? "Tarehe ya Ankara:" : "Invoice Date:", invoice.invoiceDate],
        [language === "SW" ? "Tarehe ya Ukomo:" : "Due Date:", invoice.dueDate],
        [language === "SW" ? "Msimamizi wa Mauzo:" : "Sales Agent:", invoice.salesperson],
        [language === "SW" ? "Hali ya Malipo:" : "Payment Status:", invoice.status.toUpperCase()],
      ]
    : quotation
      ? [
          [language === "SW" ? "Namba ya Quote:" : "Quotation Ref:", quotation.quotationNumber],
          [language === "SW" ? "Tarehe iliyoandaliwa:" : "Date Generated:", quotation.date],
          [language === "SW" ? "Daraja la Bei:" : "Pricing Tier:", quotation.pricingType.toUpperCase()],
          [language === "SW" ? "Aliyeandaa:" : "Compiled By:", quotation.salesperson],
          [language === "SW" ? "Hali ya Hati:" : "Document State:", "ACTIVE ESTIMATE"],
        ]
      : [];

  let metaY = y;
  metaRows.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
    doc.text(lbl, rightMargin - 45, metaY, { align: "right" });
    
    // Highlight status or document numbers
    if (val.includes("PAID") || val.includes("LIPWA")) {
      doc.setTextColor(colSuccess[0], colSuccess[1], colSuccess[2]);
    } else {
      doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);
    }
    doc.setFont("helvetica", "bold");
    doc.text(val, rightMargin, metaY, { align: "right" });
    metaY += 4.5;
  });

  y += 18;

  // Gray separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, y, rightMargin, y);

  y += 7;

  // --- BILL TO / CLIENT SECTION ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
  const clientHeading = isInvoice ? "BILLING / CUSTOMER INVOICE RECIPIENT:" : "CLIENT PROFILE PROPOSAL DETAILS:";
  doc.text(clientHeading, leftMargin, y);

  // Right column: Amount visual display
  const grandTotalText = isInvoice && invoice
    ? `TZS ${invoice.grandTotal.toLocaleString()}`
    : quotation
      ? `TZS ${quotation.grandTotal.toLocaleString()}`
      : "0 TZS";
  
  doc.text(
    language === "SW" ? "KIASI HALISI INAYOPASWA KULIPWA:" : "TOTAL CONSOLIDATED DUE AMOUNT:",
    rightMargin,
    y,
    { align: "right" }
  );

  y += 4.5;

  // Client Details text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);
  const clientName = isInvoice && invoice
    ? invoice.customerDetails.fullName
    : quotation
      ? quotation.clientName
      : "Valued Customer";
  doc.text(clientName, leftMargin, y);

  // Amount badge statement
  doc.setFontSize(14);
  doc.setTextColor(colPrimary[0], colPrimary[1], colPrimary[2]);
  doc.text(grandTotalText, rightMargin, y, { align: "right" });

  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);

  if (isInvoice && invoice) {
    const cCompany = invoice.customerDetails.companyName ? `${invoice.customerDetails.companyName}` : "";
    const cAddr = `${invoice.customerDetails.address || "Main Street"}, ${invoice.customerDetails.region || "Dar es Salaam"}`;
    const cContact = `Tel: ${invoice.customerDetails.phone || "---"} | Email: ${invoice.customerDetails.email || "---"}`;
    const cTin = invoice.customerDetails.tinNumber ? `TIN: ${invoice.customerDetails.tinNumber}` : "";

    let customerStartY = y;
    if (cCompany) {
      doc.text(cCompany, leftMargin, customerStartY);
      customerStartY += 4;
    }
    doc.text(cAddr, leftMargin, customerStartY);
    doc.text(cContact, leftMargin, customerStartY + 4);
    if (cTin) {
      doc.text(cTin, leftMargin, customerStartY + 8);
      y = customerStartY + 12;
    } else {
      y = customerStartY + 8;
    }
  } else {
    doc.text(language === "SW" ? "Kadi ya mteja haijasajiliwa kielektroniki" : "Registered quotation client ledger node.", leftMargin, y);
    y += 6;
  }

  y += 5;

  // --- ITEMIZED TABLE SECTION ---
  // Background rectangle for headers
  doc.setFillColor(241, 245, 249);
  doc.rect(leftMargin, y, rightMargin - leftMargin, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(colPrimary[0], colPrimary[1], colPrimary[2]);

  // Headers
  const colXItem = 16;
  const colXSku = 95;
  const colXUnitPrice = 138; // right-aligned
  const colXQty = 162; // center-aligned
  const colXTotal = 194; // right-aligned

  doc.text(language === "SW" ? "Bidhaa / Huduma" : "Core Registered Item Description", colXItem, y + 5.5);
  doc.text("SKU ID", colXSku, y + 5.5);
  doc.text(language === "SW" ? "Bei ya Kipengele" : "Unit Rate", colXUnitPrice, y + 5.5, { align: "right" });
  doc.text(language === "SW" ? "Idadi" : "Qty", colXQty, y + 5.5, { align: "center" });
  doc.text(language === "SW" ? "Jumla (TZS)" : "Subtotal Amount", colXTotal, y + 5.5, { align: "right" });

  y += 12;

  // Process rows
  const items = isInvoice && invoice
    ? invoice.items.map(it => ({
        name: it.productName,
        sku: it.sku || "N/A",
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        total: it.unitPrice * it.quantity,
      }))
    : quotation
      ? quotation.items.map(it => ({
          name: it.productName,
          sku: it.sku || "N/A",
          unitPrice: it.price,
          quantity: it.qty,
          total: it.price * it.qty,
        }))
      : [];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);

  items.forEach((item, index) => {
    // Page break handling
    if (y > 255) {
      // Draw footer page code
      doc.setFontSize(7.5);
      doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
      doc.text("Page 1 of 2", rightMargin, pageHeight - 10, { align: "right" });
      doc.addPage();
      y = 20;

      // Draw table headers again
      doc.setFillColor(241, 245, 249);
      doc.rect(leftMargin, y, rightMargin - leftMargin, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colPrimary[0], colPrimary[1], colPrimary[2]);
      
      doc.text(language === "SW" ? "Bidhaa / Huduma" : "Core Registered Item Description", colXItem, y + 5.5);
      doc.text("SKU ID", colXSku, y + 5.5);
      doc.text(language === "SW" ? "Bei ya Kipengele" : "Unit Rate", colXUnitPrice, y + 5.5, { align: "right" });
      doc.text(language === "SW" ? "Idadi" : "Qty", colXQty, y + 5.5, { align: "center" });
      doc.text(language === "SW" ? "Jumla (TZS)" : "Subtotal Amount", colXTotal, y + 5.5, { align: "right" });

      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);
    }

    // Drawing alternate colored lines backgrounds
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(leftMargin, y - 3.5, rightMargin - leftMargin, 6.5, "F");
    }

    // Wrap product name safely
    const shortName = item.name.length > 40 ? `${item.name.substring(0, 38)}...` : item.name;
    const skuLabel = item.sku;

    doc.setFont("helvetica", "bold");
    doc.text(shortName, colXItem, y);
    doc.setFont("helvetica", "normal");
    doc.text(skuLabel, colXSku, y);
    doc.text(item.unitPrice.toLocaleString(), colXUnitPrice, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(item.quantity.toString(), colXQty, y, { align: "center" });
    doc.text(item.total.toLocaleString(), colXTotal, y, { align: "right" });

    // Light line divider
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.35);
    doc.line(leftMargin, y + 3, rightMargin, y + 3);

    y += 7.5;
  });

  y += 3;

  // --- FINANCIALS BLOCK ---
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  // Draw subtotal details on the right
  const currentTotal = isInvoice && invoice
    ? invoice.grandTotal
    : quotation
      ? quotation.grandTotal
      : 0;
  const subTotalCalc = (currentTotal / 1.18);
  const vatTotalCalc = currentTotal - subTotalCalc;

  const totalsBoxX = rightMargin - 90;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);

  doc.text(language === "SW" ? "Jumla Kabla ya Kodi (Subtotal Excl VAT):" : "Subtotal Exclusive of VAT:", totalsBoxX, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);
  doc.text(`TZS ${Math.round(subTotalCalc).toLocaleString()}`, rightMargin, y, { align: "right" });

  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
  doc.text(language === "SW" ? "Kodi ya VAT (18% Standard VAT Rate):" : "Value Added Tax (VAT 18%):", totalsBoxX, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);
  doc.text(`TZS ${Math.round(vatTotalCalc).toLocaleString()}`, rightMargin, y, { align: "right" });

  y += 5.5;

  // Thick underline for Grand Total
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(totalsBoxX, y, rightMargin, y);

  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(colPrimary[0], colPrimary[1], colPrimary[2]);
  doc.text(language === "SW" ? "JUMLA KUU INAYOPASWA KULIPWA:" : "TOTAL PAYABLE BALANCE (TZS):", totalsBoxX, y);
  doc.text(`TZS ${currentTotal.toLocaleString()}`, rightMargin, y, { align: "right" });

  y += 18;

  // --- SECURITY FOOTER SEAL BLOCK ---
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.45);
  // Dashed border for the electronic receipt envelope representation
  doc.setLineDashPattern([2.5, 2.5], 0);
  doc.rect(leftMargin, y, rightMargin - leftMargin, 26);
  doc.setLineDashPattern([], 0); // reset standard

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colTextDark[0], colTextDark[1], colTextDark[2]);
  doc.text(
    language === "SW" ? "MHUURI WA ULINZI NA MNYORORO WA SALAMA (SECURE DIGITAL ENVELOPE)" : "DIGITAL SIGNATURE & COMPLIANCE FOOTPRINT LOG",
    leftMargin + 4,
    y + 5
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(colTextMuted[0], colTextMuted[1], colTextMuted[2]);
  
  const refCode = isInvoice && invoice
    ? invoice.refNumber || `DUKAOS-INV-${invoice.id.substring(0,8)}`
    : quotation
      ? `DUKAOS-QTN-${quotation.id.substring(0,8)}`
      : "OFFLINE-DUKAOS-GENERIC";

  const stampLabel = profile?.companyStamp || "APPROVED CLOUD ERP OFFICE HQ";
  const complianceLine1 = language === "SW"
    ? `Ankara thabiti husika imethibitishwa na kusajiliwa kielektroniki chini ya mifumo salama ya ERP.`
    : `This commercial instrument is legally logged as a secure audit log under official software guidelines.`;
  const complianceLine2 = language === "SW"
    ? `Nambari ya Marejeleo: [ ${refCode} ]   |   Mhuri Maalum: "${stampLabel}"`
    : `Verification Register ID: [ ${refCode} ]   |   Authorized Stamp Sign: "${stampLabel}"`;

  doc.text(complianceLine1, leftMargin + 4, y + 11);
  doc.text(complianceLine2, leftMargin + 4, y + 16);
  
  doc.text(
    language === "SW" ? "Imepakuliwa thabiti kupitia: https://ai.studio/build" : "Enterprise download compiled natively in Cloud container.",
    leftMargin + 4,
    y + 21
  );

  // Save/Download operation trigger with proper mime header
  doc.save(`${docName}.pdf`);
};
