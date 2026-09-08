import React, { useState, useEffect } from "react";
import moment from "moment";
import { Link } from "react-router-dom";
import { IUser, Pagination } from "../../types";
import {
  DealOrderItem,
  CommissionSummary,
  DealOrdersService,
  DealsOrdersFilters,
} from "../../services/DealOrdersService";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import OrderStatusTag from "../../utils/OrderStatusTag";
import CardSkeleton from "../CardSkeleton";
import PaginationControl from "../PaginationControl";
import {
  TrendingUp,
  Filter,
  Calendar,
  RotateCcw,
  Eye,
  ShieldCheck,
  Coins,
  Package,
  Layers,
  AlertCircle,
} from "lucide-react";
import { FaRupeeSign } from "react-icons/fa";

interface UserTradeDealHistoryProps {
  user: IUser;
}

export const UserTradeDealHistory: React.FC<UserTradeDealHistoryProps> = ({ user }) => {
  const userId = user._id || (user as any).id || "";

  // Data & Loading States
  const [deals, setDeals] = useState<DealOrderItem[]>([]);
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | undefined>(undefined);
  const [pagination, setPagination] = useState<Pagination>({
    totalCount: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [apiGapNotice, setApiGapNotice] = useState<string | null>(null);

  // Filter States - Default matching working Postman request (2026-01-01 to 2026-12-31)
  const [datePreset, setDatePreset] = useState<"year" | "30days" | "7days" | "custom">("year");
  const [startDate, setStartDate] = useState<string>(
    moment().startOf("year").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState<string>(
    moment().endOf("year").format("YYYY-MM-DD")
  );
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Helper to safely match ID strings or Mongo ID objects
  const matchId = (field: any, targetId: string): boolean => {
    if (!field || !targetId) return false;
    const target = String(targetId).toLowerCase();
    if (typeof field === "string") {
      return field.toLowerCase() === target;
    }
    if (typeof field === "object") {
      if (field._id && typeof field._id === "string") {
        return field._id.toLowerCase() === target;
      }
      if (field.id && typeof field.id === "string") {
        return field.id.toLowerCase() === target;
      }
    }
    return String(field).toLowerCase() === target;
  };

  // Fetch Deals Data from DealOrdersService
  const fetchDeals = async (page = 1) => {
    setIsLoading(true);
    setErrorMsg(null);
    setApiGapNotice(null);
    setValidationError(null);

    // Validate Custom Date Range
    if (datePreset === "custom" && startDate && endDate) {
      if (moment(startDate).isAfter(moment(endDate))) {
        setValidationError("Start date cannot be after end date.");
        setIsLoading(false);
        return;
      }
    }

    // Build clean filter parameters matching working Postman API structure
    const filters: DealsOrdersFilters = {
      page,
      limit: pagination.limit,
    };
    if (userId) {
      filters.userId = userId;
    }

    if (startDate) {
      filters.startDate = moment(startDate).format("YYYY-MM-DD");
    }
    if (endDate) {
      filters.endDate = moment(endDate).format("YYYY-MM-DD");
    }

    if (commissionStatusFilter === "transferred") {
      filters.commissionTransferred = true;
    } else if (commissionStatusFilter === "not_transferred") {
      filters.commissionTransferred = false;
    }

    if (roleFilter && roleFilter !== "all") {
      filters.isPromotorOrConnector = roleFilter;
    }

    if (orderStatusFilter !== "all") {
      filters.status = orderStatusFilter;
    }

    console.log("UserTradeDealHistory fetching deals for user:", userId, "with filters:", filters);
    const res = await DealOrdersService.getDealsOrders(filters);
    console.log("UserTradeDealHistory received response:", res);

    setIsLoading(false);

    if (res.success) {
      const rawData = res.data || [];

      // Filter rawData specifically for selected user's relationship
      const userMatchedDeals = userId
        ? rawData.filter((item) => {
            const isBuyer = matchId(item.userId || (item as any).user || (item as any).buyerId || (item as any).buyer, userId);
            const isSeller = matchId(item.sellerId || (item as any).seller, userId);
            const isPromoter = matchId(item.promoterId || (item as any).promoter, userId);
            const isConnector = matchId(item.connectorId || (item as any).connector, userId);

            if (roleFilter === "promoter") return isPromoter;
            if (roleFilter === "connector") return isConnector;
            if (roleFilter === "seller") return isSeller;
            if (roleFilter === "buyer") return isBuyer;

            return isBuyer || isSeller || isPromoter || isConnector;
          })
        : rawData;

      setDeals(userMatchedDeals);
      const effectiveTotal = (userId && rawData.length !== userMatchedDeals.length)
        ? userMatchedDeals.length
        : (res.pagination?.totalCount ?? userMatchedDeals.length);

      setPagination({
        page,
        limit: pagination.limit,
        totalCount: effectiveTotal,
        totalPages: Math.max(1, Math.ceil(effectiveTotal / pagination.limit)),
      });
      setCommissionSummary(res.commissionSummary);
    } else {
      setDeals([]);
      setErrorMsg(res.message || "Failed to load trade and deal history.");
      if (res.apiGapNotice) {
        setApiGapNotice(res.apiGapNotice);
      }
    }
  };

  useEffect(() => {
    setDeals([]);
    fetchDeals(1);
  }, [userId, startDate, endDate, commissionStatusFilter, roleFilter, orderStatusFilter]);

  // Date Preset Switcher Handler
  const handlePresetChange = (preset: "year" | "30days" | "7days" | "custom") => {
    setDatePreset(preset);
    setValidationError(null);

    if (preset === "year") {
      setStartDate(moment().startOf("year").format("YYYY-MM-DD"));
      setEndDate(moment().endOf("year").format("YYYY-MM-DD"));
    } else if (preset === "30days") {
      setStartDate(moment().subtract(30, "days").format("YYYY-MM-DD"));
      setEndDate(moment().format("YYYY-MM-DD"));
    } else if (preset === "7days") {
      setStartDate(moment().subtract(7, "days").format("YYYY-MM-DD"));
      setEndDate(moment().format("YYYY-MM-DD"));
    }
  };

  const handleResetFilters = () => {
    setDatePreset("year");
    setStartDate(moment().startOf("year").format("YYYY-MM-DD"));
    setEndDate(moment().endOf("year").format("YYYY-MM-DD"));
    setCommissionStatusFilter("all");
    setRoleFilter("all");
    setOrderStatusFilter("all");
    setValidationError(null);
  };

  const onPageChange = (page: number) => {
    fetchDeals(page);
  };

  // Compute summary totals strictly from filtered deals of the currently selected user
  const displayTotalDeals = pagination.totalCount ?? deals.length;

  const displayTradeValue = deals.reduce((sum, d) => {
    const amount = d.totalAmount || (d.lot?.price ? d.lot.price * (d.quantity || 1) : 0);
    return sum + amount;
  }, 0);

  const displayPromoterCommission = userId
    ? deals.reduce((sum, d) => {
        if (matchId(d.promoterId || (d as any).promoter, userId)) {
          return sum + (d.promoterCommission || 0);
        }
        return sum;
      }, 0)
    : (commissionSummary?.totalPromoterCommission ?? deals.reduce((sum, d) => sum + (d.promoterCommission || 0), 0));

  const displayConnectorCommission = userId
    ? deals.reduce((sum, d) => {
        if (matchId(d.connectorId || (d as any).connector, userId)) {
          return sum + (d.connectorCommission || 0);
        }
        return sum;
      }, 0)
    : (commissionSummary?.totalConnectorCommission ?? deals.reduce((sum, d) => sum + (d.connectorCommission || 0), 0));

  const displayTotalCommission = userId
    ? (displayPromoterCommission + displayConnectorCommission)
    : (commissionSummary?.total ?? commissionSummary?.totalCommission ?? (displayPromoterCommission + displayConnectorCommission));

  const getUserRoleLabel = (deal: DealOrderItem): string => {
    if (userId) {
      const roles: string[] = [];
      if (matchId(deal.promoterId || (deal as any).promoter, userId)) roles.push("Promoter");
      if (matchId(deal.connectorId || (deal as any).connector, userId)) roles.push("Connector");
      if (matchId(deal.sellerId || (deal as any).seller, userId)) roles.push("Seller");
      if (matchId(deal.userId || (deal as any).user, userId)) roles.push("Buyer");

      if (roles.length > 0) return roles.join(" / ");
    }
    if (deal.promoterId && deal.promoterCommission && deal.promoterCommission > 0) return "Promoter";
    if (deal.connectorId && deal.connectorCommission && deal.connectorCommission > 0) return "Connector";
    return deal.userRole || user.role?.[0] || "User";
  };

  return (
    <div className="space-y-6">
      {/* ── SECURITY GUARANTEE BANNER ── */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs text-blue-900 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div>
            <p className="font-bold">Admin Authorization Security Guarantee</p>
            <p className="text-[11px] text-blue-700 font-normal mt-0.5">
              Zero user token impersonation. Calls <code>GET /api/order/deals-orders</code> using the authenticated Super Admin session token only.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 bg-blue-200/70 text-blue-900 text-[10px] font-extrabold rounded-full uppercase border border-blue-300/60 hidden sm:inline-block">
          Admin Verified
        </span>
      </div>

      {/* ── SUMMARY METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Deals */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3.5 group">
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-blue-100/50">
            <Package size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Deals</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">
              {isLoading ? "..." : displayTotalDeals}
            </h3>
          </div>
        </div>

        {/* Total Trade Value */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3.5 group">
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-emerald-100/50">
            <FaRupeeSign size={17} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Trade Value</p>
            <h3 className="text-xl font-black text-emerald-600 mt-0.5">
              {isLoading ? "..." : formatCurrency(displayTradeValue)}
            </h3>
          </div>
        </div>

        {/* Promoter Commission */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3.5 group">
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-amber-100/50">
            <Coins size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Promoter Commission</p>
            <h3 className="text-xl font-black text-amber-600 mt-0.5">
              {isLoading ? "..." : formatCurrency(displayPromoterCommission)}
            </h3>
          </div>
        </div>

        {/* Connector Commission */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3.5 group">
          <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-purple-100/50">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Connector Commission</p>
            <h3 className="text-xl font-black text-purple-600 mt-0.5">
              {isLoading ? "..." : formatCurrency(displayConnectorCommission)}
            </h3>
          </div>
        </div>

        {/* Total Commission */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3.5 group">
          <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-indigo-100/50">
            <Coins size={18} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Commission</p>
            <h3 className="text-xl font-black text-indigo-600 mt-0.5">
              {isLoading ? "..." : formatCurrency(displayTotalCommission)}
            </h3>
          </div>
        </div>
      </div>

      {/* ── FILTER TOOLBAR & CONTROLS ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between border-b border-slate-100 pb-4">
          {/* Header Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase">
                Trade & Deal History Filter Control
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Server-side paginated queries for user <span className="font-mono font-bold text-slate-600">({userId})</span>
              </p>
            </div>
          </div>

          {/* Date Range Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60 text-xs font-bold">
            {(["year", "30days", "7days", "custom"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer capitalize ${
                  datePreset === preset
                    ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {preset === "year"
                  ? "This Year"
                  : preset === "30days"
                  ? "Last 30 Days"
                  : preset === "7days"
                  ? "Last 7 Days"
                  : "Custom Date"}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Filters Grid */}
        <div className="flex flex-wrap gap-4 items-center justify-between text-xs font-semibold">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Commission Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Coins size={10} /> Commission
              </span>
              <select
                value={commissionStatusFilter}
                onChange={(e) => setCommissionStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer text-xs font-semibold"
              >
                <option value="all">All Commissions</option>
                <option value="transferred">Transferred Only</option>
                <option value="not_transferred">Not Transferred Only</option>
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp size={10} /> User Role
              </span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer text-xs font-semibold"
              >
                <option value="all">All Roles</option>
                <option value="promoter">Promoter</option>
                <option value="connector">Connector</option>
              </select>
            </div>

            {/* Order Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Filter size={10} /> Order Status
              </span>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer text-xs font-semibold"
              >
                <option value="all">All Statuses</option>
                <option value="0">Pending</option>
                <option value="1">Approved</option>
                <option value="4">Delivered</option>
                <option value="3">Cancelled</option>
                <option value="5">RTO</option>
              </select>
            </div>
          </div>

          {/* Date Picker Custom inputs */}
          <div className="flex items-center gap-3">
            {datePreset === "custom" && (
              <div className="flex items-center gap-2 border border-slate-200/80 px-3 py-1.5 rounded-xl bg-slate-50">
                <Calendar size={11} className="text-slate-400" />
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-slate-700 outline-none cursor-pointer text-xs font-medium"
                  />
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-slate-700 outline-none cursor-pointer text-xs font-medium"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleResetFilters}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* ── API GAP / BACKEND NOTICE BANNER ── */}
      {apiGapNotice && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1.5 text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
            <span>Backend Authorization / Endpoint Notice</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800">{apiGapNotice}</p>
          <p className="text-[10px] text-amber-700 font-mono">
            Target Endpoint: GET /api/order/deals-orders?isPromotorOrConnector={roleFilter}
          </p>
        </div>
      )}

      {/* ── ERROR STATE WITH RETRY BUTTON ── */}
      {errorMsg && !apiGapNotice && (
        <div className="p-6 bg-white border border-rose-100 rounded-2xl shadow-sm text-center space-y-3">
          <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={20} />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Unable to Load Trade & Deal History</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{errorMsg}</p>
          <button
            onClick={() => fetchDeals(pagination.page)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw size={12} /> Retry Request
          </button>
        </div>
      )}

      {/* ── DEALS TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80 text-slate-500 font-bold">
              <tr className="text-[11px] uppercase tracking-wider text-left">
                <th className="py-3.5 px-5">Deal / Order ID</th>
                <th className="py-3.5 px-5">Product & Lot</th>
                <th className="py-3.5 px-5 text-center">Quantity</th>
                <th className="py-3.5 px-5">Total Amount</th>
                <th className="py-3.5 px-5">User Role</th>
                <th className="py-3.5 px-5">Commission Details</th>
                <th className="py-3.5 px-5">Commission Status</th>
                <th className="py-3.5 px-5">Order Status</th>
                <th className="py-3.5 px-5">Created Date</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>

            {isLoading ? (
              <tbody>
                <tr>
                  <td colSpan={10} className="py-6">
                    <CardSkeleton />
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {deals.length > 0 ? (
                  deals.map((deal, idx) => {
                    const isTransferred = Boolean(
                      deal.commissionTransferred ??
                      deal.commissiomTransfered ??
                      deal.commissionTransferredLogs ??
                      deal.commissionTransferedLogs
                    );
                    const mediaUrl = deal.media && deal.media.length > 0 ? deal.media[0] : null;

                    const isPromoterForDeal = matchId(deal.promoterId || (deal as any).promoter, userId);
                    const isConnectorForDeal = matchId(deal.connectorId || (deal as any).connector, userId);
                    const hasPromoterComm = isPromoterForDeal && deal.promoterCommission !== undefined && deal.promoterCommission > 0;
                    const hasConnectorComm = isConnectorForDeal && deal.connectorCommission !== undefined && deal.connectorCommission > 0;

                    return (
                      <tr key={deal._id || idx} className="hover:bg-slate-50/80 transition-colors">
                        {/* Order ID */}
                        <td className="py-3.5 px-5 font-extrabold text-slate-800 font-mono">
                          <Link
                            to={`/orders/${deal.orderId || deal._id}`}
                            className="hover:text-blue-600 transition"
                          >
                            #{deal.numericOrderId || (deal.orderId ? deal.orderId.slice(-6) : (deal.lotId ? deal.lotId.slice(-6) : (deal._id ? deal._id.slice(-6) : idx + 1)))}
                          </Link>
                        </td>

                        {/* Product & Lot */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            {/* Product Media Thumbnail with Fallback */}
                            {mediaUrl ? (
                              <img
                                src={mediaUrl}
                                alt={deal.brand || deal.productName || "Deal product"}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                                onError={(e) => {
                                  // Fallback to placeholder icon on broken URL
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <Package size={18} />
                              </div>
                            )}

                            <div className="space-y-0.5 text-xs">
                              <p className="font-bold text-slate-800 line-clamp-1">
                                {deal.productName || deal.brand || deal.description || "Lottmart Trade Product"}
                              </p>
                              {deal.lotId && (
                                <p className="text-[10px] text-amber-700 font-mono">
                                  Lot: #{deal.lotId}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-5 text-center font-bold text-slate-800">
                          {deal.quantity || deal.lot?.quantity || 1} units
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-5 font-extrabold text-slate-900">
                          {formatCurrency(deal.totalAmount || (deal.lot?.price ? deal.lot.price * (deal.quantity || 1) : 0))}
                        </td>

                        {/* User Role */}
                        <td className="py-3.5 px-5">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold rounded uppercase border border-blue-100">
                            {getUserRoleLabel(deal)}
                          </span>
                        </td>

                        {/* Commission Details */}
                        <td className="py-3.5 px-5 text-xs space-y-0.5">
                          {hasPromoterComm && (
                            <p className="text-[11px] font-bold text-emerald-600">
                              Promoter: {formatCurrency(deal.promoterCommission)}
                              {deal.promoterCommissionPercentage ? ` (${deal.promoterCommissionPercentage}%)` : ""}
                            </p>
                          )}
                          {hasConnectorComm && (
                            <p className="text-[11px] font-bold text-slate-700">
                              Connector: {formatCurrency(deal.connectorCommission)}
                              {deal.connectorCommissionPercentage ? ` (${deal.connectorCommissionPercentage}%)` : ""}
                            </p>
                          )}
                          {!hasPromoterComm && !hasConnectorComm && (
                            <p className="text-[10px] text-slate-400 italic">No commission set</p>
                          )}
                        </td>

                        {/* Commission Status */}
                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              isTransferred
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {isTransferred ? "TRANSFERRED" : "NOT TRANSFERRED"}
                          </span>
                        </td>

                        {/* Order Status */}
                        <td className="py-3.5 px-5">
                          <OrderStatusTag
                            status={typeof deal.status === "number" ? deal.status : Number(deal.status) || 4}
                            size="sm"
                            type="order"
                          />
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-5 text-xs text-slate-500 font-medium whitespace-nowrap">
                          {deal.createdAt ? formatDateTime(deal.createdAt) : "—"}
                        </td>

                        {/* Action: View Details */}
                        <td className="py-3.5 px-5 text-right">
                          <Link
                            to={`/orders/${deal.orderId || deal._id}`}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition inline-flex items-center justify-center cursor-pointer"
                            title="View Deal Details"
                          >
                            <Eye size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400 italic">
                      No trade or deal history records found for this user matching the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            )}
          </table>
        </div>

        {/* Server-Side Pagination */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <PaginationControl pagination={pagination} onPageChange={onPageChange} />
        </div>
      </div>
    </div>
  );
};
