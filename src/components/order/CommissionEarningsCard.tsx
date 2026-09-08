import React, { useState } from "react";
import { OrderItem } from "../../types";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { FaPercentage, FaChevronDown, FaChevronUp, FaCoins } from "react-icons/fa";
import { AlertCircle, CheckCircle2, PackageCheck, Truck } from "lucide-react";
import {
  PromoterCommissionItem,
  PromoterCommissionService,
  CommissionStatus,
} from "../../services/PromoterCommissionService";
import { ReleaseCommissionModal } from "../commission/ReleaseCommissionModal";

interface Props {
  items: OrderItem[];
  orderId?: string;
  orderStatus?: number | string;
  orderDeliveredAt?: string | null;
  onRefresh?: () => void;
}

/**
 * Strict Item-Level Delivery Checker.
 * Evaluates delivery independently per order item using verified item fields.
 * Does NOT fallback to parent order status.
 */
export const isOrderItemDelivered = (item: OrderItem): boolean => {
  if (!item) return false;

  // 1. Check item-level deliveredAt ISO timestamp
  if (item.deliveredAt && item.deliveredAt !== "" && item.deliveredAt !== null) {
    return true;
  }

  // 2. Check item-level status (4 or "4" or "DELIVERED")
  if (
    item.status === 4 ||
    item.status === "4" ||
    String(item.status).toUpperCase() === "DELIVERED"
  ) {
    return true;
  }

  // 3. Check item-level deliveryStatus field if present
  const deliveryStatus = (item as any).deliveryStatus;
  if (deliveryStatus && String(deliveryStatus).toUpperCase() === "DELIVERED") {
    return true;
  }

  return false;
};

export const CommissionEarningsCard: React.FC<Props> = ({
  items = [],
  orderId,
  onRefresh,
}) => {
  const [showItemDetails, setShowItemDetails] = useState(false);

  // Modals & Action State
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Alert/Toast State
  const [alert, setAlert] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showAlert = (message: string, type: "success" | "error" = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // Compute individual item status
  const getItemStatus = (item: OrderItem): CommissionStatus => {
    if (Boolean(item.commissionTransferred)) return "TRANSFERRED";
    if (isOrderItemDelivered(item)) return "ELIGIBLE";
    return "NOT_ELIGIBLE";
  };

  // Group items by eligibility
  const eligibleItems = items.filter(
    (item) => getItemStatus(item) === "ELIGIBLE" && ((item.promoterCommission || 0) > 0 || item.promoterId)
  );
  const transferredItems = items.filter((item) => getItemStatus(item) === "TRANSFERRED");

  // Determine overall card operational status
  const getOverallStatus = (): CommissionStatus => {
    if (items.length === 0) return "NOT_ELIGIBLE";
    if (transferredItems.length === items.length) return "TRANSFERRED";
    if (eligibleItems.length === items.length) return "ELIGIBLE";
    if (eligibleItems.length > 0) return "PARTIALLY_ELIGIBLE";
    return "NOT_ELIGIBLE";
  };

  const overallStatus = getOverallStatus();

  // Aggregate financial metrics across items
  const totalPromoterCommission = items.reduce(
    (sum, item) => sum + (item.promoterCommission || 0),
    0
  );

  const eligiblePromoterCommission = eligibleItems.reduce(
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

  const mainItem = items.find((item) => item.promoterId || (item.promoterCommission || 0) > 0) || items[0];

  // Audit logs from transferred items
  const transferLogs = (Array.isArray(items) ? items : []).flatMap((item) =>
    item && Array.isArray(item.commissionTransferredLogs) ? item.commissionTransferredLogs : []
  );

  // Target commission items passed into modal (ONLY ELIGIBLE ITEMS)
  const targetCommissionItems: PromoterCommissionItem[] = eligibleItems.map((item, idx) => ({
    _id: item._id || `${orderId || "COMM"}-${idx + 1}`,
    orderId: orderId || item.orderId || "",
    orderItemId: item._id || "",
    numericOrderId: (item as any).numericOrderId || 10000,
    promoterId: item.promoterId || "USR-PROMOTER",
    promoterName: (item as any)?.promoterName || `Promoter (${item.promoterId || "N/A"})`,
    promoterPhone: (item as any)?.promoterPhone || "",
    promoterEmail: (item as any)?.promoterEmail || "",
    orderValue: item.totalAmount || 0,
    commissionPercentage: item.promoterCommissionPercentage || 0,
    commissionAmount: item.promoterCommission || 0,
    orderStatus: isOrderItemDelivered(item) ? "Delivered" : "Pending",
    eligibleFrom: item.deliveredAt || item.createdAt || new Date().toISOString(),
    status: "ELIGIBLE",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }));

  // Confirm Release Handler (POST /api/order/mark-commission-as-transferred)
  const handleConfirmRelease = async () => {
    if (isProcessing) return; // Prevent duplicate submissions

    if (!orderId && !items[0]?.orderId) {
      showAlert("Missing order identifier for commission transfer.", "error");
      return;
    }

    if (eligibleItems.length === 0) {
      showAlert("No eligible order items found for commission release.", "error");
      return;
    }

    setIsProcessing(true);
    const targetOrderId = orderId || items[0]?.orderId || "";
    const targetItemIds = eligibleItems.map((i) => i._id).filter(Boolean);

    try {
      const res = await PromoterCommissionService.markCommissionAsTransferred({
        orderId: targetOrderId,
        orderItemIds: targetItemIds,
        transferredMethod: "MANUAL",
      });

      setIsProcessing(false);
      setIsReleaseModalOpen(false);

      if (res.success) {
        showAlert(
          `Commission for ${targetItemIds.length} item(s) marked as TRANSFERRED successfully.`,
          "success"
        );
        // Refresh authoritative backend order data
        if (onRefresh) onRefresh();
      } else {
        showAlert(res.message || "Failed to release commission.", "error");
      }
    } catch (err: any) {
      setIsProcessing(false);
      showAlert(err?.message || "Network request failed during commission release.", "error");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      {/* Alert / Notification Toast */}
      {alert && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-xs ${
            alert.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} className="text-slate-500 hover:text-slate-800">
            ×
          </button>
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
            overallStatus === "TRANSFERRED"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : overallStatus === "ELIGIBLE"
              ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold"
              : overallStatus === "PARTIALLY_ELIGIBLE"
              ? "bg-amber-100 text-amber-900 border-amber-300 font-extrabold"
              : "bg-slate-100 text-slate-700 border-slate-200"
          }`}
        >
          {overallStatus === "TRANSFERRED"
            ? "TRANSFERRED"
            : overallStatus === "ELIGIBLE"
            ? "ELIGIBLE"
            : overallStatus === "PARTIALLY_ELIGIBLE"
            ? "PARTIALLY ELIGIBLE"
            : "NOT ELIGIBLE"}
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
            <p className="text-[10px] text-slate-500 font-mono truncate">
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
            <p className="text-[10px] text-slate-500 font-mono truncate">
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

      {/* Operational State Information & Release Control Toolbar */}
      <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Promoter Operational Action Control
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            POST /api/order/mark-commission-as-transferred
          </span>
        </div>

        {/* State 1: NOT ELIGIBLE (No order items delivered) */}
        {overallStatus === "NOT_ELIGIBLE" && (
          <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <AlertCircle size={15} className="text-slate-500 flex-shrink-0" />
              <span>Commission Pending Delivery</span>
            </div>
            <p className="text-xs text-slate-600 font-medium pl-6">
              Commission will become eligible after successful delivery.
            </p>
            <p className="text-[11px] text-slate-400 pl-6">
              Commission release is available only for delivered order items.
            </p>
          </div>
        )}

        {/* State 2: ELIGIBLE or PARTIALLY ELIGIBLE */}
        {(overallStatus === "ELIGIBLE" || overallStatus === "PARTIALLY_ELIGIBLE") && (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <PackageCheck size={16} className="text-emerald-600 flex-shrink-0" />
                <span>
                  {overallStatus === "PARTIALLY_ELIGIBLE"
                    ? `Partially Eligible (${eligibleItems.length} of ${items.length} Items Delivered)`
                    : "Commission Eligible for Release"}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 font-normal">
                {overallStatus === "PARTIALLY_ELIGIBLE"
                  ? `${eligibleItems.length} of ${items.length} order items are delivered and eligible for release (${formatCurrency(eligiblePromoterCommission)}). Pending items will become eligible upon delivery.`
                  : "All order items have been successfully delivered. Confirm manual release to credit promoter wallet balance."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsReleaseModalOpen(true)}
                disabled={isProcessing || eligibleItems.length === 0}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Truck size={14} />
                <span>
                  {overallStatus === "PARTIALLY_ELIGIBLE"
                    ? `Release Eligible Commission (${formatCurrency(eligiblePromoterCommission)})`
                    : `Release Commission (${formatCurrency(totalPromoterCommission)})`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* State 3: TRANSFERRED */}
        {overallStatus === "TRANSFERRED" && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
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
      {items.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowItemDetails(!showItemDetails)}
            className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            {showItemDetails ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
            {showItemDetails ? "Hide Item-level Breakdown" : "View Item-level Commission Breakdown"}
          </button>

          {showItemDetails && (
            <div className="mt-3 space-y-2 pt-2 border-t border-slate-100 text-xs">
              {items.map((item, idx) => {
                const itemStatus = getItemStatus(item);
                const isDelivered = isOrderItemDelivered(item);

                return (
                  <div
                    key={item._id || idx}
                    className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-2 text-slate-700"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          Item #{idx + 1} ({item.brand || "Product"})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                            itemStatus === "TRANSFERRED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : itemStatus === "ELIGIBLE"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-slate-200 text-slate-700 border-slate-300"
                          }`}
                        >
                          {itemStatus === "TRANSFERRED"
                            ? "TRANSFERRED"
                            : itemStatus === "ELIGIBLE"
                            ? "ELIGIBLE"
                            : "NOT ELIGIBLE"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Item ID: {item._id} | Delivery: {isDelivered ? "Delivered" : "Pending"}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] self-end md:self-auto">
                      <span>
                        Promoter: <strong className="text-emerald-600">{formatCurrency(item.promoterCommission)}</strong>
                      </span>
                      <span>
                        Connector: <strong>{formatCurrency(item.connectorCommission)}</strong>
                      </span>
                      <span>
                        Promo Fee: <strong>{formatCurrency(item.promotionFeeAmount)}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Release Confirmation Modal */}
      <ReleaseCommissionModal
        isOpen={isReleaseModalOpen}
        selectedItems={targetCommissionItems}
        onClose={() => setIsReleaseModalOpen(false)}
        onConfirmRelease={handleConfirmRelease}
        isProcessing={isProcessing}
      />
    </div>
  );
};
