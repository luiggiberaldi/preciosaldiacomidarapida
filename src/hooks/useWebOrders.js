import { useState, useEffect } from "react";
import { WEB_ORDER_STATUS } from "../utils/constants";
import { useNotifications } from "./useNotifications";
import { useSounds } from "./useSounds";
import { showToast } from "../components/Toast";
import { webSupabase, getTenantId } from "../utils/supabase";

// Keep track of already notified orders to prevent duplicate alerts
// Self-cleaning: clear every 2 hours to prevent memory leak on long shifts
const notifiedOrders = new Set();
setInterval(() => notifiedOrders.clear(), 2 * 60 * 60 * 1000);

export const useWebOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notifyNewWebOrder } = useNotifications();
  const { playNewWebOrder } = useSounds();

  const fetchOrders = async () => {
    try {
      // We fetch pending, confirmed, and kitchen orders.
      // Completed and Cancelled are historical.
      const { data, error } = await webSupabase
        .from("web_orders")
        .select("*")
        .eq("tenant_id", getTenantId())
        .in("status", [WEB_ORDER_STATUS.PENDING, WEB_ORDER_STATUS.CONFIRMED, WEB_ORDER_STATUS.PREPARING])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching web orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time changes
    const subscription = webSupabase
      .channel("public:web_orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "web_orders",
          filter: `tenant_id=eq.${getTenantId()}`,
        },
        (payload) => {
          // Play sound and show notifications if it is a NEW order (INSERT)
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new;
            if (newOrder && newOrder.id && !notifiedOrders.has(newOrder.id)) {
              notifiedOrders.add(newOrder.id);
              playNewWebOrder();
              showToast(`¡Nuevo pedido de ${newOrder.customer_name}!`, "success", 5000);
              notifyNewWebOrder(newOrder.customer_name, newOrder.total_usd);
            }
          }

          // Refresh the whole list to keep it simple and avoid stale state bugs
          // (as mentioned in the knowledge base)
          fetchOrders();
        },
      )
      .subscribe();

    return () => {
      webSupabase.removeChannel(subscription);
    };
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await webSupabase
        .from("web_orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
      // The realtime subscription will trigger a refresh
    } catch (error) {
      console.error("Error updating order:", error);
      throw error;
    }
  };

  return {
    orders,
    loading,
    updateOrderStatus,
    refresh: fetchOrders,
  };
};
