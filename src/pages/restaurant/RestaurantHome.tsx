import React, { useEffect, useState } from "react";
import {
  ShoppingBag,
  UtensilsCrossed,
  DollarSign,
  Clock,
  QrCode,
  Copy,
  ExternalLink,
  Check,
} from "lucide-react";
import { Card, Badge, Loading, Button } from "../../components/ui";
import { getRestaurantStats } from "../../services/restaurantService";
import { formatCurrency, copyToClipboard } from "../../utils/helpers";

const RestaurantHome: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 3000);
    window.addEventListener("storage", loadStats);
    window.addEventListener("local-data-updated", loadStats);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", loadStats);
      window.removeEventListener("local-data-updated", loadStats);
    };
  }, []);

  const loadStats = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) {
      setLoading(false);
      return;
    }

    try {
      const restId = user.restaurant_id || "demo-restaurant-123";
      const restSlug = user.restaurant?.slug || "cantinho-da-rose";

      const keysToCheck = [
        `orders_${restId}`,
        restSlug ? `orders_${restSlug}` : null,
        "orders_demo-restaurant-123",
        "orders_cantinho-da-rose",
      ].filter(Boolean) as string[];

      const orderMap = new Map<string, any>();
      keysToCheck.forEach((k) => {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach((ord: any) => {
                const uniqueKey = ord.id || ord.order_number;
                if (uniqueKey && !orderMap.has(uniqueKey)) {
                  orderMap.set(uniqueKey, ord);
                }
              });
            }
          }
        } catch (e) {
          console.warn("Erro ao ler pedidos no dashboard:", k, e);
        }
      });

      const saved = Array.from(orderMap.values()).sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const localPending = saved.filter((o: any) => o.status === "pending").length;
      const localTodayRevenue = saved.reduce(
        (acc: number, o: any) => acc + (o.total || 0),
        0
      );
      const localMenu = JSON.parse(
        localStorage.getItem(`menu_${restId}`) || "[]"
      );

      let data: any = null;
      try {
        data = await getRestaurantStats(restId);
      } catch (e) {}

      setStats({
        pendingOrders:
          data?.pendingOrders > 0 ? data.pendingOrders : localPending,
        todayOrders: (data?.completedToday || 0) + (saved.length || 0),
        todayRevenue: (data?.revenueToday || 0) + (localTodayRevenue || 0),
        totalMenuItems: localMenu.length || 4,
        recentOrders:
          saved.length > 0
            ? saved.slice(0, 5)
            : [
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

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const slug = user.restaurant?.slug || "cantinho-da-rose";
  const menuUrl = `${window.location.origin}/menu/${slug}`;
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    copyToClipboard(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Painel do Restaurante</h2>
        <p className="text-text-secondary">
          Bem-vindo de volta! Acompanhe o movimento e pedidos em tempo real
        </p>
      </div>

      {/* Banner de Divulgação do Cardápio & QR Code */}
      <div className="bg-gradient-to-r from-accent to-accent-hover text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-2">
            🔗 Link Oficial para Divulgar aos Clientes
          </span>
          <h3 className="text-xl font-bold">Cardápio Digital do seu Restaurante</h3>
          <p className="text-white/90 text-sm mt-1 max-w-xl">
            Divulgue este link na biografia do Instagram, envie no WhatsApp para seus clientes ou imprima o QR Code para as mesas.
          </p>
          <div className="mt-3 flex items-center gap-2 bg-black/25 px-3 py-2 rounded-lg text-sm font-mono break-all max-w-lg">
            <span>{menuUrl}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            className="bg-white text-accent hover:bg-gray-100 font-bold border-none"
            icon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            onClick={handleCopyLink}
          >
            {copied ? "Link Copiado!" : "Copiar Link"}
          </Button>
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-black/30 hover:bg-black/40 text-white rounded-lg font-bold text-sm inline-flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Cardápio
          </a>
          <a
            href="/restaurant/settings"
            className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-sm inline-flex items-center gap-2 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Baixar QR Code
          </a>
        </div>
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
        <h3 className="text-lg font-semibold text-text mb-4">Ações Rápidas</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <a
            href="/restaurant/orders"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <ShoppingBag className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">Ver Pedidos</p>
            <p className="text-sm text-text-secondary">
              Gerencie os pedidos recebidos
            </p>
          </a>
          <a
            href="/restaurant/menu"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <UtensilsCrossed className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">Gerenciar Cardápio</p>
            <p className="text-sm text-text-secondary">Atualizar pratos e preços</p>
          </a>
          <a
            href="/restaurant/reports"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <DollarSign className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">Ver Relatórios</p>
            <p className="text-sm text-text-secondary">Vendas e faturamento</p>
          </a>
        </div>
      </Card>

      {/* Recent Orders Preview */}
      {stats?.recentOrders && stats.recentOrders.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text">Pedidos Recentes</h3>
            <a
              href="/restaurant/orders"
              className="text-accent hover:underline text-sm font-semibold"
            >
              Ver Todos
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
                    Pedido #{order.order_number}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {order.order_type} • {order.items?.length || 0} itens
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
                    {order.status === "completed"
                      ? "Concluído"
                      : order.status === "pending"
                      ? "Pendente"
                      : order.status}
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
