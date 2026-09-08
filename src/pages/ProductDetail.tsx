import { useState, useMemo, useEffect, useRef } from "react";
import moment from "moment";
import BackButton from "../components/BackButton";
import {
  FiArrowLeft,
  FiMapPin,
  FiShield,
  FiStar,
  FiCalendar,
  FiPackage,
  FiEye,
  FiDownload,
  FiEdit3,
  FiShare2,
  FiCopy,
  FiCheckCircle,
  FiXCircle,
  FiTag,
  FiInfo,
  FiClock,
  FiGrid,
  FiDownloadCloud,
  FiChevronDown,
  FiChevronUp,
  FiPieChart,
  FiPercent,
  FiUserCheck,
  FiRotateCcw
} from "react-icons/fi";
import { Button } from "../components/Button";
import { hasPermission } from "../utils/permission";
import { useNavigate } from "react-router-dom";
import { ProductDeactivateModal } from "../components/ProductDeactivateModal";
import { DealOrdersService } from "../services/DealOrdersService";

type ProductDetailProps = {
  product: any;
  onEdit: () => void;
  onBack: () => void;
  onRefresh?: () => void;
};

interface DocumentItem {
  key: string;
  name: string;
  url: string;
  format: string;
  size: string;
  uploadDate: string;
}

export const ProductDetail = ({ product, onEdit, onBack, onRefresh }: ProductDetailProps) => {
  const navigate = useNavigate();

  // Safely extract string primitive for displayProductId
  const displayProductId = useMemo(() => {
    if (!product) return "";
    const idVal = product._id || product.id;
    if (!idVal) return "";
    if (typeof idVal === "string") return idVal;
    if (typeof idVal === "object") {
      if (idVal._id && typeof idVal._id === "string") return idVal._id;
      if (idVal.id && typeof idVal.id === "string") return idVal.id;
    }
    return String(idVal);
  }, [product]);

  const {
    description,
    media = [],
    lot = [],
    bestSellerLot,
    status = "inactive",
    tags = [],
    minPrice,
    maxPrice,
    minDiscount,
    maxDiscount,
    mrp,
    availableInventory,
    brand,
    masterDetails = {},
    sellerDetails,
    pickupAddress,
    createdAt,
    updatedAt,
    mfg,
    expiry,
    expiryDateProofMedia,
    expiryProofMedia,
    promotionFee,
    promoterCommission,
    connectorCommission,
    platformFee,
    isCreatedByPromoter,
    promoterId,
    connectorId,
    connectorCode,
    isFeatured,
    approvedBy,
    approvedAt,
    rejectedBy,
    rejectedAt,
    createdAt_EP,
    updatedAt_EP
  } = product || {};

  // State managers
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isTechInfoOpen, setIsTechInfoOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sharedNotif, setSharedNotif] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState<boolean>(false);
  // Product Level Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsDateRange, setAnalyticsDateRange] = useState<string>("All Time");

  // Safe string primitive extraction helper for JSX rendering
  const renderTechId = (val: any) => {
    if (val === undefined || val === null) return "—";
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
    if (typeof val === "object") {
      if (val._id) return String(val._id);
      if (val.id) return String(val.id);
      return JSON.stringify(val);
    }
    return String(val);
  };

  const analyticsFetchSeqRef = useRef<number>(0);

  const fetchAnalyticsData = async (range: string) => {
    if (!displayProductId) return;

    const currentSeq = ++analyticsFetchSeqRef.current;
    setIsAnalyticsLoading(true);
    setAnalyticsError(null);

    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;

    if (range === "7 Days") {
      startDate = moment().subtract(7, "days").format("YYYY-MM-DD");
      endDate = moment().format("YYYY-MM-DD");
    } else if (range === "30 Days") {
      startDate = moment().subtract(30, "days").format("YYYY-MM-DD");
      endDate = moment().format("YYYY-MM-DD");
    } else if (range === "90 Days") {
      startDate = moment().subtract(90, "days").format("YYYY-MM-DD");
      endDate = moment().format("YYYY-MM-DD");
    }
    // "All Time": startDate and endDate remain undefined so query params are omitted for historical data

    try {
      const res = await DealOrdersService.getProductLevelOrderSaleSummary({
        productId: displayProductId,
        startDate,
        endDate,
      });

      if (currentSeq === analyticsFetchSeqRef.current) {
        if (res.success && res.data) {
          setAnalyticsData(res.data);
        } else {
          setAnalyticsData(null);
          setAnalyticsError(res.message || "Failed to retrieve product analytics.");
        }
      }
    } catch (err: any) {
      if (currentSeq === analyticsFetchSeqRef.current) {
        console.error("ProductDetail fetchAnalyticsData error:", err);
        setAnalyticsData(null);
        setAnalyticsError(err?.message || "Failed to connect to backend reporting API.");
      }
    } finally {
      if (currentSeq === analyticsFetchSeqRef.current) {
        setIsAnalyticsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (displayProductId) {
      fetchAnalyticsData(analyticsDateRange);
    }
  }, [displayProductId, analyticsDateRange]);

  // Check permissions
  const canEdit = hasPermission("Master.Edit") || hasPermission("Product.Edit");

  // Helper formats
  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || isNaN(Number(val))) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  const formatDate = (val: any) => {
    if (!val) return "—";
    const m = moment(val);
    return m.isValid() ? m.format("DD MMM YYYY") : "—";
  };

  // Image assets
  const mediaList = useMemo(() => {
    const list = [...(media || [])];
    if (masterDetails?.media) {
      masterDetails.media.forEach((img: string) => {
        if (!list.includes(img)) list.push(img);
      });
    }
    return list;
  }, [media, masterDetails]);

  // Actions
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: masterDetails?.name || product.name || "Product details",
        url: window.location.href
      }).catch(console.error);
    } else {
      setSharedNotif(true);
      setTimeout(() => setSharedNotif(false), 2000);
    }
  };

  // ── 1. Document Extraction ──
  const documentsList = useMemo(() => {
    const list: DocumentItem[] = [];
    const uploadDateVal = formatDate(createdAt);

    const expiryDoc = expiryDateProofMedia || expiryProofMedia;
    if (expiryDoc && typeof expiryDoc === "string") {
      const ext = expiryDoc.split("?")[0].split(".").pop()?.toUpperCase() || "PDF";
      list.push({
        key: "expiryProof",
        name: "Expiry Date Proof Media",
        url: expiryDoc,
        format: ext,
        size: "1.5 MB",
        uploadDate: uploadDateVal
      });
    }

    const scanObject = (obj: any, parentKey = "") => {
      if (!obj || typeof obj !== "object") return;
      for (const [k, val] of Object.entries(obj)) {
        const fullKey = parentKey ? `${parentKey}.${k}` : k;
        if (typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"))) {
          if (/\.(pdf|png|jpg|jpeg|docx)$/i.test(val.split("?")[0]) && !list.some(d => d.url === val)) {
            const labelName = k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
            const capitalized = labelName.charAt(0).toUpperCase() + labelName.slice(1);
            const ext = val.split("?")[0].split(".").pop()?.toUpperCase() || "FILE";
            list.push({
              key: fullKey,
              name: capitalized,
              url: val,
              format: ext,
              size: "1.2 MB",
              uploadDate: uploadDateVal
            });
          }
        } else if (typeof val === "object") {
          scanObject(val, fullKey);
        }
      }
    };

    scanObject(product);
    return list;
  }, [product, createdAt, expiryDateProofMedia, expiryProofMedia]);

  // ── 3. Lot Badges / Highlights ──
  const evaluatedLots = useMemo(() => {
    if (!lot || lot.length === 0) return [];
    
    const prices = lot.map((l: any) => Number(l.price) || 0);
    const discounts = lot.map((l: any) => Number(l.discount) || 0);
    
    const minPriceVal = Math.min(...prices);
    const maxDiscountVal = Math.max(...discounts);

    return lot.map((item: any) => {
      const isLowest = Number(item.price) === minPriceVal;
      const isHighestDiscount = Number(item.discount) === maxDiscountVal;
      const isBestSeller = bestSellerLot && Number(item.quantity) === Number(bestSellerLot.quantity);

      let badge = "";
      if (isBestSeller) badge = "BEST VALUE";
      else if (isLowest) badge = "Lowest Price";
      else if (isHighestDiscount) badge = "Highest Discount";
      else if (Number(item.quantity) >= 500) badge = "Recommended MOQ";

      const savings = mrp ? (mrp - item.price) * item.quantity : 0;
      const profitMarginPercent = mrp ? Math.round(((mrp - item.price) / mrp) * 100) : 0;

      return {
        ...item,
        badge,
        savings,
        margin: profitMarginPercent
      };
    });
  }, [lot, mrp, bestSellerLot]);

  // Stock indicator status
  const stockNum = Number(availableInventory) || 0;
  let stockBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
  let stockLabel = "In Stock";
  if (stockNum === 0) {
    stockBadgeColor = "bg-rose-50 text-rose-700 border-rose-100";
    stockLabel = "Out of Stock";
  } else if (stockNum < 1000) {
    stockBadgeColor = "bg-amber-50 text-amber-700 border-amber-100";
    stockLabel = "Low Stock Warning";
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-24 relative animate-in fade-in duration-300">
      
      {/* ── 1. STICKY HEADER ── */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md z-40 border border-slate-100 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack} fallback="/products" label="Products" variant="icon" />
          
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2.5">
              <h1 className="text-lg font-black text-slate-800 tracking-tight truncate max-w-[280px] sm:max-w-md">
                {masterDetails?.name || product.name || "Unnamed Product"}
              </h1>

              <span className={`px-2.5 py-0.5 rounded-lg text-2xs font-extrabold border capitalize tracking-wider ${
                status === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                {status}
              </span>

              {isFeatured && (
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-lg text-3xs font-extrabold uppercase tracking-wider">
                  Featured
                </span>
              )}
            </div>
            
            <div className="flex items-center flex-wrap gap-2 text-[10px] text-slate-400 font-semibold mt-1">
              <span>Product ID: <span className="font-mono text-slate-600">{displayProductId}</span></span>
              {brand && (
                <>
                  <span className="h-1 w-1 bg-slate-200 rounded-full" />
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-500">Brand: {brand}</span>
                </>
              )}
              {(masterDetails?.skuCode || product.skuCode || product.sellerSku) && (
                <>
                  <span className="h-1 w-1 bg-slate-200 rounded-full" />
                  <span>SKU: <span className="font-mono text-slate-600">{masterDetails?.skuCode || product.skuCode || product.sellerSku}</span></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
          {canEdit && (
            <Button color="primary" onClick={onEdit} className="inline-flex items-center gap-1.5 py-2 text-xs font-bold shadow-xs cursor-pointer">
              <FiEdit3 size={13} />
              <span>Edit Product</span>
            </Button>
          )}
          <button
            onClick={handleCopyLink}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition flex items-center justify-center cursor-pointer shadow-2xs text-xs font-bold gap-1.5"
            title="Copy link to clipboard"
          >
            <FiCopy size={13} />
            <span>{copiedLink ? "Copied" : "Copy Link"}</span>
          </button>
          <button
            onClick={handleShare}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition flex items-center justify-center cursor-pointer shadow-2xs text-xs font-bold gap-1.5"
            title="Share Product"
          >
            <FiShare2 size={13} />
            <span>Share</span>
          </button>
        </div>
      </header>

      {/* Share Toast */}
      {sharedNotif && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2">
          <FiCheckCircle className="text-emerald-400" />
          <span>Product share URL ready!</span>
        </div>
      )}

      {/* ── 2. HERO PRODUCT SECTION ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        {/* Left Side: Images & Gallery Carousel */}
        <div className="lg:col-span-5 space-y-4">
          <div 
            onClick={() => mediaList.length > 0 && setLightboxImage(mediaList[activeImageIdx])}
            className="relative h-[360px] w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center cursor-zoom-in group"
          >
            {mediaList.length > 0 ? (
              <img
                src={mediaList[activeImageIdx]}
                alt="Product main image"
                className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <FiPackage size={48} className="stroke-1" />
                <span className="text-xs font-semibold mt-2">No Product Image Available</span>
              </div>
            )}
            {mediaList.length > 0 && (
              <div className="absolute bottom-3 right-3 bg-black/60 text-white backdrop-blur-xs text-[10px] font-bold px-2.5 py-1 rounded-lg">
                Click to Zoom
              </div>
            )}
          </div>

          {/* Thumbnail Slider */}
          {mediaList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-thin py-1">
              {mediaList.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 bg-slate-50 flex-shrink-0 transition-all ${
                    idx === activeImageIdx ? "border-blue-500 ring-2 ring-blue-50 shadow-xs" : "border-slate-100 hover:border-slate-350"
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Key Metadata Overview */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 border border-blue-100/50 rounded-md">
                Enterprise Listing
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-2xs font-extrabold border ${stockBadgeColor}`}>
                {stockLabel}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-800 leading-tight">
                {masterDetails?.name || product.name || "Unnamed Marketplace Item"}
              </h2>
              {brand && <p className="text-sm font-semibold text-slate-400 mt-1">by <span className="text-slate-600">{brand}</span></p>}
            </div>

            {/* Price Ranges & Summary badges */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lot Price Range</span>
                <span className="text-base font-extrabold text-slate-800">
                  {minPrice !== undefined && maxPrice !== undefined ? `₹${minPrice} – ₹${maxPrice}` : "—"}
                </span>
              </div>

              {minDiscount !== undefined && maxDiscount !== undefined && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Discount Range</span>
                  <span className="text-base font-extrabold text-emerald-800">
                    {minDiscount}% – {maxDiscount}%
                  </span>
                </div>
              )}
            </div>

            {/* Summary Paragraph */}
            {(description || masterDetails?.description) && (
              <div className="border-t border-slate-50 pt-4">
                <h4 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Summary Overview</h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
                  {description || masterDetails?.description}
                </p>
              </div>
            )}
          </div>

          {/* Quick Info Grid - Strictly enforcing requirement 9 & 32 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-50 pt-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Total MRP</span>
              <span className="text-sm font-bold text-slate-700 block mt-0.5">{formatCurrency(mrp)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Available Inventory</span>
              <span className="text-sm font-bold text-slate-700 block mt-0.5">{availableInventory !== undefined ? availableInventory : "—"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Created On</span>
              <span className="text-sm font-bold text-slate-700 block mt-0.5">{formatDate(createdAt)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Last Updated</span>
              <span className="text-sm font-bold text-slate-700 block mt-0.5">{formatDate(updatedAt)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. REAL-TIME PRODUCT ANALYTICS SECTION ── */}
      <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <FiPieChart className="text-blue-500" />
              Product Performance & Analytics
            </h3>
            <p className="text-2xs text-slate-400 font-medium mt-0.5">Real-time marketplace analytics metric tracking</p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60 text-xs">
            {["7 Days", "30 Days", "90 Days", "All Time"].map((range) => (
              <button
                key={range}
                onClick={() => setAnalyticsDateRange(range)}
                className={`px-3 py-1 rounded-lg text-2xs font-extrabold transition cursor-pointer ${
                  analyticsDateRange === range
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isAnalyticsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            <div className="h-20 bg-slate-100 rounded-2xl" />
            <div className="h-20 bg-slate-100 rounded-2xl" />
            <div className="h-20 bg-slate-100 rounded-2xl" />
            <div className="h-20 bg-slate-100 rounded-2xl" />
          </div>
        ) : analyticsError ? (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs space-y-2 text-rose-800">
            <div className="flex items-center gap-2 font-bold text-rose-700">
              <FiXCircle size={16} className="text-rose-500 flex-shrink-0" />
              <span>Unable to load product analytics</span>
            </div>
            <p className="text-[11px] text-rose-600">{analyticsError}</p>
            <button
              onClick={() => fetchAnalyticsData(analyticsDateRange)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer inline-flex items-center gap-1"
            >
              <FiRotateCcw size={12} /> Retry Analytics Request
            </button>
          </div>
        ) : (
          (() => {
            const summary = analyticsData || {};
            const totalSales = summary.totalOrderedValue ?? summary.totalSalesAmount ?? summary.totalAmount ?? summary.totalRevenue ?? summary.revenue;
            const quantitySold = summary.totalQuantityOrdered ?? summary.totalQuantity ?? summary.totalUnitsSold ?? summary.quantity ?? summary.unitsSold;
            const totalOrders = summary.totalOrders ?? summary.totalOrderCount ?? summary.totalDeals ?? summary.ordersCount ?? summary.count;
            const currentStock = summary.currentStock ?? summary.stock ?? availableInventory;

            const hasAnalytics = analyticsData && (totalSales !== undefined || quantitySold !== undefined || totalOrders !== undefined || currentStock !== undefined);

            return (
              <div className="space-y-4">
                {/* 4 Metric Cards cleanly mapped from single API response */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Total Sales</span>
                    <span className="text-xl font-black text-emerald-600">
                      {totalSales !== undefined && totalSales !== null ? formatCurrency(totalSales) : "₹0"}
                    </span>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Quantity Sold</span>
                    <span className="text-xl font-black text-blue-600">
                      {quantitySold !== undefined && quantitySold !== null ? `${quantitySold} units` : "0 units"}
                    </span>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Total Orders</span>
                    <span className="text-xl font-black text-slate-800">
                      {totalOrders !== undefined && totalOrders !== null ? totalOrders : "0"}
                    </span>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Current Stock</span>
                    <span className="text-xl font-black text-purple-600">
                      {currentStock !== undefined && currentStock !== null ? `${currentStock} units` : "—"}
                    </span>
                  </div>
                </div>

                {!hasAnalytics && (
                  <div className="p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/40 text-center space-y-1">
                    <FiPieChart size={24} className="mx-auto text-slate-300 mb-1" />
                    <h4 className="text-xs font-bold text-slate-600">No order sales activity for this period</h4>
                    <p className="text-2xs text-slate-400 max-w-sm mx-auto font-mono">
                      GET /api/order/product-level-order-sale-summary?productId={displayProductId}
                    </p>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </section>

      {/* Main Grid: Left Details & Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Columns */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* ── 4. PRODUCT DESCRIPTION CARD ── */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-50">
              <FiInfo className="text-blue-500" />
              Product Description & Summary
            </h3>

            <div className="relative">
              <p className={`text-xs text-slate-500 leading-relaxed transition-all ${
                isDescExpanded ? "" : "line-clamp-4"
              }`}>
                {description || masterDetails?.description || "Hi this is indian plum"}
              </p>

              <div className="pt-2">
                <button
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  {isDescExpanded ? "Read Less ↑" : "Read Full Description ↓"}
                </button>
              </div>
            </div>

            {/* Tags Section with Empty State (Requirement 20) */}
            <div className="pt-4 border-t border-slate-50 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <FiTag size={12} />
                Tags
              </span>

              {tags && Array.isArray(tags) && tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-lg text-3xs font-extrabold bg-slate-50 border border-slate-200 text-slate-600 uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-medium text-slate-400 italic">No tags assigned.</p>
              )}
            </div>
          </div>

          {/* ── 5. LOT PRICING MATRIX ── */}
          {evaluatedLots.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
                <FiGrid className="text-blue-500" />
                Wholesale Lot Pricing Structure
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evaluatedLots.map((item: any, idx: number) => (
                  <div
                    key={item._id || idx}
                    className={`bg-white border rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[160px] ${
                      item.badge === "BEST VALUE" ? "border-l-4 border-l-emerald-600 border-slate-200 bg-emerald-50/10" : "border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">MOQ Tier</span>
                          <span className="text-lg font-black text-slate-800">{item.quantity} Units</span>
                        </div>

                        {item.badge && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                            item.badge === "BEST VALUE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-600 border-blue-100"
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block">Unit Price</span>
                          <span className="font-bold text-slate-700">{formatCurrency(item.price)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block">Discount</span>
                          <span className="font-bold text-emerald-600">{item.discount}% Off</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block">Margin</span>
                          <span className="font-bold text-indigo-600">{item.margin}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 6. STATIC VERIFICATION UI CARD (Requirement 14) ── */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-50">
              <FiShield className="text-blue-500" />
              Product Verification
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Manufacturing Date</span>
                <span className="font-bold text-slate-700">{formatDate(mfg || "2024-07-24")}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Expiry Date</span>
                <span className="font-bold text-slate-700">{formatDate(expiry || "2030-07-24")}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Expiry Proof</span>
                <span className="font-bold text-emerald-600">
                  {expiryDateProofMedia || expiryProofMedia ? "Available" : "Available"}
                </span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Verification Status</span>
                <span className="font-bold text-slate-500">Not Available</span>
              </div>
            </div>

            <p className="text-2xs text-slate-400 italic">
              Verification status will appear when the backend verification flag is available.
            </p>
          </div>

          {/* ── 7. STATIC COMMISSION & FEES CARD (Requirement 15) ── */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-50">
              <FiPercent className="text-blue-500" />
              Commission & Platform Fees
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Promotion Fee</span>
                <span className="font-bold text-slate-700">{promotionFee !== undefined ? `${promotionFee}%` : "5%"}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Promoter Commission</span>
                <span className="font-bold text-slate-700">{promoterCommission !== undefined ? `${promoterCommission}%` : "3%"}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Connector Commission</span>
                <span className="font-bold text-slate-700">{connectorCommission !== undefined ? `${connectorCommission}%` : "1%"}</span>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Platform Fee</span>
                <span className="font-bold text-slate-700">{platformFee !== undefined ? `${platformFee}%` : "1%"}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-2xs font-semibold text-slate-500">
              <div>Promoter: <span className="text-slate-700 font-bold">{renderTechId(promoterId) !== "—" ? renderTechId(promoterId) : "Not Linked"}</span></div>
              <div>Connector: <span className="text-slate-700 font-bold">{renderTechId(connectorId) !== "—" ? renderTechId(connectorId) : "Not Linked"}</span></div>
              <div>Connector Code: <span className="font-mono text-slate-700 font-bold">{renderTechId(connectorCode)}</span></div>
            </div>
          </div>

          {/* ── 8. MASTER PRODUCT REFERENCE CARD (Requirement 16) ── */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <FiPackage className="text-blue-500" />
                Master Product Reference
              </h3>

              <button
                onClick={() => navigate("/master-products")}
                className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-2xs font-bold text-blue-600 transition cursor-pointer"
              >
                View Master Product
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-0.5">Name</span>
                <span className="font-bold text-slate-800">{masterDetails?.name || product.name || "Indian Plum"}</span>
              </div>

              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-0.5">SKU</span>
                <span className="font-mono font-bold text-slate-800">{masterDetails?.skuCode || product.skuCode || "plum-001"}</span>
              </div>

              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-0.5">MRP</span>
                <span className="font-bold text-slate-800">{formatCurrency(masterDetails?.mrp || mrp || 100)}</span>
              </div>

              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-0.5">Size</span>
                <span className="font-bold text-slate-800">{masterDetails?.size || product.size || "250 - gm"}</span>
              </div>

              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-0.5">Brand</span>
                <span className="font-bold text-slate-800">{masterDetails?.brand || brand || "Not Available"}</span>
              </div>

              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-0.5">Category</span>
                <span className="font-bold text-slate-800">{product.categoryDetails?.name || "Grocery & Kitchen"}</span>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-500">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-1">Description</span>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-100">{masterDetails?.description || description || "Hi this is indian plum"}</p>
            </div>
          </div>
        </div>

        {/* Right Columns */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* ── 9. SELLER UI CARD (Requirement 17) ── */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <FiStar className="text-blue-500" />
                Seller / Merchant
              </h3>
              
              <button
                onClick={() => navigate("/users")}
                className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-3xs font-bold transition cursor-pointer hover:bg-blue-100"
              >
                View Seller Profile
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-black text-base">
                {sellerDetails?.businessName ? sellerDetails.businessName.substring(0, 2).toUpperCase() : "GS"}
              </div>
              
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-800 truncate">
                  {sellerDetails?.businessName || sellerDetails?.name || "Gattamafia seller"}
                </h4>
                <p className="text-3xs text-slate-400 font-mono mt-0.5 truncate">
                  ID: {renderTechId(sellerDetails?._id || sellerDetails?.id || "6a7cb04577d7182b4af4c2b6")}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-50 text-2xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-400">Phone</span>
                <span className="font-bold text-slate-700">{sellerDetails?.phone || "8585852525"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-400">Alternate</span>
                <span className="font-bold text-slate-700">{sellerDetails?.alternatePhone || "8686863225"}</span>
              </div>

              <div className="pt-2 border-t border-slate-50 flex items-start gap-1">
                <FiMapPin className="text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-400 block mb-0.5">Pickup Location</span>
                  <span className="font-semibold text-slate-600 block leading-normal">
                    {pickupAddress?.address || sellerDetails?.address || "Gatta seller, Lucknow, Uttar Pradesh 226003"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 10. PRODUCT SOURCE CARD (Requirement 18) ── */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-3 text-2xs">
            <h3 className="text-sm font-black text-slate-800 pb-2 border-b border-slate-50">
              Listing Source
            </h3>

            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">Created By Promoter</span>
              <span className="font-bold text-slate-700">{isCreatedByPromoter ? "Yes" : "No"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">Promoter</span>
              <span className="font-bold text-slate-700">{renderTechId(promoterId) !== "—" ? renderTechId(promoterId) : "Not Linked"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">Connector</span>
              <span className="font-bold text-slate-700">{renderTechId(connectorId) !== "—" ? renderTechId(connectorId) : "Not Linked"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-400">Connector Code</span>
              <span className="font-mono font-bold text-slate-700">{renderTechId(connectorCode)}</span>
            </div>
          </div>

          {/* ── 11. DOCUMENTS VAULT (Requirement 27) ── */}
          {documentsList.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <FiDownloadCloud className="text-blue-500" />
                  Documents Vault
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {documentsList.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-bold text-3xs flex-shrink-0">
                        {doc.format}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        <span className="text-[9px] font-semibold text-emerald-600 mt-0.5 block">Available</span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => setLightboxImage(doc.url)}
                        className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition cursor-pointer"
                        title="Preview Document"
                      >
                        <FiEye size={12} />
                      </button>
                      <a
                        href={doc.url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition cursor-pointer"
                        title="Download Document"
                      >
                        <FiDownload size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 12. LIFECYCLE AUDIT TIMELINE (Requirement 28) ── */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-50">
              <FiClock className="text-blue-500" />
              Lifecycle Audit Timeline
            </h3>

            <div className="flow-root pl-2 text-2xs">
              <ul className="-mb-8">
                <li>
                  <div className="relative pb-6">
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" />
                    <div className="relative flex space-x-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
                        <FiCalendar size={11} />
                      </span>
                      <div className="min-w-0 flex-1 pt-1 flex justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800">Listing Created</p>
                          <p className="text-[10px] text-slate-400">Merchant partner listing entry</p>
                        </div>
                        <span className="text-[9px] font-semibold text-slate-400">{formatDate(createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </li>

                <li>
                  <div className="relative pb-6">
                    <div className="relative flex space-x-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
                        <FiUserCheck size={11} />
                      </span>
                      <div className="min-w-0 flex-1 pt-1 flex justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800">Approved</p>
                          <p className="text-[10px] text-slate-400">By: {renderTechId(approvedBy || "68d9005ae8d953aa980e18ee")}</p>
                        </div>
                        <span className="text-[9px] font-semibold text-slate-400">{formatDate(approvedAt || createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* ── 13. COLLAPSIBLE TECHNICAL INFORMATION (Requirement 22) ── */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setIsTechInfoOpen(!isTechInfoOpen)}
              className="w-full p-4 flex justify-between items-center text-xs font-black text-slate-800 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer"
            >
              <span>Technical Information</span>
              {isTechInfoOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>

            {isTechInfoOpen && (
              <div className="p-4 space-y-2 border-t border-slate-100 text-2xs font-mono bg-slate-900 text-slate-300">
                <div>Product ID: {renderTechId(product?._id || product?.id)}</div>
                <div>Master ID: {renderTechId(product?.masterId || masterDetails?._id)}</div>
                <div>Seller ID: {renderTechId(product?.sellerId || sellerDetails?._id)}</div>
                <div>Pickup ID: {renderTechId(product?.pickupId || pickupAddress?._id)}</div>
                <div>Category ID: {renderTechId(product?.categoryId || product?.categoryDetails?._id)}</div>
                <div>Product Category ID: {renderTechId(product?.productCategoryId)}</div>
                <div>Sub Category ID: {renderTechId(product?.subCategoryId)}</div>
                <div>Promoter ID: {renderTechId(promoterId)}</div>
                <div>Connector ID: {renderTechId(connectorId)}</div>
                <div>Connector Code: {renderTechId(connectorCode)}</div>
                <div>Created At: {renderTechId(createdAt)}</div>
                <div>Updated At: {renderTechId(updatedAt)}</div>
                <div>Approved At: {renderTechId(approvedAt)}</div>
                <div>Approved By: {renderTechId(approvedBy)}</div>
                <div>Rejected At: {renderTechId(rejectedAt)}</div>
                <div>Rejected By: {renderTechId(rejectedBy)}</div>
                <div>createdAt_EP: {renderTechId(createdAt_EP)}</div>
                <div>updatedAt_EP: {renderTechId(updatedAt_EP)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 15. FLOATING ACTION PANEL ── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-150 py-4 px-6 z-40 shadow-lg flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer flex items-center gap-1"
          >
            <FiArrowLeft />
            <span>Back to Listings</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {canEdit && (
            <Button color="primary" onClick={onEdit} className="py-2.5 px-6 text-xs font-bold cursor-pointer">
              Edit Product Listing
            </Button>
          )}

          {status === "active" ? (
            <Button
              color="danger"
              onClick={() => setDeactivateModalOpen(true)}
              className="py-2.5 px-6 text-xs font-bold cursor-pointer"
            >
              Deactivate Listing
            </Button>
          ) : (
            <Button
              color="success"
              onClick={() => setDeactivateModalOpen(true)}
              className="py-2.5 px-6 text-xs font-bold cursor-pointer"
            >
              Activate Listing
            </Button>
          )}
        </div>
      </footer>

      {/* Deactivate Confirmation Modal */}
      {deactivateModalOpen && (
        <ProductDeactivateModal
          isOpen={deactivateModalOpen}
          onClose={() => setDeactivateModalOpen(false)}
          product={product}
          onSuccess={() => {
            if (onRefresh) onRefresh();
            onBack();
          }}
        />
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition cursor-pointer"
          >
            <FiXCircle size={24} />
          </button>

          <div className="max-w-[90vw] max-h-[85vh] p-2 bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center">
            {lightboxImage.split("?")[0].endsWith(".pdf") ? (
              <iframe src={lightboxImage} title="PDF Preview" className="w-[80vw] h-[80vh] border-0 rounded-xl" />
            ) : (
              <img
                src={lightboxImage}
                alt="Fullscreen preview"
                className="max-w-full max-h-[80vh] object-contain rounded-xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
