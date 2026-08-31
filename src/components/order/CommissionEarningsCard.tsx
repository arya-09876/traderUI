import React, { useState } from "react";
import { OrderItem } from "../../types";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { FaPercentage, FaChevronDown, FaChevronUp, FaCoins } from "react-icons/fa";
import { AlertCircle, ShieldAlert, CheckCircle2, RotateCcw } from "lucide-react";
import moment from "moment";
import {
  PromoterCommissionItem,
  PromoterCommissionService,
  CommissionStatus,
} from "../../services/PromoterCommissionService";
import { ReleaseCommissionModal } from "../commission/ReleaseCommissionModal";
import { ScheduleCommissionModal } from "../commission/ScheduleCommissionModal";
import { HoldCommissionModal } from "../commission/HoldCommissionModal";

interface Props {
  items: OrderItem[];
  orderId?: string;
  onRefresh?: () => void;
}

export const CommissionEarningsCard: React.FC<Props> = ({ items = [], orderId, onRefresh }) => {
  const [showItemDetails, setShowItemDetails] = useState(false);

  // Modals & Action State
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Alert/Toast State
  const [alert, setAlert] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showAlert = (message: string, type: "success" | "error" = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // Safely aggregate item-level commission fields across items
  const totalPromoterCommission = items.reduce(
    (sum, item) => sum + (item.promoterCommission || 0),
    0
  );

  const totalConnectorCommission = items.reduce(
    (sum, item) => sum + (item.connectorCommission || 0),
    0
  );

  const totalPromotionFee = items.reduce(
    (sum, item) => sum + (item.promotionFeeAmount || 0),
    0
  );

  const isTransferred = items.some((item) => item.commissionTransferred);
  const mainItem = items.find((item) => item.promoterId || (item.promoterCommission || 0) > 0) || items[0];

  // Determine Operational Status
  const getCalculatedStatus = (): CommissionStatus => {
    if (isTransferred) return "TRANSFERRED";
    if ((mainItem as any)?.holdReason) return "ON_HOLD";
    const rawStatus = (mainItem as any)?.status;
    if (rawStatus === "DUE") return "DUE";
    if ((mainItem as any)?.scheduledDate) {
      const scheduledMoment = moment((mainItem as any).scheduledDate);
      if (scheduledMoment.isValid() && scheduledMoment.isSameOrBefore(moment(), "day")) {
        return "DUE";
      }
      return "SCHEDULED";
    }
    return "ELIGIBLE";
  };

  const currentStatus: CommissionStatus = getCalculatedStatus();

  // Check if logs exist on any item
  const transferLogs = (Array.isArray(items) ? items : []).flatMap((item) =>
    item && Array.isArray(item.commissionTransferredLogs) ? item.commissionTransferredLogs : []
  );

  // Construct target commission item for modals
  const targetCommissionItem: PromoterCommissionItem = {
    _id: mainItem?._id || orderId || "COMM-ORD",
    orderId: orderId || mainItem?.orderId || "",
    orderItemId: mainItem?._id || "",
    numericOrderId: 10000,
    promoterId: mainItem?.promoterId || "USR-PROMOTER",
    promoterName: (mainItem as any)?.promoterName || `Promoter (${mainItem?.promoterId || "N/A"})`,
    promoterPhone: (mainItem as any)?.promoterPhone || "",
    promoterEmail: (mainItem as any)?.promoterEmail || "",
    orderValue: items.reduce((s, i) => s + (i.totalAmount || 0), 0),
    commissionPercentage: mainItem?.promoterCommissionPercentage || 0,
    commissionAmount: totalPromoterCommission,
    orderStatus: "Delivered",
    eligibleFrom: mainItem?.deliveredAt || mainItem?.createdAt || new Date().toISOString(),
    status: currentStatus,
    holdReason: (mainItem as any)?.holdReason,
    scheduledDate: (mainItem as any)?.scheduledDate,
    scheduledBy: (mainItem as any)?.scheduledBy,
    createdAt: mainItem?.createdAt || new Date().toISOString(),
    updatedAt: mainItem?.updatedAt || new Date().toISOString(),
  };

  // 1. CONFIRM RELEASE (Calls existing POST /api/order/mark-commission-as-transferred)
  const handleConfirmRelease = async () => {
    if (!orderId && !mainItem?.orderId) {
      showAlert("Missing order identifier for commission transfer.", "error");
      return;
    }

    setIsProcessing(true);
    const targetOrderId = orderId || mainItem?.orderId || "";
    const targetItemIds = items.map((i) => i._id).filter(Boolean);

    const res = await PromoterCommissionService.markCommissionAsTransferred({
      orderId: targetOrderId,
      orderItemIds: targetItemIds.length > 0 ? targetItemIds : [targetOrderId],
      transferredMethod: "MANUAL",
    });

    setIsProcessing(false);
    setIsReleaseModalOpen(false);

    if (res.success) {
      showAlert("Commission marked as TRANSFERRED successfully.", "success");
      if (onRefresh) onRefresh();
    } else {
      showAlert(res.message || "Failed to release commission.", "error");
    }
  };

  // 2. CONFIRM SCHEDULE
  const handleConfirmSchedule = async (payload: {
    scheduleType: string;
    days?: number;
    releaseDate?: string;
    note?: string;
  }) => {
    setIsProcessing(true);
    const res = await PromoterCommissionService.scheduleCommissions({
      commissionIds: [targetCommissionItem._id],
      scheduleType: payload.scheduleType as any,
      days: payload.days,
      releaseDate: payload.releaseDate,
      note: payload.note,
    });

    setIsProcessing(false);
    setIsScheduleModalOpen(false);

    if (res.success) {
      showAlert("Commission release scheduled successfully.", "success");
      if (onRefresh) onRefresh();
    } else {
      showAlert(res.message, "error");
    }
  };

  // 3. CONFIRM HOLD
  const handleConfirmHold = async (payload: { reason: string; note?: string }) => {
    setIsProcessing(true);
    const res = await PromoterCommissionService.holdCommissions({
      commissionIds: [targetCommissionItem._id],
      reason: payload.reason,
      note: payload.note,
    });

    setIsProcessing(false);
    setIsHoldModalOpen(false);

    if (res.success) {
      showAlert("Commission placed on hold.", "success");
      if (onRefresh) onRefresh();
    } else {
      showAlert(res.message, "error");
    }
  };

  // 4. RESUME / UNHOLD
  const handleResume = async () => {
    setIsProcessing(true);
    const res = await PromoterCommissionService.unholdCommissions([targetCommissionItem._id]);
    setIsProcessing(false);
    if (res.success) {
      showAlert("Commission unheld and restored to active queue.", "success");
      if (onRefresh) onRefresh();
    } else {
      showAlert(res.message, "error");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      {/* Alert Banner */}
      {alert && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-xs ${
            alert.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} className="text-slate-500 hover:text-slate-800">×</button>
        </div>
      )}

      {/* Header & Status Badge */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <FaPercentage size={15} className="text-violet-500" />
          Commission & Earnings
        </h3>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
            currentStatus === "TRANSFERRED"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : currentStatus === "DUE"
              ? "bg-amber-100 text-amber-900 border-amber-300 font-extrabold animate-pulse"
              : currentStatus === "SCHEDULED"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : currentStatus === "ON_HOLD"
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-slate-100 text-slate-700 border-slate-200"
          }`}
        >
          {currentStatus === "TRANSFERRED"
            ? "TRANSFERRED"
            : currentStatus === "DUE"
            ? "DUE FOR RELEASE"
            : currentStatus === "SCHEDULED"
            ? "SCHEDULED"
            : currentStatus === "ON_HOLD"
            ? "ON HOLD"
            : "ELIGIBLE"}
        </span>
      </div>

      {/* Financial Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Promoter Commission Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Promoter Commission</p>
            <FaCoins className="text-amber-500 text-xs" />
          </div>
          <p className="text-base font-extrabold text-emerald-600">
            {formatCurrency(totalPromoterCommission)}
          </p>
          {mainItem?.promoterCommissionPercentage !== undefined && (
            <p className="text-[10px] text-slate-400 font-medium">
              Rate: {mainItem.promoterCommissionPercentage}%
            </p>
          )}
          {mainItem?.promoterId ? (
            <p className="text-[10px] text-slate-500 font-mono">
              Promoter ID: {mainItem.promoterId}
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 italic">No promoter assigned</p>
          )}
        </div>

        {/* Connector Commission Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Connector Commission</p>
          <p className="text-base font-extrabold text-slate-800">
            {formatCurrency(totalConnectorCommission)}
          </p>
          {mainItem?.connectorCommissionPercentage !== undefined && (
            <p className="text-[10px] text-slate-400 font-medium">
              Rate: {mainItem.connectorCommissionPercentage}%
            </p>
          )}
          {mainItem?.connectorId ? (
            <p className="text-[10px] text-slate-500 font-mono">
              Connector ID: {mainItem.connectorId}
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 italic">No connector ID</p>
          )}
        </div>

        {/* Promotion Fee Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Promotion Fee</p>
          <p className="text-base font-extrabold text-slate-800">
            {formatCurrency(totalPromotionFee)}
          </p>
          {mainItem?.promotionFeePercentage !== undefined && (
            <p className="text-[10px] text-slate-400 font-medium">
              Rate: {mainItem.promotionFeePercentage}%
            </p>
          )}
        </div>
      </div>

      {/* Operational State Information & Action Toolbar */}
      <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Promoter Operational Action Control
          </span>
          <span className="text-[10px] font-mono text-slate-400">API Target: POST /api/order/mark-commission-as-transferred</span>
        </div>

        {/* State 1: DUE FOR RELEASE */}
        {currentStatus === "DUE" && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Commission Due for Release</p>
                <p className="text-[11px] text-amber-700 font-normal">
                  The scheduled release window has arrived. Confirm manual release to credit promoter wallet balance.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsReleaseModalOpen(true)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer disabled:opacity-60"
              >
                RELEASE COMMISSION
              </button>
              <button
                onClick={() => setIsHoldModalOpen(true)}
                disabled={isProcessing}
                className="py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Place Hold
              </button>
            </div>
          </div>
        )}

        {/* State 2: ELIGIBLE / PENDING */}
        {currentStatus === "ELIGIBLE" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              disabled={isProcessing}
              className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Schedule Release
            </button>
            <button
              onClick={() => setIsReleaseModalOpen(true)}
              disabled={isProcessing}
              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Release Today
            </button>
            <button
              onClick={() => setIsHoldModalOpen(true)}
              disabled={isProcessing}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Hold
            </button>
          </div>
        )}

        {/* State 3: SCHEDULED */}
        {currentStatus === "SCHEDULED" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Scheduled Release Date:</span>
              <span className="font-bold text-blue-700 font-mono">
                {(mainItem as any)?.scheduledDate ? formatDateTime((mainItem as any).scheduledDate) : "Scheduled"}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setIsReleaseModalOpen(true)}
                disabled={isProcessing}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Release Now
              </button>
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                disabled={isProcessing}
                className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Edit Schedule
              </button>
              <button
                onClick={() => setIsHoldModalOpen(true)}
                disabled={isProcessing}
                className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Hold
              </button>
            </div>
          </div>
        )}

        {/* State 4: ON HOLD */}
        {currentStatus === "ON_HOLD" && (
          <div className="space-y-2.5">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert size={14} className="text-rose-600" />
                <span>Commission Held by Admin</span>
              </div>
              <p className="text-[11px] text-rose-800">
                Reason: <strong>{(mainItem as any)?.holdReason || "Manual Review Required"}</strong>
              </p>
            </div>
            <button
              onClick={handleResume}
              disabled={isProcessing}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RotateCcw size={12} /> Resume / Unhold Commission
            </button>
          </div>
        )}

        {/* State 5: TRANSFERRED */}
        {currentStatus === "TRANSFERRED" && (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Transferred via MANUAL release API to promoter wallet balance</span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-extrabold rounded uppercase">
              Confirmed
            </span>
          </div>
        )}
      </div>

      {/* Transfer Logs if present */}
      {transferLogs.length > 0 && (
        <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
          <p className="font-bold text-slate-700">Commission Transfer Audit Logs:</p>
          <div className="space-y-1.5">
            {transferLogs.map((log, lIdx) => (
              <div key={lIdx} className="p-2 bg-slate-50 rounded-lg text-slate-600 flex justify-between">
                <span>Method: {log.transferMethod || "MANUAL"}</span>
                <span>By: {log.transferredBy || "Admin"}</span>
                <span>At: {formatDateTime(log.transferredAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item-level Details Toggle */}
      {items.length > 1 && (
        <div className="pt-2">
          <button
            onClick={() => setShowItemDetails(!showItemDetails)}
            className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            {showItemDetails ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
            {showItemDetails ? "Hide Item-level Commissions" : "View Item-level Commission Breakdown"}
          </button>

          {showItemDetails && (
            <div className="mt-3 space-y-2 pt-2 border-t border-slate-100 text-xs">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-slate-700"
                >
                  <span className="font-bold">Item #{idx + 1} ({item.brand || "Product"})</span>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span>Promoter: <strong>{formatCurrency(item.promoterCommission)}</strong></span>
                    <span>Connector: <strong>{formatCurrency(item.connectorCommission)}</strong></span>
                    <span>Promo Fee: <strong>{formatCurrency(item.promotionFeeAmount)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ReleaseCommissionModal
        isOpen={isReleaseModalOpen}
        selectedItems={[targetCommissionItem]}
        onClose={() => setIsReleaseModalOpen(false)}
        onConfirmRelease={handleConfirmRelease}
        isProcessing={isProcessing}
      />

      <ScheduleCommissionModal
        isOpen={isScheduleModalOpen}
        selectedItems={[targetCommissionItem]}
        onClose={() => setIsScheduleModalOpen(false)}
        onConfirmSchedule={handleConfirmSchedule}
        isProcessing={isProcessing}
      />

      <HoldCommissionModal
        isOpen={isHoldModalOpen}
        selectedItems={[targetCommissionItem]}
        onClose={() => setIsHoldModalOpen(false)}
        onConfirmHold={handleConfirmHold}
        isProcessing={isProcessing}
      />
    </div>
  );
};
