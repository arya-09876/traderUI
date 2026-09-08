import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCompleteUrlV1 } from "../utils";
import { httpClient } from "../services/ApiService";
import { Order } from "../types";
import BackButton from "../components/BackButton";
import { FaInfoCircle } from "react-icons/fa";

// Modular Order Components
import { OrderHeader } from "../components/order/OrderHeader";
import { OrderControlCenter } from "../components/order/OrderControlCenter";
import { OrderLifecycleTimeline } from "../components/order/OrderLifecycleTimeline";
import { OrderItemsDetails } from "../components/order/OrderItemsDetails";
import { FinancialSummaryCard } from "../components/order/FinancialSummaryCard";
import { TokenSecurityCard } from "../components/order/TokenSecurityCard";
import { CommissionEarningsCard } from "../components/order/CommissionEarningsCard";
import { BuyerProfileCard } from "../components/order/BuyerProfileCard";
import { SellerProfileCard } from "../components/order/SellerProfileCard";
import { FulfillmentDeliveryCard } from "../components/order/FulfillmentDeliveryCard";
import { AddressDetailsCard } from "../components/order/AddressDetailsCard";
import { CompactFutureCards } from "../components/order/CompactFutureCards";
import { ActivityAuditLog } from "../components/order/ActivityAuditLog";
import { AdditionalTechnicalDetails } from "../components/order/AdditionalTechnicalDetails";
import { ProductSalesSummaryCard } from "../components/order/ProductSalesSummaryCard";

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const res = await httpClient.get(getCompleteUrlV1(`order/${id}`));
      if (res.ok) {
        const json = await res.json();
        console.log("ORDER_API_RESPONSE:", json);
        const orderData = Array.isArray(json.data)
          ? json.data[0]
          : json.data || (json._id ? json : null);
        if (orderData) {
          setOrder(orderData);
        }
      }
    } catch (err) {
      console.error("Error loading order details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  // Update order status API handler
  const handleUpdateStatus = async (statusId: number) => {
    if (!order) return;
    try {
      setIsUpdating(true);
      const payload = {
        id: order._id,
        status: statusId,
        reason: "Fulfillment updated from CRM Admin Order Control Center",
      };

      // Try PUT /order
      let res = await httpClient.put(getCompleteUrlV1("order"), payload);
      if (!res.ok) {
        // Fallback: try PUT /order/:id
        res = await httpClient.put(getCompleteUrlV1(`order/${order._id}`), {
          status: statusId,
          reason: "Fulfillment updated from CRM Admin Order Control Center",
        });
      }

      if (res.ok) {
        fetchOrder();
      } else {
        alert("Failed to update status. Server returned an error.");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update status.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-slate-200 rounded-2xl" />
            <div className="h-64 bg-slate-200 rounded-2xl" />
          </div>
          <div className="h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm space-y-4 max-w-md mx-auto mt-10">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <FaInfoCircle size={20} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Order Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested order ID could not be located in CRM database.
        </p>
        <BackButton fallback="/orders" label="Order List" variant="button" className="mt-4" />
      </div>
    );
  }

  const extractStringId = (idVal: any): string | null => {
    if (!idVal) return null;
    if (typeof idVal === "string") return idVal;
    if (typeof idVal === "object") {
      if (idVal._id && typeof idVal._id === "string") return idVal._id;
      if (idVal.id && typeof idVal.id === "string") return idVal.id;
    }
    return String(idVal);
  };

  // Extract unique string productIds from order items
  const productIds = Array.from(
    new Set(
      (order.order_items || [])
        .map((item) =>
          extractStringId(item.productId) ||
          extractStringId((item as any).lot?.productId) ||
          extractStringId((order as any).productId)
        )
        .filter((idVal): idVal is string => Boolean(idVal) && typeof idVal === "string")
    )
  );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. ORDER HEADER */}
      <OrderHeader
        order={order}
        isUpdating={isUpdating}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Main Order Operations & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product & Lot Details */}
          <OrderItemsDetails items={order.order_items || []} />

          {/* Order Financial Summary & Tokens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FinancialSummaryCard order={order} />
            <CommissionEarningsCard
              items={order.order_items || []}
              orderId={order._id}
              orderStatus={order.status}
              orderDeliveredAt={order.deliveredAt}
              onRefresh={fetchOrder}
            />
          </div>

          {/* Product Level Order & Sales Summary Analytics */}
          {productIds.map((prodId, pIdx) => {
            const matchingItem = (order.order_items || []).find(
              (i) => extractStringId(i.productId) === prodId
            );
            return (
              <ProductSalesSummaryCard
                key={String(prodId) || String(pIdx)}
                productId={String(prodId)}
                productName={matchingItem?.brand || matchingItem?.description}
              />
            );
          })}

          {/* Token Security */}
          <TokenSecurityCard items={order.order_items || []} />

          {/* Profiles: Buyer & Seller */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BuyerProfileCard userId={order.userId} address={order.address} />
            <SellerProfileCard
              sellerId={order.sellerId}
              gstNumber={order.gstNumber}
              items={order.order_items || []}
            />
          </div>

          {/* Fulfillment & Delivery */}
          <FulfillmentDeliveryCard order={order} />

          {/* Addresses: Shipping & Pickup */}
          <AddressDetailsCard buyerAddress={order.address} items={order.order_items || []} />

          {/* Order Lifecycle Timeline */}
          <OrderLifecycleTimeline history={order.statusChangeLogs || []} />

          {/* Future-Ready Compact Cards (Attribution, Wallet, Cancellation, Dispute) */}
          <CompactFutureCards items={order.order_items || []} />

          {/* Activity Audit Log */}
          <ActivityAuditLog order={order} />

          {/* Additional Technical Details */}
          <AdditionalTechnicalDetails order={order} />
        </div>

        {/* RIGHT COLUMN: Sticky Order Operations Control Center */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 space-y-6">
          <OrderControlCenter
            order={order}
            isUpdating={isUpdating}
            onUpdateStatus={handleUpdateStatus}
          />
        </div>
      </div>
    </div>
  );
};
