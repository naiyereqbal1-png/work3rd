import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  FileCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../../services/db';

interface AdminBulkImportProps {
  onImportComplete: () => void;
}

export const AdminBulkImport: React.FC<AdminBulkImportProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    validRows: any[];
    errorRows: any[];
    totalRows: number;
  } | null>(null);
  const [importStatus, setImportStatus] = useState<'Published' | 'Draft'>('Published');
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<{
    addedCount: number;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        SKU: 'ST1-TSH-9001',
        'Product Name': "Men's Heavyweight Bio-Washed Cotton T-Shirt",
        Category: 'T-Shirts',
        Gender: 'Men',
        Brand: 'TRYatHOME Originals',
        MRP: 1299,
        'Selling Price': 599,
        Stock: 50,
        Sizes: 'S,M,L,XL,XXL',
        Colors: 'Sage Green,Charcoal',
        Description: '100% combed cotton jersey with reinforced neck rib and anti-pilling wash.',
        'Image 1 URL': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
        'Image 2 URL': 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80',
        'Image 3 URL': 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80',
        Fabric: '100% Combed Cotton',
        Fit: 'Relaxed Fit',
        'Wash Care': 'Machine Wash Cold',
        Origin: 'India',
        Status: 'Published',
      },
      {
        SKU: 'ST1-JNS-9002',
        'Product Name': "Women's High Rise Stretch Vintage Straight Denim",
        Category: 'Jeans',
        Gender: 'Women',
        Brand: 'DenimCo Studio',
        MRP: 2999,
        'Selling Price': 1299,
        Stock: 30,
        Sizes: '28,30,32,34',
        Colors: 'Vintage Light Blue',
        Description: 'Authentic 12oz denim with comfort stretch and clean vintage wash whiskers.',
        'Image 1 URL': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80',
        'Image 2 URL': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80',
        'Image 3 URL': 'https://images.unsplash.com/photo-1560243563-062bfc001d68?w=800&q=80',
        Fabric: '98% Cotton 2% Elastane',
        Fit: 'High Rise Straight',
        'Wash Care': 'Inside Out Wash',
        Origin: 'India',
        Status: 'Published',
      },
      {
        SKU: 'ST1-KRT-9003',
        'Product Name': 'Chanderi Silk Embroidered Straight Kurti with Pants',
        Category: 'Kurtis',
        Gender: 'Women',
        Brand: 'Heritage Stitch',
        MRP: 3499,
        'Selling Price': 1499,
        Stock: 25,
        Sizes: 'S,M,L,XL',
        Colors: 'Teal Green,Mustard',
        Description: 'Fine Chanderi silk blend kurti with handwork zari embroidery.',
        'Image 1 URL': 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80',
        'Image 2 URL': 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
        'Image 3 URL': 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
        Fabric: 'Chanderi Silk Blend',
        Fit: 'Straight Calf Length',
        'Wash Care': 'Dry Clean Recommended',
        Origin: 'India',
        Status: 'Published',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Garments_Import_Template');
    XLSX.writeFile(workbook, 'STYLE1_Garments_Bulk_Import_Template.xlsx');
  };

  // 2. Handle File Upload & Validation
  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setCommitSuccess(null);
    setIsValidating(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      const existingProducts = db.getAllProducts();
      const existingSkus = new Set(existingProducts.map((p) => p.sku.toLowerCase()));
      const categories = db.getCategories();
      const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

      const validRows: any[] = [];
      const errorRows: any[] = [];

      rows.forEach((row, index) => {
        const rowNum = index + 2;
        const errors: string[] = [];

        const sku = String(row['SKU'] || '').trim();
        const name = String(row['Product Name'] || '').trim();
        const catName = String(row['Category'] || '').trim();
        const mrp = Number(row['MRP']);
        const sellingPrice = Number(row['Selling Price']);
        const stock = Number(row['Stock']);

        if (!sku) errors.push('SKU is required');
        else if (existingSkus.has(sku.toLowerCase())) {
          errors.push(`Duplicate SKU "${sku}" already exists in store`);
        }

        if (!name) errors.push('Product Name is required');
        if (!catName) errors.push('Category is required');
        if (isNaN(mrp) || mrp <= 0) errors.push('Valid MRP is required');
        if (isNaN(sellingPrice) || sellingPrice <= 0) errors.push('Valid Selling Price is required');
        if (sellingPrice > mrp) errors.push('Selling Price cannot exceed MRP');
        if (isNaN(stock) || stock < 0) errors.push('Valid stock quantity is required');

        if (errors.length > 0) {
          errorRows.push({
            rowNum,
            sku: sku || 'N/A',
            name: name || 'N/A',
            errors,
          });
        } else {
          // Normalize into product entity
          const matchedCategory = catMap.get(catName.toLowerCase()) || categories[0];
          const sizes = String(row['Sizes'] || 'M,L,XL')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          const colors = String(row['Colors'] || 'Classic')
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean);

          const images = [
            row['Image 1 URL'],
            row['Image 2 URL'],
            row['Image 3 URL'],
            row['Image 4 URL'],
          ]
            .filter(Boolean)
            .map((url, i) => ({
              id: `img-import-${Date.now()}-${i}`,
              image_url: String(url).trim(),
              sort_order: i + 1,
              is_primary: i === 0,
              caption: `View ${i + 1}`,
            }));

          if (images.length === 0) {
            images.push({
              id: `img-import-${Date.now()}-0`,
              image_url:
                'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80',
              sort_order: 1,
              is_primary: true,
              caption: 'Front View',
            });
          }

          validRows.push({
            sku,
            name,
            category_id: matchedCategory.id,
            category_name: matchedCategory.name,
            category_slug: matchedCategory.slug,
            gender: row['Gender'] || 'Men',
            brand: row['Brand'] || 'TRYatHOME Originals',
            mrp,
            selling_price: sellingPrice,
            stock,
            sizes,
            colors,
            description:
              row['Description'] ||
              'Quality garment designed for modern comfort and style.',
            specifications: {
              Fabric: row['Fabric'] || '100% Cotton',
              Fit: row['Fit'] || 'Regular Fit',
              WashCare: row['Wash Care'] || 'Machine Wash',
              Origin: row['Origin'] || 'India',
            },
            images,
          });
        }
      });

      setValidationResult({
        validRows,
        errorRows,
        totalRows: rows.length,
      });
    } catch (err: any) {
      alert(`Failed to read Excel file: ${err.message || 'Unknown error'}`);
    } finally {
      setIsValidating(false);
    }
  };

  // 3. Commit Import
  const handleCommitImport = () => {
    if (!validationResult || validationResult.validRows.length === 0) return;

    setIsCommitting(true);

    setTimeout(() => {
      validationResult.validRows.forEach((row) => {
        db.addProduct({
          ...row,
          status: importStatus,
        });
      });

      setIsCommitting(false);
      setCommitSuccess({
        addedCount: validationResult.validRows.length,
        message: `Successfully imported and synchronized ${validationResult.validRows.length} garments into TRYatHOME catalog!`,
      });
      setValidationResult(null);
      setFile(null);
      onImportComplete();
    }, 600);
  };

  return (
    <div id="admin-bulk-import-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-black text-slate-900">Bulk Product Import using Excel</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Import hundreds of garments, sizes, prices, and high-res images in seconds using standard Excel (.xlsx).
          </p>
        </div>

        <button
          id="download-excel-template-btn"
          onClick={handleDownloadTemplate}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download Sample Excel Template</span>
        </button>
      </div>

      {/* Success Banner */}
      {commitSuccess && (
        <div
          id="bulk-import-success-banner"
          className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-800 animate-in fade-in"
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <h4 className="font-extrabold text-sm">Bulk Import Succeeded!</h4>
            <p className="text-xs mt-0.5">{commitSuccess.message}</p>
          </div>
        </div>
      )}

      {/* File Dropzone */}
      <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 transition-colors text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileChange(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="font-bold text-slate-900 text-base mb-1">
          {file ? file.name : 'Upload Your Completed Excel Sheet'}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
          Drag & drop your .xlsx or .csv file here, or click to browse from your computer.
        </p>

        <button
          id="browse-excel-file-btn"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2"
        >
          <span>Select Excel File</span>
        </button>

        {isValidating && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Validating Excel columns, prices, and SKUs...</span>
          </div>
        )}
      </div>

      {/* Validation Results & Preview */}
      {validationResult && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">Validation Results</h3>
              <p className="text-xs text-slate-500">
                Found {validationResult.totalRows} total rows: {validationResult.validRows.length} ready to import,{' '}
                {validationResult.errorRows.length} with issues.
              </p>
            </div>

            {/* Import Status Option */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Import Mode:</label>
              <select
                id="bulk-import-status-select"
                value={importStatus}
                onChange={(e) => setImportStatus(e.target.value as 'Published' | 'Draft')}
                className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white outline-hidden"
              >
                <option value="Published">Publish Immediately (Live on Storefront)</option>
                <option value="Draft">Import as Draft (Review Later)</option>
              </select>

              <button
                id="commit-bulk-import-btn"
                disabled={isCommitting || validationResult.validRows.length === 0}
                onClick={handleCommitImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                {isCommitting ? (
                  <span>Importing...</span>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>COMMIT IMPORT ({validationResult.validRows.length} PRODUCTS)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Errors List */}
          {validationResult.errorRows.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Rows with Errors (Will be skipped during import):</span>
              </div>
              <ul className="text-xs text-rose-700 space-y-1 pl-6 list-disc max-h-40 overflow-y-auto">
                {validationResult.errorRows.map((err, i) => (
                  <li key={i}>
                    <strong>Row {err.rowNum}</strong> (SKU: {err.sku}) - {err.errors.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Valid Products Preview Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Valid Garments Preview ({validationResult.validRows.length})
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Garment Title</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">MRP</th>
                    <th className="p-2.5">Selling Price</th>
                    <th className="p-2.5">Stock</th>
                    <th className="p-2.5">Sizes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validationResult.validRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-indigo-700">{row.sku}</td>
                      <td className="p-2.5 font-bold text-slate-800">{row.name}</td>
                      <td className="p-2.5 text-slate-600">{row.category_name}</td>
                      <td className="p-2.5 text-slate-400 line-through">₹{row.mrp}</td>
                      <td className="p-2.5 font-extrabold text-slate-900">₹{row.selling_price}</td>
                      <td className="p-2.5 font-bold text-emerald-700">{row.stock} units</td>
                      <td className="p-2.5 text-slate-600">{row.sizes.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {validationResult.validRows.length > 10 && (
              <p className="text-[11px] text-slate-400 mt-2 text-right">
                Showing first 10 of {validationResult.validRows.length} valid garments.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
