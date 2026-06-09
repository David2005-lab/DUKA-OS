/**
 * Unified Print Utility
 * Captures a target DOM element (like an invoice, receipt, or quotation),
 * isolates it in a clean iframe context, replicates styles, and triggers window.print().
 * This provides a perfect crisp print capture free of active app buttons or sidebars.
 */
export const printElement = (elementId: string, docTitle: string = 'Document') => {
  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    console.error(`[Print Utility] Target element with ID "${elementId}" not found. Falling back to whole page print.`);
    window.print();
    return;
  }

  // Create temporary hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.overflow = 'hidden';
  iframe.setAttribute('title', 'DukaOS Print Worker');
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    console.error('[Print Utility] Could not open printing iframe document. Falling back to whole page print.');
    window.print();
    return;
  }

  // Render isolated target inner layout in the frame
  iframeDoc.write(`
    <!DOCTYPE html>
    <html class="light bg-white text-black font-sans leading-normal antialiased">
      <head>
        <title>${docTitle}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body class="bg-white text-black p-4 md:p-6 select-none leading-normal">
        <div class="print-container w-full">
          ${targetElement.outerHTML}
        </div>
      </body>
    </html>
  `);

  // Clone all styles from main page into the print iframe Document head
  const allStylesheets = Array.from(document.styleSheets);
  try {
    allStylesheets.forEach((stylesheet) => {
      if (stylesheet.href) {
        const link = iframeDoc.createElement('link');
        link.rel = 'stylesheet';
        link.href = stylesheet.href;
        iframeDoc.head.appendChild(link);
      } else {
        const rules = Array.from(stylesheet.cssRules || []).map(rule => rule.cssText).join('\n');
        const style = iframeDoc.createElement('style');
        style.appendChild(iframeDoc.createTextNode(rules));
        iframeDoc.head.appendChild(style);
      }
    });
  } catch (e) {
    console.warn('[Print Utility] Styling access limited by CORS; fallback stylesheets will be cloned:', e);
    const styleTags = document.querySelectorAll('style, link[rel="stylesheet"]');
    styleTags.forEach((tag) => {
      iframeDoc.head.appendChild(tag.cloneNode(true));
    });
  }

  // Inject special CSS print overrides
  const printStyle = iframeDoc.createElement('style');
  printStyle.textContent = `
    @media print {
      body, html {
        background-color: #ffffff !important;
        color: #000000 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print, .no-print-area {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
      }
      /* Ensure that the cloned element layout fits fully */
      .print-container {
        width: 100% !important;
      }
      #printable-area-canvas {
        display: block !important;
        width: 100% !important;
        padding: 5mm !important;
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
    }
  `;
  iframeDoc.head.appendChild(printStyle);
  iframeDoc.close();

  // Safely trigger print dialogue after brief delay for rendering stylesheets
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  }, 450);
};
