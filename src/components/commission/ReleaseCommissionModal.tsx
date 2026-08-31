import React from "react";
import { PromoterCommissionItem, BulkReleaseResultItem } from "../../services/PromoterCommissionService";
import { Wallet, AlertTriangle, CheckCircle2, X } from "lucide-react";

interface ReleaseCommissionModalProps {
  isOpen: boolean;
  selectedItems: PromoterCommissionItem[];
  onClose: () => void;
  onConfirmRelease: (items: PromoterCommissionItem[]) => void;
  isProcessing?: boolean;
  bulkResults?: BulkReleaseResultItem[] | null;
}

export const ReleaseCommissionModal: React.FC<ReleaseCommissionModalProps> = ({
  isOpen,
  selectedItems,
  onClose,
  onConfirmRelease,
  isProcessing = false,
  bulkResults = null,
}) => {
  if (!isOpen || selectedItems.length === 0) return null;

  const isBulk = selectedItems.length > 1;
  const singleItem = selectedItems[0];
  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.commissionAmount || 0), 0);

  const handleConfirm = () => {
    onConfirmRelease(selectedItems);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isBulk ? `Release Selected (${selectedItems.length} Commissions)` : "Release Promoter Commission"}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Manual release to promoter wallet balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {bulkResults ? (
            /* Results View after Bulk Processing */
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Release Execution Summary</span>
                <div className="flex items-center justify-between font-bold text-slate-800 text-sm pt-1">
                  <span>Total Attempted: {bulkResults.length}</span>
                  <span className="text-emerald-600">
                    Success: {bulkResults.filter((r) => r.status === "SUCCESS").length}
                  </span>
                  <span className="text-rose-600">
                    Failed: {bulkResults.filter((r) => r.status !== "SUCCESS").length}
                  </span>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {bulkResults.map((res, idx) => (
                  <div key={idx} className="p-2.5 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-700">{res.commissionId}</span>
                      {res.error && <p className="text-[10px] text-rose-600 leading-tight mt-0.5">{res.error}</p>}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        res.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {res.status}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          ) : (
            /* Pre-confirmation view */
            <>
              {/* Financial Safety Notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Financial Safety Enforcement</p>
                  <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                    Commission release triggers an atomic wallet transaction via backend. Amounts are validated from backend records.
                  </p>
                </div>
              </div>

              {/* Commission Details Box */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2.5 text-xs">
                {isBulk ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Selected Commissions:</span>
                      <span className="font-bold text-slate-900 text-sm">{selectedItems.length} Records</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Total Amount to Release:</span>
                      <span className="font-extrabold text-emerald-600 text-base">₹{totalAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Destination:</span>
                      <span className="font-bold text-slate-700">Promoter Wallets</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 uppercase text-[10px]">Promoter</span>
                      <span className="font-bold text-slate-800">{singleItem.promoterName} ({singleItem.promoterId})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 uppercase text-[10px]">Order ID</span>
                      <span className="font-bold text-slate-800 font-mono">#{singleItem.numericOrderId || singleItem.orderId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 uppercase text-[10px]">Order Item ID</span>
                      <span className="font-bold text-slate-700 font-mono">{singleItem.orderItemId || singleItem._id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 uppercase text-[10px]">Commission Amount</span>
                      <span className="font-extrabold text-emerald-600 text-sm">₹{singleItem.commissionAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 uppercase text-[10px]">Transfer Method</span>
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[10px]">MANUAL</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                      <span className="text-slate-400 uppercase text-[10px]">Destination</span>
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px]">Promoter Wallet</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmation Text Prompt */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                  Are you sure you want to release {isBulk ? `these ${selectedItems.length} promoter commissions` : "this commission"} to the promoter wallet? This action is irreversible.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="w-1/2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isProcessing ? <span>Releasing...</span> : <span>Confirm Release</span>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
