import React, { useState } from "react";
import { FiCheckCircle, FiCopy } from "react-icons/fi";

interface MasterProductCardProps {
  product: any;
}

export const MasterProductCard: React.FC<MasterProductCardProps> = ({ product }) => {
  const master = product.masterDetails || {};
  const [copied, setCopied] = useState(false);

  if (!master._id && !master.skuCode && !master.name) return null;

  const masterMedia = master.media?.[0] || master.image || "/placeholder-product.png";

  const handleCopySku = () => {
    if (master.skuCode) {
      navigator.clipboard.writeText(master.skuCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
          Master Product Catalog Reference
        </h2>
        <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border border-violet-100">
          <FiCheckCircle size={12} />
          Linked Master Listing
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-4 pt-1">
        {/* Master Image */}
        <div className="h-24 w-24 flex-shrink-0 rounded-xl bg-slate-50 border border-slate-150 p-1 overflow-hidden relative group">
          <img
            src={masterMedia}
            alt={master.name || "Master Product"}
            className="h-full w-full object-contain"
          />
        </div>

        {/* Master Details */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Master Title</span>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight leading-snug">
              {master.name || "Master Product"}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
            {master.skuCode && (
              <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Master SKU</span>
                <span className="font-mono font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  {master.skuCode}
                  <button
                    onClick={handleCopySku}
                    className="text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                    title="Copy SKU"
                  >
                    {copied ? <span className="text-[9px] text-emerald-600">Copied</span> : <FiCopy size={11} />}
                  </button>
                </span>
              </div>
            )}

            {master.mrp && (
              <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Master MRP</span>
                <span className="font-bold text-slate-800 block mt-0.5">₹{master.mrp}</span>
              </div>
            )}

            {master.brand && (
              <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Brand</span>
                <span className="font-semibold text-slate-800 block mt-0.5">{master.brand}</span>
              </div>
            )}

            {master.size && (
              <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Size / Pack</span>
                <span className="font-semibold text-slate-800 block mt-0.5">{master.size}</span>
              </div>
            )}

            {master.unit && (
              <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Unit</span>
                <span className="font-semibold text-slate-800 block mt-0.5">{master.unit}</span>
              </div>
            )}
          </div>

          {master.description && (
            <div className="pt-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Master Description</span>
              <p className="text-xs text-slate-650 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed font-medium line-clamp-2">
                {master.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterProductCard;
