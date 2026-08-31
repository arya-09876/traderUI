import React, { useState, useEffect, useMemo, useCallback } from "react";
import Breadcrumb from "../components/Breadcrumb";
import moment from "moment";
import {
  PromoterCommissionItem,
  PromoterCommissionService,
  BulkReleaseResultItem,
} from "../services/PromoterCommissionService";
import { hasPermission } from "../utils/permission";
import {
  Search,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Eye,
  ShieldAlert,
  Wallet,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { FaCoins } from "react-icons/fa";

// Modals & Drawers
import { ScheduleCommissionModal } from "../components/commission/ScheduleCommissionModal";
import { ReleaseCommissionModal } from "../components/commission/ReleaseCommissionModal";
import { HoldCommissionModal } from "../components/commission/HoldCommissionModal";
import { CommissionDetailDrawer } from "../components/commission/CommissionDetailDrawer";

export const PromoterCommissionRelease: React.FC = () => {
  // Authorization Check
  const canManageCommissions = hasPermission("promoter_commission_release");

  // Main Data States
  const [commissions, setCommissions] = useState<PromoterCommissionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"pending" | "scheduled" | "due" | "released" | "hold">("pending");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [promoterFilter, setPromoterFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Checkbox Selections
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // Modal / Drawer States
  const [scheduleModalState, setScheduleModalState] = useState<{
    isOpen: boolean;
    items: PromoterCommissionItem[];
    isProcessing: boolean;
  }>({ isOpen: false, items: [], isProcessing: false });

  const [releaseModalState, setReleaseModalState] = useState<{
    isOpen: boolean;
    items: PromoterCommissionItem[];
    isProcessing: boolean;
    bulkResults: BulkReleaseResultItem[] | null;
  }>({ isOpen: false, items: [], isProcessing: false, bulkResults: null });

  const [holdModalState, setHoldModalState] = useState<{
    isOpen: boolean;
    items: PromoterCommissionItem[];
    isProcessing: boolean;
  }>({ isOpen: false, items: [], isProcessing: false });

  const [detailDrawerItem, setDetailDrawerItem] = useState<PromoterCommissionItem | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch Data from Service / API
  const fetchCommissions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await PromoterCommissionService.getCommissions({
        status: activeTab,
        search: searchQuery,
        page,
        limit: 10,
        startDate,
        endDate,
      });

      setCommissions(res.data);
      setPagination(res.pagination);

      if (!res.backendSupported) {
        setApiNotice("Notice: Primary POST/PUT commission endpoints require backend implementation. Extracted live order commission items for inspection.");
      } else if (!canManageCommissions) {
        setApiNotice("Notice: You are in read-only view. Release and Schedule controls require promoter_commission_release permission.");
      } else {
        setApiNotice(null);
      }
    } catch (err) {
      console.error("Error fetching commissions:", err);
      showToast("Unable to load promoter commissions.", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
    fetchCommissions(1);
  }, [activeTab, searchQuery, startDate, endDate, fetchCommissions]);

  // Page level Stats calculation
  const summaryStats = useMemo(() => {
    const pendingItems = commissions.filter((c) => c.status === "PENDING");
    const scheduledItems = commissions.filter((c) => c.status === "SCHEDULED");
    const dueItems = commissions.filter((c) => c.status === "DUE");
    const releasedItems = commissions.filter((c) => c.status === "RELEASED");

    const pendingTotal = pendingItems.reduce((s, i) => s + (i.commissionAmount || 0), 0);
    const scheduledTotal = scheduledItems.reduce((s, i) => s + (i.commissionAmount || 0), 0);
    const dueTotal = dueItems.reduce((s, i) => s + (i.commissionAmount || 0), 0);
    const releasedTotal = releasedItems.reduce((s, i) => s + (i.commissionAmount || 0), 0);

    return {
      pending: { count: pendingItems.length, total: pendingTotal },
      scheduled: { count: scheduledItems.length, total: scheduledTotal },
      due: { count: dueItems.length, total: dueTotal },
      released: { count: releasedItems.length, total: releasedTotal },
    };
  }, [commissions]);

  // Filtered List based on tab and client search
  const displayCommissions = useMemo(() => {
    return commissions.filter((c) => {
      // Tab matching
      if (activeTab === "pending" && c.status !== "PENDING") return false;
      if (activeTab === "scheduled" && c.status !== "SCHEDULED") return false;
      if (activeTab === "due" && c.status !== "DUE") return false;
      if (activeTab === "released" && c.status !== "RELEASED") return false;
      if (activeTab === "hold" && c.status !== "HOLD") return false;

      // Promoter filter
      if (promoterFilter && !c.promoterName.toLowerCase().includes(promoterFilter.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [commissions, activeTab, promoterFilter]);

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(displayCommissions.map((c) => c._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  // 1. EXECUTE SCHEDULE ACTION
  const handleConfirmSchedule = async (payload: {
    commissionIds: string[];
    scheduleType: "today" | "days" | "custom_date";
    days?: number;
    releaseDate?: string;
    note?: string;
  }) => {
    setScheduleModalState((prev) => ({ ...prev, isProcessing: true }));

    const res = await PromoterCommissionService.scheduleCommissions(payload);

    if (res.success && res.backendSupported) {
      showToast(`Successfully scheduled ${payload.commissionIds.length} commission(s).`, "success");
      setScheduleModalState({ isOpen: false, items: [], isProcessing: false });
      setSelectedIds([]);
      fetchCommissions(currentPage);
    } else {
      // Backend support required notice
      showToast(res.message, "error");
      setScheduleModalState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // 2. EXECUTE RELEASE ACTION
  const handleConfirmRelease = async (items: PromoterCommissionItem[]) => {
    setReleaseModalState((prev) => ({ ...prev, isProcessing: true }));

    const res = await PromoterCommissionService.releaseCommissions(items);

    if (res.success && res.backendSupported) {
      showToast(res.message, "success");
      setReleaseModalState({
        isOpen: true,
        items: releaseModalState.items,
        isProcessing: false,
        bulkResults: res.results,
      });
      setSelectedIds([]);
      fetchCommissions(currentPage);
    } else {
      // Show per-record failure summary or API error
      setReleaseModalState({
        isOpen: true,
        items: releaseModalState.items,
        isProcessing: false,
        bulkResults: res.results,
      });
      showToast(res.message, "error");
    }
  };

  // 3. EXECUTE HOLD ACTION
  const handleConfirmHold = async (payload: { commissionIds: string[]; reason: string; note?: string }) => {
    setHoldModalState((prev) => ({ ...prev, isProcessing: true }));

    const res = await PromoterCommissionService.holdCommissions(payload);

    if (res.success && res.backendSupported) {
      showToast(`Placed ${payload.commissionIds.length} commission(s) on hold.`, "success");
      setHoldModalState({ isOpen: false, items: [], isProcessing: false });
      setSelectedIds([]);
      fetchCommissions(currentPage);
    } else {
      showToast(res.message, "error");
      setHoldModalState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  // 4. EXECUTE UNHOLD / RESUME ACTION
  const handleUnholdCommission = async (item: PromoterCommissionItem) => {
    const res = await PromoterCommissionService.unholdCommissions([item._id]);
    if (res.success && res.backendSupported) {
      showToast(`Commission #${item._id} unheld and restored to ${item.previousStatus || "PENDING"}.`, "success");
      if (detailDrawerItem?._id === item._id) setDetailDrawerItem(null);
      fetchCommissions(currentPage);
    } else {
      showToast(res.message, "error");
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setPromoterFilter("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 min-h-screen bg-slate-50/50">
      {/* ── Breadcrumb & Header ── */}
      <div className="bg-white rounded-2xl px-5 py-4 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: "Dashboard", to: "/dashboard" },
              { label: "Wallet Module", to: "/wallet/dashboard" },
              { label: "Promoter Commission", to: "/wallet/promoter-commission" },
            ]}
          />
          <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight flex items-center gap-2">
            <FaCoins className="text-amber-500" />
            Promoter Commission
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage, schedule and manually release promoter commissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchCommissions(currentPage)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-md animate-in slide-in-from-top-2 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : toast.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-blue-50 text-blue-800 border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : toast.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-blue-600" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Backend API Notice Banner */}
      {apiNotice && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{apiNotice}</span>
          </div>
          <span className="text-[10px] uppercase font-bold bg-amber-200/80 px-2 py-0.5 rounded text-amber-900">
            Read Only Mode
          </span>
        </div>
      )}

      {/* ── Top Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Pending Commission */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Commission</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {loading ? "—" : summaryStats.pending.total > 0 ? `₹${summaryStats.pending.total.toLocaleString("en-IN")}` : "No data available"}
          </p>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">
            {loading ? "—" : `${summaryStats.pending.count} records pending schedule`}
          </p>
        </div>

        {/* 2. Scheduled Commission */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Scheduled Commission</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-blue-900">
            {loading ? "—" : summaryStats.scheduled.total > 0 ? `₹${summaryStats.scheduled.total.toLocaleString("en-IN")}` : "No data available"}
          </p>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">
            {loading ? "—" : `${summaryStats.scheduled.count} records future scheduled`}
          </p>
        </div>

        {/* 3. Due for Release */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Due for Release</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-900">
            {loading ? "—" : summaryStats.due.total > 0 ? `₹${summaryStats.due.total.toLocaleString("en-IN")}` : "No data available"}
          </p>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">
            {loading ? "—" : `${summaryStats.due.count} records awaiting manual release`}
          </p>
        </div>

        {/* 4. Released Commission */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Released Commission</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-900">
            {loading ? "—" : summaryStats.released.total > 0 ? `₹${summaryStats.released.total.toLocaleString("en-IN")}` : "No data available"}
          </p>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">
            {loading ? "—" : `${summaryStats.released.count} records credited to promoter wallets`}
          </p>
        </div>
      </div>

      {/* ── DUE TAB TOP OPERATIONAL BANNER ── */}
      {activeTab === "due" && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                Admin Control Room
              </span>
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Commissions Due for Release</h2>
            <p className="text-xs text-amber-100">
              The scheduled release dates have arrived. Verify commission parameters and confirm manual release to promoter wallets.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/20">
            <div>
              <span className="text-[10px] font-bold text-amber-200 uppercase block">Total Due Amount</span>
              <span className="text-xl font-extrabold">₹{summaryStats.due.total.toLocaleString("en-IN")}</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <span className="text-[10px] font-bold text-amber-200 uppercase block">Due Records</span>
              <span className="text-xl font-extrabold">{summaryStats.due.count}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT CONTAINER: TABS, FILTERS & TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-5">
        {/* Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto scrollbar-none">
          {[
            { id: "pending", label: "Eligible", count: summaryStats.pending.count },
            { id: "scheduled", label: "Scheduled", count: summaryStats.scheduled.count },
            { id: "due", label: "Due", count: summaryStats.due.count },
            { id: "released", label: "Transferred", count: summaryStats.released.count },
            { id: "hold", label: "On Hold", count: commissions.filter((c) => c.status === "HOLD" || c.status === "ON_HOLD").length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Commission ID, Order ID, Promoter Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 bg-slate-50/50 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
            />
          </div>

          {/* Filter Toolbar controls */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            {/* Promoter Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Filter size={10} /> Promoter:
              </span>
              <input
                type="text"
                placeholder="Filter by promoter..."
                value={promoterFilter}
                onChange={(e) => setPromoterFilter(e.target.value)}
                className="p-1.5 border border-slate-200 rounded-xl bg-slate-50/50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2 border border-slate-200 p-1.5 rounded-xl bg-slate-50/50">
              <span className="text-[10px] text-slate-400 uppercase">Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-700 outline-none text-xs cursor-pointer"
              />
              <span className="text-slate-300">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-700 outline-none text-xs cursor-pointer"
              />
            </div>

            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer px-2 py-1"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* ── ENTERPRISE DATA TABLE ── */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
          <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                {/* Checkbox Column for Pending & Due */}
                {(activeTab === "pending" || activeTab === "due") && (
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={displayCommissions.length > 0 && selectedIds.length === displayCommissions.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 accent-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
                    />
                  </th>
                )}
                <th className="py-3.5 px-4">Commission ID</th>
                <th className="py-3.5 px-4">Order Details</th>
                <th className="py-3.5 px-4">Promoter Details</th>
                <th className="py-3.5 px-4 text-right">Commission Amount</th>

                {/* Tab Specific Columns */}
                {activeTab === "pending" && (
                  <>
                    <th className="py-3.5 px-4">Order Status</th>
                    <th className="py-3.5 px-4">Eligible From</th>
                  </>
                )}

                {activeTab === "scheduled" && (
                  <>
                    <th className="py-3.5 px-4">Scheduled Date</th>
                    <th className="py-3.5 px-4">Scheduled By</th>
                    <th className="py-3.5 px-4">Scheduled At</th>
                  </>
                )}

                {activeTab === "due" && (
                  <>
                    <th className="py-3.5 px-4">Release Date</th>
                    <th className="py-3.5 px-4">Overdue Status</th>
                  </>
                )}

                {activeTab === "released" && (
                  <>
                    <th className="py-3.5 px-4">Released Date</th>
                    <th className="py-3.5 px-4">Released By</th>
                    <th className="py-3.5 px-4">Wallet Tx ID</th>
                  </>
                )}

                {activeTab === "hold" && (
                  <>
                    <th className="py-3.5 px-4">Held By / At</th>
                    <th className="py-3.5 px-4">Hold Reason</th>
                  </>
                )}

                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>

            {loading ? (
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="py-4 px-4">
                      <div className="h-5 bg-slate-100 rounded-lg w-full" />
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : displayCommissions.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400 font-semibold">
                    {activeTab === "pending" && "No pending commissions"}
                    {activeTab === "scheduled" && "No scheduled commissions"}
                    {activeTab === "due" && "No commissions are due for release"}
                    {activeTab === "released" && "No released commissions found"}
                    {activeTab === "hold" && "No commissions are currently on hold"}
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {displayCommissions.map((comm) => {
                  const isSelected = selectedIds.includes(comm._id);
                  const isOverdue =
                    activeTab === "due" &&
                    comm.scheduledDate &&
                    moment(comm.scheduledDate).isBefore(moment(), "day");

                  return (
                    <tr
                      key={comm._id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? "bg-blue-50/20" : isOverdue ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Checkbox Column */}
                      {(activeTab === "pending" || activeTab === "due") && (
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(comm._id, e.target.checked)}
                            className="rounded border-slate-300 accent-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
                          />
                        </td>
                      )}

                      {/* Commission ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {comm._id}
                      </td>

                      {/* Order Details */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-mono font-bold text-slate-800">#{comm.numericOrderId}</p>
                          <p className="text-[10px] text-slate-400">Val: ₹{comm.orderValue.toLocaleString("en-IN")}</p>
                        </div>
                      </td>

                      {/* Promoter Details */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-900">{comm.promoterName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{comm.promoterPhone}</p>
                        </div>
                      </td>

                      {/* Commission Amount */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 text-sm">
                        ₹{comm.commissionAmount.toLocaleString("en-IN")}
                        <span className="text-[10px] font-normal text-slate-400 block">{comm.commissionPercentage}% Rate</span>
                      </td>

                      {/* Pending Tab columns */}
                      {activeTab === "pending" && (
                        <>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {comm.orderStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {moment(comm.eligibleFrom).format("DD MMM YYYY")}
                          </td>
                        </>
                      )}

                      {/* Scheduled Tab columns */}
                      {activeTab === "scheduled" && (
                        <>
                          <td className="py-3.5 px-4 font-bold text-blue-600">
                            {comm.scheduledDate ? moment(comm.scheduledDate).format("DD MMM YYYY") : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{comm.scheduledBy || "Admin"}</td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {comm.scheduledAt ? moment(comm.scheduledAt).format("DD MMM YYYY") : "—"}
                          </td>
                        </>
                      )}

                      {/* Due Tab columns */}
                      {activeTab === "due" && (
                        <>
                          <td className="py-3.5 px-4 font-bold text-amber-700">
                            {comm.scheduledDate ? moment(comm.scheduledDate).format("DD MMM YYYY") : "Today"}
                          </td>
                          <td className="py-3.5 px-4">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                ⚠️ {moment().diff(moment(comm.scheduledDate), "days")} Days Overdue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700">
                                Due Today
                              </span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Released Tab columns */}
                      {activeTab === "released" && (
                        <>
                          <td className="py-3.5 px-4 font-semibold text-emerald-800">
                            {comm.releasedDate ? moment(comm.releasedDate).format("DD MMM YYYY HH:mm") : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{comm.releasedBy || "Super Admin"}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                            {comm.walletTransactionId || "—"}
                          </td>
                        </>
                      )}

                      {/* Hold Tab columns */}
                      {activeTab === "hold" && (
                        <>
                          <td className="py-3.5 px-4 text-slate-600">
                            {comm.heldBy || "Admin"}
                            <span className="text-[10px] text-slate-400 block">
                              {comm.heldAt ? moment(comm.heldAt).format("DD MMM YYYY") : ""}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-amber-800">{comm.holdReason || "Manual Review"}</td>
                        </>
                      )}

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            comm.status === "RELEASED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : comm.status === "DUE"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : comm.status === "SCHEDULED"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : comm.status === "HOLD"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {comm.status}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Detail Drawer */}
                          <button
                            onClick={() => setDetailDrawerItem(comm)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            title="View Commission Details"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Action button based on tab */}
                          {activeTab === "pending" && (
                            <button
                              onClick={() => setScheduleModalState({ isOpen: true, items: [comm], isProcessing: false })}
                              className="px-2.5 py-1 text-2xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-2xs cursor-pointer"
                            >
                              Schedule
                            </button>
                          )}

                          {activeTab === "scheduled" && (
                            <button
                              onClick={() => setScheduleModalState({ isOpen: true, items: [comm], isProcessing: false })}
                              className="px-2.5 py-1 text-2xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all cursor-pointer"
                            >
                              Edit Schedule
                            </button>
                          )}

                          {activeTab === "due" && (
                            <button
                              onClick={() => setReleaseModalState({ isOpen: true, items: [comm], isProcessing: false, bulkResults: null })}
                              className="px-2.5 py-1 text-2xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-2xs cursor-pointer"
                            >
                              Release
                            </button>
                          )}

                          {activeTab === "hold" ? (
                            <button
                              onClick={() => handleUnholdCommission(comm)}
                              className="px-2.5 py-1 text-2xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              <RotateCcw size={11} /> Unhold
                            </button>
                          ) : (
                            comm.status !== "RELEASED" && (
                              <button
                                onClick={() => setHoldModalState({ isOpen: true, items: [comm], isProcessing: false })}
                                className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                                title="Place on Hold"
                              >
                                <ShieldAlert size={14} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total items)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchCommissions(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={() => fetchCommissions(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── STICKY BULK ACTION BAR ── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center justify-between gap-8 z-40 border border-slate-800 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className="text-sm font-semibold tracking-wide">
              {selectedIds.length} Commission(s) Selected
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex items-center gap-3">
            {activeTab === "pending" && (
              <button
                onClick={() => {
                  const selectedItems = commissions.filter((c) => selectedIds.includes(c._id));
                  setScheduleModalState({ isOpen: true, items: selectedItems, isProcessing: false });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Bulk Schedule ({selectedIds.length})
              </button>
            )}

            {activeTab === "due" && (
              <button
                onClick={() => {
                  const selectedItems = commissions.filter((c) => selectedIds.includes(c._id));
                  setReleaseModalState({ isOpen: true, items: selectedItems, isProcessing: false, bulkResults: null });
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Release Selected ({selectedIds.length})
              </button>
            )}

            <button
              onClick={() => {
                const selectedItems = commissions.filter((c) => selectedIds.includes(c._id));
                setHoldModalState({ isOpen: true, items: selectedItems, isProcessing: false });
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Hold Selected ({selectedIds.length})
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 text-slate-400 hover:text-white text-xs transition cursor-pointer font-semibold"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* ── MODALS & DRAWERS ── */}
      <ScheduleCommissionModal
        isOpen={scheduleModalState.isOpen}
        selectedItems={scheduleModalState.items}
        onClose={() => setScheduleModalState({ isOpen: false, items: [], isProcessing: false })}
        onConfirmSchedule={handleConfirmSchedule}
        isProcessing={scheduleModalState.isProcessing}
      />

      <ReleaseCommissionModal
        isOpen={releaseModalState.isOpen}
        selectedItems={releaseModalState.items}
        onClose={() => setReleaseModalState({ isOpen: false, items: [], isProcessing: false, bulkResults: null })}
        onConfirmRelease={handleConfirmRelease}
        isProcessing={releaseModalState.isProcessing}
        bulkResults={releaseModalState.bulkResults}
      />

      <HoldCommissionModal
        isOpen={holdModalState.isOpen}
        selectedItems={holdModalState.items}
        onClose={() => setHoldModalState({ isOpen: false, items: [], isProcessing: false })}
        onConfirmHold={handleConfirmHold}
        isProcessing={holdModalState.isProcessing}
      />

      <CommissionDetailDrawer
        isOpen={Boolean(detailDrawerItem)}
        commission={detailDrawerItem}
        onClose={() => setDetailDrawerItem(null)}
        onSchedule={(item) => {
          setDetailDrawerItem(null);
          setScheduleModalState({ isOpen: true, items: [item], isProcessing: false });
        }}
        onRelease={(item) => {
          setDetailDrawerItem(null);
          setReleaseModalState({ isOpen: true, items: [item], isProcessing: false, bulkResults: null });
        }}
        onHold={(item) => {
          setDetailDrawerItem(null);
          setHoldModalState({ isOpen: true, items: [item], isProcessing: false });
        }}
        onUnhold={(item) => {
          handleUnholdCommission(item);
        }}
      />
    </div>
  );
};

export default PromoterCommissionRelease;
