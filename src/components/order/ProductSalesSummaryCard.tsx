import React, { useState, useEffect, useRef } from "react";
import moment from "moment";
import { DealOrdersService } from "../../services/DealOrdersService";
import { formatCurrency } from "../../utils/formatters";
import {
  TrendingUp,
  Package,
  RotateCcw,
  AlertCircle,
  BarChart3,
  Coins,
  ShoppingBag,
} from "lucide-react";
import { FaRupeeSign } from "react-icons/fa";

interface Props {
  productId: string;
  productName?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  className?: string;
}

export const ProductSalesSummaryCard: React.FC<Props> = ({
  productId,
  productName,
  initialStartDate,
  initialEndDate,
  className = "",
}) => {
  const cleanProductId = typeof productId === "object"
    ? (productId as any)?._id || (productId as any)?.id || String(productId)
    : String(productId || "");

  const [summaryData, setSummaryData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Date Filter State
  const [datePreset, setDatePreset] = useState<"all" | "year" | "30days" | "7days">("all");
  const [startDate, setStartDate] = useState<string | undefined>(initialStartDate);
  const [endDate, setEndDate] = useState<string | undefined>(initialEndDate);

  // Request Protection & Cache Ref to prevent duplicate API calls
  const requestCacheRef = useRef<Set<string>>(new Set());

  const fetchSummary = async (sDate?: string, eDate?: string) => {
    if (!cleanProductId) {
      setIsLoading(false);
      return;
    }

    const cacheKey = `${cleanProductId}_${sDate || "all"}_${eDate || "all"}`;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await DealOrdersService.getProductLevelOrderSaleSummary({
        productId: cleanProductId,
        startDate: sDate,
        endDate: eDate,
      });

      if (res.success && res.data) {
        setSummaryData(res.data);
        requestCacheRef.current.add(cacheKey);
      } else {
        setSummaryData(null);
        setErrorMsg(res.message || "Unable to retrieve product sales summary.");
      }
    } catch (err: any) {
      console.error("ProductSalesSummaryCard fetch error:", err);
      setSummaryData(null);
      setErrorMsg(err?.message || "Failed to load product sales summary.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(startDate, endDate);
  }, [productId, startDate, endDate]);

  const handlePresetChange = (preset: "all" | "year" | "30days" | "7days") => {
    setDatePreset(preset);
    if (preset === "all") {
      setStartDate(undefined);
      setEndDate(undefined);
    } else if (preset === "year") {
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

  // Flexible Response Data Extraction
  const data = summaryData || {};
  const totalOrders =
    data.totalOrders ??
    data.totalOrderCount ??
    data.totalDeals ??
    data.ordersCount ??
    data.count ??
    data.totalCount ??
    (Array.isArray(data.items) ? data.items.length : null);

  const totalQuantity =
    data.totalQuantityOrdered ??
    data.totalQuantity ??
    data.totalUnitsSold ??
    data.quantity ??
    data.unitsSold ??
    data.totalUnits;

  const totalSalesAmount =
    data.totalOrderedValue ??
    data.totalSalesAmount ??
    data.totalAmount ??
    data.totalRevenue ??
    data.totalSales ??
    data.totalValue ??
    data.revenue;

  const avgOrderValue =
    data.averageOrderValue ??
    data.avgOrderValue ??
    data.aov ??
    (totalOrders && totalSalesAmount && totalOrders > 0
      ? Math.round(totalSalesAmount / totalOrders)
      : null);

  const promoterCommission =
    data.totalPromoterCommission ??
    data.promoterCommission ??
    data.promoterCommissionAmount;

  const connectorCommission =
    data.totalConnectorCommission ??
    data.connectorCommission ??
    data.connectorCommissionAmount;

  const hasData =
    summaryData &&
    (totalOrders !== null || totalQuantity !== null || totalSalesAmount !== null);

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 ${className}`}>
      {/* ── CARD HEADER & DATE CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BarChart3 size={17} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <span>PRODUCT SALES SUMMARY</span>
              {productName && (
                <span className="text-xs font-semibold text-slate-500 font-normal">
                  ({productName})
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Product Analytics for ID: <span className="font-mono font-bold text-slate-600">{cleanProductId}</span>
            </p>
          </div>
        </div>

        {/* Date Preset Selector */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60 text-[11px] font-bold">
          {(["all", "year", "30days", "7days"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetChange(preset)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer capitalize ${
                datePreset === preset
                  ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {preset === "all"
                ? "All Time"
                : preset === "year"
                ? "This Year"
                : preset === "30days"
                ? "30 Days"
                : "7 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* ── LOADING SKELETON (Section Level - Non-blocking) ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2 animate-pulse">
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
        </div>
      ) : errorMsg ? (
        /* ── NON-BLOCKING ERROR STATE ── */
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs space-y-2 text-rose-800">
          <div className="flex items-center gap-2 font-bold text-rose-700">
            <AlertCircle size={15} className="text-rose-500 flex-shrink-0" />
            <span>Unable to load product sales summary</span>
          </div>
          <p className="text-[11px] text-rose-600">{errorMsg}</p>
          <button
            onClick={() => fetchSummary(startDate, endDate)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer inline-flex items-center gap-1"
          >
            <RotateCcw size={11} /> Retry Summary Request
          </button>
        </div>
      ) : !hasData ? (
        /* ── EMPTY / NO DATA STATE ── */
        <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
          <Package size={24} className="mx-auto text-slate-300 mb-1" />
          <p className="text-xs font-semibold text-slate-500">
            No product sales summary available for the selected period.
          </p>
          <p className="text-[11px] text-slate-400">
            Endpoint: <code>GET /api/order/product-level-order-sale-summary</code>
          </p>
        </div>
      ) : (
        /* ── PRODUCT METRICS GRID ── */
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
            {/* Total Revenue / Sales */}
            {totalSalesAmount !== undefined && totalSalesAmount !== null && (
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider">Total Product Sales</span>
                  <FaRupeeSign size={13} />
                </div>
                <p className="text-lg font-black text-emerald-700 mt-0.5">
                  {formatCurrency(totalSalesAmount)}
                </p>
              </div>
            )}

            {/* Total Units Sold */}
            {totalQuantity !== undefined && totalQuantity !== null && (
              <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-blue-700">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider">Units Sold</span>
                  <Package size={14} />
                </div>
                <p className="text-lg font-black text-blue-700 mt-0.5">
                  {totalQuantity.toLocaleString()} units
                </p>
              </div>
            )}

            {/* Total Orders Count */}
            {totalOrders !== undefined && totalOrders !== null && (
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider">Total Orders</span>
                  <ShoppingBag size={14} />
                </div>
                <p className="text-lg font-black text-slate-800 mt-0.5">
                  {totalOrders}
                </p>
              </div>
            )}

            {/* Average Order Value (AOV) */}
            {avgOrderValue !== undefined && avgOrderValue !== null && (
              <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-purple-700">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider">Avg Order Value</span>
                  <TrendingUp size={14} />
                </div>
                <p className="text-lg font-black text-purple-700 mt-0.5">
                  {formatCurrency(avgOrderValue)}
                </p>
              </div>
            )}
          </div>

          {/* Optional Commissions Summary if returned by product summary API */}
          {(promoterCommission !== undefined || connectorCommission !== undefined) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              {promoterCommission !== undefined && (
                <div className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
                  <span className="text-amber-800 font-bold flex items-center gap-1.5">
                    <Coins size={14} className="text-amber-600" />
                    Product Promoter Commission:
                  </span>
                  <span className="font-extrabold text-amber-900">{formatCurrency(promoterCommission)}</span>
                </div>
              )}
              {connectorCommission !== undefined && (
                <div className="flex items-center justify-between p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                  <span className="text-indigo-800 font-bold flex items-center gap-1.5">
                    <Coins size={14} className="text-indigo-600" />
                    Product Connector Commission:
                  </span>
                  <span className="font-extrabold text-indigo-900">{formatCurrency(connectorCommission)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
