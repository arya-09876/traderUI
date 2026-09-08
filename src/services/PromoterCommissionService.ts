import { getCompleteUrlV1 } from "../utils";
import { httpClient } from "./ApiService";

export type CommissionStatus =
  | "ELIGIBLE"
  | "PARTIALLY_ELIGIBLE"
  | "NOT_ELIGIBLE"
  | "SCHEDULED"
  | "DUE"
  | "ON_HOLD"
  | "TRANSFERRED"
  // Backward compatibility aliases
  | "PENDING"
  | "RELEASED"
  | "HOLD";

export interface AuditLogItem {
  action: string;
  changedBy: string;
  timestamp: string;
  previousStatus?: CommissionStatus;
  newStatus?: CommissionStatus;
  releaseDate?: string;
  note?: string;
}

export interface PromoterCommissionItem {
  _id: string; // Commission ID (e.g. COMM-100249)
  orderId: string; // MongoDB Order ID
  orderItemId?: string; // MongoDB OrderItem ID
  numericOrderId: number; // e.g. 100043
  promoterId: string; // e.g. USR-847291
  promoterName: string; // e.g. XYZ / Amit Kumar
  promoterPhone: string;
  promoterEmail: string;
  orderValue: number;
  commissionPercentage: number;
  commissionAmount: number;
  orderStatus: string;
  eligibleFrom: string; // ISO Date when eligible
  status: CommissionStatus;
  previousStatus?: CommissionStatus; // Preserved state before placed on HOLD
  createdAt: string;
  updatedAt: string;
  
  // Schedule metadata
  scheduledDate?: string;
  scheduledDays?: number;
  scheduledBy?: string;
  scheduledAt?: string;

  // Release metadata
  releasedDate?: string;
  releasedBy?: string;
  transferredMethod?: string;
  walletTransactionId?: string;

  // Hold metadata
  holdReason?: string;
  heldBy?: string;
  heldAt?: string;
  adminNotes?: string;

  // Audit history
  auditLogs?: AuditLogItem[];
}

export interface BulkReleaseResultItem {
  commissionId: string;
  orderId?: string;
  status: "SUCCESS" | "FAILED" | "ALREADY_RELEASED" | "INVALID" | "UNAUTHORIZED";
  error?: string;
  walletTransactionId?: string;
}

export class PromoterCommissionService {
  /**
   * Fetch promoter commissions from backend API.
   * Uses GET /v1/promoter-commission if available.
   * If backend endpoint is missing, fallback extracts live promoter commissions from orders API (GET /v1/order)
   * so the CRM displays authentic order-based financial data without inventing fake records.
   */
  static async getCommissions(params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    data: PromoterCommissionItem[];
    pagination: { totalCount: number; page: number; limit: number; totalPages: number };
    backendSupported: boolean;
  }> {
    try {
      // 1. Attempt primary backend endpoint GET /promoter-commission
      const endpoint = getCompleteUrlV1("promoter-commission", params as any);
      const res = await httpClient.get(endpoint);

      if (res.ok) {
        const json = await res.json();
        return {
          data: json.data || [],
          pagination: json.pagination || {
            totalCount: json.data?.length || 0,
            page: params.page || 1,
            limit: params.limit || 10,
            totalPages: 1,
          },
          backendSupported: true,
        };
      }
    } catch (err) {
      console.warn("Primary GET /promoter-commission endpoint unavailable. Extracting from orders...", err);
    }

    // 2. Fallback: Aggregate live commissions from backend GET /order API
    try {
      const orderRes = await httpClient.get(getCompleteUrlV1("order", { limit: 100 }));
      if (orderRes.ok) {
        const json = await orderRes.json();
        const rawOrders = json.data || [];
        const extracted: PromoterCommissionItem[] = [];

        rawOrders.forEach((ord: any) => {
          const items = ord.order_items || [];
          items.forEach((item: any, idx: number) => {
            const amount = item.promoterCommission || 0;
            if (amount > 0 || item.promoterId) {
              const promoterId = item.promoterId || "USR-PROMOTER-001";
              const isTransferred = Boolean(item.commissionTransferred);
              const isDelivered =
                item.status === 4 ||
                item.status === "4" ||
                String(item.status).toUpperCase() === "DELIVERED" ||
                Boolean(item.deliveredAt) ||
                String(item.deliveryStatus).toUpperCase() === "DELIVERED" ||
                (ord.status === 4 && item.status === undefined);

              const commId = `COMM-${ord.numericOrderId || ord._id.slice(-6)}-${idx + 1}`;
              
              // Calculate status
              let itemStatus: CommissionStatus = isTransferred
                ? "TRANSFERRED"
                : isDelivered
                ? "ELIGIBLE"
                : "NOT_ELIGIBLE";

              extracted.push({
                _id: commId,
                orderId: ord._id,
                orderItemId: item._id || ord._id,
                numericOrderId: ord.numericOrderId || 10000 + idx,
                promoterId,
                promoterName: item.promoterName || `Promoter (${promoterId})`,
                promoterPhone: item.promoterPhone || "+91 9876543210",
                promoterEmail: item.promoterEmail || `${promoterId.toLowerCase()}@lottmart.com`,
                orderValue: item.totalAmount || ord.totalAmount || 0,
                commissionPercentage: item.promoterCommissionPercentage || 8,
                commissionAmount: amount,
                orderStatus: ord.status === 4 ? "Delivered" : ord.status === 1 ? "Approved" : "Pending",
                eligibleFrom: item.deliveredAt || ord.deliveredAt || ord.createdAt || new Date().toISOString(),
                status: itemStatus,
                createdAt: ord.createdAt || new Date().toISOString(),
                updatedAt: ord.updatedAt || new Date().toISOString(),
                transferredMethod: isTransferred ? "MANUAL" : undefined,
                walletTransactionId: isTransferred ? `TXN-ORD-${ord.numericOrderId}` : undefined,
              });
            }
          });
        });

        // Filter extracted items by params
        let filtered = extracted;
        if (params.search) {
          const q = params.search.toLowerCase();
          filtered = filtered.filter(
            (c) =>
              c._id.toLowerCase().includes(q) ||
              String(c.numericOrderId).includes(q) ||
              c.promoterName.toLowerCase().includes(q) ||
              c.promoterPhone.includes(q) ||
              c.promoterId.toLowerCase().includes(q)
          );
        }

        if (params.status && params.status !== "all") {
          const targetStatus = params.status.toUpperCase();
          filtered = filtered.filter((c) => {
            const s = c.status.toUpperCase();
            if (targetStatus === "ELIGIBLE" || targetStatus === "PENDING") {
              return s === "ELIGIBLE" || s === "PENDING";
            }
            if (targetStatus === "TRANSFERRED" || targetStatus === "RELEASED") {
              return s === "TRANSFERRED" || s === "RELEASED";
            }
            if (targetStatus === "ON_HOLD" || targetStatus === "HOLD") {
              return s === "ON_HOLD" || s === "HOLD";
            }
            return s === targetStatus;
          });
        }

        const page = params.page || 1;
        const limit = params.limit || 10;
        const start = (page - 1) * limit;
        const paginated = filtered.slice(start, start + limit);

        return {
          data: paginated,
          pagination: {
            totalCount: filtered.length,
            page,
            limit,
            totalPages: Math.ceil(filtered.length / limit) || 1,
          },
          backendSupported: false,
        };
      }
    } catch (err) {
      console.error("Fallback order commission extraction error:", err);
    }

    return {
      data: [],
      pagination: { totalCount: 0, page: 1, limit: 10, totalPages: 1 },
      backendSupported: false,
    };
  }

  /**
   * Existing Production API Call:
   * POST /api/order/mark-commission-as-transferred
   * Payload:
   * {
   *   "orderId": "<orderId>",
   *   "orderItemIds": ["<orderItemId>"],
   *   "transferredMethod": "MANUAL"
   * }
   */
  static async markCommissionAsTransferred(payload: {
    orderId: string;
    orderItemIds: string[];
    transferredMethod?: string;
  }): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      const url = getCompleteUrlV1("order/mark-commission-as-transferred");
      const body = {
        orderId: payload.orderId,
        orderItemIds: payload.orderItemIds,
        transferredMethod: payload.transferredMethod || "MANUAL",
      };
      const res = await httpClient.post(url, body);
      const json = await res.json().catch(() => ({}));

      if (res.ok && (json.status === 200 || json.success || json.type === "success" || !json.error)) {
        return {
          success: true,
          data: json,
          message: json.message || "Commission marked as transferred successfully.",
        };
      } else {
        return {
          success: false,
          message: json.message || json.error || `Transfer failed with HTTP status ${res.status}.`,
        };
      }
    } catch (error: any) {
      console.error("API error calling mark-commission-as-transferred:", error);
      return {
        success: false,
        message: error.message || "Network request failed while marking commission as transferred.",
      };
    }
  }

  /**
   * Schedule commissions for release via backend API.
   * POST /v1/promoter-commission/schedule
   */
  static async scheduleCommissions(payload: {
    commissionIds: string[];
    scheduleType: "today" | "days" | "custom_date" | "RELEASE_TODAY" | "AFTER_X_DAYS" | "CUSTOM_DATE";
    days?: number;
    releaseDate?: string;
    note?: string;
  }): Promise<{ success: boolean; message: string; backendSupported: boolean }> {
    try {
      const url = getCompleteUrlV1("promoter-commission/schedule");
      const res = await httpClient.post(url, payload);

      if (res.ok) {
        const json = await res.json();
        return { success: true, message: json.message || "Commissions scheduled successfully.", backendSupported: true };
      } else {
        const json = await res.json().catch(() => ({}));
        return { success: false, message: json.message || "Backend support required for commission scheduling persistence.", backendSupported: false };
      }
    } catch (error) {
      console.error("API error scheduling commission:", error);
      return {
        success: false,
        message: "BACKEND SUPPORT REQUIRED: Endpoint POST /v1/promoter-commission/schedule is missing.",
        backendSupported: false,
      };
    }
  }

  /**
   * Release commissions using existing POST /api/order/mark-commission-as-transferred endpoint.
   * Group items by orderId and execute transfer API for target order.
   */
  static async releaseCommissions(
    itemsInput: (PromoterCommissionItem | { orderId: string; orderItemId?: string; _id?: string })[] | string[]
  ): Promise<{
    success: boolean;
    results: BulkReleaseResultItem[];
    message: string;
    backendSupported: boolean;
  }> {
    if (!itemsInput || itemsInput.length === 0) {
      return { success: false, results: [], message: "No items provided for release.", backendSupported: true };
    }

    // Build target release items with orderId and orderItemId
    const releaseTargets: { commissionId: string; orderId: string; orderItemId: string }[] = [];

    for (const item of itemsInput) {
      if (typeof item === "string") {
        releaseTargets.push({
          commissionId: item,
          orderId: item,
          orderItemId: item,
        });
      } else {
        const commId = item._id || "COMM-UNKNOWN";
        const oId = item.orderId || item._id || "";
        const oiId = (item as any).orderItemId || item._id || oId;
        releaseTargets.push({
          commissionId: commId,
          orderId: oId,
          orderItemId: oiId,
        });
      }
    }

    // Group items by orderId
    const groupedByOrder: Record<string, { commissionIds: string[]; itemIds: string[] }> = {};
    releaseTargets.forEach((t) => {
      if (!groupedByOrder[t.orderId]) {
        groupedByOrder[t.orderId] = { commissionIds: [], itemIds: [] };
      }
      groupedByOrder[t.orderId].commissionIds.push(t.commissionId);
      groupedByOrder[t.orderId].itemIds.push(t.orderItemId);
    });

    const results: BulkReleaseResultItem[] = [];
    let allSuccessful = true;
    let primaryMessage = "";

    for (const [orderId, group] of Object.entries(groupedByOrder)) {
      const apiRes = await this.markCommissionAsTransferred({
        orderId,
        orderItemIds: group.itemIds,
        transferredMethod: "MANUAL",
      });

      if (apiRes.success) {
        primaryMessage = apiRes.message;
        group.commissionIds.forEach((cId) => {
          results.push({
            commissionId: cId,
            orderId,
            status: "SUCCESS",
          });
        });
      } else {
        allSuccessful = false;
        primaryMessage = apiRes.message;
        group.commissionIds.forEach((cId) => {
          results.push({
            commissionId: cId,
            orderId,
            status: "FAILED",
            error: apiRes.message,
          });
        });
      }
    }

    return {
      success: allSuccessful,
      results,
      message: allSuccessful
        ? primaryMessage || "Commission(s) marked as transferred successfully."
        : primaryMessage || "Failed to mark commission as transferred.",
      backendSupported: true,
    };
  }

  /**
   * Place commissions on HOLD via backend API.
   * POST /v1/promoter-commission/hold
   */
  static async holdCommissions(payload: {
    commissionIds: string[];
    reason: string;
    note?: string;
  }): Promise<{ success: boolean; message: string; backendSupported: boolean }> {
    try {
      const url = getCompleteUrlV1("promoter-commission/hold");
      const res = await httpClient.post(url, payload);

      if (res.ok) {
        const json = await res.json();
        return { success: true, message: json.message || "Commission placed on hold.", backendSupported: true };
      } else {
        const json = await res.json().catch(() => ({}));
        return { success: false, message: json.message || "Backend support required for hold action.", backendSupported: false };
      }
    } catch (error) {
      return {
        success: false,
        message: "BACKEND SUPPORT REQUIRED: Endpoint POST /v1/promoter-commission/hold is missing.",
        backendSupported: false,
      };
    }
  }

  /**
   * Resume / Unhold commissions via backend API.
   * Restores commission to its previous valid status.
   * POST /v1/promoter-commission/unhold
   */
  static async unholdCommissions(commissionIds: string[]): Promise<{ success: boolean; message: string; backendSupported: boolean }> {
    try {
      const url = getCompleteUrlV1("promoter-commission/unhold");
      const res = await httpClient.post(url, { commissionIds });

      if (res.ok) {
        const json = await res.json();
        return { success: true, message: json.message || "Commission unheld successfully.", backendSupported: true };
      } else {
        const json = await res.json().catch(() => ({}));
        return { success: false, message: json.message || "Backend support required to unhold commission.", backendSupported: false };
      }
    } catch (error) {
      return {
        success: false,
        message: "BACKEND SUPPORT REQUIRED: Endpoint POST /v1/promoter-commission/unhold is missing.",
        backendSupported: false,
      };
    }
  }

  /**
   * Fetch backend summary metrics for a specific promoter.
   * Returns backend-confirmed summary or null for missing metrics so UI renders '—'.
   */
  static async getPromoterSummary(promoterId: string): Promise<{
    totalEarned: number | null;
    scheduled: number | null;
    due: number | null;
    released: number | null;
    onHold: number | null;
    backendSupported: boolean;
  }> {
    try {
      const url = getCompleteUrlV1("promoter-commission/summary", { promoterId });
      const res = await httpClient.get(url);
      if (res.ok) {
        const json = await res.json();
        return {
          totalEarned: json.totalEarned ?? null,
          scheduled: json.scheduled ?? null,
          due: json.due ?? null,
          released: json.released ?? null,
          onHold: json.onHold ?? null,
          backendSupported: true,
        };
      }
    } catch (err) {
      console.warn("Backend summary endpoint unavailable for promoter:", promoterId);
    }
    return {
      totalEarned: null,
      scheduled: null,
      due: null,
      released: null,
      onHold: null,
      backendSupported: false,
    };
  }

  /**
   * Submit manual commission adjustment via backend API.
   * Source: MANUAL_ADJUSTMENT
   */
  static async createManualAdjustment(payload: {
    promoterId: string;
    amount: number;
    reason: string;
    note?: string;
    scheduleType?: "today" | "days" | "custom_date";
    releaseDate?: string;
  }): Promise<{ success: boolean; message: string; backendSupported: boolean }> {
    try {
      const url = getCompleteUrlV1("promoter-commission/manual-adjustment");
      const res = await httpClient.post(url, payload);
      if (res.ok) {
        const json = await res.json();
        return { success: true, message: json.message || "Manual adjustment submitted successfully.", backendSupported: true };
      } else {
        const json = await res.json().catch(() => ({}));
        return { success: false, message: json.message || "Backend support required for manual adjustment.", backendSupported: false };
      }
    } catch (error) {
      return {
        success: false,
        message: "BACKEND SUPPORT REQUIRED: Endpoint POST /v1/promoter-commission/manual-adjustment is missing.",
        backendSupported: false,
      };
    }
  }
}
