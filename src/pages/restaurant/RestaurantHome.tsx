import React, { useEffect, useState } from "react";
import { ShoppingBag, UtensilsCrossed, DollarSign, Clock } from "lucide-react";
import { Card, Badge, Loading } from "../../components/ui";
import { getRestaurantStats } from "../../services/restaurantService";
import { formatCurrency } from "../../utils/helpers";

const RestaurantHome: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    if (user.restaurant_id === "demo-restaurant-123") {
      setStats({
        pendingOrders: 2,
        todayOrders: 19,
        todayRevenue: 1580.4,
        totalMenuItems: 12,
        recentOrders: [
          {
            id: "ord-1",
            order_number: "PED849201",
            order_type: "Delivery",
            items: [{}, {}],
            total: 82.5,
            status: "pending",
          },
          {
            id: "ord-2",
            order_number: "PED849198",
            order_type: "Mesa 04",
            items: [{}, {}, {}],
            total: 114.9,
            status: "pending",
          },
          {
            id: "ord-3",
            order_number: "PED849182",
            order_type: "Delivery",
            items: [{}],
            total: 45.9,
            status: "completed",
          },
        ],
      });
      setLoading(false);
      return;
    }

    try {
      const localOrdersKey = `orders_${user.restaurant_id}`;
      const saved = JSON.parse(localStorage.getItem(localOrdersKey) || "[]");
      const localPending = saved.filter((o: any) => o.status === "pending").length;
      const localTodayRevenue = saved.reduce((acc: number, o: any) => acc + (o.total || 0), 0);
      const localMenu = JSON.parse(localStorage.getItem(`menu_${user.restaurant_id}`) || "[]");

      const data = await getRestaurantStats(user.restaurant_id);
      setStats({
        pendingOrders: data?.pendingOrders > 0 ? data.pendingOrders : localPending,
        todayOrders: (data?.completedToday || 0) + (saved.length || 0),
        todayRevenue: (data?.revenueToday || 0) + (localTodayRevenue || 0),
        totalMenuItems: localMenu.length || 4,
        recentOrders: saved.length > 0 ? saved.slice(0, 5) : [
          {
            id: "ord-1",
            order_number: "PED849201",
            order_type: "Delivery",
            items: [{}, {}],
            total: 91.8,
            status: "pending",
          },
        ],
      });
    } catch (e) {
      console.warn("Fallback to local restaurant stats:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Carregando painel..." />;
  }

  const statCards = [
    {
      title: "Pedidos Pendentes",
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Pedidos de Hoje",
      value: stats?.todayOrders || 0,
      icon: ShoppingBag,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Faturamento Hoje",
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Itens no Cardápio",
      value: stats?.totalMenuItems || 0,
      icon: UtensilsCrossed,
      color: "text-accent-secondary",
      bgColor: "bg-accent-secondary/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Dashboard</h2>
        <p className="text-text-secondary">
          Welcome back! Here's your restaurant overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-text mb-4">Quick Actions</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <a
            href="/restaurant/orders"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <ShoppingBag className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">View Orders</p>
            <p className="text-sm text-text-secondary">
              Manage incoming orders
            </p>
          </a>
          <a
            href="/restaurant/menu"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <UtensilsCrossed className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">Manage Menu</p>
            <p className="text-sm text-text-secondary">Update items & prices</p>
          </a>
          <a
            href="/restaurant/reports"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <DollarSign className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">View Reports</p>
            <p className="text-sm text-text-secondary">Sales & analytics</p>
          </a>
        </div>
      </Card>

      {/* Recent Orders Preview */}
      {stats?.recentOrders && stats.recentOrders.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text">Recent Orders</h3>
            <a
              href="/restaurant/orders"
              className="text-accent hover:underline text-sm"
            >
              View All
            </a>
          </div>
          <div className="space-y-3">
            {stats.recentOrders.slice(0, 5).map((order: any) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-text">
                    Order #{order.order_number}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {order.order_type} • {order.items?.length || 0} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-text">
                    {formatCurrency(order.total)}
                  </p>
                  <Badge
                    variant={
                      order.status === "completed"
                        ? "success"
                        : order.status === "pending"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RestaurantHome;
