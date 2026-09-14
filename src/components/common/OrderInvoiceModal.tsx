import React, { useState } from 'react';
import { Order } from '../../types';
import { db } from '../../services/db';
import { XCircle, Printer, CheckCircle, FileText, Home, Lock, RotateCcw, ShieldCheck, Download } from 'lucide-react';
import { TryAtHomeCountdown } from '../order/TryAtHomeCountdown';
import { printInvoiceElement, downloadInvoicePDF } from '../../utils/printInvoice';

interface OrderInvoiceModalProps {
  order: Order | null;
  onClose: () => void;
  userRole?: 'Customer' | 'Admin' | 'Delivery Partner' | 'DeliveryBoy';
  onBillGenerated?: (updatedOrder: Order) => void;
}

export const OrderInvoiceModal: React.FC<OrderInvoiceModalProps> = ({
  order,
  onClose,
  userRole = 'Customer',
  onBillGenerated,
}) => {
  const [currentOrder, setCurrentOrder] = useState<Order | null>(order);
  const [justGenerated, setJustGenerated] = useState(false);

  React.useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  if (!currentOrder) return null;

  const billCalc = db.getOrderBillCalculation(currentOrder);
  const isLocked = !!currentOrder.final_bill_generated || !!currentOrder.final_bill_locked;
  const isFinalBill = billCalc.has_returns || billCalc.has_replacements || isLocked;
  const hasReplacedItems = billCalc.has_replacements || currentOrder.is_replace_order || billCalc.total_replaced_quantity > 0;

  const handleGenerateFinalBill = () => {
    try {
      const updated = db.generateFinalBill(currentOrder.order_id, userRole);
      setCurrentOrder(updated);
      setJustGenerated(true);
      if (onBillGenerated) {
        onBillGenerated(updated);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to generate final bill.');
    }
  };

  const handlePrint = () => {
    printInvoiceElement('printable-invoice-card', `Tax-Invoice-${currentOrder.order_id}`);
  };

  const handleDownloadPDF = async () => {
    await downloadInvoicePDF('printable-invoice-card', `Invoice-${currentOrder.order_id}.pdf`);
  };

  return (
    <div
      id="order-detail-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static"
    >
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          #order-detail-modal,
          #order-detail-modal * {
            visibility: visible !important;
          }
          #order-detail-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      <div id="printable-invoice-card" className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:bg-slate-900 print:text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200 border border-slate-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400">
                  {isFinalBill ? 'Final Bill & Tax Invoice (Post-Delivery & Returns)' : 'Tax Invoice & Order Receipt'}
                </span>
                {isLocked ? (
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> All Locked
                  </span>
                ) : null}
                {hasReplacedItems && (
                  <span className="bg-purple-500/20 text-purple-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Replace Item Order
                  </span>
                )}
              </div>
              <h3 className="text-base font-black flex items-center gap-2">
                <span>{currentOrder.order_id}</span>
                <span className="text-xs font-mono font-normal text-slate-400">
                  ({billCalc.invoice_number})
                </span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              title="Print Invoice / Save as PDF"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs print:p-6 print:overflow-visible">
          {/* Locked Status Banner */}
          {isLocked && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-amber-950 font-semibold print:border print:border-amber-400">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>All Actions Locked:</strong> Final bill & invoice has been generated. Order items, status, and delivery partner cannot be altered.
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded shrink-0">
                Immutable
              </span>
            </div>
          )}

          {/* Replace Item Policy Banner */}
          {hasReplacedItems && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5 text-purple-950 text-xs">
              <RotateCcw className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-purple-900">
                  Replace Item Order (1:1 Doorstep Exchange)
                </p>
                <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                  Replaced garment is shown for size/piece exchange records. As per exchange policy, the <strong>bill amount does not change</strong> (₹0 bill variation).
                </p>
              </div>
            </div>
          )}

          {/* Top Alert if final bill was just generated */}
          {justGenerated && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-semibold print:hidden">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Final Bill generated and locked successfully! All further order modifications are closed.</span>
            </div>
          )}

          {/* Try at Home Doorstep Trial Status (for Try at Home orders) */}
          {currentOrder.order_type === 'try_at_home' && (
            <div className="print:hidden">
              <TryAtHomeCountdown order={currentOrder} />
            </div>
          )}

          {/* Customer & Shipping Info */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                Billed & Shipped To:
              </span>
              <p className="font-extrabold text-slate-900 text-sm">
                {billCalc.customer_name}
              </p>
              <p className="text-slate-600 mt-1 leading-relaxed">
                {billCalc.customer_address}
              </p>
              {billCalc.customer_mobile && (
                <p className="text-slate-500 mt-1">Phone: +91 {billCalc.customer_mobile}</p>
              )}
            </div>

            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                Order Information:
              </span>
              <p className="text-slate-700">
                <strong>Order Date:</strong> {new Date(billCalc.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {billCalc.delivery_date && (
                <p className="text-slate-700 mt-1">
                  <strong>Original Delivery Date:</strong> {new Date(billCalc.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
              <p className="text-slate-700 mt-1">
                <strong>Payment Mode:</strong> {billCalc.payment_method}
              </p>
              <p className="text-slate-700 mt-1">
                <strong>Payment Status:</strong>{' '}
                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  billCalc.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {billCalc.payment_status}
                </span>
              </p>
              {currentOrder.assigned_delivery_boy_name && (
                <p className="text-slate-700 mt-1 flex items-center gap-1">
                  <strong>Delivery Associate:</strong> {currentOrder.assigned_delivery_boy_name}
                  {isLocked && <Lock className="w-3 h-3 text-amber-600 inline" />}
                </p>
              )}
              {currentOrder.order_type === 'try_at_home' && (
                <p className="text-indigo-700 font-bold mt-1 flex items-center gap-1">
                  <Home className="w-3.5 h-3.5" /> Order Type: Try at Home
                </p>
              )}
            </div>
          </div>

          {/* Items Table with Item-Wise Return / Replace Adjustment */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <th className="p-2.5">Garment Item</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-center">Delivered</th>
                  {isFinalBill && (
                    <>
                      <th className="p-2.5 text-center text-rose-700">Returned</th>
                      <th className="p-2.5 text-center text-purple-700">Replaced</th>
                      <th className="p-2.5 text-center text-slate-900">Final Qty</th>
                      <th className="p-2.5 text-right">Original Amt</th>
                      <th className="p-2.5 text-right text-rose-700">Less: RETURN</th>
                    </>
                  )}
                  <th className="p-2.5 text-right font-black">
                    {isFinalBill ? 'Final Amount' : 'Amount'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billCalc.items.map((item) => {
                  const isItemReplaced = item.is_replace || item.replaced_quantity > 0;
                  return (
                    <tr
                      key={item.item_id}
                      className={`hover:bg-slate-50/60 ${isItemReplaced ? 'bg-purple-50/30' : ''}`}
                    >
                      <td className="p-2.5 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{item.product_name}</span>
                          {isItemReplaced && (
                            <span className="bg-purple-100 text-purple-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-purple-200">
                              Replace Item (Exchange)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          SKU: {item.sku || 'N/A'} • Size: {item.size} • Color: {item.color}
                        </div>
                        {isItemReplaced && (
                          <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                            ⇄ Exchange: {item.replacement_size ? `Size ${item.replacement_size}` : ''} {item.replacement_color ? `• Color ${item.replacement_color}` : ''} (Doorstep replacement, bill unchanged)
                          </div>
                        )}
                        {item.returned_quantity > 0 && !isItemReplaced && (
                          <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                            ✓ {item.returned_quantity} unit(s) returned ({item.return_status || 'Return Completed'})
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-right text-slate-600 font-mono">
                        ₹{(item.rate ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-700">
                        {item.delivered_quantity ?? 1}
                      </td>
                      {isFinalBill && (
                        <>
                          <td className="p-2.5 text-center font-bold text-rose-600">
                            {(item.returned_quantity ?? 0) > 0 ? `-${item.returned_quantity}` : '0'}
                          </td>
                          <td className="p-2.5 text-center font-bold text-purple-700">
                            {(item.replaced_quantity ?? 0) > 0 ? `${item.replaced_quantity}` : '-'}
                          </td>
                          <td className="p-2.5 text-center font-black text-slate-900">
                            {item.final_quantity ?? 0}
                          </td>
                          <td className="p-2.5 text-right text-slate-500 font-mono">
                            ₹{(item.original_amount ?? 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-right font-bold font-mono">
                            {isItemReplaced ? (
                              <span className="text-purple-700 font-bold text-[10px]">
                                ₹0 (Bill Unchanged)
                              </span>
                            ) : (item.return_amount ?? 0) > 0 ? (
                              <span className="text-rose-600">
                                -₹{(item.return_amount ?? 0).toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-slate-400">₹0</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="p-2.5 text-right font-black text-slate-900 font-mono">
                        ₹{((isFinalBill ? item.final_amount : item.original_amount) ?? 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quantity & Amount Calculation Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quantity Breakdown Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-slate-700">
              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                Items Summary
              </span>
              <div className="flex justify-between">
                <span>Delivered Items:</span>
                <span className="font-bold text-slate-900">{billCalc.total_delivered_quantity}</span>
              </div>
              {isFinalBill && (
                <>
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Return Items (Refund):</span>
                    <span>-{billCalc.total_returned_quantity}</span>
                  </div>
                  {billCalc.total_replaced_quantity > 0 && (
                    <div className="flex justify-between text-purple-700 font-semibold">
                      <span>Replace Items (Exchange):</span>
                      <span>{billCalc.total_replaced_quantity} unit(s) (Bill Unchanged)</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-slate-200 flex justify-between font-black text-slate-900">
                    <span>Final Items Kept / Retained:</span>
                    <span className="text-emerald-700">{billCalc.total_final_quantity}</span>
                  </div>
                </>
              )}
            </div>

            {/* Financial Liability / Calculation Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-slate-700">
              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">
                Financial Adjustment
              </span>
              <div className="flex justify-between">
                <span>Original Order Total:</span>
                <span className="font-bold text-slate-900">₹{(billCalc.original_total ?? 0).toLocaleString('en-IN')}</span>
              </div>
              {isFinalBill && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Less: RETURN:</span>
                  <span>-₹{(billCalc.total_return_amount ?? 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              {(billCalc.total_replaced_quantity ?? 0) > 0 && (
                <div className="flex justify-between text-purple-700 font-medium text-[11px]">
                  <span>Replace Item Adjustment:</span>
                  <span>₹0 (1:1 Exchange - No Bill Change)</span>
                </div>
              )}
              {(billCalc.adjusted_tax ?? 0) > 0 && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>GST (5% Included):</span>
                  <span>
                    ₹{(billCalc.adjusted_tax ?? 0).toLocaleString('en-IN')}
                    {(billCalc.tax_reversed ?? 0) > 0 && (
                      <span className="text-rose-600 ml-1 font-normal">(-₹{billCalc.tax_reversed} adj.)</span>
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge:</span>
                <span>{billCalc.delivery_charge === 0 ? 'FREE' : `₹${billCalc.delivery_charge ?? 0}`}</span>
              </div>
              {currentOrder.order_type === 'try_at_home' && (
                <div className="flex justify-between text-indigo-700 font-semibold text-[11px]">
                  <span>Try at Home Fee (Non-refundable):</span>
                  <span>
                    {(billCalc.try_at_home_fee ?? 0) > 0
                      ? `+₹${(billCalc.try_at_home_fee ?? 0).toLocaleString('en-IN')}`
                      : '₹0 (Not Applicable - Kept > ₹500)'}
                  </span>
                </div>
              )}
              {(billCalc.replacement_credit_applied ?? 0) > 0 && (
                <div className="flex justify-between text-purple-700 font-semibold text-[11px]">
                  <span>Replacement Credit Adjustment:</span>
                  <span>-₹{(billCalc.replacement_credit_applied ?? 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              {billCalc.total_final_quantity === 0 && (billCalc.try_at_home_fee ?? 0) > 0 && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 font-medium">
                  <strong>Notice:</strong> All garments returned. Non-refundable Try at Home fee of ₹{(billCalc.try_at_home_fee ?? 0).toLocaleString('en-IN')} must be collected in cash at the doorstep.
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900">
                <span>FINAL PAYABLE AMOUNT:</span>
                <span className="text-emerald-700 font-mono text-base">
                  ₹{(billCalc.final_payable ?? 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Payment Settlement Information */}
              <div className="pt-2 border-t border-slate-200/60 text-[11px] space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-semibold text-slate-800">{billCalc.payment_method || 'Cash on Delivery'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Collected:</span>
                  <span className="font-semibold text-slate-800">₹{(billCalc.amount_collected ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Balance Due:</span>
                  <span className={`font-bold ${(billCalc.balance_due ?? 0) === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    ₹{(billCalc.balance_due ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <div>
            {!isLocked ? (
              <button
                onClick={handleGenerateFinalBill}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Generate & Lock Final Bill</span>
              </button>
            ) : (
              <span className="text-xs text-amber-800 font-bold flex items-center gap-1.5 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-lg">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Final Bill & Invoice Locked (All Actions Closed)</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Download Tax Invoice as PDF file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print Bill / Invoice"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
