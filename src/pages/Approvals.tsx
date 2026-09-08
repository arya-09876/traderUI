import { useEffect, useState, useMemo } from "react";
import { httpClient } from "../services/ApiService";
import { getCompleteUrlV1 } from "../utils";
import { AdminRequestsType, RequestStatus } from "../types";
import { Modal } from "../components/ImageModal";
import CardSkeleton from "../components/CardSkeleton";
import ProductDetailView from "../components/ProductDetailView";
import SellerDetailView from "../components/SellerDetailView";
import moment from "moment";
import { 
  FiClock, 
  FiUser, 
  FiBox, 
  FiCheckCircle, 
  FiXCircle, 
  FiAlertCircle, 
  FiList
} from "react-icons/fi";

// Import Redesigned Moderation Components
import ApprovalStatCard from "../components/approvals/ApprovalStatCard";
import ApprovalCard from "../components/approvals/ApprovalCard";
import ApprovalToolbar from "../components/approvals/ApprovalToolbar";
import ApprovalFilters from "../components/approvals/ApprovalFilters";
import ApprovalPreview from "../components/approvals/ApprovalPreview";
import { validateCommissionAllocation } from "../utils/utils";


interface SellerRequest {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  metadata: any;
  status: string;
  type: "seller_onboarding" | "product_approval";
  createdAt?: string;
  updatedAt?: string;
  requester?: any;
}

interface IInitialFees {
  promoterFee?: string;
  messengerFee: string;
  connectorFee: string;
  platformFee: string;
  promoterCommission?: string;
  connectorCommission?: string;
}

const initialFees: IInitialFees = {
  promoterFee: "",
  messengerFee: "",
  connectorFee: "",
  platformFee: "",
};

export type RequestType = "accept" | "reject";

export const Approvals = () => {
  const [requests, setRequests] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, local filter, and sorting states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "priority">("newest");
  const [showFiltersPanel, setShowFiltersPanel] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [reviewerFilter, setReviewerFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateRange, setDateRange] = useState("");

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Selected detail view request (for preview panel / mobile detailed view)
  const [activeDetail, setActiveDetail] = useState<any>(null);
  const [showFullDetailMobile, setShowFullDetailMobile] = useState(false);

  // Modals for preview actions
  const [previewApproveModal, setPreviewApproveModal] = useState(false);
  const [previewRejectModal, setPreviewRejectModal] = useState(false);
  const [previewChangesModal, setPreviewChangesModal] = useState(false);

  // Modal input states
  const [fees, setFees] = useState(initialFees);
  const [error, setError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDescription, setRejectDescription] = useState("");
  const [changesComment, setChangesComment] = useState("");
  const [selectedMissingFields, setSelectedMissingFields] = useState<string[]>([]);
  const [selectedRequiredDocs, setSelectedRequiredDocs] = useState<string[]>([]);

  // Pre-configured validation options for checkboxes
  const validationFields = [
    "Product Description",
    "HSN Code",
    "Barcode",
    "Lot Weight / Dimensions",
    "Expiry Date",
    "Manufacturing Date",
    "Short Description",
    "Seller SKU",
  ];

  const validationDocs = [
    "GST Identification Certificate",
    "PAN Card Copy",
    "Trade License Document",
    "FSSAI License Certificate",
    "Drug License",
    "Import License Certificate",
    "Manufacturing Certificate",
    "Expiry Label Image",
  ];

  // Counts of pending items
  const [pendingCounts, setPendingCounts] = useState({
    products: 0,
    sellers: 0,
  });

  const [filters, setFilters] = useState<{
    status: RequestStatus;
    type: AdminRequestsType;
  }>({
    status: RequestStatus.Pending,
    type: AdminRequestsType.sellerOnboarding,
  });

  // Fetch pending statistics for products and sellers
  async function getPendingCounts() {
    try {
      const [prodRes, sellRes] = await Promise.all([
        httpClient.get(
          getCompleteUrlV1("request/admin-requests", {
            status: RequestStatus.Pending,
            type: AdminRequestsType.productApproval,
          })
        ),
        httpClient.get(
          getCompleteUrlV1("request/admin-requests", {
            status: RequestStatus.Pending,
            type: AdminRequestsType.sellerOnboarding,
          })
        ),
      ]);
      const prods = await prodRes.json();
      const sellers = await sellRes.json();
      setPendingCounts({
        products: prods.data?.length || 0,
        sellers: sellers.data?.length || 0,
      });
    } catch (err) {
      console.error("Failed to fetch pending counts", err);
    }
  }

  const handleSubmit = async (
    request: any,
    requestType: RequestType,
    customFees?: any,
    rejectionOrChangesData?: {
      reason?: string;
      comment?: string;
      missingFields?: string[];
      requiredDocuments?: string[];
    }
  ) => {
    const targetRequest = request || activeDetail;
    let data: any = {
      id: targetRequest?._id,
      status: requestType,
    };
    if (
      requestType === "accept" &&
      targetRequest.type === "product_approval"
    ) {
      const activeFees = customFees || fees;
      const m = parseInt(activeFees.promoterCommission || activeFees.messengerFee);
      const c = parseInt(activeFees.connectorCommission || activeFees.connectorFee);
      const p = parseInt(activeFees.platformFee);
      if (isNaN(m) || isNaN(c) || isNaN(p)) {
        setError("All fields must be valid numbers");
        return;
      }
      data["metadata"] = {
        promoterCommission: m,
        connectorCommission: c,
        platformFee: p,
      };
    } else if (rejectionOrChangesData) {
      data["reason"] = rejectionOrChangesData.reason || "";
      data["comment"] = rejectionOrChangesData.comment || "";
      data["missingFields"] = rejectionOrChangesData.missingFields || [];
      data["requiredDocuments"] = rejectionOrChangesData.requiredDocuments || [];
    }
    try {
      setLoading(true);
      await httpClient.put(getCompleteUrlV1(`request`), data);
      resetState();
    } catch (err) {
      console.error("Failed to process request", err);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setError("");
    onModalClose();
    setActiveDetail(null);
    setShowFullDetailMobile(false);
    getPendingCounts();
    getSellerRequests();
  };

  async function getSellerRequests() {
    setRequests([]);
    setLoading(true);
    try {
      const response = await httpClient.get(
        getCompleteUrlV1("request/admin-requests", filters)
      );

      const [approvalRequests] = await Promise.all([
        response.json(),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
      setRequests(approvalRequests.data || []);
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getPendingCounts();
  }, []);

  useEffect(() => {
    getSellerRequests();
  }, [filters]);

  // Clear selections when base filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [filters, searchQuery, priorityFilter, categoryFilter, dateRange]);

  const onConfirm = (request: any, requestType: RequestType) => {
    handleSubmit(request, requestType);
  };

  const handleSellerReqAction = async (
    request: any,
    requestType: RequestType
  ) => {
    const userConfirmed = window.confirm(
      `Are you sure you want to ${requestType} seller - ${request.metadata?.businessName}`
    );
    if (userConfirmed) {
      onConfirm(request, requestType);
    }
  };

  const onModalClose = () => {
    setPreviewApproveModal(false);
    setPreviewRejectModal(false);
    setPreviewChangesModal(false);
    setFees({ ...initialFees });
    setRejectReason("");
    setRejectDescription("");
    setChangesComment("");
    setSelectedMissingFields([]);
    setSelectedRequiredDocs([]);
  };

  // Perform advanced filter, search and sort locally
  const filteredAndSortedRequests = useMemo(() => {
    return requests
      .filter((req) => {
        // 1. Text Search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const firstName = req.requester?.firstName || req.firstName || "";
          const lastName = req.requester?.lastName || req.lastName || "";
          const name = `${firstName} ${lastName}`.trim().toLowerCase();
          const email = (req.requester?.email || req.email || "").toLowerCase();
          const businessName = (req.metadata?.businessName || "").toLowerCase();
          const id = (req._id || "").toLowerCase();
          if (
            !name.includes(query) &&
            !email.includes(query) &&
            !businessName.includes(query) &&
            !id.includes(query)
          ) {
            return false;
          }
        }

        // 2. Priority Filter
        if (priorityFilter) {
          const isSeller = req.type === "seller_onboarding";
          const metadata = req.metadata || {};
          const priority = isSeller
            ? (!metadata.gstNumber ? "high" : "medium")
            : (Number(metadata.sellingPrice) > Number(metadata.mrp) || Number(metadata.stock) === 0 ? "high" : "medium");
          if (priority !== priorityFilter) return false;
        }

        // 3. Category Filter (for products only)
        if (categoryFilter && req.type === "product_approval") {
          const catName = (req.metadata?.masterDetails?.categoryId?.name || req.metadata?.categoryName || "").toLowerCase();
          if (!catName.includes(categoryFilter.toLowerCase())) return false;
        }

        // 4. Date Range filter
        if (dateRange) {
          const created = moment(req.createdAt);
          if (dateRange === "today" && !created.isSame(moment(), "day")) return false;
          if (dateRange === "yesterday" && !created.isSame(moment().subtract(1, "day"), "day")) return false;
          if (dateRange === "week" && created.isBefore(moment().subtract(7, "days"))) return false;
          if (dateRange === "month" && created.isBefore(moment().subtract(30, "days"))) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "newest") {
          return moment(b.createdAt).diff(moment(a.createdAt));
        }
        if (sortOrder === "oldest") {
          return moment(a.createdAt).diff(moment(b.createdAt));
        }
        if (sortOrder === "priority") {
          const getPrioScore = (r: any) => {
            const isSel = r.type === "seller_onboarding";
            const meta = r.metadata || {};
            if (isSel) return !meta.gstNumber ? 2 : 1;
            return (Number(meta.sellingPrice) > Number(meta.mrp) || Number(meta.stock) === 0) ? 2 : 1;
          };
          return getPrioScore(b) - getPrioScore(a);
        }
        return 0;
      });
  }, [requests, searchQuery, sortOrder, priorityFilter, categoryFilter, dateRange]);

  // Set first item in the list as selected request inside split view
  useEffect(() => {
    if (filteredAndSortedRequests.length > 0) {
      const exists = filteredAndSortedRequests.some(r => r._id === activeDetail?._id);
      if (!activeDetail || !exists) {
        setActiveDetail(filteredAndSortedRequests[0]);
      }
    } else {
      setActiveDetail(null);
    }
  }, [filteredAndSortedRequests]);

  // Bulk action triggers
  const handleBulkApprove = () => {
    alert(`Bulk Approve action triggered for ${selectedIds.length} requests:\n${selectedIds.join(", ")}`);
  };

  const handleBulkReject = () => {
    alert(`Bulk Reject action triggered for ${selectedIds.length} requests:\n${selectedIds.join(", ")}`);
  };

  const handleBulkExport = () => {
    alert(`Bulk Export action triggered for ${selectedIds.length} requests:\n${selectedIds.join(", ")}`);
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allIds = filteredAndSortedRequests.map(r => r._id);
    const isAllSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  // Preview Action Handlers
  const handlePreviewApprove = () => {
    setFees(initialFees);
    setError("");
    if (activeDetail.type === "product_approval") {
      setPreviewApproveModal(true);
    } else {
      handleSellerReqAction(activeDetail, "accept");
    }
  };

  const handlePreviewReject = () => {
    setPreviewRejectModal(true);
  };

  const handlePreviewChanges = () => {
    setPreviewChangesModal(true);
  };

  // Extract active detail promotion fee from API
  const activeMetadata = activeDetail?.metadata || {};
  const activeProdDetails = activeMetadata.productDetails || {};
  const apiPromotionFee = Number(
    activeMetadata.promotionFee ??
    activeProdDetails.promotionFee ??
    activeMetadata.promotionCommission ??
    activeMetadata.promotionFeePercentage ??
    activeDetail?.promotionFee ??
    0
  );

  const previewCommissionValidation = validateCommissionAllocation(
    fees.promoterFee || fees.messengerFee,
    fees.connectorFee,
    fees.platformFee,
    apiPromotionFee
  );

  const submitPreviewApproval = async () => {
    setError("");
    const validation = validateCommissionAllocation(
      fees.promoterFee || fees.messengerFee,
      fees.connectorFee,
      fees.platformFee,
      apiPromotionFee
    );

    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    const m = parseFloat(String(fees.promoterFee || fees.messengerFee || 0)) || 0;
    const c = parseFloat(String(fees.connectorFee || 0)) || 0;
    const p = parseFloat(String(fees.platformFee || 0)) || 0;

    const payloadFees = {
      promoterCommission: m,
      connectorCommission: c,
      platformFee: p,
    };

    await handleSubmit(activeDetail, "accept", payloadFees);
  };

  const submitPreviewRejection = async () => {
    setError("");
    if (!rejectReason.trim()) {
      setError("Please specify a rejection reason.");
      return;
    }

    const payload = {
      reason: rejectReason,
      comment: rejectDescription,
    };

    await handleSubmit(activeDetail, "reject", null, payload);
  };

  const submitPreviewChanges = async () => {
    setError("");
    if (!changesComment.trim()) {
      setError("Please provide change comments.");
      return;
    }

    const payload = {
      reason: "Request Changes",
      comment: changesComment,
      missingFields: selectedMissingFields,
      requiredDocuments: selectedRequiredDocs,
    };

    await handleSubmit(activeDetail, "reject", null, payload);
  };

  const handleCheckboxToggle = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Statistics summaries
  const stats = useMemo(() => {
    const highPriorityCount = requests.filter(r => {
      const isSel = r.type === "seller_onboarding";
      const meta = r.metadata || {};
      return isSel ? !meta.gstNumber : (Number(meta.sellingPrice) > Number(meta.mrp) || Number(meta.stock) === 0);
    }).length;

    const approvedCount = requests.filter(r => r.status === "accept").length;
    const rejectedCount = requests.filter(r => r.status === "reject").length;

    const getAvgReviewTime = () => {
      const reviewed = requests.filter(r => r.status !== "pending" && r.updatedAt);
      if (reviewed.length === 0) return "1.2 hrs";
      const totalDiff = reviewed.reduce((sum, r) => sum + moment(r.updatedAt).diff(moment(r.createdAt)), 0);
      const avgMs = totalDiff / reviewed.length;
      const duration = moment.duration(avgMs);
      if (duration.asDays() >= 1) return `${Math.round(duration.asDays())} days`;
      if (duration.asHours() >= 1) return `${Math.round(duration.asHours())} hrs`;
      return `${Math.round(duration.asMinutes())} mins`;
    };

    return {
      total: pendingCounts.products + pendingCounts.sellers,
      products: pendingCounts.products,
      sellers: pendingCounts.sellers,
      highPriority: highPriorityCount,
      approvedToday: approvedCount,
      rejectedToday: rejectedCount,
      avgTime: getAvgReviewTime(),
    };
  }, [requests, pendingCounts]);

  // If a detail view is active and we are in mobile full view mode, render inline
  if (showFullDetailMobile && activeDetail) {
    if (activeDetail.type === "product_approval") {
      return (
        <ProductDetailView
          req={activeDetail}
          onBack={() => setShowFullDetailMobile(false)}
          handleSubmit={handleSubmit}
          loading={loading}
        />
      );
    } else if (activeDetail.type === "seller_onboarding") {
      return (
        <SellerDetailView
          req={activeDetail}
          onBack={() => setShowFullDetailMobile(false)}
          handleSubmit={handleSubmit}
          loading={loading}
        />
      );
    }
  }

  const isAllSelected = filteredAndSortedRequests.length > 0 && 
    filteredAndSortedRequests.every(r => selectedIds.includes(r._id));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header Toolbar */}
      <ApprovalToolbar
        onRefresh={() => {
          getPendingCounts();
          getSellerRequests();
        }}
        onExport={handleBulkExport}
        onToggleFilters={() => setShowFiltersPanel(!showFiltersPanel)}
        showFilters={showFiltersPanel}
        selectedCount={selectedIds.length}
        totalCount={filteredAndSortedRequests.length}
        onSelectAll={handleSelectAll}
        isAllSelected={isAllSelected}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleBulkReject}
      />

      {/* 2. KPI Summary Cards Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ApprovalStatCard
            title="Total Pending approvals"
            value={stats.total}
            icon={<FiList size={18} className="text-slate-800" />}
            trend="Total Queue"
            gradientClass="from-slate-50 to-slate-100/50 border-slate-200/80"
          />
          <ApprovalStatCard
            title="Pending Products"
            value={stats.products}
            icon={<FiBox size={18} className="text-indigo-650" />}
            trend={stats.products > 0 ? "Needs Review" : "All Clean"}
            trendType={stats.products > 0 ? "neutral" : "positive"}
            gradientClass="from-indigo-50/50 to-purple-50/20 border-indigo-100/60"
          />
          <ApprovalStatCard
            title="Pending Sellers"
            value={stats.sellers}
            icon={<FiUser size={18} className="text-blue-600" />}
            trend={stats.sellers > 0 ? "Needs Review" : "All Clean"}
            trendType={stats.sellers > 0 ? "neutral" : "positive"}
            gradientClass="from-blue-50/50 to-sky-50/20 border-blue-100/60"
          />
          <ApprovalStatCard
            title="High Priority"
            value={stats.highPriority}
            icon={<FiAlertCircle size={18} className="text-rose-500 animate-pulse" />}
            trend={stats.highPriority > 0 ? "Urgent Action" : "No Blocker"}
            trendType={stats.highPriority > 0 ? "negative" : "positive"}
            gradientClass="from-rose-50/50 to-orange-50/20 border-rose-100/60"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ApprovalStatCard
            title="Approved Today"
            value={stats.approvedToday}
            icon={<FiCheckCircle size={18} className="text-emerald-550" />}
            trend="Live"
            trendType="positive"
            gradientClass="from-emerald-50/50 to-teal-50/20 border-emerald-100/60"
          />
          <ApprovalStatCard
            title="Rejected Today"
            value={stats.rejectedToday}
            icon={<FiXCircle size={18} className="text-rose-550" />}
            trend="Review"
            trendType="negative"
            gradientClass="from-rose-50/50 to-red-50/20 border-rose-100/60"
          />
          <ApprovalStatCard
            title="Average Review Time"
            value={stats.avgTime}
            icon={<FiClock size={18} className="text-amber-500" />}
            trend="Target < 2h"
            trendType="positive"
            gradientClass="from-amber-50/50 to-yellow-50/20 border-amber-100/60"
          />
        </div>
      </div>

      {/* 3. Filters panel (Collapsible) */}
      {showFiltersPanel && (
        <ApprovalFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          status={filters.status}
          onStatusChange={(statusVal) => setFilters({ ...filters, status: statusVal })}
          type={filters.type}
          onTypeChange={(typeVal) => setFilters({ ...filters, type: typeVal })}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          reviewerFilter={reviewerFilter}
          onReviewerChange={setReviewerFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          sellerCounts={{ sellers: pendingCounts.sellers, products: pendingCounts.products }}
        />
      )}

      {/* 4. Main Workspace (Split layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Queue List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Approvals Queue ({filteredAndSortedRequests.length} items)
            </span>
          </div>

          {loading && <CardSkeleton />}

          {!loading && filteredAndSortedRequests.length === 0 && (
            <div className="text-center py-16 px-4 bg-white border border-slate-200 rounded-2xl animate-in fade-in duration-300">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                <FiCheckCircle size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No pending approvals</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Everything has been reviewed successfully. Check back later for new requests.
              </p>
            </div>
          )}

          {!loading && filteredAndSortedRequests.length > 0 && (
            <div className="space-y-3.5">
              {filteredAndSortedRequests.map((req) => (
                <ApprovalCard
                  key={req._id}
                  req={req}
                  isSelected={activeDetail?._id === req._id}
                  isChecked={selectedIds.includes(req._id)}
                  onCheckChange={() => toggleSelectId(req._id)}
                  onClick={() => {
                    setActiveDetail(req);
                  }}
                  onViewDetails={() => {
                    setActiveDetail(req);
                    setShowFullDetailMobile(true);
                  }}
                  onApprove={() => {
                    setActiveDetail(req);
                    if (req.type === "product_approval") {
                      setPreviewApproveModal(true);
                    } else {
                      handleSellerReqAction(req, "accept");
                    }
                  }}
                  onReject={() => {
                    setActiveDetail(req);
                    setPreviewRejectModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Live details preview (5 cols) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-6">
          <ApprovalPreview
            req={activeDetail}
            onApprove={handlePreviewApprove}
            onReject={handlePreviewReject}
            onRequestChanges={activeDetail?.type === "product_approval" ? handlePreviewChanges : undefined}
            onDownloadDocuments={() => {
              // trigger download files logic dynamically
              const urls: string[] = [];
              const scanUrls = (obj: any) => {
                if (!obj || typeof obj !== "object") return;
                for (const [, val] of Object.entries(obj)) {
                  if (typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"))) {
                    if (/\.(pdf|png|jpg|jpeg)$/i.test(val.split("?")[0])) {
                      urls.push(val);
                    }
                  } else if (typeof val === "object") {
                    scanUrls(val);
                  }
                }
              };
              scanUrls(activeDetail?.metadata);
              scanUrls(activeDetail?.seller);

              if (urls.length === 0) {
                alert("No downloadable files found on this request.");
                return;
              }

              urls.forEach((url, index) => {
                setTimeout(() => {
                  const a = document.createElement("a");
                  a.href = url;
                  a.target = "_blank";
                  a.download = `Document_${index + 1}`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }, index * 400);
              });
            }}
            loading={loading}
          />
        </div>
      </div>

      {/* 5. Legacy Commission Activation Modal (Product Approval Accept) */}
      {previewApproveModal && (
        <Modal onClose={onModalClose}>
          <div className="w-[440px] max-w-full space-y-4 p-1">
            <h3 className="text-sm font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Approve Listing & Set Margins
            </h3>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-bold">
                {error}
              </div>
            )}

            {/* API Promotion Fee Summary Badge */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs font-bold text-slate-700">
              <span className="text-slate-500 font-semibold">Promotion Fee (from API):</span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-lg font-black">{apiPromotionFee}%</span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Promoter Commission (%)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 3"
                  value={fees.promoterFee || fees.messengerFee}
                  onChange={(e) => setFees({ ...fees, promoterFee: e.target.value, messengerFee: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-slate-400 outline-none transition"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Connector Commission (%)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1"
                  value={fees.connectorFee}
                  onChange={(e) => setFees({ ...fees, connectorFee: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-slate-400 outline-none transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Platform Margin / Fee (%)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1"
                  value={fees.platformFee}
                  onChange={(e) => setFees({ ...fees, platformFee: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-slate-400 outline-none transition"
                />
              </div>
            </div>

            {/* Dynamic Inline Validation Alert */}
            <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 transition ${
              previewCommissionValidation.status === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : previewCommissionValidation.status === "warning"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}>
              <div className="flex items-center gap-2">
                {previewCommissionValidation.status === "success" ? (
                  <FiCheckCircle className="text-emerald-600 flex-shrink-0" size={16} />
                ) : previewCommissionValidation.status === "warning" ? (
                  <FiAlertCircle className="text-amber-600 flex-shrink-0" size={16} />
                ) : (
                  <FiXCircle className="text-rose-600 flex-shrink-0" size={16} />
                )}
                <span>{previewCommissionValidation.message}</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/80 border border-current whitespace-nowrap">
                {previewCommissionValidation.total}% / {previewCommissionValidation.target}%
              </span>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 justify-end">
              <button
                onClick={onModalClose}
                className="px-4 py-2 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={submitPreviewApproval}
                disabled={loading || !previewCommissionValidation.isValid}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Approval
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Rejection Workflow Modal */}
      {previewRejectModal && (
        <Modal onClose={onModalClose}>
          <div className="w-[450px] max-w-full space-y-4 p-1">
            <h3 className="text-sm font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              Reject Request
            </h3>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-bold">
                {error}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rejection Reason</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-slate-400 outline-none transition cursor-pointer"
                >
                  <option value="">Select rejection reason...</option>
                  <option value="Pricing mismatch">Pricing / MRP mismatch</option>
                  <option value="Poor image quality">Poor image quality / watermarked</option>
                  <option value="Regulatory license expired">Regulatory license expired</option>
                  <option value="Incomplete document upload">Incomplete document upload</option>
                  <option value="Other">Other (specify below)</option>
                </select>
              </div>

              {activeDetail?.type === "product_approval" && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Detailed Description</label>
                  <textarea
                    placeholder="Explain exactly why the listing is being rejected..."
                    rows={3}
                    value={rejectDescription}
                    onChange={(e) => setRejectDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-slate-400 outline-none transition"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 justify-end">
              <button
                onClick={onModalClose}
                className="px-4 py-2 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={submitPreviewRejection}
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer transition disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Product Request Changes Modal */}
      {previewChangesModal && (
        <Modal onClose={onModalClose}>
          <div className="w-[500px] max-w-full space-y-4 p-1">
            <h3 className="text-sm font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              Request Information Changes
            </h3>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-bold">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Feedback / Comments</label>
                <textarea
                  placeholder="Specify clear instructions for the seller to rectify..."
                  rows={2.5}
                  value={changesComment}
                  onChange={(e) => setChangesComment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-slate-400 outline-none transition"
                />
              </div>

              {/* Missing Fields Checklist */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Check Missing Fields to Rectify</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-2xs">
                  {validationFields.map((field) => (
                    <label key={field} className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedMissingFields.includes(field)}
                        onChange={() => handleCheckboxToggle(selectedMissingFields, setSelectedMissingFields, field)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{field}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Required Documents Checklist */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Check Required Documents to Upload</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-2xs">
                  {validationDocs.map((doc) => (
                    <label key={doc} className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedRequiredDocs.includes(doc)}
                        onChange={() => handleCheckboxToggle(selectedRequiredDocs, setSelectedRequiredDocs, doc)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{doc}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 justify-end">
              <button
                onClick={onModalClose}
                className="px-4 py-2 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={submitPreviewChanges}
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs cursor-pointer transition disabled:opacity-50"
              >
                Send Request to Seller
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
