import React, { useState, useEffect } from "react";
import { FaTimes, FaSpinner } from "react-icons/fa";
import { IndustryType } from "../types";
import { IndustryTypeService } from "../services/IndustryTypeService";

interface IndustryTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  editingItem?: IndustryType | null;
}

export const IndustryTypeModal: React.FC<IndustryTypeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingItem = null,
}) => {
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || "");
      setDescription(editingItem.description || "");
      setStatus(editingItem.status === "inactive" ? "inactive" : "active");
    } else {
      setName("");
      setDescription("");
      setStatus("active");
    }
    setErrorMessage(null);
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Industry Type Name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingItem) {
        const response = await IndustryTypeService.updateIndustryType({
          _id: editingItem._id,
          name: trimmedName,
          description: description.trim(),
          status,
        });
        onSuccess(response.message || "Industry type updated successfully");
      } else {
        const response = await IndustryTypeService.createIndustryType({
          name: trimmedName,
          description: description.trim(),
          status,
        });
        onSuccess(response.message || "Industry type created successfully");
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {editingItem ? "Edit Industry Type" : "Add Industry Type"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {editingItem
                ? "Update industry category details"
                : "Create a new industry category for the Lottmart platform"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl animate-in fade-in">
              {errorMessage}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Industry Type Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. General Trade, Healthcare, Electronics"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-50"
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this industry category..."
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-50 resize-none"
            />
          </div>

          {/* Status Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-50 cursor-pointer font-medium"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" size={12} />
                  {editingItem ? "Saving..." : "Creating..."}
                </>
              ) : (
                <>{editingItem ? "Save Changes" : "Create Industry Type"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
