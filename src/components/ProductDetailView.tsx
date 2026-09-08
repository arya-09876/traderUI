import React, { useState } from "react";
import moment from "moment";
import { RequestType } from "../pages/Approvals";
import { Modal } from "./ImageModal";
import BackButton from "./BackButton";

// Reusable Enterprise Component Imports
import ApprovalSummaryCard from "./ApprovalSummaryCard";
import ProductGallery from "./ProductGallery";
import PriceCard from "./PriceCard";
import InventoryCard from "./InventoryCard";
import LotInformationCard from "./LotInformationCard";
import ManufacturingCard from "./ManufacturingCard";
import SellerCard from "./SellerCard";
import DocumentsCard from "./DocumentsCard";
import TimelineCard from "./TimelineCard";
import ApprovalActions from "./ApprovalActions";

// Product Moderation Specific Widgets
import MasterProductCategoryCard from "./approvals/product/MasterProductCategoryCard";
import CommercialFlagsCard from "./approvals/product/CommercialFlagsCard";
import ProductDescriptionCard from "./approvals/product/ProductDescriptionCard";
import JsonDebugViewer from "./approvals/product/JsonDebugViewer";

import { FiCopy, FiTag, FiUser, FiCheckCircle, FiAlertCircle, FiXCircle } from "react-icons/fi";
import { validateCommissionAllocation } from "../utils/utils";

interface ProductDetailViewProps {
  req: any;
  onBack: () => void;
  handleSubmit: (request: any, actionType: RequestType, fees?: any, rejectionOrChangesData?: any) => Promise<void>;
  loading: boolean;
}

const CopyButton: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1 inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? (
        <span className="text-[9px] font-bold text-emerald-600">Copied!</span>
      ) : (
        <FiCopy size={11} />
      )}
    </button>
  );
};

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  req,
  onBack,
  handleSubmit,
  loading,
}) => {
  const metadata = req?.metadata || {};
  const productDetails = metadata.productDetails || {};
  const product = {
    ...metadata,
    ...productDetails,
    masterDetails: productDetails.masterDetails || metadata.masterDetails || {},
    categoryDetails: productDetails.categoryDetails || metadata.categoryDetails || {},
    productCategoryDetails: productDetails.productCategoryDetails || metadata.productCategoryDetails || {},
    subCategoryDetails: productDetails.subCategoryDetails || metadata.subCategoryDetails || {},
    pickupAddress: productDetails.pickupAddress || metadata.pickupAddress || {},
    bestSellerLot: productDetails.bestSellerLot || metadata.bestSellerLot || {},
    lot: productDetails.lot || metadata.lot || [],
    media: productDetails.media || metadata.media || [],
    expiryProofMedia: productDetails.expiryDateProofMedia || productDetails.expiryProofMedia || metadata.expiryDateProofMedia || metadata.expiryProofMedia || metadata.expiryProofUrl,
  };

  const master = product.masterDetails || {};
  const mediaList = product.media || master.media || [];
  const masterMediaList = master.media || [];

  // Modals & Developer Debug state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [showDevJson, setShowDevJson] = useState(false);

  // Form input states
  const [error, setError] = useState("");
  const [fees, setFees] = useState({
    promoterFee: "",
    messengerFee: "",
    connectorFee: "",
    platformFee: "",
  });

  const [rejectReason, setRejectReason] = useState("");
  const [rejectDescription, setRejectDescription] = useState("");
  const [rejectAttachment, setRejectAttachment] = useState("");

  const [changesComment, setChangesComment] = useState("");
  const [selectedMissingFields, setSelectedMissingFields] = useState<string[]>([]);
  const [selectedRequiredDocs, setSelectedRequiredDocs] = useState<string[]>([]);

  const handleCheckboxToggle = (
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    if (currentList.includes(item)) {
      setList(currentList.filter((i) => i !== item));
    } else {
      setList([...currentList, item]);
    }
  };

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

  // Automated Verification Checks
  const runValidationCheck = () => {
    const checks: { type: "error" | "warning" | "info"; message: string }[] = [];

    // 1. Missing Images
    if (mediaList.length === 0) {
      checks.push({ type: "error", message: "Missing Images: Upload at least one media asset." });
    }

    // 2. Missing Description
    const desc = product.description || master.description;
    if (!desc || desc.trim().length < 10) {
      checks.push({ type: "warning", message: "Incomplete Description: Listing details are short or missing." });
    }

    // 3. Expired Product
    const expiryDateVal = product.expiryDate || product.expiry || product.expirationDate;
    if (expiryDateVal) {
      const exp = moment(expiryDateVal);
      if (exp.isValid() && exp.isBefore(moment())) {
        checks.push({ type: "error", message: "Expired Product: Expiration date has already passed." });
      }
    }

    // 4. Invalid MRP
    const mrpVal = Number(product.mrp);
    const sellPriceVal = Number(product.minPrice || product.sellingPrice);
    const isLotPricing = Array.isArray(product.lot) && product.lot.length > 0;
    const bestQty = product.bestSellerLot?.quantity || product.lot?.[0]?.quantity || 1;
    const unitSellPrice = isLotPricing && bestQty > 0 ? (sellPriceVal / bestQty) : sellPriceVal;

    if (isNaN(mrpVal) || mrpVal <= 0) {
      checks.push({ type: "error", message: "Invalid MRP: List price must be greater than zero." });
    } else if (unitSellPrice > mrpVal) {
      checks.push({ type: "error", message: "Invalid Pricing: Per-unit selling price exceeds MRP." });
    }

    // 5. Zero Stock
    const stockVal = Number(product.availableInventory ?? product.stock ?? product.availableLots ?? 0);
    if (isNaN(stockVal) || stockVal <= 0) {
      checks.push({ type: "error", message: "Zero Stock: Inventory count is 0." });
    }

    // 6. Missing Documents
    const sellerDetails = product.sellerDetails || req.sellerDetails || req.seller || {};
    const hasGst = product.gstNumber || sellerDetails.gstNumber || sellerDetails.gst;
    const hasPan = sellerDetails.pan || sellerDetails.panNumber;
    if (!hasGst) {
      checks.push({ type: "error", message: "Missing GST Documents: GST registration has not been verified." });
    }
    if (!hasPan) {
      checks.push({ type: "error", message: "Missing PAN Documents: PAN registration has not been verified." });
    }

    return checks;
  };

  const validationAlerts = runValidationCheck();

  // Compute Risk Level dynamically
  const getRiskLevel = (): "Low" | "Medium" | "High" | "Critical" => {
    const errorCount = validationAlerts.filter((c) => c.type === "error").length;
    const warningCount = validationAlerts.filter((c) => c.type === "warning").length;

    const isExpired = validationAlerts.some((c) => c.message.includes("Expired Product"));
    const isInvalidPricing = validationAlerts.some((c) => c.message.includes("Invalid Pricing") || c.message.includes("Invalid MRP"));

    if (isExpired || isInvalidPricing || errorCount >= 3) return "Critical";
    if (errorCount > 0) return "High";
    if (warningCount > 0) return "Medium";
    return "Low";
  };

  const riskLevel = getRiskLevel();

  // Dynamic Product Specifications Table (Only include valid non-empty fields)
  const getSpecifications = () => {
    const specs: { label: string; value: string }[] = [];

    const specKeys = [
      { key: "brandName", label: "Brand Name" },
      { key: "brand", label: "Brand" },
      { key: "hsnCode", label: "HSN Code" },
      { key: "barcode", label: "Barcode (UPC/EAN)" },
      { key: "sellerSku", label: "Seller SKU" },
      { key: "color", label: "Color" },
      { key: "material", label: "Material" },
      { key: "size", label: "Size / Pack" },
      { key: "weight", label: "Weight" },
      { key: "origin", label: "Country of Origin" },
      { key: "ingredients", label: "Ingredients" },
      { key: "fragrance", label: "Fragrance" },
      { key: "packaging", label: "Packaging Type" },
      { key: "manufacturer", label: "Manufacturer" },
    ];

    const visitedLabels = new Set();

    specKeys.forEach(({ key, label }) => {
      const val = product[key] !== undefined && product[key] !== null && product[key] !== ""
        ? product[key]
        : master[key];
      if (val !== undefined && val !== null && val !== "" && !visitedLabels.has(label.toLowerCase())) {
        visitedLabels.add(label.toLowerCase());
        specs.push({ label, value: String(val) });
      }
    });

    const explicitSpecs = product.specifications || product.specs || master.specifications || master.specs;
    if (explicitSpecs && typeof explicitSpecs === "object") {
      Object.entries(explicitSpecs).forEach(([k, val]) => {
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          const labelName = k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
          const capitalized = labelName.charAt(0).toUpperCase() + labelName.slice(1);
          if (!visitedLabels.has(capitalized.toLowerCase())) {
            visitedLabels.add(capitalized.toLowerCase());
            specs.push({ label: capitalized, value: String(val) });
          }
        }
      });
    }

    return specs;
  };

  const specifications = getSpecifications();

  // Dynamic Overview Fields Grid (Only non-empty)
  const getGeneralInfo = () => {
    const info: { label: string; value: string; fullWidth?: boolean; copyable?: boolean }[] = [];

    const titleVal = master.name || product.name || product.productName;
    if (titleVal) info.push({ label: "Product Title", value: titleVal });

    const masterSkuVal = master.skuCode || product.skuCode;
    if (masterSkuVal) info.push({ label: "Master Product SKU", value: masterSkuVal, copyable: true });

    const sellerSkuVal = product.sellerSku;
    if (sellerSkuVal) info.push({ label: "Seller SKU", value: sellerSkuVal, copyable: true });

    const brandVal = product.brandName || master.brand;
    if (brandVal) info.push({ label: "Brand", value: brandVal });

    const mainCategoryVal = product.categoryDetails?.name || master.categoryId?.name || product.categoryName;
    if (mainCategoryVal) info.push({ label: "Category", value: mainCategoryVal });

    const prodCategoryVal = product.subCategoryDetails?.name || (typeof product.subCategory === "string" ? product.subCategory : undefined) || master.subCategory;
    if (prodCategoryVal) info.push({ label: "Product Category", value: prodCategoryVal });

    const subCategoryVal = product.productCategoryDetails?.name || (typeof product.productCategory === "string" ? product.productCategory : undefined);
    if (subCategoryVal) info.push({ label: "Sub-Category", value: subCategoryVal });

    const hsnVal = product.hsnCode || master.hsnCode;
    if (hsnVal) info.push({ label: "HSN Code", value: hsnVal, copyable: true });

    const barcodeVal = product.barcode || master.barcode;
    if (barcodeVal) info.push({ label: "Barcode (UPC/EAN)", value: barcodeVal, copyable: true });

    if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
      info.push({ label: "Product Tags", value: product.tags.join(", ") });
    }

    return info;
  };

  const generalInfo = getGeneralInfo();

  // Dynamic API Promotion Fee extraction
  const apiPromotionFee = Number(
    product.promotionFee ??
    product.promotionCommission ??
    product.promotionFeePercentage ??
    metadata.promotionFee ??
    metadata.promotionCommission ??
    0
  );

  const commissionValidation = validateCommissionAllocation(
    fees.promoterFee || fees.messengerFee,
    fees.connectorFee,
    fees.platformFee,
    apiPromotionFee
  );

  // Decision submit handlers
  const submitApproval = async () => {
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

    await handleSubmit(req, "accept", payloadFees);
    setShowApproveModal(false);
  };

  const submitRejection = async () => {
    setError("");
    if (!rejectReason.trim()) {
      setError("Please specify a rejection reason.");
      return;
    }

    const payload = {
      reason: rejectReason,
      comment: rejectDescription,
      commentAttachment: rejectAttachment,
    };

    await handleSubmit(req, "reject", null, payload);
    setShowRejectModal(false);
  };

  const submitRequestChanges = async () => {
    setError("");
    if (!changesComment.trim()) {
      setError("Please provide change request comments.");
      return;
    }

    const payload = {
      reason: "Request Changes",
      comment: changesComment,
      missingFields: selectedMissingFields,
      requiredDocuments: selectedRequiredDocs,
    };

    await handleSubmit(req, "reject", null, payload);
    setShowChangesModal(false);
  };

  const handleDownloadAllDocs = () => {
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
    scanUrls(product);
    scanUrls(req.seller);

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
  };

  // Resolve Header IDs
  const requestIdVal = req._id;
  const productIdVal = product._id || product.id || req.productId;
  const masterSkuVal = master.skuCode || product.skuCode;
  const sellerIdVal = req.sellerId || req.requester?._id || req.seller?._id;
  const sellerNameHeader = `${req.requester?.firstName || req.firstName || ""} ${req.requester?.lastName || req.lastName || ""}`.trim() || req.seller?.businessName;

  const categoryBreadcrumb = [
    product.categoryDetails?.name || master.categoryId?.name || product.categoryName,
    product.productCategoryDetails?.name || product.productCategory,
    product.subCategoryDetails?.name || product.subCategory || master.subCategory,
  ].filter(Boolean).join(" > ");

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 animate-in fade-in duration-300">
      {/* ── 1. HERO APPROVAL HEADER ── */}
      <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <BackButton onClick={onBack} fallback="/products" label="Products" variant="icon" />

            {/* Thumbnail Image */}
            <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-slate-50 border border-slate-200 p-1 overflow-hidden">
              <img
                src={mediaList[0] || "/placeholder-product.png"}
                alt={master.name || "Product"}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Moderation Workspace
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-700 border border-amber-200/60">
                  {req.type === "product_approval" ? "Product Listing Approval" : "Seller Onboarding"}
                </span>
                {categoryBreadcrumb && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-xs">
                    <FiTag size={10} className="text-slate-400" />
                    {categoryBreadcrumb}
                  </span>
                )}
              </div>

              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-snug truncate">
                {master.name || product.name || "Product Moderation Detail"}
              </h1>

              {/* ID Chips Strip with Copy Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-2xs font-mono text-slate-500">
                {requestIdVal && (
                  <span className="inline-flex items-center bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 font-semibold">
                    Req ID: {String(requestIdVal).substring(0, 12)} <CopyButton value={String(requestIdVal)} />
                  </span>
                )}
                {productIdVal && (
                  <span className="inline-flex items-center bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 font-semibold">
                    Product ID: {String(productIdVal).substring(0, 12)} <CopyButton value={String(productIdVal)} />
                  </span>
                )}
                {masterSkuVal && (
                  <span className="inline-flex items-center bg-violet-50 text-violet-700 px-2 py-0.5 rounded border border-violet-200/60 font-semibold">
                    Master SKU: {masterSkuVal} <CopyButton value={masterSkuVal} />
                  </span>
                )}
                {sellerNameHeader && (
                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200/60 font-semibold">
                    <FiUser size={10} /> Seller Name: {sellerNameHeader}
                    {sellerIdVal && <CopyButton value={String(sellerIdVal)} />}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE CONTENT GRID ── */}
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        
        {/* Full-width 20-sec Decision Summary Banner */}
        <ApprovalSummaryCard req={req} validations={validationAlerts} riskLevel={riskLevel} />

        {/* 2-Column Responsive Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Content Area (Left 70%) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Seller & Dispatch Pickup Location Snapshot (Important Info Top Position) */}
            <SellerCard req={req} />

            {/* 2. Unified Master Product Catalog Reference & Complete Category Classification Flow */}
            <MasterProductCategoryCard product={product} />

            {/* 3. Visual Product Media Assets Gallery */}
            <ProductGallery media={mediaList} masterMedia={masterMediaList} expiryProof={product.expiryProofMedia || product.expiryProofUrl} />

            {/* 4. General Information & Dynamic Specs Card */}
            {(generalInfo.length > 0 || specifications.length > 0) && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <h2 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    Product Overview & Specifications
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    API Driven Fields
                  </span>
                </h2>

                {/* Key Overview Grid */}
                {generalInfo.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generalInfo.map((field, idx) => (
                      <div key={idx} className="p-3 bg-slate-50/70 rounded-xl border border-slate-150">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                          {field.label}
                        </span>
                        <span className="text-xs font-bold text-slate-850 block truncate flex items-center justify-between">
                          <span className="truncate">{field.value}</span>
                          {field.copyable && <CopyButton value={field.value} />}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Specifications Table */}
                {specifications.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Technical Attributes & Product Specs ({specifications.length})
                    </span>
                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                      <table className="min-w-full divide-y divide-slate-150 text-xs">
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {specifications.map((spec, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/40">
                              <td className="px-4 py-3 font-extrabold text-slate-400 uppercase tracking-wider w-1/3 bg-slate-50/50">
                                {spec.label}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {spec.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Pricing & Commercial Dashboard */}
            <PriceCard product={product} />

            {/* 6. Lots & Bulk Pricing Matrix */}
            <LotInformationCard product={product} />

            {/* 7. Inventory & Stock Status */}
            <InventoryCard product={product} />

            {/* 8. Manufacturing & Expiry Verification */}
            <ManufacturingCard product={product} />

            {/* 9. Product Description Comparison Section */}
            <ProductDescriptionCard product={product} />

            {/* 10. Commercial System Flags Section */}
            <CommercialFlagsCard product={product} req={req} />

            {/* 12. Verification & KYC Documents */}
            <DocumentsCard product={product} req={req} />

            {/* 13. Audit Activity Log Timeline */}
            <TimelineCard product={product} req={req} />

            {/* 14. Developer Mode Raw API JSON Inspector */}
            {showDevJson && <JsonDebugViewer data={req} />}

          </div>

          {/* Right Sticky Decision Workspace Panel (30%) */}
          <div className="lg:col-span-1 sticky top-24 space-y-4">
            <ApprovalActions
              status={req.status}
              onApprove={() => {
                setFees({ promoterFee: "", messengerFee: "", connectorFee: "", platformFee: "" });
                setError("");
                setShowApproveModal(true);
              }}
              onReject={() => setShowRejectModal(true)}
              onRequestChanges={() => setShowChangesModal(true)}
              onViewSeller={() => alert("Opening Seller Profile...")}
              onDownloadDocuments={handleDownloadAllDocs}
              loading={loading}
              validationCount={validationAlerts.filter((c) => c.type === "error").length}
            />

            {/* Toggle Developer Mode Raw JSON button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDevJson(!showDevJson)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                {showDevJson ? "Hide Raw API JSON" : "Inspect Raw API JSON (Dev Mode)"}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── APPROVAL COMMISSION MODAL ── */}
      {showApproveModal && (
        <Modal onClose={() => setShowApproveModal(false)}>
          <div className="w-[450px] max-w-full space-y-4">
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
              commissionValidation.status === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : commissionValidation.status === "warning"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}>
              <div className="flex items-center gap-2">
                {commissionValidation.status === "success" ? (
                  <FiCheckCircle className="text-emerald-600 flex-shrink-0" size={16} />
                ) : commissionValidation.status === "warning" ? (
                  <FiAlertCircle className="text-amber-600 flex-shrink-0" size={16} />
                ) : (
                  <FiXCircle className="text-rose-600 flex-shrink-0" size={16} />
                )}
                <span>{commissionValidation.message}</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/80 border border-current whitespace-nowrap">
                {commissionValidation.total}% / {commissionValidation.target}%
              </span>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 justify-end">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={submitApproval}
                disabled={loading || !commissionValidation.isValid}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Approval
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── REJECTION WORKFLOW MODAL ── */}
      {showRejectModal && (
        <Modal onClose={() => setShowRejectModal(false)}>
          <div className="w-[480px] max-w-full space-y-4">
            <h3 className="text-sm font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              Reject Listing Request
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

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Attachment (Optional File Url)</label>
                <input
                  type="text"
                  placeholder="https://example.com/audit-report.pdf"
                  value={rejectAttachment}
                  onChange={(e) => setRejectAttachment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-slate-400 outline-none transition"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={submitRejection}
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer transition disabled:opacity-50"
              >
                Reject Listing
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── REQUEST CHANGES MODAL ── */}
      {showChangesModal && (
        <Modal onClose={() => setShowChangesModal(false)}>
          <div className="w-[520px] max-w-full space-y-4">
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
                onClick={() => setShowChangesModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={submitRequestChanges}
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

export default ProductDetailView;
