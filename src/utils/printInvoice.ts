import html2pdf from 'html2pdf.js';

/**
 * Triggers a clean print dialog for an invoice element
 */
export const printInvoiceElement = (elementId: string, title: string = 'Tax Invoice') => {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const stylesHtml = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((style) => style.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        ${stylesHtml}
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
            padding: 16px !important;
          }
          .print\\:hidden { display: none !important; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body>
        <div style="width: 100%; max-width: 850px; margin: 0 auto;">
          ${element.innerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }, 3000);
};

/**
 * Downloads the invoice element directly as a PDF file
 */
export const downloadInvoicePDF = async (elementId: string, fileName: string = 'Invoice.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('Invoice document container not found.');
    return;
  }

  const opt = {
    margin: 8,
    filename: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    await (html2pdf as any)().set(opt).from(element).save();
  } catch (err) {
    console.error('PDF export fallback:', err);
    printInvoiceElement(elementId, fileName);
  }
};
