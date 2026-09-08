import {
  Control,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";

interface Size {
  size: string;
  mrp: string;
}

interface Category {
  name: string;
  images: File[] | null;
  slug: string;
  gender: string;
  sizeMrp: Size[];
}

interface IMasterProduct {
  name: string;
  brand: string;
  categoryId: string;
  productCategoryId?: string;
  subCategoryId?: string;
  skuCode: string;
  subCategory?: string;
  productSubCategory?: string;
  mrp: string;
  size: string;
  unit?: string;
  images: File[] | string | string[] | null;
  description: string;
}

interface CategoryFieldArrayProps {
  control: Control<IMasterProduct>;
  register: UseFormRegister<IMasterProduct>;
  setValue: UseFormSetValue<IMasterProduct>;
  getValues: UseFormGetValues<IMasterProduct>;
}

export interface ICategoryServer {
  _id: string;
  name: string;
  media: string[];
  brand: string;
  skuCode: string;
  active: boolean;
  size: string;
  unit?: string;
  categoryName: string;
  categoryId: string;
  categoryDetails: { [key: string]: any };
}

interface IMasterProductServer {
  name: string;
  brand: string;
  categoryId: string;
  varients: ICategoryServer[];
}

export interface ICategoryListServer {
  _id: string;
  name: string;
  media: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
export interface IBannerList {
  _id: string;
  contentType: string;
  media: string;
  contentId: string;
}
interface ILotProduct {
  _id: string;
  name: string;
  media: string[];
  lot: Lot[];
  status: Status;
  tags: string[];
  isFeatured: boolean;
  minPrice: number;
  maxPrice: number;
  masterId: string;
  masterDetails: IMasterProduct;
  categoryId: string;
  createdAt_EP: number;
  updatedAt_EP: number;
  expiry: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  __v: number;
}

interface Lot {
  quantity: number;
  price: number;
  originalPrice: number;
  _id: string;
}

// interface Pagination {
//   totalCount: number;
//   page: number;
//   limit: number;
//   totalPages: number;
// }

export type {
  Size,
  Category,
  IMasterProduct,
  CategoryFieldArrayProps,
  IMasterProductServer,
  ILotProduct,
};

export enum Status {
  Pending = "pending",
  Active = "active",
  Inactive = "inactive",
}

export enum RequestStatus {
  Pending = "pending",
  Accept = "accept",
  Reject = "reject",
}

export enum AdminRequestsType {
  sellerOnboarding = "seller_onboarding",
  productApproval = "product_approval",
}

export interface IUser {
  _id?: string;
  role: string[];
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  affiliateId?: string;
  createdAt: string;
  status: string;
  seller?: {
    businessName: string;
    address?: string;
    aadhaarNumber?: string;
    gstNumber?: string;
    pan?: string;
    panNumber?: string;
    typeOfBusiness?: string | string[];
    industry?: string;
    businessType?: string;
    businessCategory?: string;
    verificationStatus?: string;
  };
  gender?: string;
  dob?: string;
  altPhone?: string;
  state?: string;
  city?: string;
  district?: string;
  pincode?: string;
  wallet?: {
    balance: number;
    locked: number;
    earnings: number;
    withdrawals: number;
    pendingWithdrawals: number;
  };
  orders?: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    returns: number;
    totalPurchase: number;
    ltv: number;
  };
  promoterInfo?: {
    referralCount: number;
    commissionEarned: number;
    campaignsJoined: number;
    performance: string;
  };
  kycStatus?: "verified" | "unverified" | "pending";
  lastLogin?: string;
  notes?: { id: string; text: string; createdAt: string; createdBy: string }[];
  auditLogs?: { action: string; changedBy: string; oldValue: string; newValue: string; timestamp: string; ip: string }[];
}

export interface LotInfo {
  _id?: string;
  quantity?: number;
  price?: number;
  originalPrice?: number;
  discount?: number;
}

export interface PickupAddress {
  name?: string;
  phone?: string;
  alternatePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

export interface AwbLog {
  previousAwb?: string;
  newAwb?: string;
  updatedAt?: string;
  updatedBy?: string;
  [key: string]: any;
}

export interface CommissionTransferLog {
  transferredAt?: string;
  transferredBy?: string;
  transferMethod?: string;
  amount?: number;
  [key: string]: any;
}

export interface OrderItem {
  _id: string;
  userId?: string;
  orderId?: string;
  productId?: string;
  lotId?: string;
  quantity: number;
  totalAmount: number;
  totalMrpWithQuantity?: number;
  totalDiscountWithQuantity?: number;
  totalDiscountPercentage?: number;
  description?: string;
  media?: string[];
  lot?: LotInfo;
  tags?: string[];
  mrp?: number;
  sellerId?: string | any;
  pickupId?: string;
  pickupAddress?: PickupAddress;
  connectorId?: string;
  connectorCommission?: number;
  connectorCommissionPercentage?: number;
  promoterId?: string;
  promoterCommission?: number;
  promoterCommissionPercentage?: number;
  promotionFeePercentage?: number;
  promotionFeeAmount?: number;
  masterId?: string;
  brand?: string;
  categoryId?: string;
  status?: number | string;
  awbNumber?: string | null;
  awbNumberUpdatedAt?: string | null;
  expectedDeliveryDate?: string | null;
  deliveredAt?: string | null;
  rtoAt?: string | null;
  commissionTransferred?: boolean;
  commissionTransferredLogs?: CommissionTransferLog[];
  buyerTokenAmount?: number;
  buyerTokenDebited?: boolean;
  buyerTokenRefunded?: boolean;
  buyerTokenSource?: string;
  buyerTokenDebitedAt?: string | null;
  buyerTokenRefundedAt?: string | null;
  sellerTokenAmount?: number;
  sellerTokenDebited?: boolean;
  sellerTokenRefunded?: boolean;
  sellerTokenSource?: string;
  sellerTokenDebitedAt?: string | null;
  sellerTokenRefundedAt?: string | null;
  statusChangeLogs?: OrderStatusHistory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  name?: string;
  phone?: string;
  alternatePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface Order {
  _id: string;
  numericOrderId: number;
  userId?: string | any;
  sellerId?: string | any;
  gstNumber?: string;
  addressId?: string;
  createdAt: string;
  updatedAt?: string;
  createdAt_EP?: number;
  updatedAt_EP?: number;
  totalAmount: number;
  totalMrpWithQuantity: number;
  totalDiscountPercentage: number;
  totalDiscountWithQuantity?: number;
  paymentMethod: number;
  status: number;
  awbNumber?: string | null;
  awbNumberUpdatedAt?: string | null;
  expectedDeliveryDate?: string | null;
  deliveredAt?: string | null;
  rtoAt?: string | null;
  awbNumberUpdatedLogs?: AwbLog[];
  shippingDetails?: any;
  order_items: OrderItem[];
  address?: Address;
  statusChangeLogs: OrderStatusHistory[];
}

export interface OrderStatusHistory {
  changedBy?: string;
  oldStatus?: number | string;
  newStatus: number;
  reason?: string;
  timestamp?: string;
  message?: string;
}

export interface Pagination {
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductType {
  _id: string;
  totalSale: number;
  volume: number;
  productName: string;
  masterId: string;
}

export type TopAffiliateType = {
  _id: string;
  totalSale: number;
  fName: string;
  lName: string;
  businessName: string;
  affiliateId: string;
  volume: number;
};

export interface IBannerMetadata {
  title: string;
  position: string;
  platform: string;
  status: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt: string;
  views: number;
  clicks: number;
  ctr: string | number;
  priority?: string;
  description?: string;
}

export interface IBannerItem {
  _id: string;
  media: string;
  contentType: string;
  contentId: string;
  contentName: string;
  metadata: IBannerMetadata;
}

export interface WalletRedeemMetadata {
  amount?: number;
  manualTranferSource?: string;
  remarks?: string;
  source?: string;
  utrNumber?: string;
  screenshotUrl?: string;
  paymentMode?: string;
  adminNote?: string;
  approvedBy?: string;
  approvedAt?: string;
  walletTransactionId?: string;
  [key: string]: any;
}

export interface WalletPayoutDetails {
  upi?: {
    upiId?: string;
  };
  bankAccount?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifsc?: string;
  };
}

export interface WalletRedeemRequester {
  _id: string;
  email?: string;
  role?: string[];
  status?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  seller?: any;
  promotorCommission?: number;
  connectorCommission?: number;
  addresses?: any[];
  gstNumber?: string;
  payoutDetails?: WalletPayoutDetails;
  profileImg?: string;
  createdAt?: string;
  updatedAt?: string;
  createdAt_EP?: number;
  updatedAt_EP?: number;
}

export interface WalletRedeemRequest {
  _id: string;
  requesterId: string;
  type: string;
  isRequestToAdmin?: boolean;
  metadata?: WalletRedeemMetadata;
  status: "pending" | "accept" | "reject" | string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
  createdAt_EP?: number;
  updatedAt_EP?: number;
  requester?: WalletRedeemRequester;
}

export interface WalletRedeemPagination {
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WalletHistoryMetadata {
  amount?: number;
  manualTranferSource?: string;
  remarks?: string;
  source?: string;
  utrNumber?: string;
  paymentMode?: string;
  screenshotUrl?: string;
  adminNote?: string;
  requestId?: string;
  requestType?: string;
  approvedBy?: string;
  manualPayout?: boolean;
  payoutSkipped?: boolean;
  payoutSkippedReason?: string;
  orderId?: string;
  numericOrderId?: number;
  orderItemIds?: string[];
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentStatus?: string;
  [key: string]: any;
}

export interface WalletHistoryItem {
  _id: string;
  walletId?: string;
  userId?: string;
  direction: "credit" | "debit" | string;
  type: "add_money" | "seller_token_debit" | "redeem" | string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  currency?: string;
  status: "success" | string;
  source?: string;
  referenceType?: string;
  referenceId?: string;
  idempotencyKey?: string;
  initiatedBy?: string;
  remarks?: string;
  metadata?: WalletHistoryMetadata;
  createdAt_EP?: number;
  updatedAt_EP?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletHistoryPagination {
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WalletHistoryResponse {
  type: string;
  message: string;
  data: WalletHistoryItem[];
  pagination?: WalletHistoryPagination;
}

export interface IndustryType {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  status: "active" | "inactive";
  createdAt_EP?: number;
  updatedAt_EP?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IndustryTypePagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IndustryTypeResponse {
  type: string;
  message: string;
  data: IndustryType[];
  pagination: IndustryTypePagination;
}




