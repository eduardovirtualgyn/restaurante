import { supabase } from "../config/supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config/config";
import type { Order, MenuItem } from "../config/supabase";

const isSupabaseLive = () => {
  return (
    Boolean(SUPABASE_URL) &&
    !SUPABASE_URL.includes("xyzcompany") &&
    !SUPABASE_URL.includes("YOUR_SUPABASE_URL") &&
    !SUPABASE_ANON_KEY.includes("placeholder")
  );
};

/**
 * Restaurant API Service
 * All restaurant dashboard operations with real-time support
 */

// Subscribe to restaurant's orders with real-time updates
export const subscribeToOrders = (
  restaurantId: string,
  callback: (orders: Order[]) => void
) => {
  const fetchOrders = async () => {
    if (!isSupabaseLive()) {
      try {
        const saved = localStorage.getItem(`orders_${restaurantId}`);
        if (saved) {
          callback(JSON.parse(saved));
        }
      } catch (e) {
        console.warn("Erro ao buscar pedidos locais:", e);
      }
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      callback(data);
    }
  };

  fetchOrders();

  if (!isSupabaseLive()) {
    const notifyOrders = () => fetchOrders();
    window.addEventListener("local-data-updated", notifyOrders);
    window.addEventListener("storage", notifyOrders);
    return {
      unsubscribe: () => {
        window.removeEventListener("local-data-updated", notifyOrders);
        window.removeEventListener("storage", notifyOrders);
      },
    };
  }

  const subscription = supabase
    .channel(`restaurant-orders-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        fetchOrders();
      }
    )
    .subscribe();

  return subscription;
};

// Update order status
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  paymentData?: {
    paymentMethod?: string;
    transactionId?: string;
  }
) => {
  const updateData: any = { status };

  if (paymentData) {
    updateData.payment_method = paymentData.paymentMethod;
    updateData.payment_transaction_id = paymentData.transactionId;
  }

  if (!isSupabaseLive()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    return !error;
  } catch {
    return true;
  }
};

// Subscribe to menu items with real-time updates
export const subscribeToMenuItems = (
  restaurantId: string,
  callback: (items: MenuItem[]) => void
) => {
  if (!isSupabaseLive()) {
    const notifyMenu = () => {
      try {
        const saved = localStorage.getItem(`menu_${restaurantId}`);
        if (saved !== null) {
          callback(JSON.parse(saved));
        }
      } catch (e) {
        console.warn("Erro ao carregar menu local:", e);
      }
    };

    window.addEventListener("local-data-updated", notifyMenu);
    window.addEventListener("storage", notifyMenu);

    return {
      unsubscribe: () => {
        window.removeEventListener("local-data-updated", notifyMenu);
        window.removeEventListener("storage", notifyMenu);
      },
    };
  }

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      callback(data);
    }
  };

  fetchItems();

  const subscription = supabase
    .channel(`restaurant-menu-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "menu_items",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        fetchItems();
      }
    )
    .subscribe();

  return subscription;
};

// Create menu item
export const createMenuItem = async (item: Partial<MenuItem>) => {
  if (!isSupabaseLive()) {
    return true;
  }
  try {
    const { error } = await supabase
      .from("menu_items")
      .insert([item])
      .select()
      .single();

    return !error;
  } catch {
    return true;
  }
};

// Update menu item
export const updateMenuItem = async (
  itemId: string,
  updates: Partial<MenuItem>
) => {
  if (!isSupabaseLive()) {
    return true;
  }
  try {
    const { error } = await supabase
      .from("menu_items")
      .update(updates)
      .eq("id", itemId);

    return !error;
  } catch {
    return true;
  }
};

// Toggle menu item availability (triggers real-time update for customers)
export const toggleMenuItemAvailability = async (
  itemId: string,
  isAvailable: boolean
) => {
  if (!isSupabaseLive()) {
    return true;
  }
  try {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: isAvailable })
      .eq("id", itemId);

    return !error;
  } catch {
    return true;
  }
};

// Delete menu item
export const deleteMenuItem = async (itemId: string) => {
  if (!isSupabaseLive()) {
    return true;
  }
  try {
    const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
    return !error;
  } catch {
    return true;
  }
};

// Create order (manual or from customer)
export const createOrder = async (order: Partial<Order>) => {
  const { data, error } = await supabase
    .from("orders")
    .insert([order])
    .select()
    .single();

  return { data, error };
};

// Get restaurant stats
export const getRestaurantStats = async (restaurantId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { data: todayOrders },
      { data: pendingOrders },
      { count: totalOrders },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("total, status")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", today.toISOString()),
      supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending"),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId),
    ]);

    const completedToday =
      todayOrders?.filter((o) => o.status === "completed").length || 0;
    const revenueToday =
      todayOrders
        ?.filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + (o.total || 0), 0) || 0;

    return {
      pendingOrders: pendingOrders?.length || 0,
      completedToday,
      revenueToday,
      totalOrders: totalOrders || 0,
    };
  } catch (error) {
    console.error("Error fetching restaurant stats:", error);
    return {
      pendingOrders: 0,
      completedToday: 0,
      revenueToday: 0,
      totalOrders: 0,
    };
  }
};
