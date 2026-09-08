import { getCompleteUrlV1 } from "../utils";
import { httpClient } from "./ApiService";
import { Pagination } from "../types";
import moment from "moment";

export interface DealOrderItem {
  _id: string;
  orderId?: string;
  numericOrderId?: number;
  userId?: string;
  promoterId?: string | null;
  connectorId?: string | null;
  sellerId?: string;
  productId?: string;
  productName?: string;
  brand?: string;
  description?: string;
  media?: string[];
  lotId?: string;
  lot?: {
    quantity?: number;
    price?: number;
    originalPrice?: number;
    discount?: number;
    _id?: string;
  };
  quantity: number;
  totalAmount: number;
  mrp?: number;
  totalMrpWithQuantity?: number;
  totalDiscountAmount?: number;
  totalDiscountPercentage?: number;
  userRole?: string;
  promoterCommission?: number;
  promoterCommissionPercentage?: number;
  connectorCommission?: number;
  connectorCommissionPercentage?: number;
  promotionFeeAmount?: number;
  promotionFeePercentage?: number;
  commissionTransferred?: boolean;
  status?: number | string;
  deliveredAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface CommissionSummary {
  totalPromoterCommission?: number;
  totalConnectorCommission?: number;
  totalCommission?: number;
  totalTradeValue?: number;
  totalDeals?: number;
  total?: number;
  [key: string]: any;
}

export interface DealsOrdersFilters {
  userId?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  commissionTransferred?: boolean;
  isPromotorOrConnector?: "promoter" | "connector" | "all" | string;
  status?: number | string;
}

export interface DealsOrdersResponse {
  success: boolean;
  data: DealOrderItem[];
  pagination: Pagination;
  commissionSummary?: CommissionSummary;
  message?: string;
  backendSupported: boolean;
  apiGapNotice?: string;
}

export class DealOrdersService {
  /**
   * Fetch Deals Orders using Admin Authorization session token.
   * Target endpoint: GET /api/order/deals-orders
   */
  static async getDealsOrders(filters: DealsOrdersFilters = {}): Promise<DealsOrdersResponse> {
    try {
      const queryParams: Record<string, any> = {};

      if (filters.userId) {
        queryParams.userId = filters.userId;
      }

      // Server-side pagination
      if (filters.page !== undefined && filters.page !== null) {
        queryParams.page = filters.page;
      }
      if (filters.limit !== undefined && filters.limit !== null) {
        queryParams.limit = filters.limit;
      }

      // Date Range filters in strict YYYY-MM-DD format (e.g. 2026-01-01)
      if (filters.startDate) {
        queryParams.startDate = filters.startDate.includes("T")
          ? moment(filters.startDate).format("YYYY-MM-DD")
          : filters.startDate;
      }
      if (filters.endDate) {
        queryParams.endDate = filters.endDate.includes("T")
          ? moment(filters.endDate).format("YYYY-MM-DD")
          : filters.endDate;
      }

      // Optional Filters (Only send when explicitly selected)
      if (filters.commissionTransferred !== undefined && filters.commissionTransferred !== null) {
        queryParams.commissionTransferred = filters.commissionTransferred;
      }
      if (filters.isPromotorOrConnector && filters.isPromotorOrConnector !== "all") {
        queryParams.isPromotorOrConnector = filters.isPromotorOrConnector;
      }
      if (filters.status !== undefined && filters.status !== null && filters.status !== "all") {
        queryParams.status = filters.status;
      }

      const endpoint = getCompleteUrlV1("order/deals-orders", queryParams);
      const res = await httpClient.get(endpoint);

      if (res.ok) {
        const json = await res.json();

        // Extract deals items array flexibly across diverse response structures
        const rawItems: DealOrderItem[] =
          json.data?.items ||
          json.data?.orders ||
          json.data?.deals ||
          (Array.isArray(json.data) ? json.data : []) ||
          (Array.isArray(json.items) ? json.items : []) ||
          (Array.isArray(json.orders) ? json.orders : []) ||
          (Array.isArray(json.deals) ? json.deals : []) ||
          (Array.isArray(json) ? json : []);

        const rawPagination = json.pagination || json.data?.pagination;
        const paginationData: Pagination = {
          totalCount: rawPagination?.totalItems ?? rawPagination?.totalCount ?? rawItems.length,
          page: rawPagination?.currentPage ?? rawPagination?.page ?? filters.page ?? 1,
          limit: rawPagination?.itemsPerPage ?? rawPagination?.limit ?? filters.limit ?? 10,
          totalPages: rawPagination?.totalPages ?? (Math.ceil(rawItems.length / (filters.limit || 10)) || 1),
        };

        const summaryData: CommissionSummary | undefined =
          json.commissionSummary || json.data?.commissionSummary;

        return {
          success: true,
          data: rawItems,
          pagination: paginationData,
          commissionSummary: summaryData,
          message: json.message || "Deals orders retrieved successfully.",
          backendSupported: true,
        };
      } else {
        const errJson = await res.json().catch(() => ({}));
        
        return {
          success: false,
          data: [],
          pagination: { totalCount: 0, page: filters.page || 1, limit: filters.limit || 10, totalPages: 1 },
          message: errJson.message || errJson.error || `HTTP ${res.status} error fetching deals orders.`,
          backendSupported: false,
          apiGapNotice:
            res.status === 404 || res.status === 403
              ? `Backend Authorization Notice: GET /api/order/deals-orders returned HTTP ${res.status}.`
              : undefined,
        };
      }
    } catch (error: any) {
      console.error("DealOrdersService getDealsOrders error:", error);

      return {
        success: false,
        data: [],
        pagination: { totalCount: 0, page: filters.page || 1, limit: filters.limit || 10, totalPages: 1 },
        message: error.message || "Network request failed while fetching deals orders.",
        backendSupported: false,
        apiGapNotice: "Network or Server Connectivity Issue: Unable to connect to GET /api/order/deals-orders.",
      };
    }
  }

  /**
   * Fetch Product Level Order & Sales Summary for a specific productId
   * Target endpoint: GET /api/order/product-level-order-sale-summary
   */
  static async getProductLevelOrderSaleSummary(filters: {
    productId: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: any; message?: string }> {
    try {
      if (!filters.productId) {
        return {
          success: false,
          data: null,
          message: "Product ID is required",
        };
      }

      const queryParams: Record<string, any> = {
        productId: filters.productId,
      };

      if (filters.startDate) {
        queryParams.startDate = filters.startDate.includes("T")
          ? moment(filters.startDate).format("YYYY-MM-DD")
          : filters.startDate;
      }
      if (filters.endDate) {
        queryParams.endDate = filters.endDate.includes("T")
          ? moment(filters.endDate).format("YYYY-MM-DD")
          : filters.endDate;
      }

      const endpoint = getCompleteUrlV1("order/product-level-order-sale-summary", queryParams);
      console.log("DealOrdersService getProductLevelOrderSaleSummary calling:", endpoint);
      const res = await httpClient.get(endpoint);

      if (res.ok) {
        const json = await res.json();
        return {
          success: true,
          data: json.data || json,
          message: json.message || "Product sale summary fetched successfully.",
        };
      } else {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          data: null,
          message: errJson.message || errJson.error || `HTTP ${res.status} error fetching product sale summary.`,
        };
      }
    } catch (error: any) {
      console.error("DealOrdersService getProductLevelOrderSaleSummary error:", error);
      return {
        success: false,
        data: null,
        message: error.message || "Network error fetching product sale summary.",
      };
    }
  }
}
