import React, { useState, useEffect, useMemo, useCallback } from "react";
import { IUser } from "../../types";
import {
  PromoterCommissionItem,
  PromoterCommissionService,
} from "../../services/PromoterCommissionService";
import moment from "moment";
import {
  X,
  Plus,
  History,
  AlertCircle,
  ShieldAlert,
  Eye,
  RotateCcw,
  Info,
} from "lucide-react";
import { FaCoins } from "react-icons/fa";

// Modals
import { ReleaseCommissionModal } from "../commission/ReleaseCommissionModal";
import { HoldCommissionModal } from "../commission/HoldCommissionModal";
import { CommissionDetailDrawer } from "../commission/CommissionDetailDrawer";

interface PromoterManageCommissionDrawerProps {
  isOpen: boolean;
  user: IUser | null;
  initialTab?: "add" | "history";
  onClose: () => void;
}

const CENTRAL_STATUS_MAP: Record<string, { label: string; class: string }> = {
  PENDING: { label: "Pending", class: "bg-slate-100 text-slate-700 border-slate-200" },
  SCHEDULED: { label: "Scheduled", class: "bg-blue-50 text-blue-700 border-blue-200" },
  DUE: { label: "Due for Release", class: "bg-amber-50 text-amber-800 border-amber-200 font-bold" },
  RELEASED: { label: "Released", class: "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold" },
  HOLD: { label: "On Hold", class: "bg-rose-50 text-rose-800 border-rose-200 font-bold" },
};

const getStatusBadge = (status: string) => {
  const upper = (status || "").toUpperCase();
  return (
    CENTRAL_STATUS_MAP[upper] || {
      label: status || "Unknown Status",
      class: "bg-slate-100 text-slate-600 border-slate-200",
    }
  );
};

export const PromoterManageCommissionDrawer: React.FC<PromoterManageCommissionDrawerProps> = ({
  isOpen,
  user,
  initialTab = "history",
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"add" | "history">("history");

  // Summary Metrics (Backend-driven, null = '—')
  const [summary, setSummary] = useState<{
    totalEarned: number | null;
    scheduled: number | null;
    due: number | null;
    released: number | null;
    onHold: number | null;
  }>({
    totalEarned: null,
    scheduled: null,
    due: null,
    released: null,
    onHold: null,
  });

  // History List
  const [commissions, setCommissions] = useState<PromoterCommissionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form State for Add / Schedule Commission
  const [commissionSource, setCommissionSource] = useState<"order" | "manual">("order");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [manualAmount, setManualAmount] = useState<string>("");
  const [manualReason, setManualReason] = useState<string>("");
  const [adminNote, setAdminNote] = useState<string>("");
  const [scheduleOption, setScheduleOption] = useState<"today" | "days" | "custom_date">("today");
  const [daysCount, setDaysCount] = useState<number>(5);
  const [customDate, setCustomDate] = useState<string>(moment().add(1, "days").format("YYYY-MM-DD"));
  
  // Review Step for Manual Adjustment
  const [isReviewStep, setIsReviewStep] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modals & Detail State
  const [releaseModalItem, setReleaseModalItem] = useState<PromoterCommissionItem | null>(null);
  const [holdModalItem, setHoldModalItem] = useState<PromoterCommissionItem | null>(null);
  const [detailItem, setDetailItem] = useState<PromoterCommissionItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync initial tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsReviewStep(false);
      setFormError(null);
    }
  }, [isOpen, initialTab]);

  // Fetch promoter commissions & summary from backend
  const fetchPromoterData = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      // 1. Fetch Backend Summary
      const summaryRes = await PromoterCommissionService.getPromoterSummary(user._id);
      setSummary({
        totalEarned: summaryRes.totalEarned,
        scheduled: summaryRes.scheduled,
        due: summaryRes.due,
        released: summaryRes.released,
        onHold: summaryRes.onHold,
      });

      // 2. Fetch Promoter Commissions History
      const commRes = await PromoterCommissionService.getCommissions({
        search: user._id,
        limit: 50,
      });
      setCommissions(commRes.data);
    } catch (err) {
      console.error("Error loading promoter commission data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user?._id) {
      fetchPromoterData();
    }
  }, [isOpen, user, fetchPromoterData]);

  // Derived filtered commissions list for History Tab
  const filteredCommissions = useMemo(() => {
    if (statusFilter === "all") return commissions;
    return commissions.filter((c) => (c.status || "").toUpperCase() === statusFilter.toUpperCase());
  }, [commissions, statusFilter]);

  // Dynamic preview release date for schedule options
  const calculatedReleaseDate = useMemo(() => {
    const today = moment();
    if (scheduleOption === "today") return today.format("DD MMM YYYY");
    if (scheduleOption === "days") {
      const valid = Math.max(1, daysCount || 1);
      return today.clone().add(valid, "days").format("DD MMM YYYY");
    }
    if (scheduleOption === "custom_date") {
      return customDate ? moment(customDate).format("DD MMM YYYY") : "Select date";
    }
    return today.format("DD MMM YYYY");
  }, [scheduleOption, daysCount, customDate]);

  if (!isOpen || !user) return null;

  // Wallet backend metrics display helpers
  const earnedBalance = user.wallet?.earnings !== undefined ? `₹${user.wallet.earnings.toLocaleString("en-IN")}` : "—";
  const withdrawableBalance = user.wallet?.balance !== undefined ? `₹${user.wallet.balance.toLocaleString("en-IN")}` : "—";

  // Handle Add/Schedule Submit
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let releaseDateStr = moment().format("YYYY-MM-DD");
    if (scheduleOption === "days") {
      releaseDateStr = moment().add(daysCount, "days").format("YYYY-MM-DD");
    } else if (scheduleOption === "custom_date") {
      releaseDateStr = customDate;
    }

    if (commissionSource === "manual") {
      if (!manualAmount || Number(manualAmount) <= 0) {
        setFormError("Please enter a valid positive amount.");
        return;
      }
      if (!manualReason.trim()) {
        setFormError("Reason is mandatory for manual commission adjustments.");
        return;
      }

      if (!isReviewStep) {
        setIsReviewStep(true);
        return;
      }

      // Execute Manual Adjustment via Backend API
      setIsSubmitting(true);
      const res = await PromoterCommissionService.createManualAdjustment({
        promoterId: user._id || "",
        amount: Number(manualAmount),
        reason: manualReason.trim(),
        note: adminNote.trim() || undefined,
        scheduleType: scheduleOption,
        releaseDate: releaseDateStr,
      });

      setIsSubmitting(false);
      if (res.success) {
        showToast("Manual commission adjustment created successfully.", "success");
        setIsReviewStep(false);
        setManualAmount("");
        setManualReason("");
        setAdminNote("");
        setActiveTab("history");
        fetchPromoterData();
      } else {
        showToast(res.message, "error");
      }
    } else {
      // Order Based Scheduling
      if (!selectedOrderId) {
        setFormError("Please select an order to schedule commission.");
        return;
      }

      setIsSubmitting(true);
      const res = await PromoterCommissionService.scheduleCommissions({
        commissionIds: [selectedOrderId],
        scheduleType: scheduleOption,
        days: scheduleOption === "days" ? daysCount : undefined,
        releaseDate: releaseDateStr,
        note: adminNote.trim() || undefined,
      });

      setIsSubmitting(false);
      if (res.success) {
        showToast("Order commission scheduled successfully.", "success");
        setSelectedOrderId("");
        setAdminNote("");
        setActiveTab("history");
        fetchPromoterData();
      } else {
        showToast(res.message, "error");
      }
    }
  };

  // Actions
  const handleConfirmRelease = async (items: PromoterCommissionItem[]) => {
    const res = await PromoterCommissionService.releaseCommissions(items);
    if (res.success) {
      showToast("Commission marked as transferred successfully.", "success");
      setReleaseModalItem(null);
      fetchPromoterData();
    } else {
      showToast(res.message, "error");
    }
  };

  const handleConfirmHold = async (payload: { commissionIds: string[]; reason: string; note?: string }) => {
    const res = await PromoterCommissionService.holdCommissions(payload);
    if (res.success) {
      showToast("Commission placed on hold.", "success");
      setHoldModalItem(null);
      fetchPromoterData();
    } else {
      showToast(res.message, "error");
    }
  };

  const handleUnhold = async (item: PromoterCommissionItem) => {
    const res = await PromoterCommissionService.unholdCommissions([item._id]);
    if (res.success) {
      showToast("Commission unheld successfully.", "success");
      fetchPromoterData();
    } else {
      showToast(res.message, "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-100 flex flex-col justify-between">
          
          {/* ── DRAWER HEADER ── */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <FaCoins size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">
                      {user.firstName} {user.lastName}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                      Promoter
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {user.email} • {user.phoneNumber || "No Phone"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Wallet Backend Summary Bar */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Earned Commission</span>
                <span className="font-extrabold text-slate-800 text-sm">{earnedBalance}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Withdrawable Balance</span>
                <span className="font-extrabold text-emerald-600 text-sm">{withdrawableBalance}</span>
              </div>
            </div>
          </div>

          {/* Toast Notification */}
          {toast && (
            <div
              className={`mx-6 mt-4 p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              <span>{toast.message}</span>
              <button onClick={() => setToast(null)}><X size={14} /></button>
            </div>
          )}

          {/* ── 5 SUMMARY CARDS ── */}
          <div className="px-6 pt-5 grid grid-cols-5 gap-2">
            {[
              { label: "Total Earned", value: summary.totalEarned, color: "text-slate-900", bg: "bg-slate-50" },
              { label: "Scheduled", value: summary.scheduled, color: "text-blue-700", bg: "bg-blue-50/50" },
              { label: "Due for Release", value: summary.due, color: "text-amber-800", bg: "bg-amber-50/50" },
              { label: "Released", value: summary.released, color: "text-emerald-700", bg: "bg-emerald-50/50" },
              { label: "On Hold", value: summary.onHold, color: "text-rose-700", bg: "bg-rose-50/50" },
            ].map((card, idx) => (
              <div key={idx} className={`p-2.5 rounded-xl border border-slate-100 ${card.bg} text-center space-y-0.5`}>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                  {card.label}
                </span>
                <span className={`text-xs font-extrabold block truncate ${card.color}`}>
                  {card.value !== null && card.value !== undefined ? `₹${card.value.toLocaleString("en-IN")}` : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* ── TAB SELECTOR ── */}
          <div className="px-6 pt-4 pb-2 flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab("add")}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "add" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Plus size={14} /> Add / Schedule Commission
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <History size={14} /> Commission History
            </button>
          </div>

          {/* ── DRAWER BODY CONTENT ── */}
          <div className="p-6 overflow-y-auto flex-1 text-xs">
            {activeTab === "add" ? (
              /* TAB 1: ADD / SCHEDULE COMMISSION */
              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {isReviewStep ? (
                  /* Review Summary Step for Manual Adjustment */
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-amber-900 font-bold border-b border-amber-200/80 pb-2">
                        <Info size={16} className="text-amber-600" />
                        <span>Manual Adjustment Pre-Confirmation Review</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[11px] font-medium text-slate-700">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase block">Promoter</span>
                          <span className="font-bold text-slate-900">{user.firstName} {user.lastName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase block">Amount</span>
                          <span className="font-extrabold text-amber-700 text-sm">₹{Number(manualAmount).toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase block">Source Type</span>
                          <span className="font-bold text-blue-700">MANUAL_ADJUSTMENT</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase block">Scheduled Release</span>
                          <span className="font-bold text-slate-900">{calculatedReleaseDate}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 text-[10px] uppercase block">Mandatory Reason</span>
                          <span className="font-bold text-slate-800">{manualReason}</span>
                        </div>
                        {adminNote && (
                          <div className="col-span-2">
                            <span className="text-slate-400 text-[10px] uppercase block">Admin Note</span>
                            <span className="text-slate-700 italic">{adminNote}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsReviewStep(false)}
                        disabled={isSubmitting}
                        className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                      >
                        Back to Edit
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-60"
                      >
                        {isSubmitting ? "Submitting..." : "Confirm & Submit Adjustment"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Form Inputs */
                  <>
                    {/* Source Selection */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Commission Source
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                            commissionSource === "order"
                              ? "border-blue-500 bg-blue-50/40 text-blue-900 font-bold"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="source"
                            value="order"
                            checked={commissionSource === "order"}
                            onChange={() => setCommissionSource("order")}
                            className="accent-blue-600 cursor-pointer"
                          />
                          <span>Order Based</span>
                        </label>
                        <label
                          className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                            commissionSource === "manual"
                              ? "border-amber-500 bg-amber-50/40 text-amber-900 font-bold"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="source"
                            value="manual"
                            checked={commissionSource === "manual"}
                            onChange={() => setCommissionSource("manual")}
                            className="accent-amber-600 cursor-pointer"
                          />
                          <span>Manual Adjustment</span>
                        </label>
                      </div>
                    </div>

                    {/* Order Based Options */}
                    {commissionSource === "order" ? (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Select Order / Commission Item
                        </label>
                        <select
                          value={selectedOrderId}
                          onChange={(e) => setSelectedOrderId(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                          <option value="">-- Choose eligible order commission --</option>
                          {commissions.map((c) => (
                            <option key={c._id} value={c._id}>
                              #{c.numericOrderId} — ₹{c.commissionAmount.toLocaleString()} ({c.commissionPercentage}%) — {c.status}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      /* Manual Adjustment Options */
                      <div className="space-y-3 p-3 bg-amber-50/40 border border-amber-100 rounded-xl">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Adjustment Amount (₹) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 2500"
                            value={manualAmount}
                            onChange={(e) => setManualAmount(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Reason for Adjustment <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={manualReason}
                            onChange={(e) => setManualReason(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                          >
                            <option value="">-- Select mandatory reason --</option>
                            <option value="Campaign Bonus Payout">Campaign Bonus Payout</option>
                            <option value="Top Referral Performance Reward">Top Referral Performance Reward</option>
                            <option value="Dispute Settlement Correction">Dispute Settlement Correction</option>
                            <option value="Manual Verification Approval">Manual Verification Approval</option>
                            <option value="Other Audit Correction">Other Audit Correction</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Release Schedule */}
                    <div className="space-y-2 pt-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Release Schedule
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl bg-white cursor-pointer text-xs font-semibold">
                          <input
                            type="radio"
                            name="schedule"
                            value="today"
                            checked={scheduleOption === "today"}
                            onChange={() => setScheduleOption("today")}
                            className="accent-blue-600"
                          />
                          <span>Release Today</span>
                        </label>

                        <label className="flex items-center justify-between p-2.5 border border-slate-200 rounded-xl bg-white cursor-pointer text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="schedule"
                              value="days"
                              checked={scheduleOption === "days"}
                              onChange={() => setScheduleOption("days")}
                              className="accent-blue-600"
                            />
                            <span>After X Days</span>
                          </div>
                          {scheduleOption === "days" && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                value={daysCount}
                                onChange={(e) => setDaysCount(parseInt(e.target.value) || 1)}
                                className="w-16 p-1 border border-slate-300 rounded text-center text-xs font-bold"
                              />
                              <span className="text-slate-500 text-[11px]">Days</span>
                            </div>
                          )}
                        </label>

                        <label className="flex items-center justify-between p-2.5 border border-slate-200 rounded-xl bg-white cursor-pointer text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="schedule"
                              value="custom_date"
                              checked={scheduleOption === "custom_date"}
                              onChange={() => setScheduleOption("custom_date")}
                              className="accent-blue-600"
                            />
                            <span>Custom Date</span>
                          </div>
                          {scheduleOption === "custom_date" && (
                            <input
                              type="date"
                              value={customDate}
                              onChange={(e) => setCustomDate(e.target.value)}
                              className="p-1 border border-slate-300 rounded text-xs bg-white"
                            />
                          )}
                        </label>
                      </div>
                      <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between text-xs font-semibold text-blue-800">
                        <span>Calculated Release Date:</span>
                        <span className="font-mono font-extrabold text-blue-900">{calculatedReleaseDate}</span>
                      </div>
                    </div>

                    {/* Admin Note */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Admin Note (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Additional operational context or admin notes..."
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      {commissionSource === "manual" ? "Review Adjustment Summary" : "Schedule Commission"}
                    </button>
                  </>
                )}
              </form>
            ) : (
              /* TAB 2: COMMISSION HISTORY */
              <div className="space-y-4">
                {/* Filter Toolbar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {["all", "pending", "scheduled", "due", "released", "hold"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                        statusFilter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
                  <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3">Commission ID</th>
                        <th className="py-3 px-3">Source</th>
                        <th className="py-3 px-3 text-right">Amount</th>
                        <th className="py-3 px-3">Release Date</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {loading ? (
                        [...Array(4)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td colSpan={6} className="py-3 px-3"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                          </tr>
                        ))
                      ) : filteredCommissions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                            No commission records found.
                          </td>
                        </tr>
                      ) : (
                        filteredCommissions.map((c) => {
                          const badge = getStatusBadge(c.status);
                          return (
                            <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-slate-800">{c._id}</td>
                              <td className="py-3 px-3">
                                {c.numericOrderId ? (
                                  <span className="font-semibold text-slate-700">Order #{c.numericOrderId}</span>
                                ) : (
                                  <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                                    MANUAL_ADJUSTMENT
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-extrabold text-emerald-600">
                                ₹{c.commissionAmount ? c.commissionAmount.toLocaleString("en-IN") : "—"}
                              </td>
                              <td className="py-3 px-3 text-slate-500">
                                {c.scheduledDate ? moment(c.scheduledDate).format("DD MMM YYYY") : "—"}
                              </td>
                              <td className="py-3 px-3">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${badge.class}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => setDetailItem(c)}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                                    title="View Breakdown"
                                  >
                                    <Eye size={14} />
                                  </button>

                                  {(c.status === "DUE" || c.status === "SCHEDULED") && (
                                    <button
                                      onClick={() => setReleaseModalItem(c)}
                                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer"
                                    >
                                      Release
                                    </button>
                                  )}

                                  {c.status === "HOLD" ? (
                                    <button
                                      onClick={() => handleUnhold(c)}
                                      className="px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded cursor-pointer flex items-center gap-0.5"
                                    >
                                      <RotateCcw size={10} /> Unhold
                                    </button>
                                  ) : (
                                    c.status !== "RELEASED" && (
                                      <button
                                        onClick={() => setHoldModalItem(c)}
                                        className="p-1 text-amber-600 hover:text-amber-800 rounded cursor-pointer"
                                        title="Hold"
                                      >
                                        <ShieldAlert size={14} />
                                      </button>
                                    )
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modals & Detail Drawer */}
      <ReleaseCommissionModal
        isOpen={Boolean(releaseModalItem)}
        selectedItems={releaseModalItem ? [releaseModalItem] : []}
        onClose={() => setReleaseModalItem(null)}
        onConfirmRelease={handleConfirmRelease}
      />

      <HoldCommissionModal
        isOpen={Boolean(holdModalItem)}
        selectedItems={holdModalItem ? [holdModalItem] : []}
        onClose={() => setHoldModalItem(null)}
        onConfirmHold={handleConfirmHold}
      />

      <CommissionDetailDrawer
        isOpen={Boolean(detailItem)}
        commission={detailItem}
        onClose={() => setDetailItem(null)}
        onRelease={(item) => {
          setDetailItem(null);
          setReleaseModalItem(item);
        }}
        onHold={(item) => {
          setDetailItem(null);
          setHoldModalItem(item);
        }}
        onUnhold={(item) => {
          setDetailItem(null);
          handleUnhold(item);
        }}
      />
    </div>
  );
};
