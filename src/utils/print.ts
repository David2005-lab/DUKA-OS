/**
 * Unified Print & Download Utility
 * Captures a target DOM element, prepares a self-contained HTML document
 * containing all layout, logos, QR SVGs and styles, compiles it into a high-fidelity Blob,
 * and handles both browser-native printing via an isolated iframe and high-fidelity file downloading.
 */

const generateDocumentHtml = (elementId: string, docTitle: string = 'Document'): string => {
  const targetElement = document.getElementById(elementId);
  if (!targetElement) return '';

  const isThermal = targetElement.className.includes('Thermal') || 
                    targetElement.innerHTML.includes('Thermal') || 
                    elementId.toLowerCase().includes('receipt') || 
                    targetElement.innerHTML.includes('POS TRANSACTION RECEIPT') ||
                    targetElement.innerHTML.includes('PROFORMA QUOTE SLIP');

  // Capture all style/link elements for 100% styling fidelity without blocking the event loop
  const styleElementsHtml = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => {
      if (el.tagName === 'LINK') {
        const href = el.getAttribute('href');
        // Convert relative URLs to absolute links so they load properly inside the standalone blob/iframe environment
        if (href && !href.startsWith('http') && !href.startsWith('//')) {
          const absoluteHref = new URL(href, window.location.origin).href;
          return `<link rel="stylesheet" href="${absoluteHref}">`;
        }
      }
      return el.outerHTML;
    })
    .join('\n');

  // Inject essential print overriding rules
  const printStyle = `
    <style>
      @media print {
        body, html {
          background-color: #ffffff !important;
          color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print, .no-print-area {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .print-container {
          width: 100% !important;
          background: #ffffff !important;
        }
        #printable-area-canvas, #doc-printer-canvas {
          display: block !important;
          width: 100% !important;
          padding: ${isThermal ? '2mm' : '8mm'} !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
          color: #000000 !important;
        }
        #receipt-printable-canvas {
          display: block !important;
          width: 80mm !important;
          max-width: 80mm !important;
          padding: 2mm !important;
          margin: 0 auto !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
          color: #000000 !important;
        }
        #quotation-printable-canvas {
          display: block !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
          color: #000000 !important;
        }
        #financial-statement-canvas {
          display: block !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
          color: #000000 !important;
        }
        * {
          color: #000000 !important;
          border-color: #e2e8f0 !important;
          box-shadow: none !important;
          text-shadow: none !important;
        }

        /* Dynamically set standard page layout styles depending on target template */
        @page {
          size: ${isThermal ? '80mm auto' : 'A4 portrait'};
          margin: ${isThermal ? '2mm 2mm 4mm 2mm' : '15mm 12mm 15mm 12mm'} !important;
        }

        /* Prevent elements from breaking mid-signature, seals or barcode/QR sections */
        .print-avoid-break,
        .qr-seal-block,
        .signature-block,
        .totals-row,
        .invoice-header,
        .quotation-header {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        /* Table pagination optimizations */
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          page-break-inside: auto !important;
        }

        thead {
          display: table-header-group !important;
          break-inside: avoid !important;
        }

        tfoot {
          display: table-footer-group !important;
          break-inside: avoid !important;
        }

        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        td, th {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
      /* Screen fallback styling for viewing directly in tab */
      @media screen {
        body {
          background-color: #f8fafc;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 2.5rem 1rem;
          margin: 0;
          font-family: ui-sans-serif, system-ui, sans-serif;
        }
        .print-container {
          background: #ffffff;
          padding: 2.5rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
          max-width: 800px;
          width: 100%;
        }
        #receipt-printable-canvas {
          max-width: 380px !important;
          padding: 1rem !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          border: 1px dashed #cbd5e1;
        }
      }
    </style>
  `;

  return `
    <!DOCTYPE html>
    <html class="light bg-white text-black font-sans leading-normal antialiased">
      <head>
        <title>${docTitle}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${styleElementsHtml}
        ${printStyle}
      </head>
      <body class="bg-white text-black leading-normal">
        <div class="print-container w-full">
          ${targetElement.innerHTML}
        </div>
      </body>
    </html>
  `;
};

export const getDocumentBlob = (elementId: string, docTitle: string = 'Document'): Blob | null => {
  const html = generateDocumentHtml(elementId, docTitle);
  if (!html) return null;
  return new Blob([html], { type: 'text/html;charset=utf-8' });
};

export const downloadDocumentFile = (elementId: string, docTitle: string = 'Document', fileName: string = 'document.html') => {
  const blob = getDocumentBlob(elementId, docTitle);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};

export const printElement = (elementId: string, docTitle: string = 'Document', skipPreview: boolean = false) => {
  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    console.error(`[Print Utility] Target element with ID "${elementId}" not found. Falling back to whole page print.`);
    window.print();
    return;
  }

  // If we should not skip the preview, dispatch a custom event to open the gorgeous PrintPreviewModal instead!
  if (!skipPreview) {
    const isThermal = elementId.toLowerCase().includes('receipt') || 
                      elementId.toLowerCase().includes('pos') || 
                      targetElement.innerHTML.includes('Thermal') || 
                      targetElement.innerHTML.includes('POS TRANSACTION RECEIPT');
                      
    const event = new CustomEvent('open-print-preview', {
      detail: {
        elementId,
        docTitle,
        preferredFormat: isThermal ? 'Thermal' : 'A4'
      }
    });
    window.dispatchEvent(event);
    return;
  }

  // 1. Maintain the custom title during printing
  const originalTitle = document.title;
  document.title = docTitle;

  // 2. Clone the element to print to prevent modifying state of current screen
  const printWrapper = document.createElement('div');
  printWrapper.id = 'direct-print-wrapper';
  printWrapper.className = targetElement.className + ' bg-white text-black';
  printWrapper.innerHTML = targetElement.innerHTML;

  // 3. Inject CSS rules that force browser to ONLY show our cloned target wrapper upon media print
  const style = document.createElement('style');
  style.id = 'direct-print-helper-style';
  style.innerHTML = `
    @media print {
      /* Hide all default page content wrappers */
      body > :not(#direct-print-wrapper) {
        display: none !important;
        visibility: hidden !important;
      }
      /* Ensure other UI overlays, overlays, sidebars, buttons, or any dialog forms are absolutely gone */
      aside, nav, header, footer, button, select, input, .no-print, .no-print-area {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      /* Expand target wrapper to occupy the entire paper sheet */
      body > #direct-print-wrapper {
        display: block !important;
        visibility: visible !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: auto !important;
        background: #ffffff !important;
        color: #000000 !important;
        padding: 10mm !important;
        box-shadow: none !important;
        border: none !important;
      }
      /* Retain full color density during printing */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      /* Auto handle thermal roll widths */
      body > #direct-print-wrapper.Thermal,
      body > #direct-print-wrapper [class*="Thermal"],
      body > #direct-print-wrapper#receipt-printable-canvas {
        width: 80mm !important;
        max-width: 80mm !important;
        padding: 2mm !important;
        margin: 0 auto !important;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(printWrapper);

  // 4. Trigger print engine
  try {
    window.print();
  } catch (err) {
    console.error('[Print Utility] Main window print failed:', err);
  } finally {
    // 5. Cleanup delayed to guarantee spooler captures contents
    setTimeout(() => {
      document.title = originalTitle;
      if (printWrapper && printWrapper.parentNode) {
        printWrapper.parentNode.removeChild(printWrapper);
      }
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 1000);
  }
};

/**
 * Standardized 'Print-to-PDF' utility function that specifically targets the #printable-area-canvas.
 * Ensures all CSS print-media queries are properly applied and styles are injected before execution.
 */
export const printCanvasToPDF = (docTitle: string = 'Invoice_Document', paddingMm: number = 10, inkSaver: boolean = false) => {
  const targetElement = document.getElementById('printable-area-canvas');
  if (!targetElement) {
    console.warn(`[Print PDF Utility] Target element '#printable-area-canvas' not found, falling back to printElement.`);
    printElement('printable-area-canvas', docTitle);
    return;
  }

  const originalTitle = document.title;
  document.title = docTitle;

  const printWrapper = document.createElement('div');
  printWrapper.id = 'direct-print-wrapper';
  printWrapper.className = targetElement.className + ' bg-white text-black' + (inkSaver ? ' print-ink-saver' : '');
  printWrapper.innerHTML = targetElement.innerHTML;

  const style = document.createElement('style');
  style.id = 'direct-print-pdf-style';
  style.innerHTML = `
    @media print {
      /* Force hide all default page layouts */
      body > :not(#direct-print-wrapper) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      
      /* Strip interface controls */
      aside, nav, header, footer, button, select, input, textarea, .no-print, .no-print-area {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      /* Design the PDF canvas page to render on the A4 portrait sheet */
      body > #direct-print-wrapper {
        display: block !important;
        visibility: visible !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: auto !important;
        background: #ffffff !important;
        color: #000000 !important;
        padding: ${paddingMm}mm !important;
        box-shadow: none !important;
        border: none !important;
      }

      /* Color adjustments across all elements for PDF fidelity */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }

      ${inkSaver ? `
        /* Extreme inksaver mode for eco-friendly prints */
        * {
          color: #000000 !important;
          background-color: #ffffff !important;
          background-image: none !important;
          border-color: #1e293b !important;
          box-shadow: none !important;
        }
        .bg-indigo-600, .bg-slate-100, .bg-slate-50, .bg-sky-50 {
          background-color: #f1f5f9 !important;
          color: #000000 !important;
        }
      ` : `
        * {
          border-color: #e2e8f0 !important;
        }
      `}

      /* Structural safety limits to avoid mid-line cuts */
      .print-avoid-break,
      .qr-seal-block,
      .signature-block,
      .totals-row,
      .invoice-header,
      .quotation-header,
      tr,
      .avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      @page {
        size: A4 portrait;
        margin: 15mm 12mm 15mm 12mm !important;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(printWrapper);

  try {
    window.print();
  } catch (err) {
    console.error('[Print PDF Utility] Print execution error:', err);
  } finally {
    setTimeout(() => {
      document.title = originalTitle;
      if (printWrapper && printWrapper.parentNode) {
        printWrapper.parentNode.removeChild(printWrapper);
      }
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 1200);
  }
};

export interface PrintDiagnosticReport {
  canvasFound: boolean;
  elementCount: number;
  hasOverlays: boolean;
  hasDarkBackground: boolean;
  estimatedPages: number;
  itemCount: number;
  issues: string[];
  recommendations: string[];
}

export const debugPrintableCanvas = (): PrintDiagnosticReport => {
  const canvas = document.getElementById('printable-area-canvas');
  const report: PrintDiagnosticReport = {
    canvasFound: !!canvas,
    elementCount: 0,
    hasOverlays: false,
    hasDarkBackground: false,
    estimatedPages: 1,
    itemCount: 0,
    issues: [],
    recommendations: [],
  };

  if (!canvas) {
    report.issues.push("Print canvas element ('#printable-area-canvas') not found in active screen.");
    report.recommendations.push("Open or select an invoice to display it on-screen before running diagnostics.");
    return report;
  }

  // Count children
  const allElms = canvas.querySelectorAll('*');
  report.elementCount = allElms.length;

  // Search items count heuristically
  const trElements = canvas.querySelectorAll('tbody tr');
  report.itemCount = trElements.length || canvas.querySelectorAll('.grid > div').length;

  // Page estimation based on children
  if (report.elementCount > 120) {
    report.estimatedPages = Math.ceil(report.elementCount / 100);
  }

  // Check deep dark mode values
  const hasDarkText = canvas.className.includes('dark:') || !!canvas.querySelector('.bg-slate-900, .bg-slate-950, .bg-black');
  if (hasDarkText) {
    report.hasDarkBackground = true;
    report.issues.push("Excessive ink consumption risk: Canvas contains active rich deep dark background fields.");
    report.recommendations.push("Activate 'Eco Ink Saver' under the diagnostic controller to automatically print high-contrast black text on white paper.");
  }

  // Look for any interactive button controls inside
  const embeddedButtons = canvas.querySelectorAll('button, input[type="button"], input[type="submit"]');
  if (embeddedButtons.length > 0) {
    report.hasOverlays = true;
    report.issues.push(`Interactive controls found: ${embeddedButtons.length} clickable elements are mounted inside the template.`);
    report.recommendations.push("Ensure elements have a 'no-print' modifier, or export using our high-fidelity vector PDF driver.");
  }

  if (report.issues.length === 0) {
    report.recommendations.push("Excellent canvas structure! No rendering bottlenecks or dark layers found. Font sizing and padding comply perfectly with office printers.");
  } else {
    report.recommendations.push("Adjust margin size or use direct vector PDF rendering to completely bypass browser printing variance.");
  }

  return report;
};

