import { useForm, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import { getCompleteUrlV1 } from "../utils";
import { IMasterProduct } from "../types";
import { httpClient } from "../services/ApiService";
import { FormError } from "./FormError";
import { SearchableDropdown, DropdownOption } from "./SearchableDropdown";
import { ProductGalleryUploader } from "./ProductGalleryUploader";
import { FaTimes } from "react-icons/fa";
import { PRODUCT_UNITS } from "../constants";

const defaultValues: IMasterProduct = {
  name: "",
  brand: "",
  categoryId: "",
  productCategoryId: "",
  subCategoryId: "",
  skuCode: "",
  mrp: "",
  size: "",
  unit: "",
  images: [],
  description: "",
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  setRefreshList: React.SetStateAction<any>;
  editingProduct?: any; // Added prop for edit mode
};

export function CreateMasterProductModal({
  isOpen,
  onClose,
  setRefreshList,
  editingProduct,
}: Props) {
  const isEdit = !!editingProduct;
  const [categoryOptions, setCategoryOptions] = useState<DropdownOption[]>([]);
  const [productCategoryOptions, setProductCategoryOptions] = useState<DropdownOption[]>([]);
  const [subCategoryOptions, setSubCategoryOptions] = useState<DropdownOption[]>([]);
  const [loader, setLoader] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [primaryImage, setPrimaryImage] = useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<IMasterProduct>({ defaultValues });

  const categoryIdVal = watch("categoryId");
  const productCategoryIdVal = watch("productCategoryId");

  // Prefill form if editingProduct is passed
  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && editingProduct) {
      reset({
        name: editingProduct.name || "",
        brand: editingProduct.brand || "",
        categoryId: editingProduct.categoryId || "",
        productCategoryId: editingProduct.productCategoryId || "",
        subCategoryId: editingProduct.subCategoryId || "",
        skuCode: editingProduct.skuCode || "",
        mrp: editingProduct.mrp !== undefined ? String(editingProduct.mrp) : "",
        size: editingProduct.size || "",
        unit: editingProduct.unit || "",
        images: editingProduct.media || [],
        description: editingProduct.description || "",
      });
      setPrimaryImage(editingProduct.media?.[0] || "");
    } else {
      reset(defaultValues);
      setPrimaryImage("");
    }
  }, [editingProduct, isOpen, reset, isEdit]);

  // Fetch Parent Categories
  useEffect(() => {
    if (!isOpen) return;
    httpClient
      .get(getCompleteUrlV1("category/names"))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.data)) {
          setCategoryOptions(
            data.data.map((c: any) => ({
              label: c.name,
              value: c._id,
            }))
          );
        }
      })
      .catch((err) => console.error("Error loading categories:", err));
  }, [isOpen]);

  // Fetch Sub Categories (productCategoryId) when categoryId changes
  useEffect(() => {
    if (!isOpen || !categoryIdVal) {
      setProductCategoryOptions([]);
      // Only clear if the selected category is different from the original category of the editing product
      if (!isEdit || (editingProduct && editingProduct.categoryId !== categoryIdVal)) {
        setValue("productCategoryId", "");
        setValue("subCategoryId", "");
      }
      return;
    }
    httpClient
      .get(getCompleteUrlV1("category/product-category", { categoryId: categoryIdVal }))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.data)) {
          setProductCategoryOptions(
            data.data.map((c: any) => ({
              label: c.name,
              value: c._id,
            }))
          );
          // Clear sub fields only if the user changed the category manually
          if (!isEdit || (editingProduct && editingProduct.categoryId !== categoryIdVal)) {
            setValue("productCategoryId", "");
            setValue("subCategoryId", "");
          }
        }
      })
      .catch((err) => console.error("Error loading sub categories:", err));
  }, [categoryIdVal, isOpen, setValue, editingProduct, isEdit]);

  // Fetch Product Sub Categories (subCategoryId) when productCategoryId changes
  useEffect(() => {
    if (!isOpen || !categoryIdVal || !productCategoryIdVal) {
      setSubCategoryOptions([]);
      if (!isEdit || (editingProduct && editingProduct.productCategoryId !== productCategoryIdVal)) {
        setValue("subCategoryId", "");
      }
      return;
    }
    httpClient
      .get(
        getCompleteUrlV1("category/sub-category", {
          categoryId: categoryIdVal,
          productCategoryId: productCategoryIdVal,
        })
      )
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.data)) {
          setSubCategoryOptions(
            data.data.map((c: any) => ({
              label: c.name,
              value: c._id,
            }))
          );
          if (!isEdit || (editingProduct && editingProduct.productCategoryId !== productCategoryIdVal)) {
            setValue("subCategoryId", "");
          }
        }
      })
      .catch((err) => console.error("Error loading product sub categories:", err));
  }, [categoryIdVal, productCategoryIdVal, isOpen, setValue, editingProduct, isEdit]);

  const onSubmit = async (data: IMasterProduct) => {
    try {
      setLoader(true);
      setGeneralError(null);
      // Reorder images to ensure the primary image is at index 0
      const currentImages = Array.isArray(data.images)
        ? data.images
        : typeof data.images === "string"
        ? [data.images]
        : [];
      
      const reorderedMedia = [
        primaryImage,
        ...currentImages.filter((url) => url !== primaryImage),
      ].filter(Boolean);

      // Payload building
      const payload = {
        name: data.name.trim(),
        brand: data.brand?.trim() || "",
        categoryId: data.categoryId,
        productCategoryId: data.productCategoryId || null,
        subCategoryId: data.subCategoryId || null,
        skuCode: data.skuCode.trim(),
        mrp: data.mrp ? Number(data.mrp) : 0,
        size: data.size?.trim() || "Standard",
        unit: data.unit?.trim() || "",
        description: data.description?.trim() || "",
        media: reorderedMedia,
      };

      let response;
      if (isEdit && editingProduct) {
        // Send PUT request to update master product
        // Support both body-based ID and URL-based ID for maximum backend compatibility
        const editPayload = {
          id: editingProduct._id,
          active: editingProduct.active !== false,
          ...payload,
        };
        response = await httpClient.put(
          getCompleteUrlV1(`master`),
          editPayload
        );
        // Fallback: if not successful, try URL parameter based put
        if (!response.ok) {
          response = await httpClient.put(
            getCompleteUrlV1(`master/${editingProduct._id}`),
            editPayload
          );
        }
      } else {
        response = await httpClient.post(getCompleteUrlV1("master"), payload);
      }

      if (response.ok) {
        reset(defaultValues);
        onClose();
        setRefreshList((prev: boolean) => !prev);
      } else {
        const errText = await response.text();
        let errorMessage = `Failed to ${isEdit ? "update" : "create"} master product. Please try again.`;
        try {
          const errJson = JSON.parse(errText);
          errorMessage = errJson.message || errJson.error || errorMessage;
        } catch (_) {}
        setGeneralError(errorMessage);
      }
    } catch (err: any) {
      console.error("Error saving master product:", err);
      setGeneralError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoader(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden transform transition-all border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? "Edit Master Product" : "Create Master Product"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit
                ? "Update product details and save changes."
                : "Add a new master product and configure its category hierarchy."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
        >
          {generalError && (
            <div className="p-3.5 bg-red-50 border border-red-200/50 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {generalError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Core Fields */}
            <div className="space-y-4">
              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dehn Al Oud Premium"
                  {...register("name", {
                    required: "Product Name is required",
                    validate: {
                      notEmpty: (val) => val.trim().length > 0 || "Product name cannot be empty or only spaces",
                      noLeadingTrailing: (val) => val.trim() === val || "Product name cannot have leading or trailing spaces",
                    },
                  })}
                  className={`w-full px-4 py-2.5 rounded-xl border text-slate-800 text-sm placeholder:text-slate-400 bg-slate-50/50 focus:outline-none focus:ring-2 transition-all ${
                    errors.name
                      ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
                <FormError errorText={errors.name?.message} />
              </div>

              {/* SKU Code */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  SKU Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ATT-OUD-001"
                  {...register("skuCode", {
                    required: "SKU Code is required",
                    validate: {
                      notEmpty: (val) => val.trim().length > 0 || "SKU code cannot be empty or only spaces",
                    },
                  })}
                  className={`w-full px-4 py-2.5 rounded-xl border text-slate-800 text-sm placeholder:text-slate-400 bg-slate-50/50 focus:outline-none focus:ring-2 transition-all ${
                    errors.skuCode
                      ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                      : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
                <FormError errorText={errors.skuCode?.message} />
              </div>

              {/* Brand, Size & Unit Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="block text-sm font-semibold text-slate-700">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Arabian Essence"
                    {...register("brand")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder:text-slate-400 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="block text-sm font-semibold text-slate-700">Size</label>
                  <input
                    type="text"
                    placeholder="e.g. Standard"
                    {...register("size")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder:text-slate-400 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="block text-sm font-semibold text-slate-700">Unit</label>
                  <select
                    {...register("unit")}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="">Select Unit</option>
                    {PRODUCT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MRP & Description */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="block text-sm font-semibold text-slate-700">
                    MRP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="1000"
                    {...register("mrp", {
                      required: "MRP is required",
                      validate: {
                        positive: (val) => Number(val) > 0 || "MRP must be positive",
                      },
                    })}
                    className={`w-full px-4 py-2.5 rounded-xl border text-slate-800 text-sm placeholder:text-slate-400 bg-slate-50/50 focus:outline-none focus:ring-2 transition-all ${
                      errors.mrp
                        ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                        : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                  <FormError errorText={errors.mrp?.message} />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of the product"
                    {...register("description", { required: "Description is required" })}
                    className={`w-full px-4 py-2.5 rounded-xl border text-slate-800 text-sm placeholder:text-slate-400 bg-slate-50/50 focus:outline-none focus:ring-2 transition-all ${
                      errors.description
                        ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                        : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                  <FormError errorText={errors.description?.message} />
                </div>
              </div>
            </div>

            {/* Right Column: Taxonomy (Category Selector) & Image */}
            <div className="space-y-4">
              {/* Category Hierarchy Dropdowns */}
              <Controller
                name="categoryId"
                control={control}
                rules={{ required: "Category is required" }}
                render={({ field, fieldState }) => (
                  <SearchableDropdown
                    label="Category *"
                    placeholder="Search & select category..."
                    options={categoryOptions}
                    value={field.value}
                    onChange={(val) => {
                      setValue("categoryId", val, { shouldValidate: true });
                    }}
                    error={fieldState.error?.message}
                  />
                )}
              />

              <Controller
                name="productCategoryId"
                control={control}
                render={({ field, fieldState }) => (
                  <SearchableDropdown
                    label="Sub Category"
                    placeholder={
                      categoryIdVal ? "Search & select sub category..." : "Please select category first"
                    }
                    options={productCategoryOptions}
                    value={field.value || ""}
                    onChange={(val) => {
                      setValue("productCategoryId", val, { shouldValidate: true });
                    }}
                    disabled={!categoryIdVal}
                    error={fieldState.error?.message}
                  />
                )}
              />

              <Controller
                name="subCategoryId"
                control={control}
                render={({ field, fieldState }) => (
                  <SearchableDropdown
                    label="Product Sub Category"
                    placeholder={
                      productCategoryIdVal
                        ? "Search & select product sub category..."
                        : "Please select sub category first"
                    }
                    options={subCategoryOptions}
                    value={field.value || ""}
                    onChange={(val) => {
                      setValue("subCategoryId", val, { shouldValidate: true });
                    }}
                    disabled={!productCategoryIdVal}
                    error={fieldState.error?.message}
                  />
                )}
              />

              {/* Product Gallery Uploader Component */}
              <Controller
                name="images"
                control={control}
                rules={{
                  validate: {
                    required: (value) => {
                      const count = Array.isArray(value) ? value.length : 0;
                      return count > 0 || "At least one product image is required";
                    }
                  }
                }}
                render={({ field, fieldState }) => (
                  <div className="space-y-1">
                    <ProductGalleryUploader
                      defaultImages={Array.isArray(field.value) ? (field.value as string[]) : []}
                      primaryImage={primaryImage}
                      editable={true}
                      maxImages={10}
                      maxSize={2}
                      onUpload={(urls) => {
                        setValue("images", urls, { shouldValidate: true });
                      }}
                      onDelete={(url) => {
                        const current = Array.isArray(field.value) ? (field.value as string[]) : [];
                        const next = current.filter((u) => u !== url);
                        setValue("images", next, { shouldValidate: true });
                      }}
                      onReorder={(urls) => {
                        setValue("images", urls, { shouldValidate: true });
                        if (urls.length > 0) {
                          setPrimaryImage(urls[0]);
                        }
                      }}
                      onPrimaryChange={(url) => {
                        setPrimaryImage(url);
                        const current = Array.isArray(field.value) ? (field.value as string[]) : [];
                        const next = [url, ...current.filter((u) => u !== url)].filter(Boolean);
                        setValue("images", next, { shouldValidate: true });
                      }}
                    />
                    {fieldState.error && (
                      <p className="text-xs font-semibold text-rose-500 mt-1">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loader}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loader}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-2"
          >
            {loader ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {isEdit ? "Saving Product..." : "Adding Product..."}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Product"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
