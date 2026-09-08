import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCompleteUrlV1 } from "../utils";
import { httpClient } from "../services/ApiService";
import { hasPermission } from "../utils/permission";
import Breadcrumb from "../components/Breadcrumb";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { CreateMasterProductModal } from "../components/CreateMasterProductModal";
import BackButton from "../components/BackButton";
import {
  FaEdit,
  FaTrashAlt,
  FaCalendarAlt,
  FaUser,
  FaBoxOpen,
  FaLock,
  FaTag,
  FaClock,
} from "react-icons/fa";

export function MasterProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<any>(null);
  const [categoryName, setCategoryName] = useState<string>("—");
  const [subCategoryName, setSubCategoryName] = useState<string>("—");
  const [productSubCategoryName, setProductSubCategoryName] = useState<string>("—");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<boolean>(false);

  // Modal states
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const canView = hasPermission("Master.View");
  const canEdit = hasPermission("Master.Edit");

  // Fetch product details
  useEffect(() => {
    if (!canView) {
      setIsLoading(false);
      return;
    }

    const fetchProductDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch details from individual endpoint
        let res = await httpClient.get(getCompleteUrlV1(`master/${id}`));
        let details: any = null;

        if (res.ok) {
          const payload = await res.json();
          details = payload.data;
        } else {
          // Fallback: search in full list
          const listRes = await httpClient.get(getCompleteUrlV1("master"));
          if (listRes.ok) {
            const listPayload = await listRes.json();
            details = listPayload.data?.find((p: any) => p._id === id);
          }
        }

        if (!details) {
          setError("Product not found. It may have been deleted.");
          return;
        }

        setProduct(details);

        // Resolve names for Category, Sub-Category, and Product Sub-Category
        if (details.categoryDetails?.name) {
          setCategoryName(details.categoryDetails.name);
        } else if (details.categoryId) {
          // Lookup category by ID
          const catRes = await httpClient.get(getCompleteUrlV1("category/names"));
          if (catRes.ok) {
            const catPayload = await catRes.json();
            const cat = catPayload.data?.find((c: any) => c._id === details.categoryId);
            if (cat) setCategoryName(cat.name);
          }
        }

        if (details.productCategoryId) {
          // Fetch Sub-Categories for this Category
          const subRes = await httpClient.get(
            getCompleteUrlV1("category/product-category", { categoryId: details.categoryId })
          );
          if (subRes.ok) {
            const subPayload = await subRes.json();
            const sub = subPayload.data?.find((sc: any) => sc._id === details.productCategoryId);
            if (sub) setSubCategoryName(sub.name);
          }
        }

        if (details.subCategoryId) {
          // Fetch Product Sub-Categories
          const prodSubRes = await httpClient.get(
            getCompleteUrlV1("category/sub-category", {
              categoryId: details.categoryId,
              productCategoryId: details.productCategoryId,
            })
          );
          if (prodSubRes.ok) {
            const prodSubPayload = await prodSubRes.json();
            const prodSub = prodSubPayload.data?.find((psc: any) => psc._id === details.subCategoryId);
            if (prodSub) setProductSubCategoryName(prodSub.name);
          }
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        setError("Network error. Failed to load product details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductDetails();
  }, [id, canView, refresh]);

  // Delete product handler
  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      const res = await httpClient.delete(getCompleteUrlV1(`master/${id}`));
      if (res.ok) {
        navigate("/master-product-list");
      } else {
        alert("Failed to delete master product. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting master product:", err);
      alert("An error occurred while deleting the product.");
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  // ───── Permission Access Denied State ─────
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-white border border-slate-100 shadow-sm rounded-2xl max-w-lg mx-auto mt-10">
        <div className="p-4 bg-rose-50 text-rose-500 rounded-full mb-4 animate-bounce">
          <FaLock size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-sm text-slate-400 text-center mt-2">
          You do not have the required permissions to view master product details. Please contact your system administrator.
        </p>
        <BackButton fallback="/master-product-list" label="Master Product List" variant="button" className="mt-6" />
      </div>
    );
  }

  // ───── Loading State ─────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-slate-200 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-10 w-24 bg-slate-200 rounded-xl animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-200 rounded-xl animate-pulse" />
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-48 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───── Error State ─────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-slate-100 shadow-sm rounded-2xl max-w-lg mx-auto mt-10">
        <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4">
          <FaBoxOpen size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Error Loading Details</h2>
        <p className="text-sm text-slate-400 text-center mt-2">{error}</p>
        <BackButton fallback="/master-product-list" label="Master Product List" variant="button" className="mt-6" />
      </div>
    );
  }

  const isProductActive = product?.active !== false;

  return (
    <div className="space-y-6">
      {/* Navigation & Breadcrumb Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: "Dashboard", to: "/dashboard" },
              { label: "Master Product List", to: "/master-product-list" },
              { label: product.name },
            ]}
          />
          <div className="flex items-center gap-3.5 mt-2">
            <BackButton fallback="/master-product-list" label="Master Product List" variant="icon" />
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {product.name}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                isProductActive
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              {isProductActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            SKU: <span className="font-bold text-slate-600">{product.skuCode}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {canEdit && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2 cursor-pointer"
            >
              <FaEdit size={13} />
              Edit Product
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 text-sm font-semibold rounded-xl transition-all border border-rose-200/50 flex items-center gap-2 cursor-pointer"
            >
              <FaTrashAlt size={12} />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side (Information Card + Image Preview) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Information Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FaBoxOpen size={16} className="text-blue-500" />
              Product Specifications
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5">
              {/* Product Name */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Product Name
                </span>
                <p className="text-sm font-semibold text-slate-700">{product.name || "—"}</p>
              </div>

              {/* SKU Code */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  SKU Code
                </span>
                <p className="text-sm font-mono font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-lg inline-block">
                  {product.skuCode || "—"}
                </p>
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Brand Name
                </span>
                <p className="text-sm font-semibold text-slate-700">{product.brand || "—"}</p>
              </div>

              {/* Size */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Size
                </span>
                <p className="text-sm font-semibold text-slate-700">{product.size || "—"}</p>
              </div>

              {/* Unit */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Unit
                </span>
                <p className="text-sm font-semibold text-slate-700">{product.unit || "—"}</p>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Category (Parent)
                </span>
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <FaTag size={12} className="text-slate-400" />
                  {categoryName}
                </p>
              </div>

              {/* Sub-Category */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Sub Category
                </span>
                <p className="text-sm font-semibold text-slate-700">{subCategoryName}</p>
              </div>

              {/* Product Sub-Category */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Product Sub Category
                </span>
                <p className="text-sm font-semibold text-slate-700">{productSubCategoryName}</p>
              </div>

              {/* MRP */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  MRP (Maximum Retail Price)
                </span>
                <p className="text-sm font-extrabold text-slate-800">
                  {product.mrp !== undefined ? `₹${product.mrp}` : "—"}
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Description
                </span>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  {product.description || "No description provided."}
                </p>
              </div>
            </div>
          </div>

          {/* Media Section */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FaTag size={16} className="text-indigo-500" />
              Product Image Preview
            </h3>

            <div className="mt-5 flex justify-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {product.media && product.media.length > 0 ? (
                <div className="relative group max-w-sm rounded-xl overflow-hidden shadow-md bg-white border border-slate-200">
                  <img
                    src={product.media[0]}
                    alt={product.name}
                    className="max-h-72 w-auto object-contain mx-auto transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-sm text-slate-400 italic">No image available for this product</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side (Audit Trail + Timeline) */}
        <div className="space-y-6">
          {/* Audit Logs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FaClock size={15} className="text-emerald-500" />
              Audit Logs
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg mt-0.5">
                  <FaCalendarAlt size={12} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Created At
                  </span>
                  <p className="text-xs font-semibold text-slate-700">
                    {product.createdAt ? new Date(product.createdAt).toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mt-0.5">
                  <FaCalendarAlt size={12} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Last Updated
                  </span>
                  <p className="text-xs font-semibold text-slate-700">
                    {product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg mt-0.5">
                  <FaUser size={12} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Created By
                  </span>
                  <p className="text-xs font-semibold text-slate-700">
                    {product.createdBy || "System Administrator"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FaClock size={15} className="text-violet-500" />
              Activity History
            </h3>

            <div className="relative border-l border-slate-100 ml-3.5 mt-5 space-y-6">
              {/* Event 1: Creation */}
              <div className="relative pl-6">
                <span className="absolute -left-2 top-1.5 flex items-center justify-center w-4 h-4 bg-emerald-500 rounded-full border border-white ring-4 ring-emerald-50 text-white" />
                <p className="text-xs font-bold text-slate-800">Master Product Created</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {product.createdAt ? new Date(product.createdAt).toLocaleString() : "—"}
                </p>
              </div>

              {/* Event 2: Modification (Only show if updatedAt differs from createdAt) */}
              {product.updatedAt && product.createdAt !== product.updatedAt && (
                <div className="relative pl-6">
                  <span className="absolute -left-2 top-1.5 flex items-center justify-center w-4 h-4 bg-blue-500 rounded-full border border-white ring-4 ring-blue-50 text-white" />
                  <p className="text-xs font-bold text-slate-800">Details Modified</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(product.updatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Overlay */}
      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        title="Delete Master Product"
        message={`Are you sure you want to delete the master product "${product.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteOpen(false)}
      />

      {/* Edit Form Modal */}
      {isEditOpen && (
        <CreateMasterProductModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          setRefreshList={() => setRefresh((p) => !p)}
          editingProduct={product}
        />
      )}
    </div>
  );
}
