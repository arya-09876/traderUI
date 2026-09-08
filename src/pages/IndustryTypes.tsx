import { useEffect, useState, useCallback } from "react";
import { FaPlus, FaSearch, FaFilter, FaLayerGroup, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import Breadcrumb from "../components/Breadcrumb";
import { IndustryType, IndustryTypePagination } from "../types";
import { IndustryTypeService } from "../services/IndustryTypeService";
import { IndustryTypeTable } from "../components/IndustryTypeTable";
import { IndustryTypeModal } from "../components/IndustryTypeModal";
import { IndustryTypeStatusModal } from "../components/IndustryTypeStatusModal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";

export const IndustryTypes = () => {
  // Data States
  const [items, setItems] = useState<IndustryType[]>([]);
  const [pagination, setPagination] = useState<IndustryTypePagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // Filter & Search States
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // 'all' | 'active' | 'inactive'
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<IndustryType | null>(null);

  const [statusItem, setStatusItem] = useState<IndustryType | null>(null);
  const [deletingItem, setDeletingItem] = useState<IndustryType | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Debounce search input (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Rule: Search/filter change -> Reset Page 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  // Fetch Industry Types from backend API
  const fetchIndustryTypes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await IndustryTypeService.getIndustryTypes({
        page,
        limit,
        search: debouncedSearch,
        status: statusFilter,
        sort: "createdAt_EP",
        sortOrder: -1,
      });

      setItems(response.data || []);
      if (response.pagination) {
        setPagination(response.pagination);
      } else {
        setPagination({
          total: response.data ? response.data.length : 0,
          page,
          limit,
          totalPages: 1,
        });
      }
    } catch (err: any) {
      console.error("Error fetching industry types:", err);
      setErrorMessage(err.message || "Failed to load industry types. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, refreshTrigger]);

  useEffect(() => {
    fetchIndustryTypes();
  }, [fetchIndustryTypes]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => !prev);
  };

  // Handlers for Add / Edit
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: IndustryType) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Handlers for Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      setIsDeleting(true);
      const res = await IndustryTypeService.deleteIndustryType(deletingItem._id);
      showToast(res.message || "Industry type deleted successfully", "success");
      setDeletingItem(null);
      handleRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to delete industry type", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const breadcrumbItems = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Industry Types" },
  ];

  // Pagination calculation
  const startCount = (pagination.page - 1) * pagination.limit + 1;
  const endCount = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-900 text-white border-emerald-700"
              : "bg-red-900 text-white border-red-700"
          }`}
        >
          {toast.type === "success" ? (
            <FaCheckCircle size={18} className="text-emerald-400" />
          ) : (
            <FaExclamationTriangle size={18} className="text-red-400" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">
            Industry Types
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Manage industry categories available across the Lottmart platform.
          </p>
        </div>

        {/* Top Action Button */}
        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <FaPlus size={12} />
          Add Industry Type
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FaLayerGroup size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Total Industry Types
            </p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">
              {isLoading ? "..." : pagination.total}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
        {/* Filters and Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          {/* Search Area */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <FaSearch size={14} />
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Industry Types by name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-slate-50/50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FaFilter size={11} /> Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* API Error State */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table Component */}
        <IndustryTypeTable
          items={items}
          isLoading={isLoading}
          onEdit={handleOpenEditModal}
          onStatusToggle={setStatusItem}
          onDelete={setDeletingItem}
          onCreateTrigger={handleOpenAddModal}
        />

        {/* Pagination Bar */}
        {!isLoading && items.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{pagination.total === 0 ? 0 : startCount}</span> to{" "}
              <span className="font-bold text-slate-800">{endCount}</span> of{" "}
              <span className="font-bold text-slate-800">{pagination.total}</span> Results
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
              >
                Previous
              </button>

              <div className="flex items-center gap-1 px-2">
                <span className="text-xs font-bold text-slate-800">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <IndustryTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg, "success");
          handleRefresh();
        }}
        editingItem={editingItem}
      />

      {/* Status Toggle Modal */}
      <IndustryTypeStatusModal
        isOpen={!!statusItem}
        item={statusItem}
        onClose={() => setStatusItem(null)}
        onSuccess={(msg) => {
          showToast(msg, "success");
          handleRefresh();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingItem}
        title="Delete Industry Type?"
        message={
          deletingItem
            ? `You are about to permanently delete "${deletingItem.name}". This action cannot be undone.`
            : ""
        }
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
};
