import { useState, useEffect } from "react";
import { webSupabase, getTenantId } from "../utils/supabase";

// Sound effect for new orders
const playOrderSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // High pitch notification
    oscillator.frequency.exponentialRampToValueAtTime(
      1200,
      audioCtx.currentTime + 0.1,
    );

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioCtx.currentTime + 0.3,
    );

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.log("Audio not supported or blocked");
  }
};

export const useWebOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      // We fetch pending, confirmed, and kitchen orders.
      // Completed and Cancelled are historical.
      const { data, error } = await webSupabase
        .from("web_orders")
        .select("*")
        .eq("tenant_id", getTenantId())
        .in("status", ["pending", "confirmed", "kitchen"])
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
          // Play sound if it is a NEW order (INSERT)
          if (payload.eventType === "INSERT") {
            playOrderSound();
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
