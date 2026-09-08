import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCompleteUrlV1 } from "../utils";
import { httpClient } from "../services/ApiService";
import { ICategoryServer } from "../types";
import { CreateMasterProductModal } from "../components/CreateMasterProductModal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { hasPermission } from "../utils/permission";
import DebounceSearch from "../components/DebounceSearch";
import Breadcrumb from "../components/Breadcrumb";
import CardSkeleton from "../components/CardSkeleton";
import { FaEdit, FaTrashAlt, FaEye, FaPlus } from "react-icons/fa";

export const MasterProductList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<ICategoryServer[]>([]);
  const [openCreateMaster, setOpenCreateMaster] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [filteredProducts, setFilteredProducts] = useState<ICategoryServer[]>([]);
  const [isloading, setIsLoading] = useState<boolean>(true);
  const [refreshList, setRefreshList] = useState<boolean>(false);

  const canView = hasPermission("Master.View");
  const canEdit = hasPermission("Master.Edit");

  useEffect(() => {
    (async function getMatserProduct() {
      try {
        setIsLoading(true);
        const master = await httpClient.get(getCompleteUrlV1("master"));
        if (master.ok) {
          const resPayload = await master.json();
          setProducts(resPayload.data || []);
          setFilteredProducts(resPayload.data || []);
        }
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshList]);

  // Handle status toggle (active/inactive)
  const handleToggleStatus = async (product: ICategoryServer) => {
    if (!canEdit) return;
    try {
      const newActiveState = product.active === false;
      const payload = {
        id: product._id,
        name: product.name,
        brand: product.brand,
        categoryId: product.categoryId,
        productCategoryId: (product as any).productCategoryId || null,
        subCategoryId: (product as any).subCategoryId || null,
        skuCode: product.skuCode,
        mrp: product.categoryDetails?.mrp ? Number(product.categoryDetails.mrp) : 0,
        size: product.size,
        unit: product.unit || "",
        active: newActiveState,
        media: product.media || [],
      };

      let res = await httpClient.put(getCompleteUrlV1("master"), payload);
      if (!res.ok) {
        res = await httpClient.put(
          getCompleteUrlV1(`master/${product._id}`),
          payload
        );
      }

      if (res.ok) {
        setRefreshList((prev) => !prev);
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    try {
      setIsDeleting(true);
      const res = await httpClient.delete(getCompleteUrlV1(`master/${deletingProduct._id}`));
      if (res.ok) {
        setRefreshList((prev) => !prev);
      } else {
        alert("Failed to delete master product.");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("An error occurred during deletion.");
    } finally {
      setIsDeleting(false);
      setDeletingProduct(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation & Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: "Dashboard", to: "/dashboard" },
              { label: "Master Product List", to: "/master-product-list" },
            ]}
          />
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">
            Master Product Management
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            Create, manage and organize core master product variants.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setOpenCreateMaster(true);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2 cursor-pointer"
          >
            <FaPlus size={12} />
            Create Product
          </button>
        )}
      </div>

      {/* Main Listing Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
        {/* Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <DebounceSearch
              products={products}
              setSearchProduct={setFilteredProducts}
              placeholder="Search Products..."
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-55/60 text-slate-500 font-semibold">
              <tr className="text-xs uppercase tracking-wider text-left">
                <th className="py-4 px-6">Product Name</th>
                <th className="py-4 px-6">SKU Code</th>
                <th className="py-4 px-6">Brand</th>
                <th className="py-4 px-6">Category Name</th>
                <th className="py-4 px-6">Size / Unit</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            {isloading ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="py-6">
                    <CardSkeleton />
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const isActive = p.active !== false;
                    return (
                      <tr
                        key={p._id}
                        className="hover:bg-slate-50/50 transition-colors duration-150 cursor-pointer"
                        onClick={() => canView && navigate(`/master-product/${p._id}`, { state: { from: location.pathname + location.search } })}
                      >
                        <td className="py-4 px-6 font-semibold text-slate-800">{p.name}</td>
                        <td className="py-4 px-6 font-mono text-xs">{p.skuCode}</td>
                        <td className="py-4 px-6">{p.brand || "—"}</td>
                        <td className="py-4 px-6">{p.categoryDetails?.name || "—"}</td>
                        <td className="py-4 px-6 font-medium">
                          {p.size || p.unit ? (
                            <span>
                              {p.size || "—"}
                              {p.unit && <span className="ml-1 text-xs text-slate-400 font-normal">({p.unit})</span>}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(p)}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isActive ? "bg-emerald-500" : "bg-slate-200"
                              }`}
                              title={isActive ? "Deactivate product" : "Activate product"}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isActive ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2.5">
                            {canView && (
                              <button
                                onClick={() => navigate(`/master-product/${p._id}`, { state: { from: location.pathname + location.search } })}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                                title="View Details"
                              >
                                <FaEye size={14} />
                              </button>
                            )}

                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setOpenCreateMaster(true);
                                }}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                                title="Edit Product"
                              >
                                <FaEdit size={14} />
                              </button>
                            )}

                            {canEdit && (
                              <button
                                onClick={() => setDeletingProduct(p)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Delete Product"
                              >
                                <FaTrashAlt size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 italic">
                      No master products found.
                    </td>
                  </tr>
                )}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* Delete Confirmation Overlay */}
      <ConfirmDeleteModal
        isOpen={!!deletingProduct}
        title="Delete Master Product"
        message={
          deletingProduct
            ? `Are you sure you want to delete the product "${deletingProduct.name}"? This action cannot be undone.`
            : ""
        }
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingProduct(null)}
      />

      {/* Create / Edit Form Modal */}
      {(openCreateMaster || !!editingProduct) && (
        <CreateMasterProductModal
          isOpen={openCreateMaster || !!editingProduct}
          onClose={() => {
            setOpenCreateMaster(false);
            setEditingProduct(null);
          }}
          setRefreshList={setRefreshList}
          editingProduct={editingProduct}
        />
      )}
    </div>
  );
};
