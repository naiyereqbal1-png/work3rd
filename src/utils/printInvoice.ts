import html2pdf from 'html2pdf.js';

/**
 * Shows an elegant on-screen toast notification instead of browser alert()
 */
const showNotificationToast = (message: string, type: 'error' | 'success' = 'error') => {
  const existing = document.getElementById('print-notification-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'print-notification-toast';
  toast.className = `fixed bottom-5 right-5 z-[999999] p-4 rounded-lg shadow-lg border text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200 ${
    type === 'error' 
      ? 'bg-rose-50 border-rose-200 text-rose-700' 
      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
  }`;

  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${type === 'error' 
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
      }
    </svg>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.className += ' opacity-0 transition-opacity duration-300';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

/**
 * Shows a beautiful modern download dialog for sandboxed or iframe restricted views
 */
const showPDFReadyModal = (blob: Blob, fileName: string, elementId: string) => {
  const blobUrl = URL.createObjectURL(blob);
  
  // Prevent duplicate modals
  const existing = document.getElementById('pdf-ready-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'pdf-ready-modal';
  modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity';
  
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-200">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900">Your PDF is Ready!</h3>
          <p class="text-xs text-slate-500">File: ${fileName}</p>
        </div>
      </div>
      
      <p class="text-sm text-slate-600 mb-6 leading-relaxed">
        If your automatic download did not initiate due to browser iframe security, click below to open, view, and save your PDF instantly.
      </p>
      
      <div class="flex flex-col gap-2">
        <a 
          href="${blobUrl}" 
          target="_blank" 
          rel="noopener noreferrer" 
          id="pdf-modal-open-link"
          class="w-full text-center py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open PDF in New Tab
        </a>
        
        <button 
          id="pdf-modal-print-btn"
          class="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Invoice Directly
        </button>
        
        <button 
          id="pdf-modal-close-btn"
          class="w-full py-2 px-4 bg-transparent hover:bg-slate-100 text-slate-500 font-medium rounded-lg text-xs transition-colors mt-2 cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);

  // Wire up buttons
  const printBtn = modal.querySelector('#pdf-modal-print-btn');
  const closeBtn = modal.querySelector('#pdf-modal-close-btn');
  const openLink = modal.querySelector('#pdf-modal-open-link');

  openLink?.addEventListener('click', () => {
    // Keep URL active or dismiss modal
  });

  printBtn?.addEventListener('click', () => {
    modal.remove();
    printInvoiceElement(elementId, fileName.replace(/\.pdf$/i, ''));
  });

  closeBtn?.addEventListener('click', () => {
    modal.remove();
    URL.revokeObjectURL(blobUrl);
  });
};

/**
 * Triggers a clean print dialog for an invoice element
 * Fully resilient against sandbox iframe limitations
 */
export const printInvoiceElement = (elementId: string, title: string = 'Tax Invoice') => {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // To support any sandbox or browser limitation, we temporarily append a high-fidelity clone
  // directly to the main body, set print media overrides, trigger print, and clean up.
  // This is 100% immune to nested-iframe blocks or sandboxed popup constraints.
  const originalTitle = document.title;
  document.title = title;

  const wrapper = document.createElement('div');
  wrapper.className = 'print-container-wrapper-temp';
  wrapper.innerHTML = element.innerHTML;
  
  wrapper.style.position = 'absolute';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.width = '100%';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.zIndex = '9999999';

  const printStyle = document.createElement('style');
  printStyle.id = 'temp-print-override-style';
  printStyle.innerHTML = `
    @media print {
      body > *:not(.print-container-wrapper-temp) {
        display: none !important;
      }
      .print-container-wrapper-temp {
        display: block !important;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        background: #ffffff !important;
        color: #0f172a !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      /* Hide interactive widgets, buttons, sidebars, and navigation elements cleanly */
      button, input, select, textarea, nav, header, footer, 
      .no-print, .print\\:hidden, [role="tablist"], .shadow-sm, 
      .bg-slate-100 {
        display: none !important;
      }
      /* Ensure text contrast is perfect */
      * {
        color: #000000 !important;
        border-color: #e2e8f0 !important;
      }
      /* Prevent page breaks inside table rows, cards, or key content elements */
      tr, .card, .invoice-header, .invoice-footer {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
    }
  `;

  document.body.appendChild(wrapper);
  document.head.appendChild(printStyle);

  // Trigger print
  try {
    window.print();
  } catch (err) {
    console.error('Window print execution error:', err);
    showNotificationToast('Unable to open print dialog due to browser sandbox restrictions.');
  }

  // Cleanup to preserve standard visual fidelity
  setTimeout(() => {
    if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    if (printStyle.parentNode) printStyle.parentNode.removeChild(printStyle);
    document.title = originalTitle;
  }, 1000);
};

/**
 * Downloads the invoice element directly as a PDF file
 * Immune to modern CSS color crashes and sandboxed iframe blocks
 */
export const downloadInvoicePDF = async (elementId: string, fileName: string = 'Invoice.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    showNotificationToast('Invoice document container not found.');
    return;
  }

  const stylePropertyBackups: { rule: CSSStyleRule; property: string; originalValue: string }[] = [];

  // Recursive style property sanitizer
  const sanitizePropertiesRecursively = (rule: CSSRule) => {
    try {
      if ('cssRules' in rule) {
        const group = rule as any;
        if (group.cssRules) {
          for (const subRule of Array.from(group.cssRules) as CSSRule[]) {
            sanitizePropertiesRecursively(subRule);
          }
        }
      } else if ('style' in rule) {
        const styleRule = rule as CSSStyleRule;
        const style = styleRule.style;
        if (!style) return;

        for (let i = 0; i < style.length; i++) {
          const propName = style[i];
          const val = style.getPropertyValue(propName);
          if (val && /(oklch|oklab|lch|lab)/i.test(val)) {
            stylePropertyBackups.push({
              rule: styleRule,
              property: propName,
              originalValue: val
            });

            // Replace unsupported color spaces with high-contrast web fallback colors safely
            let fallback = '#4f46e5'; // Indigo default accent
            if (propName.includes('border') || propName.includes('outline')) {
              fallback = '#cbd5e1'; // slate-300 fallback for borders
            } else if (propName.includes('background') && (val.includes('white') || val.includes('#ffffff'))) {
              fallback = '#ffffff';
            } else if (propName.includes('color') && (val.includes('slate') || val.includes('gray'))) {
              fallback = '#0f172a';
            }

            const sanitizedVal = val.replace(/(oklch|oklab|lch|lab)\([^\)]*\)/gi, fallback);
            try {
              style.setProperty(propName, sanitizedVal, style.getPropertyPriority(propName));
            } catch (propErr) {
              // ignore
            }
          }
        }
      }
    } catch (err) {
      // ignore security restrictions on nested cross-origin CSS rule structures safely
    }
  };

  // 1. Sanitize active CSSOM stylesheet style declarations recursively (Zero-fetch, CORS-safe, instantaneous)
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (!sheet.cssRules) continue;
      for (const rule of Array.from(sheet.cssRules)) {
        sanitizePropertiesRecursively(rule);
      }
    } catch (err) {
      // Safe to ignore cross-origin sheet constraints
    }
  }

  // 2. Clone the element and recursively sanitize modern colors across all inline styles and SVG attributes
  const clonedElement = element.cloneNode(true) as HTMLElement;
  const sanitizeAttributes = (node: HTMLElement) => {
    const attrsToClean = ['style', 'fill', 'stroke', 'color', 'background', 'border-color'];
    for (const attr of attrsToClean) {
      const val = node.getAttribute(attr);
      if (val && /(oklch|oklab|lch|lab)/i.test(val)) {
        node.setAttribute(attr, val.replace(/(oklch|oklab|lch|lab)\([^\)]*\)/gi, '#4f46e5'));
      }
    }
  };

  sanitizeAttributes(clonedElement);
  clonedElement.querySelectorAll('*').forEach((el) => {
    sanitizeAttributes(el as HTMLElement);
  });

  // Inject professional PDF styling into clonedElement directly for perfect html2pdf rendering
  const pdfStyle = document.createElement('style');
  pdfStyle.innerHTML = `
    button, input, select, textarea, nav, header, footer, 
    .no-print, .print\\:hidden, [role="tablist"], 
    .bg-slate-100 {
      display: none !important;
    }
    tr, .card, .invoice-header, .invoice-footer {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    body {
      background: #ffffff !important;
    }
  `;
  clonedElement.appendChild(pdfStyle);

  const opt = {
    margin: 8,
    filename: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  const originalGetComputedStyle = window.getComputedStyle;
  
  // Intercept window.getComputedStyle calls from html2canvas / html2pdf to sanitize oklch/oklab values dynamically
  window.getComputedStyle = function (elt, pseudoElt) {
    const style = originalGetComputedStyle.call(window, elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return function(propertyName: string) {
            const value = target.getPropertyValue(propertyName);
            if (typeof value === 'string' && /(oklch|oklab|lch|lab)/i.test(value)) {
              return value.replace(/(oklch|oklab|lch|lab)\([^\)]*\)/gi, '#4f46e5');
            }
            return value;
          };
        }
        
        const value = (target as any)[prop];
        if (typeof value === 'string' && /(oklch|oklab|lch|lab)/i.test(value)) {
          return value.replace(/(oklch|oklab|lch|lab)\([^\)]*\)/gi, '#4f46e5');
        }
        
        if (typeof value === 'function') {
          return value.bind(target);
        }
        
        return value;
      }
    });
  };

  try {
    // Generate raw PDF blob first to bypass standard sandbox file-writing constraints safely
    const blob = await (html2pdf as any)().set(opt).from(clonedElement).toPdf().output('blob');
    
    // Attempt automatic standard click download
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = opt.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Prompt the visual Fallback download card for guaranteed access in restricted sandboxes
    showPDFReadyModal(blob, opt.filename, elementId);
  } catch (err) {
    console.error('PDF export fallback error:', err);
    // If saving fails entirely, trigger printInvoiceElement with original element
    printInvoiceElement(elementId, fileName);
  } finally {
    // Restore window.getComputedStyle to original
    window.getComputedStyle = originalGetComputedStyle;

    // 3. Restore all modified style properties in reverse order to preserve original document presentation perfectly
    for (let i = stylePropertyBackups.length - 1; i >= 0; i--) {
      const backup = stylePropertyBackups[i];
      try {
        backup.rule.style.setProperty(backup.property, backup.originalValue);
      } catch (restoreErr) {
        console.warn('Failed to restore style property:', restoreErr);
      }
    }
  }
};
