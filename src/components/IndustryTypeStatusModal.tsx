import React, { useState } from "react";
import { FaExclamationCircle, FaSpinner } from "react-icons/fa";
import { IndustryType } from "../types";
import { IndustryTypeService } from "../services/IndustryTypeService";

interface IndustryTypeStatusModalProps {
  isOpen: boolean;
  item: IndustryType | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const IndustryTypeStatusModal: React.FC<IndustryTypeStatusModalProps> = ({
  isOpen,
  item,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const isCurrentActive = item.status === "active" || item.isActive === true;
  const newStatus: "active" | "inactive" = isCurrentActive ? "inactive" : "active";

  const handleConfirm = async () => {
    setErrorMessage(null);
    try {
      setIsSubmitting(true);
      // Sends documented complete payload
      const response = await IndustryTypeService.updateIndustryType({
        _id: item._id,
        name: item.name,
        description: item.description || "",
        status: newStatus,
      });
      onSuccess(
        response.message ||
          `Industry type ${newStatus === "active" ? "activated" : "deactivated"} successfully`
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update status. Please try again.");
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
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden transform transition-all border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex gap-4">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              isCurrentActive
                ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            <FaExclamationCircle size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 leading-snug">
              {isCurrentActive ? "Deactivate Industry Type?" : "Activate Industry Type?"}
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {isCurrentActive
                ? `You are about to deactivate "${item.name}". This industry type may no longer be available for future selections in the Lottmart platform.`
                : `You are about to activate "${item.name}". This industry type will be made available for selection across the Lottmart platform.`}
            </p>
            {errorMessage && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                {errorMessage}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer ${
              isCurrentActive
                ? "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-500/10"
                : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-500/10"
            }`}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="animate-spin" size={12} />
                Processing...
              </>
            ) : (
              <>{isCurrentActive ? "Confirm Deactivate" : "Confirm Activate"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
