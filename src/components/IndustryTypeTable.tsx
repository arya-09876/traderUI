import React from "react";
import moment from "moment";
import { FaEdit, FaTrashAlt, FaToggleOn, FaToggleOff, FaPlus, FaLayerGroup } from "react-icons/fa";
import { IndustryType } from "../types";
import StatusBadge from "./StatusBadge";

interface IndustryTypeTableProps {
  items: IndustryType[];
  isLoading: boolean;
  onEdit: (item: IndustryType) => void;
  onStatusToggle: (item: IndustryType) => void;
  onDelete: (item: IndustryType) => void;
  onCreateTrigger: () => void;
}

export const IndustryTypeTable: React.FC<IndustryTypeTableProps> = ({
  items,
  isLoading,
  onEdit,
  onStatusToggle,
  onDelete,
  onCreateTrigger,
}) => {
  const formatDate = (dateStr?: string, epochSec?: number) => {
    if (epochSec) {
      return moment.unix(epochSec).format("DD MMM YYYY");
    }
    if (dateStr) {
      return moment(dateStr).format("DD MMM YYYY");
    }
    return "-";
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="min-w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6 text-left">Industry Type</th>
                <th className="py-4 px-6 text-left">Description</th>
                <th className="py-4 px-6 text-left">Status</th>
                <th className="py-4 px-6 text-left">Created Date</th>
                <th className="py-4 px-6 text-left">Last Updated</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-100 rounded w-32" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-100 rounded w-48" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-6 bg-slate-100 rounded-full w-16" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-100 rounded w-24" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-100 rounded w-24" />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="inline-flex gap-2 justify-end">
                      <div className="h-8 w-8 bg-slate-100 rounded-xl" />
                      <div className="h-8 w-8 bg-slate-100 rounded-xl" />
                      <div className="h-8 w-8 bg-slate-100 rounded-xl" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <FaLayerGroup size={28} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Industry Types Found</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
          Create your first industry type to make it available across the Lottmart platform.
        </p>
        <button
          onClick={onCreateTrigger}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-500/10 inline-flex items-center gap-2 cursor-pointer"
        >
          <FaPlus size={12} />
          Add Industry Type
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="min-w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/75 text-slate-500 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="py-4 px-6 text-left">Industry Type</th>
              <th className="py-4 px-6 text-left">Description</th>
              <th className="py-4 px-6 text-left">Status</th>
              <th className="py-4 px-6 text-left">Created Date</th>
              <th className="py-4 px-6 text-left">Last Updated</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((item) => {
              const isActive = item.status === "active" || item.isActive === true;
              return (
                <tr
                  key={item._id}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  <td className="py-4 px-6">
                    <span className="font-bold text-slate-800 text-sm block">
                      {item.name}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-slate-600 text-xs line-clamp-2 max-w-xs leading-relaxed">
                      {item.description || <span className="text-slate-400 italic">No description</span>}
                    </span>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <StatusBadge status={isActive ? "active" : "inactive"} />
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-xs whitespace-nowrap font-medium">
                    {formatDate(item.createdAt, item.createdAt_EP)}
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-xs whitespace-nowrap font-medium">
                    {formatDate(item.updatedAt, item.updatedAt_EP)}
                  </td>
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {/* Edit Button */}
                      <button
                        onClick={() => onEdit(item)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                        title="Edit Industry Type"
                      >
                        <FaEdit size={14} />
                      </button>

                      {/* Status Toggle Button */}
                      <button
                        onClick={() => onStatusToggle(item)}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isActive
                            ? "text-emerald-600 hover:text-amber-600 hover:bg-amber-50"
                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={isActive ? "Deactivate Industry Type" : "Activate Industry Type"}
                      >
                        {isActive ? <FaToggleOn size={18} /> : <FaToggleOff size={18} />}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => onDelete(item)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        title="Delete Industry Type"
                      >
                        <FaTrashAlt size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
