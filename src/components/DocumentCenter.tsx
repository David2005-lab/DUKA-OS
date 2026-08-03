/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Calendar, 
  Printer, 
  Download, 
  Share2, 
  QrCode, 
  Send,
  CheckCircle2, 
  Clipboard, 
  Check, 
  ExternalLink,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  X,
  CreditCard,
  UserCheck,
  Building,
  DollarSign,
  Mail,
  History,
  AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Invoice, Quotation, QRLog } from '../types';
import { db } from '../db';
import { translations } from '../translations';
import { printElement, downloadDocumentFile } from '../utils/print';
import { exportSingleDocumentToPDF } from '../utils/pdfExport';

interface DocumentCenterProps {
  language: 'EN' | 'SW';
  currentBranch: string;
  userEmail: string;
}

export default function DocumentCenter({ language, currentBranch, userEmail }: DocumentCenterProps) {
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'receipts' | 'quotations' | 'sheets'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Loaded database items state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [qrLogs, setQrLogs] = useState<QRLog[]>([]);

  // Preview & Sharing Modal states
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'Modern' | 'Classic' | 'Thermal' | 'Luxury'>('Modern');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  
  // Quick Actions Toolbar states
  const [quickActionTab, setQuickActionTab] = useState<'download' | 'print' | 'email'>('download');
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkDownloadStatus, setBulkDownloadStatus] = useState<Record<string, 'pending' | 'success'>>({});
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkEmailStatus, setBulkEmailStatus] = useState<Record<string, 'pending' | 'sending' | 'sent' | 'failed'>>({});

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappTemplateStyle, setWhatsappTemplateStyle] = useState<'Modern' | 'Thermal' | 'Luxury'>('Modern');
  const [whatsappCustomText, setWhatsappCustomText] = useState('');
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  // Email Dispatch Modal states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSenderChoice, setEmailSenderChoice] = useState<'profile' | 'machine'>('profile');
  const [emailDispatchMethod, setEmailDispatchMethod] = useState<'mailto' | 'server'>('mailto');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [emailLogsList, setEmailLogsList] = useState<{
    id: string;
    sender: string;
    recipient: string;
    subject: string;
    date: string;
    status: 'Sent' | 'Processing';
    docType: 'Invoice' | 'Quotation';
    docRef: string;
  }[]>([]);

  // Load datasets dynamically
  const loadDocumentsData = () => {
    const allInvoices = db.getInvoices().filter(inv => inv.branchId === currentBranch);
    setInvoices(allInvoices);
    setQuotations(db.getQuotations().filter(q => q.branchId === currentBranch));
    setQrLogs(db.getQRLogs());
  };

  useEffect(() => {
    loadDocumentsData();
    // Instantly sync when DB changes
    const handleDbUpdate = () => {
      loadDocumentsData();
    };
    window.addEventListener('db-update', handleDbUpdate);

    // Passive fallback interval (15 seconds) to save CPU
    const interval = setInterval(loadDocumentsData, 15000);

    return () => {
      window.removeEventListener('db-update', handleDbUpdate);
      clearInterval(interval);
    };
  }, [currentBranch]);

  // Clear selections on category subtab transitions
  useEffect(() => {
    setSelectedDocIds([]);
  }, [activeSubTab]);

  // Handle WhatsApp parameters generation
  useEffect(() => {
    if (selectedInvoice) {
      const biz = db.getProfile();
      const phoneClean = selectedInvoice.customerDetails.phone !== 'Walk-In' ? selectedInvoice.customerDetails.phone : '';
      setWhatsappPhone(phoneClean);
      
      const welcome = language === 'SW' ? 'Habari!' : 'Hello!';
      const invoiceText = language === 'SW' 
        ? `Nyaraka yako ya ankara kutoka kwa ${biz?.name || 'Duka OS Ltd'}.\nNamba ya Ankara: ${selectedInvoice.invoiceNumber}\nKiasi: TZS ${selectedInvoice.grandTotal.toLocaleString()}\nUnaweza kuthibitisha sasa kupitia: ${window.location.origin}/verify?type=invoice&ref=${selectedInvoice.refNumber}`
        : `Your invoice document from ${biz?.name || 'Duka OS Enterprise'}.\nInvoice No: ${selectedInvoice.invoiceNumber}\nTotal Amount: TZS ${selectedInvoice.grandTotal.toLocaleString()}\nVerify official payment register securely here: ${window.location.origin}/verify?type=invoice&ref=${selectedInvoice.refNumber}`;
        
      setWhatsappCustomText(invoiceText);
    } else if (selectedQuotation) {
      const biz = db.getProfile();
      setWhatsappPhone('');
      const quoteText = language === 'SW'
        ? `Habari! Mfumo wa Duka OS umekusanyia makadirio rasmi ya bei kutoka katika stoki ya ${biz?.name || 'Duka OS Ltd'}.\nNamba ya Makadirio: ${selectedQuotation.quotationNumber}\nMteja: ${selectedQuotation.clientName}\nKiasi Chetu: TZS ${selectedQuotation.grandTotal.toLocaleString()}\nThibitisha hapa: ${window.location.origin}/verify?type=quotation&client=${encodeURIComponent(selectedQuotation.clientName)}&total=${selectedQuotation.grandTotal}`
        : `Hello! Duka OS ERP compiled an official price quotation for you from ${biz?.name || 'Duka OS'}.\nQuotation Reference: ${selectedQuotation.quotationNumber}\nClient: ${selectedQuotation.clientName}\nEstimated Total: TZS ${selectedQuotation.grandTotal.toLocaleString()}\nVerify live details here: ${window.location.origin}/verify?type=quotation&client=${encodeURIComponent(selectedQuotation.clientName)}&total=${selectedQuotation.grandTotal}`;
      setWhatsappCustomText(quoteText);
    }
  }, [selectedInvoice, selectedQuotation, whatsappTemplateStyle]);

  // Filtering Logic
  const filteredInvoices = invoices.filter(inv => {
    const isPOS = inv.salesperson.includes('Shift') || inv.customerId === 'walk-in';
    const matchesTab = activeSubTab === 'receipts' ? isPOS : !isPOS;
    
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerDetails.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customerDetails.companyName && inv.customerDetails.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      inv.salesperson.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = 
      (!startDate || inv.invoiceDate >= startDate) &&
      (!endDate || inv.invoiceDate <= endDate);

    return matchesTab && matchesSearch && matchesDate;
  });

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = 
      q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.salesperson.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = 
      (!startDate || q.date >= startDate) &&
      (!endDate || q.date <= endDate);

    return matchesSearch && matchesDate;
  });

  // Export any list cleanly to offline Excel CSV structure
  const handleExportToExcel = () => {
    let csvHeader = "";
    let csvBody = "";
    
    if (activeSubTab === 'invoices' || activeSubTab === 'receipts') {
      csvHeader = "Namba ya Hati/Ankara,Tarehe,Mteja,Kiasi Halisi (TZS),Aina ya Malipo,Muuzaji/Msimamizi,Hali ya Ankara\n";
      filteredInvoices.forEach(inv => {
        csvBody += `"${inv.invoiceNumber}","${inv.invoiceDate}","${inv.customerDetails.fullName.replace(/"/g, '""')}","${inv.grandTotal}","${inv.paymentDetails?.paymentMethod || 'Cash'}","${inv.salesperson.replace(/"/g, '""')}","${inv.status}"\n`;
      });
    } else if (activeSubTab === 'quotations') {
      csvHeader = "Namba ya Makadirio,Tarehe,Mteja,Kiasi cha Jumla (TZS),Aina ya Bei,Aliyeandaa\n";
      filteredQuotations.forEach(q => {
        csvBody += `"${q.quotationNumber}","${q.date}","${q.clientName.replace(/"/g, '""')}","${q.grandTotal}","${q.pricingType}","${q.salesperson}"\n`;
      });
    } else {
      csvHeader = "Namba ya Usalama,Tarehe,Hati Husika,Kiunganishi cha Uhakiki (QR Validation URL),Aliyezalisha\n";
      qrLogs.forEach(log => {
        csvBody += `"${log.transactionId}","${new Date(log.timestamp).toLocaleDateString()}","${log.type}","${log.url}","${log.generatedBy}"\n`;
      });
    }

    const csvContent = csvHeader + csvBody;
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    const documentName = activeSubTab === 'invoices' ? 'Ankara_Kuu' : activeSubTab === 'receipts' ? 'Risiti_POS_Mauzo' : activeSubTab === 'quotations' ? 'Makadirio_Bei' : 'Logi_Nyaraka_Mseto';
    link.download = `${documentName}_Report_${new Date().toISOString().split('T')[0]}.csv`;
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    db.logAudit('TRANSFER', 'DocumentCenter', `Exported document ledger table of ${activeSubTab} to Excel CSV sheet format`, userEmail);
  };

  const handleCopyVerificationLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlId(id);
    setTimeout(() => setCopiedUrlId(null), 1500);
  };

  // Safe user-initiated WhatsApp link triggering to bypass popup blockers
  const handleShareToWhatsAppGo = () => {
    if (!whatsappPhone) return;
    const cleanPhone = whatsappPhone.replace(/\D/g, '');
    
    const link = document.createElement("a");
    link.href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappCustomText)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsShareModalOpen(false);
    db.logAudit('TRANSFER', 'DocumentCenter', `Shared PDF link of transaction directly to customer WhatsApp ${whatsappPhone}`, userEmail);
  };

  // Modern element printing helper using unified printElement inside clean HTML iframe context
  const handlePrintDocument = (id: string) => {
    const documentName = selectedInvoice 
      ? `Invoice_${selectedInvoice.invoiceNumber}` 
      : selectedQuotation 
        ? `Quotation_${selectedQuotation.quotationNumber}` 
        : 'Document';

    printElement(id, documentName);
    db.logAudit('TRANSFER', 'DocumentCenter', `Printed document ${documentName} layout format`, userEmail);
  };

  // High-fidelity blob-based document download helper
  const handleDownloadDocument = (id: string) => {
    const documentName = selectedInvoice 
      ? `Invoice_${selectedInvoice.invoiceNumber}` 
      : selectedQuotation 
        ? `Quotation_${selectedQuotation.quotationNumber}` 
        : 'Document';

    downloadDocumentFile(id, documentName, `${documentName}.html`);
    db.logAudit('TRANSFER', 'DocumentCenter', `Downloaded offline high-fidelity document file for ${documentName}`, userEmail);
  };

  // Unified Individual Document Exporter (PDF / EXCEL CSV)
  const handleExportIndividual = (id: string, format: 'PDF' | 'EXCEL') => {
    const inv = invoices.find(item => item.id === id);
    const q = quotations.find(item => item.id === id);
    const profile = db.getProfile();

    if (format === 'PDF') {
      exportSingleDocumentToPDF(inv || null, q || null, profile, language);
      const documentName = inv ? `Invoice_${inv.invoiceNumber}` : q ? `Quotation_${q.quotationNumber}` : 'Document';
      db.logAudit('TRANSFER', 'DocumentCenter', `Exported individual high-fidelity PDF for ${documentName}`, userEmail);
    } else if (format === 'EXCEL') {
      let csvContent = "";
      let docName = "";
      
      if (inv) {
        docName = `Invoice_${inv.invoiceNumber}`;
        // Header
        csvContent += `DUKA OS ENTERPRISE - INVOICE SHEET\n`;
        csvContent += `Enterprise,"${profile?.name || 'SMART ERP INC'}"\n`;
        csvContent += `TIN,"${profile?.tinNumber || '112-402-921'}" | VRN: "${profile?.vatNumber || '40032912-F'}"\n`;
        csvContent += `Address,"${profile?.address || 'Dar es Salaam'}"\n`;
        csvContent += `\n`;
        csvContent += `INVOICE REFERENCE DETAILS\n`;
        csvContent += `Invoice Number,${inv.invoiceNumber}\n`;
        csvContent += `Issue Date,${inv.invoiceDate}\n`;
        csvContent += `Due Date,${inv.dueDate}\n`;
        csvContent += `Salesperson,"${inv.salesperson.replace(/"/g, '""')}"\n`;
        csvContent += `Branch Code,${inv.branchId}\n`;
        csvContent += `Status,${inv.status}\n`;
        csvContent += `\n`;
        csvContent += `CUSTOMER PROFILE\n`;
        csvContent += `Full Name,"${inv.customerDetails.fullName.replace(/"/g, '""')}"\n`;
        if (inv.customerDetails.companyName) {
          csvContent += `Company,"${inv.customerDetails.companyName.replace(/"/g, '""')}"\n`;
        }
        csvContent += `Phone,"${inv.customerDetails.phone}"\n`;
        csvContent += `Email,"${inv.customerDetails.email}"\n`;
        if (inv.customerDetails.tinNumber) {
          csvContent += `Client TIN,"${inv.customerDetails.tinNumber}"\n`;
        }
        csvContent += `\n`;
        csvContent += `LINE ITEM DETAILS\n`;
        csvContent += `Item Name,SKU,Unit Price (TZS),Quantity,Line Total (TZS)\n`;
        inv.items?.forEach(item => {
          csvContent += `"${item.productName.replace(/"/g, '""')}","${item.sku || ''}",${item.unitPrice || 0},${item.quantity || 0},${(item.unitPrice || 0) * (item.quantity || 0)}\n`;
        });
        csvContent += `\n`;
        csvContent += `SUM TOTALS\n`;
        csvContent += `,,Subtotal Excl VAT,TZS ${Math.round(inv.grandTotal / 1.18).toLocaleString()}\n`;
        csvContent += `,,VAT Standard (18%),TZS ${Math.round(inv.grandTotal - (inv.grandTotal / 1.18)).toLocaleString()}\n`;
        csvContent += `,,GRAND TOTAL DIRECT,TZS ${inv.grandTotal.toLocaleString()}\n`;
      } else if (q) {
        docName = `Quotation_${q.quotationNumber}`;
        // Header
        csvContent += `DUKA OS ENTERPRISE - ESTIMATE PROFORMA QUOTATION SHEET\n`;
        csvContent += `Enterprise,"${profile?.name || 'SMART ERP INC'}"\n`;
        csvContent += `Address,"${profile?.address || 'Dar es Salaam'}"\n`;
        csvContent += `\n`;
        csvContent += `PROFORMA REFERENCE DETAILS\n`;
        csvContent += `Quotation Number,${q.quotationNumber}\n`;
        csvContent += `Issue Date,${q.date}\n`;
        csvContent += `Pricing Tier,${q.pricingType.toUpperCase()}\n`;
        csvContent += `Compiled By,"${q.salesperson.replace(/"/g, '""')}"\n`;
        csvContent += `\n`;
        csvContent += `CLIENT PROFILE\n`;
        csvContent += `Client Name,"${q.clientName.replace(/"/g, '""')}"\n`;
        csvContent += `\n`;
        csvContent += `LINE ITEM ESTIMATES\n`;
        csvContent += `Item Name,SKU,Estimated Rate (TZS),Quantity,Subtotal (TZS)\n`;
        q.items?.forEach(item => {
          csvContent += `"${item.productName.replace(/"/g, '""')}","${item.sku || ''}",${item.price || 0},${item.qty || 0},${(item.price || 0) * (item.qty || 0)}\n`;
        });
        csvContent += `\n`;
        csvContent += `SUM TOTALS\n`;
        csvContent += `,,Subtotal Excl VAT,TZS ${Math.round(q.grandTotal / 1.18).toLocaleString()}\n`;
        csvContent += `,,VAT Standard (18%),TZS ${Math.round(q.grandTotal - (q.grandTotal / 1.18)).toLocaleString()}\n`;
        csvContent += `,,ESTIMATED TOTAL BUDGET,TZS ${q.grandTotal.toLocaleString()}\n`;
      } else {
        return;
      }

      // Export as high-fidelity CSV blob with Excel BOM prefix for perfect character loading in Microsoft Excel
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${docName}.csv`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      db.logAudit('TRANSFER', 'DocumentCenter', `Exported individual document ${docName} to Excel CSV spreadsheet format`, userEmail);
    }
  };

  const handleBatchPrint = () => {
    if (selectedDocIds.length === 0) return;
    const documentName = `Batch_${activeSubTab}_Report`;
    printElement('batch-print-canvas', documentName);
    db.logAudit('TRANSFER', 'DocumentCenter', `Executed Batch Print of ${selectedDocIds.length} documents from ${activeSubTab}`, userEmail);
  };

  const handleBatchDownload = () => {
    if (selectedDocIds.length === 0) return;
    const documentName = `Batch_${activeSubTab}_Report`;
    downloadDocumentFile('batch-print-canvas', documentName, `${documentName}.html`);
    db.logAudit('TRANSFER', 'DocumentCenter', `Executed Batch Download of ${selectedDocIds.length} documents from ${activeSubTab}`, userEmail);
  };

  const handleIndividualDownloadAll = async () => {
    if (selectedDocIds.length === 0) return;
    setIsBulkDownloading(true);
    
    // Set all status to pending
    const initialStatus: Record<string, 'pending' | 'success'> = {};
    selectedDocIds.forEach(id => {
      initialStatus[id] = 'pending';
    });
    setBulkDownloadStatus(initialStatus);

    for (let i = 0; i < selectedDocIds.length; i++) {
      const id = selectedDocIds[i];
      const inv = invoices.find(item => item.id === id);
      const q = quotations.find(item => item.id === id);
      const docName = inv 
        ? `Invoice_${inv.invoiceNumber}` 
        : q 
          ? `Quotation_${q.quotationNumber}` 
          : 'Document';

      // Call download with slight delay to avoid browser popup blocking
      await new Promise(resolve => setTimeout(resolve, 400));
      downloadDocumentFile(`batch-item-${id}`, docName, `${docName}.html`);
      
      setBulkDownloadStatus(prev => ({ ...prev, [id]: 'success' }));
    }

    db.logAudit('TRANSFER', 'DocumentCenter', `Executed Individual Bulk Download of ${selectedDocIds.length} documents`, userEmail);
    setIsBulkDownloading(false);
  };

  const handleBulkEmailDispatch = async () => {
    if (selectedDocIds.length === 0) return;
    setIsBulkSending(true);

    const initialStatus: Record<string, 'pending' | 'sending' | 'sent' | 'failed'> = {};
    selectedDocIds.forEach(id => {
      initialStatus[id] = 'pending';
    });
    setBulkEmailStatus(initialStatus);

    const biz = db.getProfile();
    const senderAddr = emailSenderChoice === 'profile' ? (biz?.email || 'sales@dukaos.co.tz') : userEmail;

    for (let i = 0; i < selectedDocIds.length; i++) {
      const id = selectedDocIds[i];
      setBulkEmailStatus(prev => ({ ...prev, [id]: 'sending' }));

      const inv = invoices.find(item => item.id === id);
      const q = quotations.find(item => item.id === id);

      let recipient = '';
      let subject = '';
      let body = '';
      let docNum = '';
      let docType: 'Invoice' | 'Quotation' = 'Invoice';

      if (inv) {
        recipient = inv.customerDetails.email || '';
        docNum = inv.invoiceNumber;
        docType = 'Invoice';
        subject = language === 'SW'
          ? `Nyaraka ya Ankara: ${inv.invoiceNumber} kutoka ${biz?.name || 'Smart ERP'}`
          : `Official Invoice Ref: ${inv.invoiceNumber} - ${biz?.name || 'Enterprise'}`;
        body = language === 'SW'
          ? `Ndugu ${inv.customerDetails.fullName},\n\nTafadhali pokea ankara yako rasmi namba ${inv.invoiceNumber} yenye jumla ya TZS ${inv.grandTotal.toLocaleString()}.\n\nAsante kwa kufanya biashara nasi!\n\nKutoka,\n${biz?.name || 'Meneja wa Duka'}`
          : `Dear ${inv.customerDetails.fullName},\n\nPlease find attached your official commercial invoice ${inv.invoiceNumber} with a total of TZS ${inv.grandTotal.toLocaleString()}.\n\nRegards,\n${biz?.name || 'Store Manager'}`;
      } else if (q) {
        recipient = 'client@example.com';
        docNum = q.quotationNumber;
        docType = 'Quotation';
        subject = language === 'SW'
          ? `Makadirio ya Bei: ${q.quotationNumber} kutoka ${biz?.name || 'Smart ERP'}`
          : `Official Quotation Estimate: ${q.quotationNumber} - ${biz?.name || 'Enterprise'}`;
        body = language === 'SW'
          ? `Ndugu Mteja ${q.clientName},\n\nTafadhali pokea makadirio rasmi ya bei namba ${q.quotationNumber}.\n\nAsante na karibu tena!\n\nKutoka,\n${biz?.name || 'Meneja wa Duka'}`
          : `Dear Client ${q.clientName},\n\nPlease find compiled your estimated price quotation reference ${q.quotationNumber}.\n\nThank you for doing business with us!\n\nRegards,\n${biz?.name || 'Store Manager'}`;
      }

      if (!recipient) {
        setBulkEmailStatus(prev => ({ ...prev, [id]: 'failed' }));
        continue;
      }

      try {
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderEmail: senderAddr,
            recipientEmail: recipient,
            subject: subject,
            body: body,
            documentId: docNum,
            language: language
          })
        });

        const resData = await response.json();
        if (resData.success) {
          setBulkEmailStatus(prev => ({ ...prev, [id]: 'sent' }));
          
          // Log locally
          const newLog = {
            id: `email-${Date.now()}-${id}`,
            sender: senderAddr,
            recipient: recipient,
            subject: subject,
            date: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
            status: 'Sent' as const,
            docType: docType,
            docRef: docNum
          };
          setEmailLogsList(prev => [newLog, ...prev]);

          db.logAudit('TRANSFER', 'DocumentCenter', `Sent bulk email dispatch for ${docType} ${docNum} to ${recipient}`, userEmail);
        } else {
          setBulkEmailStatus(prev => ({ ...prev, [id]: 'failed' }));
        }
      } catch (err) {
        console.error(err);
        setBulkEmailStatus(prev => ({ ...prev, [id]: 'failed' }));
      }

      // Add a slight delay between dispatches
      await new Promise(resolve => setTimeout(resolve, 650));
    }

    setIsBulkSending(false);
  };

  // Email modal launcher that gathers and formats exact content based on selected document
  const openEmailModal = (inv: Invoice | null, q: Quotation | null) => {
    const biz = db.getProfile();
    const activeInvoice = inv || selectedInvoice;
    const activeQuotation = q || selectedQuotation;
    
    if (activeInvoice) {
      if (!selectedInvoice || selectedInvoice.id !== activeInvoice.id) {
        setSelectedInvoice(activeInvoice);
      }
      setSelectedQuotation(null);
      setEmailRecipient(activeInvoice.customerDetails.email || '');
      
      const subjectText = language === 'SW'
        ? `Nyaraka ya Ankara: ${activeInvoice.invoiceNumber} kutoka ${biz?.name || 'Smart ERP'}`
        : `Official Invoice Ref: ${activeInvoice.invoiceNumber} - ${biz?.name || 'Enterprise'}`;
      
      const bodyText = language === 'SW'
        ? `Ndugu ${activeInvoice.customerDetails.fullName},\n\nTafadhali pokea ankara yako rasmi namba ${activeInvoice.invoiceNumber} yenye jumla ya TZS ${activeInvoice.grandTotal.toLocaleString()}.\n\nTarehe ya Ankara: ${activeInvoice.invoiceDate}\nTarehe ya Mwisho wa Malipo: ${activeInvoice.dueDate}\n\nUnaweza kupitia uhakiki rasmi hapa:\n${window.location.origin}/verify?type=invoice&ref=${activeInvoice.refNumber}\n\nAsante kwa kufanya biashara nasi!\n\nKutoka,\n${biz?.name || 'Meneja wa Duka'}\nEmail: ${biz?.email || ''}\nSimu: ${biz?.phone || ''}`
        : `Dear ${activeInvoice.customerDetails.fullName},\n\nPlease find attached your official commercial invoice ${activeInvoice.invoiceNumber} with a consolidated total of TZS ${activeInvoice.grandTotal.toLocaleString()}.\n\nInvoice Date: ${activeInvoice.invoiceDate}\nDue Date: ${activeInvoice.dueDate}\n\nYou can review live verification register here:\n${window.location.origin}/verify?type=invoice&ref=${activeInvoice.refNumber}\n\nThank you for choosing us!\n\nRegards,\n${biz?.name || 'Store Manager'}\nEmail: ${biz?.email || ''}\nTel: ${biz?.phone || ''}`;
      
      setEmailSubject(subjectText);
      setEmailBody(bodyText);
    } else if (activeQuotation) {
      if (!selectedQuotation || selectedQuotation.id !== activeQuotation.id) {
        setSelectedQuotation(activeQuotation);
      }
      setSelectedInvoice(null);
      setEmailRecipient('');
      
      const subjectText = language === 'SW'
        ? `Makadirio ya Bei: ${activeQuotation.quotationNumber} kutoka ${biz?.name || 'Smart ERP'}`
        : `Official Quotation Estimate: ${activeQuotation.quotationNumber} - ${biz?.name || 'Enterprise'}`;
      
      const bodyText = language === 'SW'
        ? `Ndugu Mteja ${activeQuotation.clientName},\n\nTafadhali pokea makadirio rasmi ya bei namba ${activeQuotation.quotationNumber} kutoka katika stoki ya ${biz?.name || 'Duka wetu'}.\n\nKiasi Chetu: TZS ${activeQuotation.grandTotal.toLocaleString()}\nPricing Type: ${activeQuotation.pricingType.toUpperCase()}\n\nAngalia maelezo hapa chini au thibitisha saini hapa:\n${window.location.origin}/verify?type=quotation&client=${encodeURIComponent(activeQuotation.clientName)}&total=${activeQuotation.grandTotal}\n\nAsante na karibu tena!\n\nKutoka,\n${biz?.name || 'Meneja wa Duka'}\nEmail: ${biz?.email || ''}\nSimu: ${biz?.phone || ''}`
        : `Dear Client ${activeQuotation.clientName},\n\nPlease find compiled your estimated price quotation reference ${activeQuotation.quotationNumber} dynamically retrieved from our store pricing matrix.\n\nEstimated Total Budget: TZS ${activeQuotation.grandTotal.toLocaleString()}\nPricing Tier: ${activeQuotation.pricingType.toUpperCase()}\n\nYou can review live verification register here:\n${window.location.origin}/verify?type=quotation&client=${encodeURIComponent(activeQuotation.clientName)}&total=${activeQuotation.grandTotal}\n\nThank you for doing business with us!\n\nRegards,\n${biz?.name || 'Store Manager'}\nEmail: ${biz?.email || ''}\nTel: ${biz?.phone || ''}`;
      
      setEmailSubject(subjectText);
      setEmailBody(bodyText);
    }
    
    setEmailSentSuccess(false);
    setIsEmailModalOpen(true);
  };

  // Safe asynchronous dispatch call triggers expressive notification logs
  const handleSendEmailGo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient) {
      alert(language === 'SW' ? 'Tafadhali jaza barua pepe ya mteja!' : 'Please enter recipient email!');
      return;
    }

    const biz = db.getProfile();
    const senderAddr = emailSenderChoice === 'profile' ? (biz?.email || 'sales@dukaos.co.tz') : userEmail;
    const docNum = selectedInvoice ? selectedInvoice.invoiceNumber : selectedQuotation ? selectedQuotation.quotationNumber : 'N/A';
    const docType = selectedInvoice ? 'Invoice' : 'Quotation';

    if (emailDispatchMethod === 'mailto') {
      // Direct client email via mailto scheme
      const mailtoUrl = `mailto:${encodeURIComponent(emailRecipient)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      
      const link = document.createElement("a");
      link.href = mailtoUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Track locally in immediate logs
      const newLog = {
        id: `email-${Date.now()}`,
        sender: 'Device Mail App',
        recipient: emailRecipient,
        subject: emailSubject,
        date: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
        status: 'Sent' as const,
        docType: docType as any,
        docRef: docNum
      };
      setEmailLogsList(prev => [newLog, ...prev]);
      setEmailSentSuccess(true);
      db.logAudit('TRANSFER', 'DocumentCenter', `Drafted email for ${docType} ${docNum} to ${emailRecipient} using local mail system`, userEmail);
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: senderAddr,
          recipientEmail: emailRecipient,
          subject: emailSubject,
          body: emailBody,
          documentId: docNum,
          language: language
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setEmailSentSuccess(true);
        // Track locally in immediate logs
        const newLog = {
          id: `email-${Date.now()}`,
          sender: senderAddr,
          recipient: emailRecipient,
          subject: emailSubject,
          date: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
          status: 'Sent' as const,
          docType: docType as any,
          docRef: docNum
        };
        setEmailLogsList(prev => [newLog, ...prev]);
        
        db.logAudit('TRANSFER', 'DocumentCenter', `Sent email notification for ${docType} ${docNum} to ${emailRecipient} (via ${senderAddr})`, userEmail);
      } else {
        alert(resData.error || 'Failed to send email.');
      }
    } catch (err) {
      console.error(err);
      alert(language === 'SW' ? 'Kushindwa kuwasiliana na seva ya barua pepe!' : 'Failed to connect to express server email notification endpoint.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const profile = db.getProfile();

  return (
    <div className="space-y-6 text-xs animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Banner bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl gap-3 shadow-sm">
        <div className="flex gap-3 items-center">
          <div className="h-12 w-12 bg-indigo-600/10 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <strong className="text-sm font-serif uppercase tracking-tight block">
              {language === 'SW' ? 'Kituo cha Nyaraka na Maktaba ya PDF / Excel' : 'Professional Document & Reports Hub'}
            </strong>
            <span className="text-[10.5px] text-slate-400 mt-1 block font-extrabold">
              {language === 'SW' ? 'Tengeneza, hariri, thibitisha, pakua na tuma Ankara na Risiti zote moja kwa moja WhatsApp' : 'Verify, download, custom-style, print and share sales PDFs & Excel files to customer logs.'}
            </span>
          </div>
        </div>

        <button 
          onClick={handleExportToExcel}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase rounded-xl tracking-wider shadow-md transition-all cursor-pointer active:scale-95 duration-100 shrink-0"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>{language === 'SW' ? 'Hamisha kama Excel' : 'Export Reports to Excel (CSV)'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Control Panel / Filter & Search - Col 4 */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-250 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-850">
            <Filter className="h-4 w-4 text-indigo-505" />
            <span className="font-extrabold text-[10px] uppercase tracking-widest text-slate-400">
              {language === 'SW' ? 'Chuja Orodha ya PDF' : 'Ledger Categories Filters'}
            </span>
          </div>

          {/* Quick Category Buttons */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => { setActiveSubTab('invoices'); setSearchQuery(''); }}
              className={`w-full px-3 py-2.5 rounded-xl text-left font-bold transition-all flex justify-between items-center ${
                activeSubTab === 'invoices' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border dark:border-slate-800/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0" />
                <span>{language === 'SW' ? 'Ankara Kuu za Biashara' : 'Commercial Invoices'}</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${activeSubTab === 'invoices' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-405'}`}>
                {invoices.filter(i => !i.salesperson.includes('Shift') && i.customerId !== 'walk-in').length}
              </span>
            </button>

            <button
              onClick={() => { setActiveSubTab('receipts'); setSearchQuery(''); }}
              className={`w-full px-3 py-2.5 rounded-xl text-left font-bold transition-all flex justify-between items-center ${
                activeSubTab === 'receipts' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border dark:border-slate-800/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span>{language === 'SW' ? 'Risiti POS / Mauzo Ya Haraka' : 'Retail POS Receipts'}</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${activeSubTab === 'receipts' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-405'}`}>
                {invoices.filter(i => i.salesperson.includes('Shift') || i.customerId === 'walk-in').length}
              </span>
            </button>

            <button
              onClick={() => { setActiveSubTab('quotations'); setSearchQuery(''); }}
              className={`w-full px-3 py-2.5 rounded-xl text-left font-bold transition-all flex justify-between items-center ${
                activeSubTab === 'quotations' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border dark:border-slate-800/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4 shrink-0" />
                <span>{language === 'SW' ? 'Makadirio ya Bei (Quotations)' : 'Proforma Quotations'}</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${activeSubTab === 'quotations' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-405'}`}>
                {quotations.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveSubTab('sheets'); setSearchQuery(''); }}
              className={`w-full px-3 py-2.5 rounded-xl text-left font-bold transition-all flex justify-between items-center ${
                activeSubTab === 'sheets' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border dark:border-slate-800/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>{language === 'SW' ? 'Ledger QR / Ripoti za Usalama' : 'Diagnostic QR Verifications'}</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${activeSubTab === 'sheets' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-405'}`}>
                {qrLogs.length}
              </span>
            </button>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-850 my-2" />

          {/* Detailed Filters Form */}
          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Search Keywords</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Invoice, client, ref, amount..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border pl-8 p-2 rounded-lg font-medium text-[11px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Start Date</label>
                <input 
                  type="date"
                  className="w-full bg-slate-50 dark:bg-slate-950 border p-1 rounded font-medium text-[10px]"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">End Date</label>
                <input 
                  type="date"
                  className="w-full bg-slate-50 dark:bg-slate-950 border p-1 rounded font-medium text-[10px]"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {(startDate || endDate || searchQuery) && (
              <button 
                onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
                className="w-full py-1.5 border border-dashed rounded text-center font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[10px]"
              >
                Clear Search Parameters
              </button>
            )}
          </div>
        </div>

        {/* Right Tabbed Results Table - Col 8 */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-205 dark:border-slate-800 shadow-sm min-h-[585px] flex flex-col justify-between">
          <div className="space-y-3">
            
            {/* Category Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 mb-3 gap-2 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {activeSubTab !== 'sheets' && (activeSubTab === 'invoices' || activeSubTab === 'receipts' ? filteredInvoices.length > 0 : filteredQuotations.length > 0) && (
                  <input
                    type="checkbox"
                    checked={
                      activeSubTab === 'invoices' || activeSubTab === 'receipts'
                        ? filteredInvoices.length > 0 && selectedDocIds.length === filteredInvoices.length
                        : filteredQuotations.length > 0 && selectedDocIds.length === filteredQuotations.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = activeSubTab === 'invoices' || activeSubTab === 'receipts'
                          ? filteredInvoices.map(inv => inv.id)
                          : filteredQuotations.map(q => q.id);
                        setSelectedDocIds(allIds);
                      } else {
                        setSelectedDocIds([]);
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                    title={language === 'SW' ? 'Chagua Zote' : 'Select All'}
                  />
                )}
                <span className="font-extrabold text-[10.5px] uppercase tracking-widest text-slate-720 dark:text-slate-200">
                  {activeSubTab === 'invoices' && (language === 'SW' ? 'Maktaba ya Ankara za Kweli' : 'Commercial Billing Archive')}
                  {activeSubTab === 'receipts' && (language === 'SW' ? 'Jedwali la Risiti za Mauzo (POS)' : 'Retail POS Transaction Logs')}
                  {activeSubTab === 'quotations' && (language === 'SW' ? 'Makadirio Isiyo na Hati ya Ankara' : 'Price Quotation Forecast Registry')}
                  {activeSubTab === 'sheets' && (language === 'SW' ? 'Logi za QR na Diagnostics za Mfumo' : 'Secure QR Verification Logs')}
                </span>
              </div>
              <span className="font-mono text-[9px] text-slate-400">Total: {
                activeSubTab === 'invoices' || activeSubTab === 'receipts' ? filteredInvoices.length : activeSubTab === 'quotations' ? filteredQuotations.length : qrLogs.length
              } records</span>
            </div>

            {/* Interactive Quick Actions Toolbar */}
            {selectedDocIds.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-205 dark:border-slate-800 p-4 rounded-xl space-y-4 mb-3 shadow-xs">
                
                {/* Header info */}
                <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-1.5 text-[9px] font-mono font-black uppercase text-white bg-indigo-600 rounded">
                      {language === 'SW' ? 'PANELI HARAKA' : 'QUICK PANEL'}
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-150">
                      {language === 'SW' 
                        ? `Uteuzi wa Nyaraka: ${selectedDocIds.length} zimechaguliwa` 
                        : `Selected Action Panel: ${selectedDocIds.length} active`}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedDocIds([])}
                    className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-rose-600 font-bold text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                    <span>{language === 'SW' ? 'Futa Uteuzi' : 'Clear All'}</span>
                  </button>
                </div>

                {/* Segment Controls */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border dark:border-slate-850">
                  <button
                    onClick={() => setQuickActionTab('download')}
                    className={`py-2 px-1 text-center font-extrabold text-[9.5px] uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      quickActionTab === 'download' 
                        ? 'bg-white dark:bg-slate-850 text-indigo-655 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Download className="h-3 w-3" />
                    <span>{language === 'SW' ? 'Pakua Moja' : 'Individual Download'}</span>
                  </button>
                  <button
                    onClick={() => setQuickActionTab('print')}
                    className={`py-2 px-1 text-center font-extrabold text-[9.5px] uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      quickActionTab === 'print' 
                        ? 'bg-white dark:bg-slate-850 text-indigo-655 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Printer className="h-3 w-3" />
                    <span>{language === 'SW' ? 'Kundi Print' : 'Batch Print'}</span>
                  </button>
                  <button
                    onClick={() => setQuickActionTab('email')}
                    className={`py-2 px-1 text-center font-extrabold text-[9.5px] uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      quickActionTab === 'email' 
                        ? 'bg-white dark:bg-slate-850 text-indigo-655 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Mail className="h-3 w-3" />
                    <span>{language === 'SW' ? 'Kundi Mail' : 'Bulk Mail'}</span>
                  </button>
                </div>

                {/* Mode Sub-contents */}
                {quickActionTab === 'download' && (
                  <div className="space-y-3 animate-fade-in text-[10.5px]">
                    <p className="text-slate-500 dark:text-slate-400 leading-normal">
                      {language === 'SW' 
                        ? 'Pakua kundi zima la nyaraka zilizochaguliwa kama faili binafsi za HTML/PDF katika sekunde moja. Kila faili litatengenezwa kipekee.'
                        : 'Download each selected document as an individual high-fidelity document file. Prevents popups by pacing the downloads sequentially.'}
                    </p>
                    
                    {/* Downloading Progress Indicator */}
                    {isBulkDownloading && (
                      <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl border border-dashed border-indigo-200/50 dark:border-slate-800 space-y-2">
                        <div className="flex justify-between font-mono text-[9px] text-slate-400">
                          <span>Progress Status:</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">Downloading...</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {selectedDocIds.map(id => {
                            const inv = invoices.find(i => i.id === id);
                            const q = quotations.find(item => item.id === id);
                            const label = inv ? inv.invoiceNumber : q ? q.quotationNumber : 'Doc';
                            const status = bulkDownloadStatus[id] || 'pending';
                            return (
                              <div key={id} className="flex items-center gap-1.5 p-1 px-2 rounded-md bg-slate-100 dark:bg-slate-900 border dark:border-slate-850 text-[9.5px]">
                                <span className={`h-1.5 w-1.5 rounded-full ${status === 'success' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                                <span className="font-mono font-bold truncate grow">{label}</span>
                                <span className="text-[8px] text-slate-400 uppercase font-bold">{status}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleBatchDownload}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-extrabold text-[10px] uppercase tracking-wider rounded-lg border dark:border-slate-700 cursor-pointer transition-all active:scale-95 duration-70"
                      >
                        <Download className="h-3 w-3" />
                        <span>{language === 'SW' ? 'Pakua Kundi Pamoja' : 'Consolidated Download'}</span>
                      </button>
                      <button
                        onClick={handleIndividualDownloadAll}
                        disabled={isBulkDownloading}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg shadow-sm cursor-pointer transition-all active:scale-95 duration-70"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{isBulkDownloading ? (language === 'SW' ? 'Inapakua...' : 'Downloading...') : (language === 'SW' ? 'Pakua Kila Moja' : 'Individual Download All')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {quickActionTab === 'print' && (
                  <div className="space-y-3 animate-fade-in text-[10.5px]">
                    <p className="text-slate-500 dark:text-slate-400 leading-normal">
                      {language === 'SW'
                        ? 'Chapisha nyaraka zote zilizochaguliwa kwa mpangilio mmoja ulioboreshwa. Chagua template mapema ili kurekebisha mitindo.'
                        : 'Consolidate and compile all chosen records into a single seamless document stream layout optimized for printing or PDF storage.'}
                    </p>
                    
                    {/* Template preferences inline selection shortcut */}
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-slate-950 border dark:border-slate-850 rounded-xl">
                      <span className="font-black text-[9.5px] uppercase tracking-wider text-slate-400 pl-1">
                        {language === 'SW' ? 'Mtindo wa Kiolezo:' : 'Selected Layout Template:'}
                      </span>
                      {['Modern', 'Classic', 'Thermal', 'Luxury'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedTemplate(t as any)}
                          className={`px-3 py-1 font-bold text-[9px] uppercase rounded-lg border transition-all cursor-pointer ${
                            selectedTemplate === t 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/40 dark:text-indigo-300 font-extrabold' 
                              : 'bg-white dark:bg-slate-900 border-slate-205 dark:border-slate-800 text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleBatchPrint}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg shadow-sm cursor-pointer transition-all active:scale-95 duration-70"
                      >
                        <Printer className="h-3 w-3" />
                        <span>{language === 'SW' ? 'Anza Kuchapa Kundi' : 'Launch Batch Print Dialog'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {quickActionTab === 'email' && (
                  <div className="space-y-4 animate-fade-in text-[10.5px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: configuration */}
                      <div className="space-y-1">
                        <label className="block text-[9.5px] uppercase tracking-wider font-extrabold text-slate-450 dark:text-slate-400">
                          {language === 'SW' ? 'Tuma Kupitia Akaunti Ya:' : 'Transmit Mail Sender Protocol:'}
                        </label>
                        <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-950 p-1 border dark:border-slate-850 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setEmailSenderChoice('profile')}
                            className={`py-1 px-1 text-center text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                              emailSenderChoice === 'profile'
                                ? 'bg-white dark:bg-slate-850 text-indigo-700 dark:text-indigo-400 font-extrabold shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {language === 'SW' ? 'Barua Pepe ya Duka' : 'Store Default Mail'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailSenderChoice('machine')}
                            className={`py-1 px-1 text-center text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                              emailSenderChoice === 'machine'
                                ? 'bg-white dark:bg-slate-850 text-indigo-700 dark:text-indigo-400 font-extrabold shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {language === 'SW' ? 'Akaunti Yako' : 'My Operator Account'}
                          </button>
                        </div>
                      </div>

                      {/* Right: brief context info */}
                      <div className="p-2.5 bg-slate-100 dark:bg-slate-950 border dark:border-slate-850 rounded-xl space-y-1">
                        <strong className="block text-[8.5px] uppercase tracking-widest text-slate-400">DISPATCH PROTOCOL:</strong>
                        <p className="text-slate-500 dark:text-slate-450 leading-snug text-[9.5px]">
                          {language === 'SW'
                            ? 'Mhasibu anapeleka kila barua kwa barua pepe ya mteja. Seva imewashwa kiotomatiki.'
                            : 'This will dispatch separate personalized email notices with digital verification registers directly from Cloud Node to each corresponding customer.'}
                        </p>
                      </div>
                    </div>

                    {/* Recipient dispatch listing status */}
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-950 rounded-xl border dark:border-slate-850 space-y-2">
                      <strong className="block text-[8.5px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        {language === 'SW' ? 'Orodha ya Barua Pepe za Makundi' : 'Consolidated Bulk Recipients Dispatch Progress:'}
                      </strong>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[120px] overflow-y-auto pr-1">
                        {selectedDocIds.map(id => {
                          const inv = invoices.find(i => i.id === id);
                          const q = quotations.find(item => item.id === id);
                          const label = inv ? inv.invoiceNumber : q ? q.quotationNumber : 'Doc';
                          const client = inv ? inv.customerDetails.fullName : q ? q.clientName : 'Client';
                          const emailRaw = inv ? inv.customerDetails.email : 'client@example.com';
                          const status = bulkEmailStatus[id] || 'pending';
                          
                          return (
                            <div key={id} className="flex flex-col justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border dark:border-slate-850 transition-all text-[9.5px]">
                              <div className="flex justify-between items-start gap-1">
                                <span className="font-mono font-bold text-[9.5px] truncate">{label}</span>
                                <span className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${
                                  status === 'sent' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' :
                                  status === 'sending' ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 animate-pulse' :
                                  status === 'failed' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600' :
                                  'bg-slate-50 dark:bg-slate-800 text-slate-500'
                                }`}>
                                  {status}
                                </span>
                              </div>
                              <div className="text-[9px] text-slate-400 truncate mt-1">
                                {client} ({emailRaw})
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleBulkEmailDispatch}
                        disabled={isBulkSending}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg shadow-sm cursor-pointer transition-all active:scale-95 duration-70"
                      >
                        <Send className="h-3 w-3" />
                        <span>{isBulkSending ? (language === 'SW' ? 'Inatuma Barua Pepe...' : 'Transmitting Bulk...') : (language === 'SW' ? 'Anza Barua Pepe ya Makundi' : 'Transmit Bulk Email Nodes')}</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* List Table wrapper */}
            {activeSubTab === 'invoices' || activeSubTab === 'receipts' ? (
              filteredInvoices.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  No matching commercial invoices compiled in tawi. Complete operations to update list.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredInvoices.map((inv) => (
                    <div 
                      key={inv.id} 
                      className="p-3 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-800/80 hover:bg-indigo-50/10 rounded-xl flex items-center justify-between text-xs transition-all relative group"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(inv.id)}
                          onChange={() => {
                            setSelectedDocIds(prev =>
                              prev.includes(inv.id) ? prev.filter(id => id !== inv.id) : [...prev, inv.id]
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="font-bold text-slate-855 dark:text-slate-200">{inv.invoiceNumber}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">({inv.invoiceDate})</span>
                          </div>
                          <span className="text-[10px] text-slate-405 block font-medium">To: <strong className="text-slate-650 dark:text-slate-300">{inv.customerDetails.fullName}</strong> | Signed: <strong className="text-indigo-600 dark:text-indigo-400">{inv.salesperson}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <strong className="font-mono text-slate-900 dark:text-white block">TZS {inv.grandTotal.toLocaleString()}</strong>
                          <span className={`text-[8.5px] font-sans px-1.5 py-0.5 rounded uppercase font-black tracking-wide border-0 ${
                            inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-808 dark:bg-amber-950/30 dark:text-amber-400'
                          }`}>
                            {inv.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setSelectedInvoice(inv); setSelectedQuotation(null); }}
                            className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 border rounded-lg text-slate-505 dark:text-slate-200 shrink-0 cursor-pointer"
                            title="Preview PDF style template"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleExportIndividual(inv.id, 'PDF')}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/40 rounded-lg text-rose-600 dark:text-rose-400 shrink-0 cursor-pointer"
                            title={language === 'SW' ? 'Pakua PDF' : 'Export as PDF'}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleExportIndividual(inv.id, 'EXCEL')}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0 cursor-pointer"
                            title={language === 'SW' ? 'Hamisha Excel (CSV)' : 'Export as Excel'}
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setSelectedInvoice(inv); setSelectedQuotation(null); setIsShareModalOpen(true); }}
                            className="p-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg shrink-0 cursor-pointer"
                            title="Tuma WhatsApp"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openEmailModal(inv, null)}
                            className="p-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg shrink-0 cursor-pointer"
                            title={language === 'SW' ? 'Tuma kwa Email' : 'Send via Email'}
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : activeSubTab === 'quotations' ? (
              filteredQuotations.length === 0 ? (
                <div className="text-center py-20 text-slate-405 font-mono">
                  No catalog quotations stored persistently yet. Open Price Catalog, select products, and open PDF view to log a quotation.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredQuotations.map((q) => (
                    <div 
                      key={q.id} 
                      className="p-3 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-800/80 hover:bg-indigo-50/10 rounded-xl flex items-center justify-between text-xs transition-all relative group"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(q.id)}
                          onChange={() => {
                            setSelectedDocIds(prev =>
                              prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id]
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <QrCode className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="font-bold text-slate-855 dark:text-slate-200">{q.quotationNumber}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">({q.date})</span>
                          </div>
                          <span className="text-[10px] text-slate-405 block font-medium">To: <strong className="text-slate-650 dark:text-slate-350">{q.clientName}</strong> | Mode: <span className="uppercase text-amber-600 font-bold font-mono">{q.pricingType}</span></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <strong className="font-mono text-slate-900 dark:text-white block">TZS {q.grandTotal.toLocaleString()}</strong>
                          <span className="text-[8px] uppercase tracking-wider block font-black text-slate-400">Estimate List</span>
                        </div>

                         <div className="flex items-center gap-1 opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setSelectedQuotation(q); setSelectedInvoice(null); }}
                            className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 border rounded-lg text-slate-505 dark:text-slate-200 shrink-0 cursor-pointer"
                            title="Print Quotation PDF"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleExportIndividual(q.id, 'PDF')}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/40 rounded-lg text-rose-600 dark:text-rose-400 shrink-0 cursor-pointer"
                            title={language === 'SW' ? 'Pakua PDF' : 'Export as PDF'}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleExportIndividual(q.id, 'EXCEL')}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0 cursor-pointer"
                            title={language === 'SW' ? 'Hamisha Excel (CSV)' : 'Export as Excel'}
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setSelectedQuotation(q); setSelectedInvoice(null); setIsShareModalOpen(true); }}
                            className="p-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg shrink-0 cursor-pointer"
                            title="Tuma WhatsApp"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openEmailModal(null, q)}
                            className="p-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg shrink-0 cursor-pointer"
                            title={language === 'SW' ? 'Tuma kwa Email' : 'Send via Email'}
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Secure QR Log lists
              qrLogs.length === 0 ? (
                <div className="text-center py-20 text-slate-400">No QR logs tracked in storage yet. Scan or compile transaction sheets.</div>
              ) : (
                <div className="space-y-2.5">
                  {qrLogs.slice(0, 15).map((log) => (
                    <div 
                      key={log.id} 
                      className="p-3 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase font-sans select-none border ${
                            log.type === 'invoice' ? 'bg-indigo-50 border-indigo-200 text-indigo-800' :
                            log.type === 'quotation' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-250 text-emerald-800'
                          }`}>
                            {log.type}
                          </span>
                          <strong className="font-mono text-slate-700 dark:text-slate-300">{log.transactionId}</strong>
                        </div>
                        <div className="text-[10px] font-mono text-indigo-750 dark:text-indigo-400 block mt-1 select-all break-all leading-normal">
                          {log.url}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopyVerificationLink(log.url, log.id)}
                          className="p-1 bg-white dark:bg-slate-800 hover:bg-slate-100 border rounded text-slate-505 transition-colors cursor-pointer shrink-0"
                          title="Copy Link"
                        >
                          {copiedUrlId === log.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Clipboard className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <a
                          href={log.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 bg-white dark:bg-slate-800 hover:bg-slate-100 border rounded text-indigo-505 transition-colors shrink-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

          </div>

          <p className="text-[10px] text-slate-400 mt-6 pt-4 border-t border-dashed dark:border-slate-800 text-center leading-relaxed">
            {language === 'SW' ? '🛡️ Kumbukumbu za ulinzi wa ankara na uhakiki zimedhaminiwa na saini ya kidijitali asilia.' : '🔒 Official security logs tracking document signatures. Unauthorized adjustments trigger automatic security notifications.'}
          </p>
        </div>

      </div>

      {/* PDF LIVE PREVIEW MODAL */}
      {(selectedInvoice || selectedQuotation) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-55 p-3 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-250 dark:border-slate-800 max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-800 dark:text-slate-200">
            
            {/* Modal Header Controls */}
            <div className="flex justify-between items-center pb-4 border-b dark:border-slate-850 shrink-0 select-none">
              <div className="flex items-center gap-4">
                <h3 className="font-sans font-black uppercase text-sm tracking-tight text-slate-900 dark:text-white">
                  {language === 'SW' ? 'Mhakiki wa Hati ya PDF / Chapisha' : 'Document PDF Live Viewer & Style Customizer'}
                </h3>

                {/* Quick Template Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border">
                  {['Modern', 'Classic', 'Thermal', 'Luxury'].map((tStyle) => (
                    <button
                      key={tStyle}
                      onClick={() => setSelectedTemplate(tStyle as any)}
                      className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer ${
                        selectedTemplate === tStyle 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      {tStyle}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => { setSelectedInvoice(null); setSelectedQuotation(null); }}
                className="p-1 px-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Direct PDF Saving Guideline Banner */}
            <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-850 dark:text-amber-300 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-[10px] sm:text-[11px] font-sans font-medium flex gap-2.5 items-start mt-3 select-none leading-relaxed shrink-0">
              <span className="text-sm">💡</span>
              <div>
                {language === 'SW' ? (
                  <span>
                    <strong>Jinsi ya kupakua PDF:</strong> Bonyeza kifungo cha chini cha <strong>"Print / PDF Export"</strong> kisha chagua kigae cha <strong>"Hifadhi kama PDF" (Save as PDF)</strong> au <strong>"Hifadhi kwenye MaFaili"</strong> kutoka kwa chaguo la printa yako ili uisave moja kwa moja kwenye simu au kompyuta yako ikiwa na saini halisi ya QR!
                  </span>
                ) : (
                  <span>
                    <strong>How to Save / Download as PDF:</strong> Click the <strong>"Print / PDF Export"</strong> action button below, then set your printer destination target option to <strong>"Save as PDF"</strong> or <strong>"Hifadhi kama PDF"</strong> inside the printer menu window to download the crisp high-fidelity document file locally!
                  </span>
                )}
              </div>
            </div>

            {/* Scrollable Printable Canvas area */}
            <div className="flex-1 overflow-y-auto py-6 bg-slate-100/60 dark:bg-slate-900/50 p-4 rounded-xl my-4 text-xs select-all">
              
              <div 
                id="doc-printer-canvas" 
                className={`bg-white text-black p-8 shadow-sm rounded-lg mx-auto ${
                  selectedTemplate === 'Luxury' ? 'border-4 border-amber-500 font-serif max-w-2xl text-amber-950' : 
                  selectedTemplate === 'Classic' ? 'border-2 border-black font-serif max-w-2xl text-black' : 
                  selectedTemplate === 'Thermal' ? 'max-w-[340px] p-4 text-[10.5px] font-mono border border-dashed border-gray-400 text-black leading-normal' : 
                  'border border-slate-200 font-sans max-w-2xl text-slate-900'
                }`}
                style={{ color: '#000000', backgroundColor: '#ffffff' }}
              >
                {selectedInvoice ? (
                  selectedTemplate === 'Thermal' ? (
                    // THERMAL SLIP 58MM/80MM LAYOUT
                    <div className="space-y-4 text-[10.5px] font-mono p-1">
                      <div className="text-center">
                        <span className="text-sm block font-black uppercase text-black">{profile?.name || 'SMART ERP INC'}</span>
                        <span className="block text-[9.5px] text-gray-700 mt-0.5">{profile?.address || 'Dar es Salaam'}</span>
                        <span className="block text-[9.5px] text-gray-700">TIN: {profile?.tinNumber || '111-222-333'} | VRN: {profile?.vatNumber || 'VAT-444-555'}</span>
                        {profile?.phone && <span className="block text-[9.5px] text-gray-750 font-bold">Tel: {profile.phone}</span>}
                      </div>
                      
                      <div className="border-b border-dashed border-black my-2" />
                      
                      <div className="space-y-1 text-black font-bold">
                        <div className="text-center font-black uppercase tracking-wider text-[11px] mb-1">POS TRANSACTION RECEIPT</div>
                        <div className="flex justify-between">
                          <span>Namba ya Risiti:</span>
                          <span>{selectedInvoice.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tarehe:</span>
                          <span>{selectedInvoice.invoiceDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mhasibu / Clerk:</span>
                          <span>{selectedInvoice.salesperson}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mteja:</span>
                          <span className="max-w-[160px] truncate">{selectedInvoice.customerDetails.fullName}</span>
                        </div>
                      </div>

                      <div className="border-b border-dashed border-black my-2" />

                      <table className="w-full text-[10px] font-mono text-black leading-tight">
                        <thead>
                          <tr className="border-b border-dashed border-black font-black uppercase">
                            <th className="text-left pb-1">Kipengele / Item</th>
                            <th className="text-center pb-1">Idadi</th>
                            <th className="text-right pb-1">Bei</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.items?.map((item, idx) => (
                            <tr key={idx} className="border-b border-dashed border-gray-150">
                              <td className="py-1 font-black max-w-[140px] truncate">{item.productName}</td>
                              <td className="text-center py-1">{item.quantity}</td>
                              <td className="text-right py-1">{((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString()} TZS</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="border-b border-dashed border-black my-2" />

                      <div className="space-y-1.5 text-right font-black text-[10.5px]">
                        <div className="flex justify-between">
                          <span className="font-normal text-gray-700">SUBTOTAL (Excl Tax):</span>
                          <span>TZS {(selectedInvoice.grandTotal / 1.18).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-normal text-gray-700">VAT (18% STNDRD):</span>
                          <span>TZS {(selectedInvoice.grandTotal - (selectedInvoice.grandTotal / 1.18)).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-1.5 border-t border-dashed border-black font-black text-black">
                          <span>JUMLA (TOTAL):</span>
                          <span>TZS {selectedInvoice.grandTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="border-b border-dashed border-black my-2" />

                      <div className="text-center space-y-1 text-[9.5px]">
                        <span className="block font-bold uppercase">{selectedInvoice.status === 'Paid' ? '★ LMELIPWA / PAID ★' : '⚠ HAIJALIPWA / UNPAID'}</span>
                        <span>{language === 'SW' ? 'Asante kwa kufanya biashara nasi!' : 'Thank you for your valued support!'}</span>
                        <div className="flex justify-center pt-2">
                          <QRCodeSVG 
                            value={`${window.location.origin}/verify?type=invoice&id=${selectedInvoice.id}&ref=${selectedInvoice.refNumber}&amount=${selectedInvoice.grandTotal}&date=${selectedInvoice.invoiceDate}`}
                            size={72}
                            level="M"
                          />
                        </div>
                        <span className="block text-[8px] text-gray-500 font-mono mt-1">Ulinzi wa Kielektroniki | Node Signed</span>
                      </div>
                    </div>
                  ) : (
                    // CORPORATE FULL-PAGE A4 STANDARD LAYOUT (Modern, Classic, Luxury)
                    <div className="space-y-6">
                      {/* Invoice header row */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          {profile?.logoUrl ? (
                            <img src={profile.logoUrl} className="h-10 w-auto object-contain mb-2 max-h-[60px]" alt="Enterprise Logo" referrerPolicy="no-referrer" />
                          ) : (
                            <span className={`text-xl font-sans font-black block mb-1 ${
                              selectedTemplate === 'Luxury' ? 'text-amber-600' : 'text-indigo-700'
                            }`}>DUKA OS ENTERPRISE</span>
                          )}
                          <h2 className="text-lg font-black tracking-tight uppercase">{profile?.name || 'SMART ERP INC'}</h2>
                          <p className="text-[10px] text-gray-500 leading-normal max-w-sm mt-1">
                            {profile?.address || '12 Floor, Golden Jubilee Tower'}<br />
                            {profile?.region || 'Dar es Salaam'}, {profile?.country || 'Tanzania'}<br />
                            TIN: {profile?.tinNumber || '112-402-921'} | VRN: {profile?.vatNumber || '40032912-F'}<br />
                            Email: {profile?.email || 'sales@dukaos.co.tz'} | Tel: {profile?.phone || '+255 712 000 000'}
                          </p>
                        </div>

                        {/* Header side metadata */}
                        <div className="text-right">
                          <span className={`text-2xl tracking-tighter uppercase font-black block ${
                            selectedTemplate === 'Luxury' ? 'text-amber-600 font-serif' : 
                            selectedTemplate === 'Classic' ? 'text-black font-serif' : 'text-indigo-800'
                          }`}>
                            INVOICE / ANKARA
                          </span>
                          <div className="text-[11px] text-gray-500 mt-2 space-y-0.5">
                            <div>Invoice No: <strong className="text-black font-mono">{selectedInvoice.invoiceNumber}</strong></div>
                            <div>Date Executed: <strong className="text-black font-mono">{selectedInvoice.invoiceDate}</strong></div>
                            <div>Due Date: <strong className="text-black font-mono">{selectedInvoice.dueDate}</strong></div>
                            <div>Ref-ID: <strong className="text-black font-mono text-[10px]">{selectedInvoice.refNumber}</strong></div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-150 pt-4 grid grid-cols-2 gap-8">
                        <div>
                          <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 block mb-1">CUSTOMER ACC BILL TO:</span>
                          <h3 className="font-extrabold text-[12px]">{selectedInvoice.customerDetails.fullName}</h3>
                          <p className="text-[10.5px] text-gray-500 mt-1 leading-relaxed">
                            {selectedInvoice.customerDetails.companyName && <span className="block font-bold text-black">{selectedInvoice.customerDetails.companyName}</span>}
                            {selectedInvoice.customerDetails.address}, {selectedInvoice.customerDetails.region}<br />
                            Phone: {selectedInvoice.customerDetails.phone} | Email: {selectedInvoice.customerDetails.email}<br />
                            {selectedInvoice.customerDetails.tinNumber && <span>TIN: {selectedInvoice.customerDetails.tinNumber}</span>}
                          </p>
                        </div>

                        <div className={`text-right p-4 rounded-xl border flex flex-col justify-between items-end min-h-[100px] ${
                          selectedTemplate === 'Luxury' ? 'bg-amber-500/5 border-amber-200' :
                          selectedTemplate === 'Classic' ? 'bg-gray-50 border-black' : 'bg-slate-50 border-gray-100'
                        }`}>
                          <div>
                            <span className="text-[9px] uppercase tracking-widest font-black text-gray-405 block mb-0.5">GRAND TOTAL TZS:</span>
                            <strong className={`text-2xl font-mono tracking-tight block ${
                              selectedTemplate === 'Luxury' ? 'text-amber-805' : 'text-indigo-700'
                            }`}>TZS {selectedInvoice.grandTotal.toLocaleString()}</strong>
                          </div>
                          <span className={`text-[9.5px] uppercase font-bold px-2 py-0.5 rounded border ${
                            selectedInvoice.status === 'Paid' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            Payment Status: {selectedInvoice.status}
                          </span>
                        </div>
                      </div>

                      {/* Table items list */}
                      <table className="w-full text-left text-[11px] border-collapse mt-4">
                        <thead>
                          <tr className={`uppercase text-[9px] font-black border-b ${
                            selectedTemplate === 'Luxury' ? 'bg-amber-550/10 text-amber-900 border-amber-300' :
                            selectedTemplate === 'Classic' ? 'bg-gray-100 text-black border-black' : 'bg-gray-100 text-gray-755 border-gray-250'
                          }`}>
                            <th className="py-2 pl-2">Product Catalogue</th>
                            <th className="py-2">SKU</th>
                            <th className="py-2 text-right">Unit Price</th>
                            <th className="py-2 text-center">Qty</th>
                            <th className="py-2 text-right pr-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {selectedInvoice.items?.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="py-2.5 pl-2 font-bold text-gray-900">{item.productName}</td>
                              <td className="py-2.5 font-mono text-gray-400">{item.sku}</td>
                              <td className="py-2.5 text-right font-mono text-gray-650">TZS {(item.unitPrice || 0).toLocaleString()}</td>
                              <td className="py-2.5 text-center font-mono font-bold">{item.quantity}</td>
                              <td className="py-2.5 text-right font-mono font-bold pr-2">TZS {((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Financial summary calculations */}
                      <div className="border-t pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div className="text-left font-mono text-[9px] text-gray-450 leading-relaxed max-w-xs">
                          <span>Invoice checked and authorized digitally via smart-hash signature in active Duka OS Node.</span>
                          <div className="font-bold text-slate-800 mt-1">Operator: {selectedInvoice.salesperson}</div>
                        </div>

                        <div className="text-right space-y-1.5 text-[11px] font-medium pr-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Subtotal Exclusive Taxes:</span>
                            <span className="font-mono text-black font-bold">TZS {(selectedInvoice.grandTotal / 1.18).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">VAT (18% Standard):</span>
                            <span className="font-mono text-black font-bold">TZS {(selectedInvoice.grandTotal - (selectedInvoice.grandTotal / 1.18)).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                          </div>
                          <div className={`flex justify-between font-bold text-lg border-t pt-1.5 ${
                            selectedTemplate === 'Luxury' ? 'text-amber-700 border-amber-300' : 'text-indigo-700 border-slate-200'
                          }`}>
                            <span>Verified Total:</span>
                            <span className="font-mono">TZS {selectedInvoice.grandTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Official Stamp & dynamic verify link QR */}
                      <div className={`p-3 rounded-lg flex items-center justify-between border border-dashed text-left ${
                        selectedTemplate === 'Luxury' ? 'bg-amber-50 border-amber-200' :
                        selectedTemplate === 'Classic' ? 'bg-gray-50 border-black' : 'bg-slate-50 border-gray-200'
                      }`}>
                        <div className="font-mono text-[9px] text-gray-505 max-w-md">
                          <strong className="text-gray-800 block text-[9.5px] uppercase">LOCK AUTH SECURITY BARCODE:</strong>
                          <span>Verification signature is compiled. Any Alteration of the PDF document without matching database records renders validation invalid.</span>
                          <div className="font-bold text-gray-700 mt-1">Official Stamp: "{profile?.companyStamp || 'APPROVED HQ DU-OS'}"</div>
                        </div>
                        <div className="shrink-0 pl-3">
                          <QRCodeSVG 
                            value={`${window.location.origin}/verify?type=invoice&id=${selectedInvoice.id}&ref=${selectedInvoice.refNumber}&amount=${selectedInvoice.grandTotal}&date=${selectedInvoice.invoiceDate}`}
                            size={52}
                            level="M"
                          />
                        </div>
                      </div>
                    </div>
                  )
                ) : selectedQuotation ? (
                  selectedTemplate === 'Thermal' ? (
                    // THERMAL QUOTATION SLIP 58MM/80MM LAYOUT
                    <div className="space-y-4 text-[10.5px] font-mono p-1">
                      <div className="text-center">
                        <span className="text-sm block font-black uppercase text-black">{profile?.name || 'SMART ERP INC'}</span>
                        <span className="block text-[9.5px] text-gray-700 mt-0.5">{profile?.address || 'Dar es Salaam'}</span>
                        <span className="block text-[9.5px] text-gray-700">TIN: {profile?.tinNumber || '111-222-333'}</span>
                        {profile?.phone && <span className="block text-[9.5px] text-gray-750 font-bold">Tel: {profile.phone}</span>}
                      </div>
                      
                      <div className="border-b border-dashed border-black my-2" />
                      
                      <div className="space-y-1 text-black font-bold">
                        <div className="text-center font-black uppercase tracking-wider text-[11.5px] mb-1">PROFORMA QUOTE SLIP</div>
                        <div className="flex justify-between">
                          <span>Namba ya Quote:</span>
                          <span>{selectedQuotation.quotationNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tarehe:</span>
                          <span>{selectedQuotation.date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Aina ya Bei:</span>
                          <span>{selectedQuotation.pricingType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mteja:</span>
                          <span className="max-w-[160px] truncate">{selectedQuotation.clientName}</span>
                        </div>
                      </div>

                      <div className="border-b border-dashed border-black my-2" />

                      <table className="w-full text-[10px] font-mono text-black leading-tight">
                        <thead>
                          <tr className="border-b border-dashed border-black font-black uppercase">
                            <th className="text-left pb-1">Item</th>
                            <th className="text-center pb-1">Qty</th>
                            <th className="text-right pb-1">Kiasi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedQuotation.items?.map((item, idx) => (
                            <tr key={idx} className="border-b border-dashed border-gray-150">
                              <td className="py-1 font-black max-w-[140px] truncate">{item.productName}</td>
                              <td className="text-center py-1">{item.qty}</td>
                              <td className="text-right py-1">{(item.price * item.qty).toLocaleString()} TZS</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="border-b border-dashed border-black my-2" />

                      <div className="space-y-1.5 text-right font-black text-[11px] text-black">
                        <div className="flex justify-between font-extrabold text-sm pt-1.5">
                          <span>JUMLA (TOTAL):</span>
                          <span>TZS {selectedQuotation.grandTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="border-b border-dashed border-black my-2" />

                      <div className="text-center space-y-1 text-[9.5px]">
                        <span>{language === 'SW' ? 'Makadirio haya ya bei ni halali kwa siku 30' : 'This quotation budget is valid for 30 days.'}</span>
                        <div className="flex justify-center pt-2">
                          <QRCodeSVG 
                            value={`${window.location.origin}/verify?type=quotation&client=${encodeURIComponent(selectedQuotation.clientName)}&date=${selectedQuotation.date}&total=${selectedQuotation.grandTotal}`}
                            size={72}
                            level="M"
                          />
                        </div>
                        <span className="block text-[8px] text-gray-500 font-mono mt-1">Uhakiki wa Kielektroniki | Node Signed</span>
                      </div>
                    </div>
                  ) : (
                    // CORPORATE FULL-PAGE A4 STANDARD QUOTATION LAYOUT (Modern, Classic, Luxury)
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          {profile?.logoUrl ? (
                            <img src={profile.logoUrl} className="h-10 w-auto mb-2 max-h-[60px]" alt="Logo" referrerPolicy="no-referrer" />
                          ) : (
                            <span className={`text-xl font-sans font-black block mb-1 ${
                              selectedTemplate === 'Luxury' ? 'text-amber-600' : 'text-indigo-705'
                            }`}>DUKA OS ENTERPRISE</span>
                          )}
                          <h2 className="text-lg font-black uppercase">{profile?.name || 'SMART ERP INC'}</h2>
                          <p className="text-[10px] text-gray-500 leading-tight">Tel: {profile?.phone} | Email: {profile?.email}</p>
                        </div>

                        <div className="text-right">
                          <span className={`text-2xl uppercase tracking-tighter font-extrabold block ${
                            selectedTemplate === 'Luxury' ? 'text-amber-600 font-serif' : 
                            selectedTemplate === 'Classic' ? 'text-black font-serif' : 'text-indigo-800'
                          }`}>
                            PROFORMA QUOTE
                          </span>
                          <div className="text-[11px] text-gray-500 mt-2 space-y-0.5">
                            <div>Quote Number: <strong className="text-black font-mono">{selectedQuotation.quotationNumber}</strong></div>
                            <div>Date Shared: <strong className="text-black font-mono">{selectedQuotation.date}</strong></div>
                            <div>Pricing Level: <strong className="text-black font-bold uppercase">{selectedQuotation.pricingType}</strong></div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-150 pt-4">
                        <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 block mb-1">PREPARED FOR CLIENT:</span>
                        <h3 className="font-extrabold text-[12px]">{selectedQuotation.clientName}</h3>
                      </div>

                      <table className="w-full text-left text-[11px] border-collapse mt-4">
                        <thead>
                          <tr className={`uppercase text-[9px] font-black border-b ${
                            selectedTemplate === 'Luxury' ? 'bg-amber-500/10 text-amber-900 border-amber-305' :
                            selectedTemplate === 'Classic' ? 'bg-gray-100 text-black border-black' : 'bg-gray-100 text-gray-755 border-gray-250'
                          }`}>
                            <th className="py-2 pl-2">Product Name</th>
                            <th className="py-2">SKU</th>
                            <th className="py-2 text-right">Unit Rate (TZS)</th>
                            <th className="py-2 text-center">Estimated Qty</th>
                            <th className="py-2 text-right pr-2">Subtotal Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {selectedQuotation.items?.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="py-2.5 pl-2 font-bold text-gray-900">{item.productName}</td>
                              <td className="py-2.5 font-mono text-gray-400">{item.sku}</td>
                              <td className="py-2.5 text-right font-mono text-gray-600">TZS {item.price.toLocaleString()}</td>
                              <td className="py-2.5 text-center font-mono font-bold">{item.qty}</td>
                              <td className="py-2.5 text-right font-mono font-bold pr-2">TZS {(item.price * item.qty).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className={`p-4 rounded-xl border text-right ${
                        selectedTemplate === 'Luxury' ? 'bg-amber-500/5 border-amber-200' :
                        selectedTemplate === 'Classic' ? 'bg-gray-50 border-black' : 'bg-slate-50 border-gray-100'
                      }`}>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">ESTIMATED TOTAL CONSOLIDATED BUDGET:</span>
                        <strong className={`text-2xl font-mono tracking-tight block mt-1 ${
                          selectedTemplate === 'Luxury' ? 'text-amber-801' : 'text-indigo-700'
                        }`}>TZS {selectedQuotation.grandTotal.toLocaleString()}</strong>
                      </div>

                      <div className={`p-3 rounded-lg flex items-center justify-between border border-dashed text-left ${
                        selectedTemplate === 'Luxury' ? 'bg-amber-50 border-amber-202' :
                        selectedTemplate === 'Classic' ? 'bg-gray-55 border-black' : 'bg-slate-50 border-gray-200'
                      }`}>
                        <div className="font-mono text-[9px] text-gray-500 max-w-md">
                          <strong className="text-gray-800 block uppercase">QUOTATION EXCELLENCE SEAL:</strong>
                          <span>This proforma quote does not hold inventory stock. Real transaction invoices must be generated in the checkout console to log legal audit logs.</span>
                          {profile?.companyStamp && <div className="font-bold text-gray-700 mt-1">Official Seal: "{profile.companyStamp}"</div>}
                        </div>
                        <div className="shrink-0 pl-3">
                          <QRCodeSVG 
                            value={`${window.location.origin}/verify?type=quotation&client=${encodeURIComponent(selectedQuotation.clientName)}&date=${selectedQuotation.date}&total=${selectedQuotation.grandTotal}`}
                            size={52}
                            level="M"
                          />
                        </div>
                      </div>
                    </div>
                  )
                ) : null}

              </div>

            </div>

            {/* Action buttons inside Modal footer */}
            <div className="flex gap-2.5 justify-end pt-4 border-t dark:border-slate-850 shrink-0 select-none">
              <button
                onClick={() => handlePrintDocument('doc-printer-canvas')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase rounded-xl flex items-center gap-1.5 text-[10px] tracking-wider cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print / PDF Export</span>
              </button>

              <button
                onClick={() => {
                  const activeDocId = selectedInvoice ? selectedInvoice.id : selectedQuotation ? selectedQuotation.id : '';
                  if (activeDocId) {
                    handleExportIndividual(activeDocId, 'PDF');
                  }
                }}
                className="px-4 py-2 bg-blue-605 bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase rounded-xl flex items-center gap-1.5 text-[10px] tracking-wider cursor-pointer"
                title={language === 'SW' ? 'Pakua nyaraka ya thabiti ya PDF' : 'Download high-fidelity vector PDF document file'}
              >
                <Download className="h-4 w-4" />
                <span>{language === 'SW' ? 'Pakua PDF' : 'Download PDF'}</span>
              </button>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase rounded-xl flex items-center gap-1.5 text-[10px] tracking-wider cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>{language === 'SW' ? 'Tuma WhatsApp' : 'Direct Share WhatsApp'}</span>
              </button>

              <button
                onClick={() => openEmailModal(null, null)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold uppercase rounded-xl flex items-center gap-1.5 text-[10px] tracking-wider cursor-pointer"
              >
                <Mail className="h-4 w-4" />
                <span>{language === 'SW' ? 'Tuma Email' : 'Email Document'}</span>
              </button>

              <button
                onClick={() => { setSelectedInvoice(null); setSelectedQuotation(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-extrabold uppercase rounded-xl text-[10px] tracking-wider cursor-pointer"
              >
                {language === 'SW' ? 'Funga' : 'Close Viewer'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* WHATSAPP PDF SHARING CHANNELS MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-55 p-3 select-none">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-250 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-200">
            
            <div className="flex justify-between items-center pb-2 border-b dark:border-slate-850">
              <span className="font-extrabold text-[12px] uppercase tracking-wider flex items-center gap-1.5 text-emerald-600">
                <Send className="h-4.5 w-4.5" />
                <span>{language === 'SW' ? 'Tuma PDF kwa WhatsApp' : 'WhatsApp Delivery Terminal'}</span>
              </span>
              <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              {language === 'SW' 
                ? 'Ingiza namba ya simu ya mteja kuanza na kodi ya nchi (Mfano +255-712-X). Mfumo utaandaa kiungo safi cha nyaraka na taarifa zote za kisheria asilia tayari kutumwa.' 
                : 'Enter the receiving client WhatsApp phone number. Be sure to use the international dialing format code e.g. 255712000111 without the plus prefix.'}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Mteja Simu (WhatsApp Phone No)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 255712345678"
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border p-2.5 rounded-xl font-bold font-mono tracking-wide text-xs"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">PDF Template Layout Choice</label>
                <select
                  value={whatsappTemplateStyle}
                  onChange={(e: any) => setWhatsappTemplateStyle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-905 border p-2 rounded-xl text-xs font-bold"
                >
                  <option value="Modern">Minimalist Modern Invoice style</option>
                  <option value="Thermal">Thermal Cash register slip 58mm style</option>
                  <option value="Luxury">Luxury Corporate Gold template</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Auto-Generated Professional Message</label>
                <textarea 
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border p-2.5 rounded-xl text-[10.5px] leading-relaxed font-sans focus:outline-none"
                  value={whatsappCustomText}
                  onChange={(e) => setWhatsappCustomText(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 border rounded-xl font-bold text-[10px] uppercase text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleShareToWhatsAppGo}
                disabled={!whatsappPhone}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold uppercase rounded-xl flex items-center gap-1.5 text-[10px] tracking-wider cursor-pointer"
              >
                <Send className="h-4.5 w-4.5" />
                <span>{language === 'SW' ? 'Tuma Sasa' : 'Dispatch via WhatsApp'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EMAIL COMPILING & DISPATCHING REGISTER MODAL */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-55 p-3 select-none">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-250 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-200">
            
            <div className="flex justify-between items-center pb-2 border-b dark:border-slate-850">
              <span className="font-extrabold text-[12px] uppercase tracking-wider flex items-center gap-1.5 text-sky-600">
                <Mail className="h-4.5 w-4.5 text-sky-500" />
                <span>{language === 'SW' ? 'Kitovu cha Kutuma Barua Pepe (Email)' : 'ERP Email Dispatch Center'}</span>
              </span>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {emailSentSuccess ? (
              <div className="py-6 space-y-4 text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                    {language === 'SW' ? 'Barua Pepe Imetayarishwa!' : 'Email Initialized!'}
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                    {language === 'SW'
                      ? 'Nyaraka ya kifedha yenye ulinzi wa kisheria imeratibiwa na kuandaliwa kwa ufanisi sasa.'
                      : 'The secure digital document with live QR signature tracking has been processed and prepared.'}
                  </p>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border text-left font-mono text-[9px] text-slate-500 space-y-1">
                  <div><strong>Method:</strong> {emailDispatchMethod === 'mailto' ? 'Device Mail App (Gmail/Outlook)' : 'Enterprise SMTP Server'}</div>
                  <div><strong>To:</strong> {emailRecipient}</div>
                  <div><strong>Subject:</strong> {emailSubject}</div>
                  <div><strong>Status:</strong> Ready / Processed / OK</div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsEmailModalOpen(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold uppercase rounded-xl text-[10px] tracking-wider cursor-pointer"
                  >
                    OK / Funga
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendEmailGo} className="space-y-3.5">
                
                {/* DISPATCH METHOD CHOICE */}
                <div>
                  <label className="text-[9.5px] font-black uppercase text-slate-400 block mb-1">
                    {language === 'SW' ? 'Njia ya Kutuma / Kipeperushi:' : 'E-mail Delivery Method:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setEmailDispatchMethod('mailto')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        emailDispatchMethod === 'mailto' 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-bold' 
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500'
                      }`}
                    >
                      <span className="text-[10px] font-black flex items-center gap-1">⚡ {language === 'SW' ? 'Native Programu (Bure)' : 'Local Mail Client'}</span>
                      <span className="block text-[8.5px] mt-1 text-slate-405 leading-normal font-sans">
                        {language === 'SW' 
                          ? 'Inafungua Gmail/Outlook yako moja kwa moja bila mipangilio.' 
                          : 'Launches Gmail, Apple Mail or Outlook on your device instantly.'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEmailDispatchMethod('server')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        emailDispatchMethod === 'server' 
                          ? 'border-indigo-500 bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-bold' 
                          : 'border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500'
                      }`}
                    >
                      <span className="text-[10px] font-black flex items-center gap-1">🌐 {language === 'SW' ? 'Seva ya Smart ERP' : 'Server SMTP'}</span>
                      <span className="block text-[8.5px] mt-1 text-slate-405 leading-normal font-sans">
                        {language === 'SW' 
                          ? 'Inatuma siri nyuma ya pazia (Inahitaji usakinishaji wa SMTP).' 
                          : 'Sends silently from backend (Requires SMTP credentials).'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* SENDER SELECTION (only for server method) */}
                {emailDispatchMethod === 'server' && (
                  <div>
                    <label className="text-[9.5px] font-black uppercase text-slate-400 block mb-1">
                      {language === 'SW' ? 'Kutuma Kupitia (Chagua Kipeperushi):' : 'Send Transaction Documents Via:'}
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setEmailSenderChoice('profile')}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          emailSenderChoice === 'profile' 
                            ? 'border-sky-505 bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20 font-bold' 
                            : 'border-slate-205 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-900 text-slate-500'
                        }`}
                      >
                        <UserCheck className="h-4.5 w-4.5 mb-1" />
                        <div>
                          <span className="block text-[10px] font-black">Mwenye Duka Email</span>
                          <span className="block font-mono text-[8.5px] truncate">{profile?.email || 'mwenyebiz@duka.tz'}</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEmailSenderChoice('machine')}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          emailSenderChoice === 'machine' 
                            ? 'border-sky-505 bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20 font-bold' 
                            : 'border-slate-205 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-900 text-slate-500'
                        }`}
                      >
                        <Building className="h-4.5 w-4.5 mb-1" />
                        <div>
                          <span className="block text-[10px] font-black">Email ya Machine</span>
                          <span className="block font-mono text-[8.5px] truncate">{userEmail || 'operator@dukaos.co.tz'}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* RECIPIENT EMAIL */}
                <div>
                  <label className="text-[9.5px] font-black uppercase text-slate-400 block mb-1">
                    {language === 'SW' ? 'Email ya Mteja (Mpokeaji):' : 'Recipient Client Email Address:'}
                  </label>
                  <input 
                    type="email" 
                    required
                    placeholder="Weka barua pepe mfano: mteja@gmail.com"
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border p-2.5 rounded-xl font-bold font-mono tracking-wide text-xs focus:ring-2 focus:ring-sky-500"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                  />
                </div>

                {/* EMAIL SUBJECT */}
                <div>
                  <label className="text-[9.5px] font-black uppercase text-slate-400 block mb-1">
                    {language === 'SW' ? 'Kichwa cha Habari (Subject):' : 'Email Subject Title:'}
                  </label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border p-2.5 rounded-xl font-bold text-xs"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                {/* EMAIL BODY */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9.5px] font-black uppercase text-slate-400 block">
                      {language === 'SW' ? 'Ujumbe Rasmi wa Nyaraka:' : 'Commercial Message Text:'}
                    </label>
                    <span className="text-[8px] px-1 bg-amber-100 text-amber-800 rounded font-bold font-mono">Attachment Included</span>
                  </div>
                  <textarea 
                    rows={6}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border p-2.5 rounded-xl text-[10.5px] leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t dark:border-slate-850">
                  <button
                    type="button"
                    onClick={() => setIsEmailModalOpen(false)}
                    className="px-4 py-2 border rounded-xl font-bold text-[10px] uppercase text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-extrabold uppercase rounded-xl flex items-center gap-1.5 text-[10px] tracking-wider cursor-pointer"
                  >
                    {isSendingEmail ? (
                      <span className="flex items-center gap-1">
                        <span className="animate-ping h-1.5 w-1.5 rounded-full bg-white"></span>
                        <span>{language === 'SW' ? 'Inatuma...' : 'Transmitting...'}</span>
                      </span>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>{language === 'SW' ? 'Tuma Sasa' : 'Dispatch Document'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* HIDDEN BATCH PRINT/DOWNLOAD CONTAINER */}
      <div id="batch-print-canvas" className="hidden" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
        {selectedDocIds.map((id, index) => {
          const inv = invoices.find(i => i.id === id);
          if (inv) {
            return (
              <div 
                key={inv.id} 
                id={`batch-item-${inv.id}`}
                className="bg-white text-black p-8 mx-auto print-avoid-break mb-12"
                style={{ 
                  color: '#000000', 
                  backgroundColor: '#ffffff',
                  pageBreakAfter: index === selectedDocIds.length - 1 ? 'auto' : 'always',
                  breakAfter: index === selectedDocIds.length - 1 ? 'auto' : 'page',
                  maxHeight: 'none',
                  overflow: 'visible'
                }}
              >
                {selectedTemplate === 'Thermal' ? (
                  <div className="space-y-4 text-[10.5px] font-mono p-1" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                    <div className="text-center">
                      <span className="text-sm block font-black uppercase text-black">{profile?.name || 'SMART ERP INC'}</span>
                      <span className="block text-[9.5px] text-gray-700 mt-0.5">{profile?.address || 'Dar es Salaam'}</span>
                      <span className="block text-[9.5px] text-gray-700">TIN: {profile?.tinNumber || '111-222-333'} | VRN: {profile?.vatNumber || 'VAT-444-555'}</span>
                      {profile?.phone && <span className="block text-[9.5px] text-gray-750 font-bold">Tel: {profile.phone}</span>}
                    </div>
                    
                    <div className="border-b border-dashed border-black my-2" />
                    
                    <div className="space-y-1 text-black font-bold">
                      <div className="text-center font-black uppercase tracking-wider text-[11px] mb-1">POS TRANSACTION RECEIPT</div>
                      <div className="flex justify-between">
                        <span>Namba ya Risiti:</span>
                        <span>{inv.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tarehe:</span>
                        <span>{inv.invoiceDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mhasibu / Clerk:</span>
                        <span>{inv.salesperson}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mteja:</span>
                        <span className="max-w-[160px] truncate">{inv.customerDetails.fullName}</span>
                      </div>
                    </div>

                    <div className="border-b border-dashed border-black my-2" />

                    <table className="w-full text-[10px] font-mono text-black leading-tight">
                      <thead>
                        <tr className="border-b border-dashed border-black font-black uppercase">
                          <th className="text-left pb-1">Kipengele / Item</th>
                          <th className="text-center pb-1">Idadi</th>
                          <th className="text-right pb-1">Bei</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items?.map((item, idx) => (
                          <tr key={idx} className="border-b border-dashed border-gray-150">
                            <td className="py-1 font-black max-w-[140px] truncate">{item.productName}</td>
                            <td className="text-center py-1">{item.quantity}</td>
                            <td className="text-right py-1">{((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString()} TZS</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="border-b border-dashed border-black my-2" />

                    <div className="space-y-1.5 text-right font-black text-[10.5px]">
                      <div className="flex justify-between">
                        <span className="font-normal text-gray-700">SUBTOTAL (Excl Tax):</span>
                        <span>TZS {(inv.grandTotal / 1.18).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-normal text-gray-700">VAT (18% STNDRD):</span>
                        <span>TZS {(inv.grandTotal - (inv.grandTotal / 1.18)).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-1.5 border-t border-dashed border-black font-black text-black">
                        <span>JUMLA (TOTAL):</span>
                        <span>TZS {inv.grandTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="border-b border-dashed border-black my-2" />

                    <div className="text-center space-y-1 text-[9.5px]">
                      <span className="block font-bold uppercase">{inv.status === 'Paid' ? '★ LMELIPWA / PAID ★' : '⚠ HAIJALIPWA / UNPAID'}</span>
                      <span>{language === 'SW' ? 'Asante kwa kufanya biashara nasi!' : 'Thank you for your valued support!'}</span>
                      <div className="flex justify-center pt-2">
                        <QRCodeSVG 
                          value={`${window.location.origin}/verify?type=invoice&id=${inv.id}&ref=${inv.refNumber}&amount=${inv.grandTotal}&date=${inv.invoiceDate}`}
                          size={70}
                          level="M"
                        />
                      </div>
                      <span className="block text-[8px] text-gray-500 font-mono mt-1">Ulinzi wa Kielektroniki | Node Signed</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        {profile?.logoUrl ? (
                          <img src={profile.logoUrl} className="h-10 w-auto object-contain mb-2 max-h-[60px]" alt="Enterprise Logo" referrerPolicy="no-referrer" />
                        ) : (
                          <span className={`text-xl font-sans font-black block mb-1 ${
                            selectedTemplate === 'Luxury' ? 'text-amber-600' : 'text-indigo-700'
                          }`}>DUKA OS ENTERPRISE</span>
                        )}
                        <h2 className="text-lg font-black tracking-tight uppercase">{profile?.name || 'SMART ERP INC'}</h2>
                        <p className="text-[10px] text-gray-500 leading-normal max-w-sm mt-1">
                          {profile?.address || '12 Floor, Golden Jubilee Tower'}<br />
                          {profile?.region || 'Dar es Salaam'}, {profile?.country || 'Tanzania'}<br />
                          TIN: {profile?.tinNumber || '112-402-921'} | VRN: {profile?.vatNumber || '40032912-F'}<br />
                          Email: {profile?.email || 'sales@dukaos.co.tz'} | Tel: {profile?.phone || '+255 712 000 000'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`text-2xl tracking-tighter uppercase font-black block ${
                          selectedTemplate === 'Luxury' ? 'text-amber-600 font-serif' : 
                          selectedTemplate === 'Classic' ? 'text-black font-serif' : 'text-indigo-800'
                        }`}>
                          INVOICE / ANKARA
                        </span>
                        <div className="text-[11px] text-gray-500 mt-2 space-y-0.5">
                          <div>Invoice No: <strong className="text-black font-mono">{inv.invoiceNumber}</strong></div>
                          <div>Date Executed: <strong className="text-black font-mono">{inv.invoiceDate}</strong></div>
                          <div>Due Date: <strong className="text-black font-mono">{inv.dueDate}</strong></div>
                          <div>Ref-ID: <strong className="text-black font-mono text-[10px]">{inv.refNumber}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-150 pt-4 grid grid-cols-2 gap-8">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 block mb-1">CUSTOMER ACC BILL TO:</span>
                        <h3 className="font-extrabold text-[12px]">{inv.customerDetails.fullName}</h3>
                        <p className="text-[10.5px] text-gray-505 mt-1 leading-relaxed">
                          {inv.customerDetails.companyName && <span className="block font-bold text-black">{inv.customerDetails.companyName}</span>}
                          {inv.customerDetails.address}, {inv.customerDetails.region}<br />
                          Phone: {inv.customerDetails.phone} | Email: {inv.customerDetails.email}<br />
                          {inv.customerDetails.tinNumber && <span>TIN: {inv.customerDetails.tinNumber}</span>}
                        </p>
                      </div>

                      <div className={`text-right p-4 rounded-xl border flex flex-col justify-between items-end min-h-[100px] ${
                        selectedTemplate === 'Luxury' ? 'bg-amber-500/5 border-amber-200' :
                        selectedTemplate === 'Classic' ? 'bg-gray-55 border-black' : 'bg-slate-50 border-gray-100'
                      }`}>
                        <div>
                          <span className="text-[9px] uppercase tracking-widest font-black text-gray-405 block mb-0.5">GRAND TOTAL TZS:</span>
                          <strong className={`text-2xl font-mono tracking-tight block ${
                            selectedTemplate === 'Luxury' ? 'text-amber-805' : 'text-indigo-700'
                          }`}>{inv.grandTotal.toLocaleString()} TZS</strong>
                        </div>
                        <span className={`text-[9.5px] uppercase font-bold px-2 py-0.5 rounded border ${
                          inv.status === 'Paid' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          Payment Status: {inv.status}
                        </span>
                      </div>
                    </div>

                    <table className="w-full text-left text-[11px] border-collapse mt-4">
                      <thead>
                        <tr className={`uppercase text-[9px] font-black border-b ${
                          selectedTemplate === 'Luxury' ? 'bg-amber-550/10 text-amber-900 border-amber-305' :
                          selectedTemplate === 'Classic' ? 'bg-gray-100 text-black border-black' : 'bg-gray-100 text-gray-755 border-gray-250'
                        }`}>
                          <th className="py-2 pl-2">Product Catalogue</th>
                          <th className="py-2">SKU</th>
                          <th className="py-2 text-right">Unit Price</th>
                          <th className="py-2 text-center">Qty</th>
                          <th className="py-2 text-right pr-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {inv.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 pl-2 font-bold text-gray-900">{item.productName}</td>
                            <td className="py-2.5 font-mono text-gray-400">{item.sku}</td>
                            <td className="py-2.5 text-right font-mono text-gray-650">TZS {(item.unitPrice || 0).toLocaleString()}</td>
                            <td className="py-2.5 text-center font-mono font-bold">{item.quantity}</td>
                            <td className="py-2.5 text-right font-mono font-bold pr-2">TZS {((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="border-t pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      <div className="text-left font-mono text-[9px] text-gray-450 leading-relaxed max-w-xs">
                        <span>Invoice checked and authorized digitally via smart-hash signature in active Duka OS Node.</span>
                        <div className="font-bold text-slate-800 mt-1">Operator: {inv.salesperson}</div>
                      </div>

                      <div className="text-right space-y-1.5 text-[11px] font-medium pr-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Subtotal Exclusive Taxes:</span>
                          <span className="font-mono text-black font-bold">TZS {(inv.grandTotal / 1.18).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">VAT (18% Standard):</span>
                          <span className="font-mono text-black font-bold">TZS {(inv.grandTotal - (inv.grandTotal / 1.18)).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                        </div>
                        <div className={`flex justify-between font-bold text-lg border-t pt-1.5 ${
                          selectedTemplate === 'Luxury' ? 'text-amber-700 border-amber-305' : 'text-indigo-700 border-slate-200'
                        }`}>
                          <span>Verified Total:</span>
                          <span className="font-mono">TZS {inv.grandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg flex items-center justify-between border border-dashed text-left ${
                      selectedTemplate === 'Luxury' ? 'bg-amber-50 border-amber-201' :
                      selectedTemplate === 'Classic' ? 'bg-gray-55 border-black' : 'bg-slate-50 border-gray-200'
                    }`}>
                      <div className="font-mono text-[9px] text-gray-550 max-w-md">
                        <strong className="text-gray-800 block text-[9.5px] uppercase">LOCK AUTH SECURITY BARCODE:</strong>
                        <span>Verification signature is compiled. Any Alteration of the PDF document without matching database records renders validation invalid.</span>
                        <div className="font-bold text-gray-700 mt-1">Official Stamp: "{profile?.companyStamp || 'APPROVED HQ DU-OS'}"</div>
                      </div>
                      <div className="shrink-0 pl-3">
                        <QRCodeSVG 
                          value={`${window.location.origin}/verify?type=invoice&id=${inv.id}&ref=${inv.refNumber}&amount=${inv.grandTotal}&date=${inv.invoiceDate}`}
                          size={50}
                          level="M"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          const q = quotations.find(item => item.id === id);
          if (q) {
            return (
              <div 
                key={q.id} 
                id={`batch-item-${q.id}`}
                className="bg-white text-black p-8 mx-auto print-avoid-break mb-12"
                style={{ 
                  color: '#000000', 
                  backgroundColor: '#ffffff',
                  pageBreakAfter: index === selectedDocIds.length - 1 ? 'auto' : 'always',
                  breakAfter: index === selectedDocIds.length - 1 ? 'auto' : 'page',
                  maxHeight: 'none',
                  overflow: 'visible'
                }}
              >
                {selectedTemplate === 'Thermal' ? (
                  <div className="space-y-4 text-[10.5px] font-mono p-1" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                    <div className="text-center">
                      <span className="text-sm block font-black uppercase text-black">{profile?.name || 'SMART ERP INC'}</span>
                      <span className="block text-[9.5px] text-gray-700 mt-0.5">{profile?.address || 'Dar es Salaam'}</span>
                      <span className="block text-[9.5px] text-gray-750">TIN: {profile?.tinNumber || '111-222-333'}</span>
                      {profile?.phone && <span className="block text-[9.5px] text-gray-750 font-bold">Tel: {profile.phone}</span>}
                    </div>
                    
                    <div className="border-b border-dashed border-black my-2" />
                    
                    <div className="space-y-1 text-black font-bold">
                      <div className="text-center font-black uppercase tracking-wider text-[11.5px] mb-1">PROFORMA QUOTE SLIP</div>
                      <div className="flex justify-between">
                        <span>Namba ya Quote:</span>
                        <span>{q.quotationNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tarehe:</span>
                        <span>{q.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Aina ya Bei:</span>
                        <span>{q.pricingType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mteja:</span>
                        <span className="max-w-[160px] truncate">{q.clientName}</span>
                      </div>
                    </div>

                    <div className="border-b border-dashed border-black my-2" />

                    <table className="w-full text-[10px] font-mono text-black leading-tight">
                      <thead>
                        <tr className="border-b border-dashed border-black font-black uppercase">
                          <th className="text-left pb-1">Item</th>
                          <th className="text-center pb-1">Qty</th>
                          <th className="text-right pb-1">Kiasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.items?.map((item, idx) => (
                          <tr key={idx} className="border-b border-dashed border-gray-150">
                            <td className="py-1 font-black max-w-[140px] truncate">{item.productName}</td>
                            <td className="text-center py-1">{item.qty}</td>
                            <td className="text-right py-1">{(item.price * item.qty).toLocaleString()} TZS</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="border-b border-dashed border-black my-2" />

                    <div className="space-y-1.5 text-right font-black text-[11px] text-black">
                      <div className="flex justify-between font-extrabold text-sm pt-1.5">
                        <span>JUMLA (TOTAL):</span>
                        <span>TZS {q.grandTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="border-b border-dashed border-black my-2" />

                    <div className="text-center space-y-1 text-[9.5px]">
                      <span>{language === 'SW' ? 'Makadirio haya ya bei ni halali kwa siku 30' : 'This quotation budget is valid for 30 days.'}</span>
                      <div className="flex justify-center pt-2">
                        <QRCodeSVG 
                          value={`${window.location.origin}/verify?type=quotation&client=${encodeURIComponent(q.clientName)}&date=${q.date}&total=${q.grandTotal}`}
                          size={70}
                          level="M"
                        />
                      </div>
                      <span className="block text-[8px] text-gray-500 font-mono mt-1">Uhakiki wa Kielektroniki | Node Signed</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        {profile?.logoUrl ? (
                          <img src={profile.logoUrl} className="h-10 w-auto mb-2 max-h-[60px]" alt="Logo" referrerPolicy="no-referrer" />
                        ) : (
                          <span className={`text-xl font-sans font-black block mb-1 ${
                            selectedTemplate === 'Luxury' ? 'text-amber-600' : 'text-indigo-705'
                          }`}>DUKA OS ENTERPRISE</span>
                        )}
                        <h2 className="text-lg font-black uppercase">{profile?.name || 'SMART ERP INC'}</h2>
                        <p className="text-[10px] text-gray-505 leading-tight">Tel: {profile?.phone} | Email: {profile?.email}</p>
                      </div>

                      <div className="text-right">
                        <span className={`text-2xl uppercase tracking-tighter font-extrabold block ${
                          selectedTemplate === 'Luxury' ? 'text-amber-600 font-serif' : 
                          selectedTemplate === 'Classic' ? 'text-black font-serif' : 'text-indigo-800'
                        }`}>
                          PROFORMA QUOTE
                        </span>
                        <div className="text-[11px] text-gray-505 mt-2 space-y-0.5">
                          <div>Quote Number: <strong className="text-black font-mono">{q.quotationNumber}</strong></div>
                          <div>Date Shared: <strong className="text-black font-mono">{q.date}</strong></div>
                          <div>Pricing Level: <strong className="text-black font-bold uppercase">{q.pricingType}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-150 pt-4">
                      <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 block mb-1">PREPARED FOR CLIENT:</span>
                      <h3 className="font-extrabold text-[12px]">{q.clientName}</h3>
                    </div>

                    <table className="w-full text-left text-[11px] border-collapse mt-4">
                      <thead>
                        <tr className={`uppercase text-[9px] font-black border-b ${
                          selectedTemplate === 'Luxury' ? 'bg-amber-500/10 text-amber-900 border-amber-305' :
                          selectedTemplate === 'Classic' ? 'bg-gray-100 text-black border-black' : 'bg-gray-100 text-gray-755 border-gray-250'
                        }`}>
                          <th className="py-2 pl-2">Product Name</th>
                          <th className="py-2">SKU</th>
                          <th className="py-2 text-right">Unit Rate (TZS)</th>
                          <th className="py-2 text-center">Estimated Qty</th>
                          <th className="py-2 text-right pr-2">Subtotal Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {q.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 pl-2 font-bold text-gray-900">{item.productName}</td>
                            <td className="py-2.5 font-mono text-gray-400">{item.sku}</td>
                            <td className="py-2.5 text-right font-mono text-sky-600">TZS {item.price.toLocaleString()}</td>
                            <td className="py-2.5 text-center font-mono font-bold">{item.qty}</td>
                            <td className="py-2.5 text-right font-mono font-bold pr-2">TZS {(item.price * item.qty).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className={`p-4 rounded-xl border text-right ${
                      selectedTemplate === 'Luxury' ? 'bg-amber-500/5 border-amber-200' :
                      selectedTemplate === 'Classic' ? 'bg-gray-55 border-black' : 'bg-slate-50 border-gray-100'
                    }`}>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">ESTIMATED TOTAL CONSOLIDATED BUDGET:</span>
                      <strong className={`text-2xl font-mono tracking-tight block mt-1 ${
                        selectedTemplate === 'Luxury' ? 'text-amber-801' : 'text-indigo-700'
                      }`}>TZS {q.grandTotal.toLocaleString()}</strong>
                    </div>

                    <div className={`p-3 rounded-lg flex items-center justify-between border border-dashed text-left ${
                      selectedTemplate === 'Luxury' ? 'bg-amber-50 border-amber-202' :
                      selectedTemplate === 'Classic' ? 'bg-gray-55 border-black' : 'bg-slate-50 border-gray-200'
                    }`}>
                      <div className="font-mono text-[9px] text-gray-500 max-w-md">
                        <strong className="text-gray-800 block uppercase">QUOTATION EXCELLENCE SEAL:</strong>
                        <span>This proforma quote does not hold inventory stock. Real transaction invoices must be generated in the checkout console to log legal audit logs.</span>
                        {profile?.companyStamp && <div className="font-bold text-gray-700 mt-1">Official Seal: "{profile.companyStamp}"</div>}
                      </div>
                      <div className="shrink-0 pl-3">
                        <QRCodeSVG 
                          value={`${window.location.origin}/verify?type=quotation&client=${encodeURIComponent(q.clientName)}&date=${q.date}&total=${q.grandTotal}`}
                          size={50}
                          level="M"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

    </div>
  );
}
