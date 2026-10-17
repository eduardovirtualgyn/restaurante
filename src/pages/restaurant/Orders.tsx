import React, { useEffect, useState, useRef } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Phone,
  User,
  MessageSquare,
  RefreshCw,
  MapPin,
  ExternalLink,
  Printer,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Modal,
  Textarea,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToOrders,
  updateOrderStatus,
} from "../../services/restaurantService";
import { supabase } from "../../config/supabase";
import type { Order } from "../../config/supabase";
import { formatDateTime, formatCurrency, playSound } from "../../utils/helpers";

export const extractOrderMetadata = (notes?: string) => {
  if (!notes) return { address: null, cutlery: null, cleanNotes: "" };

  const addressMatch = notes.match(/Endereço:\s*([^•\n\r]+)/i);
  const address = addressMatch ? addressMatch[1].trim() : null;

  const cutlery = notes.includes("[COM TALHER]")
    ? true
    : notes.includes("[SEM TALHER]")
    ? false
    : null;

  let cleanNotes = notes
    .replace(/\[COM TALHER\]\s*•?\s*/gi, "")
    .replace(/\[SEM TALHER\]\s*•?\s*/gi, "")
    .replace(/\[DELIVERY:[^\]]+\]\s*•?\s*/gi, "")
    .replace(/•?\s*Endereço:\s*[^•\n\r]+/gi, "")
    .trim();

  return { address, cutlery, cleanNotes };
};

const getOrderTypeLabel = (type: string) => {
  switch (type) {
    case "phone":
      return "Delivery (WhatsApp)";
    case "table":
      return "Mesa (Salão)";
    case "qr":
      return "Cardápio QR";
    case "counter":
      return "Balcão / Retirada";
    default:
      return type;
  }
};

export const handlePrintOrder = (order: Order) => {
  const meta = extractOrderMetadata(order.customer_notes);
  const printWindow = window.open("", "_blank", "width=380,height=650");
  if (!printWindow) {
    alert("Por favor, permita pop-ups no seu navegador para imprimir a comanda.");
    return;
  }

  const itemsHtml = (order.items || [])
    .map(
      (item: any) => `
      <div style="margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px;">
          <span>${item.quantity}x ${item.name}</span>
          <span>${formatCurrency(item.item_total || item.subtotal || (item.base_price ? item.base_price * item.quantity : 0))}</span>
        </div>
        ${item.size ? `<div style="font-size: 11px; padding-left: 10px; color: #333;">Tamanho: ${item.size}</div>` : ""}
        ${item.addons && item.addons.length > 0 ? `<div style="font-size: 11px; padding-left: 10px; color: #333;">Adicionais: ${item.addons.join(", ")}</div>` : ""}
      </div>
    `
    )
    .join("");

  const formattedDate = formatDateTime(order.created_at);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Comanda #${order.order_number}</title>
  <style>
    @page { margin: 0; size: auto; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 290px;
      margin: 0 auto;
      padding: 12px 10px 24px 10px;
      color: #000;
      font-size: 13px;
      line-height: 1.35;
      background: #fff;
    }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .title { font-size: 18px; font-weight: 900; margin-bottom: 2px; }
    .subtitle { font-size: 11px; text-transform: uppercase; margin-bottom: 6px; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .double-divider { border-top: 2px solid #000; margin: 8px 0; }
    .order-num { font-size: 21px; font-weight: 900; padding: 4px 0; letter-spacing: 0.5px; }
    .box-destaque {
      border: 2px solid #000;
      padding: 6px 8px;
      margin: 8px 0;
      background: #fff;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: 900;
      padding: 4px 0;
    }
    @media print {
      body { width: 100%; margin: 0; padding: 6px; }
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="title">CANTINHO DA ROSE</div>
    <div class="subtitle">Cardápio Digital & Almoço Executivo</div>
    <div class="double-divider"></div>
    <div class="order-num">PEDIDO #${order.order_number}</div>
    <div style="font-size: 11px;">${formattedDate}</div>
    <div class="divider"></div>
  </div>

  <div class="box-destaque">
    <div class="bold" style="font-size: 11px; text-transform: uppercase;">
      📍 DESTINO / ENTREGA (PREGAR NA SACOLA):
    </div>
    <div class="bold" style="font-size: 14px; margin-top: 3px; word-break: break-word;">
      ${meta.address ? meta.address : order.table_number || "Retirada no Balcão"}
    </div>
    ${order.table_number && meta.address ? `<div style="font-size: 11px; margin-top: 3px; color: #333;">Região: ${order.table_number}</div>` : ""}
  </div>

  <div style="font-size: 12px; line-height: 1.4;">
    <div><strong>Cliente:</strong> ${order.customer_name || "Cliente"}</div>
    <div><strong>WhatsApp:</strong> ${order.customer_phone || "-"}</div>
    <div><strong>Tipo:</strong> ${getOrderTypeLabel(order.order_type)}</div>
  </div>

  <div class="divider"></div>

  <div class="bold" style="font-size: 12px; padding: 2px 0;">
    TALHERES: ${meta.cutlery ? "SIM [COM TALHER E GUARDANAPO]" : "NÃO [SEM TALHER DESCARTÁVEL]"}
  </div>

  <div class="divider"></div>

  <div class="bold" style="margin-bottom: 6px; font-size: 12px;">ITENS DO PEDIDO:</div>
  ${itemsHtml}

  <div class="divider"></div>

  <div style="font-size: 12px;">
    <div style="display: flex; justify-content: space-between;">
      <span>Subtotal dos Itens:</span>
      <span>${formatCurrency(order.subtotal)}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>Taxa de Entrega:</span>
      <span>${order.tax > 0 ? formatCurrency(order.tax) : "Grátis (R$ 0,00)"}</span>
    </div>
    ${order.discount ? `
    <div style="display: flex; justify-content: space-between;">
      <span>Desconto:</span>
      <span>-${formatCurrency(order.discount)}</span>
    </div>` : ""}
  </div>

  <div class="double-divider"></div>
  <div class="total-row">
    <span>TOTAL A PAGAR:</span>
    <span>${formatCurrency(order.total)}</span>
  </div>
  <div class="double-divider"></div>

  ${meta.cleanNotes ? `
  <div style="margin: 6px 0;">
    <div class="bold" style="font-size: 11px;">OBSERVAÇÕES:</div>
    <div style="font-size: 12px; font-style: italic;">"${meta.cleanNotes}"</div>
    <div class="divider"></div>
  </div>
  ` : ""}

  <div class="text-center" style="margin-top: 14px; font-size: 11px;">
    <div>Obrigado pela preferência! ❤️</div>
    <div>Cantinho da Rose - Comida Caseira com Amor</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 600);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");
  const prevOrderCountRef = useRef(0);

  // Sincroniza pedidos da nuvem (Supabase) mesclando com o cache local
  const syncOrders = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const restId = user.restaurant_id || "demo-restaurant-123";
    const restSlug = user.restaurant?.slug || "cantinho-da-rose";

    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const finalId = isUUID.test(restId)
      ? restId
      : "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    const orderMap = new Map<string, Order>();

    // 1. Busca pedidos reais direto do Supabase (em tempo real pela nuvem)
    try {
      const targetIds = Array.from(
        new Set([finalId, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"])
      );
      const { data: cloudOrders, error } = await supabase
        .from("orders")
        .select("*")
        .in("restaurant_id", targetIds)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(cloudOrders)) {
        cloudOrders.forEach((ord: any) => {
          const key = ord.id || ord.order_number;
          if (key) {
            let parsedItems = ord.items;
            if (typeof ord.items === "string") {
              try {
                parsedItems = JSON.parse(ord.items);
              } catch {
                parsedItems = [];
              }
            }
            const totalNum =
              typeof ord.total === "string"
                ? parseFloat(ord.total.replace(",", "."))
                : Number(ord.total || 0);

            orderMap.set(key, {
              ...ord,
              items: Array.isArray(parsedItems) ? parsedItems : [],
              total: isNaN(totalNum) ? 0 : totalNum,
            });
          }
        });
      }
    } catch (e) {
      console.warn("Aviso ao sincronizar pedidos com Supabase:", e);
    }

    // 2. Mescla com pedidos do localStorage (pedidos locais não sobrescrevem status da nuvem)
    const keysToCheck = [
      `orders_${finalId}`,
      `orders_${restId}`,
      restSlug ? `orders_${restSlug}` : null,
      "orders_demo-restaurant-123",
      "orders_cantinho-da-rose",
    ].filter(Boolean) as string[];

    keysToCheck.forEach((k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((ord: Order) => {
              const uniqueKey = ord.id || ord.order_number;
              if (uniqueKey && !orderMap.has(uniqueKey)) {
                orderMap.set(uniqueKey, ord);
              }
            });
          }
        }
      } catch (e) {
        console.warn("Erro ao ler chave de pedidos:", k, e);
      }
    });

    let currentOrders = Array.from(orderMap.values());

    // Se ainda não houver nenhum pedido, cria pedidos de demonstração realistas
    if (currentOrders.length === 0) {
      const restName = user.restaurant?.name || "Cantinho da Rose";
      currentOrders = [
        {
          id: `ord-${restId}-1`,
          restaurant_id: finalId,
          order_number: `PED${Math.floor(100000 + Math.random() * 899999)}`,
          order_type: "phone",
          customer_name: "Mariana Silva",
          customer_phone: "(11) 99876-5432",
          table_number: "Rua das Flores, 142 - Apto 34B",
          items: [
            {
              menu_item_id: "item-1",
              name: `Marmita Executiva do ${restName}`,
              quantity: 2,
              base_price: 36.9,
              item_total: 73.8,
              selected_size: { name: "Porção Completa", price: 36.9 },
            },
            {
              menu_item_id: "item-2",
              name: "Suco Natural de Laranja 500ml",
              quantity: 2,
              base_price: 9.0,
              item_total: 18.0,
            },
          ],
          subtotal: 91.8,
          tax: 0,
          total: 91.8,
          status: "pending",
          customer_notes: "Sem cebola em um dos pratos. Pagamento via Pix.",
          created_at: new Date(Date.now() - 4 * 60000).toISOString(),
        },
        {
          id: `ord-${restId}-2`,
          restaurant_id: finalId,
          order_number: `PED${Math.floor(100000 + Math.random() * 899999)}`,
          order_type: "table",
          customer_name: "Lucas Medeiros",
          customer_phone: "(11) 99123-4567",
          table_number: "Mesa 04",
          items: [
            {
              menu_item_id: "item-3",
              name: "Porção Rústica da Casa",
              quantity: 1,
              base_price: 24.0,
              item_total: 24.0,
            },
            {
              menu_item_id: "item-4",
              name: "Guaraná Antarctica 2L",
              quantity: 1,
              base_price: 14.0,
              item_total: 14.0,
            },
          ],
          subtotal: 38.0,
          tax: 0,
          total: 38.0,
          status: "accepted",
          customer_notes: "Trazer gelo e copos.",
          created_at: new Date(Date.now() - 16 * 60000).toISOString(),
        },
      ];
    }

    // Salva a lista consolidada no localStorage para persistência e compartilhamento local
    keysToCheck.forEach((k) => {
      try {
        localStorage.setItem(k, JSON.stringify(currentOrders));
      } catch (e) {}
    });

    setOrders((prev) => {
      // Se houver mais pedidos do que antes, toca o som de notificação
      if (
        currentOrders.length > prevOrderCountRef.current &&
        prevOrderCountRef.current > 0
      ) {
        const hasNewPending = currentOrders.some(
          (uo) =>
            uo.status === "pending" &&
            !prev.some(
              (po) => (po.id || po.order_number) === (uo.id || uo.order_number)
            )
        );
        if (hasNewPending) {
          playSound("notification");
        }
      }
      prevOrderCountRef.current = currentOrders.length;
      return currentOrders;
    });

    setLastUpdatedTime(
      new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const restId = user.restaurant_id || "demo-restaurant-123";

    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const finalId = isUUID.test(restId)
      ? restId
      : "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    // 1. Carregamento inicial imediato
    syncOrders();

    // 2. Polling contínuo em tempo real a cada 2.5 segundos
    const pollInterval = setInterval(() => {
      syncOrders();
    }, 2500);

    // 3. Ouvintes de eventos locais entre abas, foco da janela e visibilidade da tela
    const handleStorageChange = () => syncOrders();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncOrders();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-data-updated", handleStorageChange);
    window.addEventListener("focus", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Sincronização via Supabase em tempo real (se configurado)
    let subscription: any = null;
    try {
      subscription = subscribeToOrders(finalId, () => {
        syncOrders();
      });
    } catch (e) {
      console.warn("Supabase real-time subscription skipped:", e);
    }

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-data-updated", handleStorageChange);
      window.removeEventListener("focus", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      subscription?.unsubscribe?.();
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    syncOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Ordena SEMPRE os mais recentes primeiro
  const filteredOrders = orders
    .filter((order) => statusFilter === "all" || order.status === statusFilter)
    .sort((a, b) => {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    // 1. Atualização no estado local
    setOrders((prev) => {
      const updated = prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus as any } : o
      );
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const restId = user.restaurant_id || "demo-restaurant-123";
      const restSlug = user.restaurant?.slug || "cantinho-da-rose";

      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const finalId = isUUID.test(restId)
        ? restId
        : "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

      const keysToUpdate = [
        `orders_${finalId}`,
        `orders_${restId}`,
        restSlug ? `orders_${restSlug}` : null,
        "orders_demo-restaurant-123",
        "orders_cantinho-da-rose",
      ].filter(Boolean) as string[];

      keysToUpdate.forEach((k) => {
        try {
          localStorage.setItem(k, JSON.stringify(updated));
        } catch (e) {}
      });

      return updated;
    });

    // 2. Atualização no Supabase em nuvem
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (e) {
      console.warn("Supabase updateOrderStatus skipped:", e);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "warning",
      accepted: "accent-secondary",
      completed: "success",
      cancelled: "neutral",
      rejected: "error",
    };
    const labels: Record<string, string> = {
      pending: "Pendente",
      accepted: "Em Preparo",
      completed: "Concluído",
      cancelled: "Cancelado",
      rejected: "Recusado",
    };
    return (
      <Badge variant={variants[status] || "neutral"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-warning" />;
      case "accepted":
        return <Package className="w-5 h-5 text-accent-secondary" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "cancelled":
      case "rejected":
        return <XCircle className="w-5 h-5 text-error" />;
      default:
        return <Clock className="w-5 h-5 text-text-secondary" />;
    }
  };

  if (loading) {
    return <Loading text="Carregando pedidos..." />;
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const acceptedCount = orders.filter((o) => o.status === "accepted").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  const statusFilters = [
    { key: "all", label: "Todos os Pedidos", count: orders.length },
    { key: "pending", label: "Pendentes", count: pendingCount },
    { key: "accepted", label: "Em Preparo", count: acceptedCount },
    { key: "completed", label: "Concluídos", count: completedCount },
    { key: "cancelled", label: "Cancelados", count: orders.filter((o) => o.status === "cancelled" || o.status === "rejected").length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text mb-1">Gestão de Pedidos</h2>
          <p className="text-text-secondary">
            Gerencie e acompanhe todos os pedidos do seu restaurante em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className="flex items-center gap-2 bg-white"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-accent" : ""}`}
            />
            <span>{isRefreshing ? "Atualizando..." : "Atualizar Agora"}</span>
          </Button>

          {pendingCount > 0 && (
            <Badge variant="warning" className="text-base px-3.5 py-1.5 animate-pulse font-bold">
              {pendingCount} {pendingCount === 1 ? "Pendente" : "Pendentes"}
            </Badge>
          )}
        </div>
      </div>

      {/* Real-time indicator & sync bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50/80 border border-emerald-200/60 rounded-xl text-xs text-emerald-800">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          <span className="font-semibold">Sincronização em Tempo Real Ativa</span>
          <span className="hidden sm:inline text-emerald-600">• Verificando a cada 2.5s</span>
          <span className="hidden sm:inline text-emerald-600">• Alertas sonoros habilitados</span>
        </div>
        {lastUpdatedTime && (
          <span className="text-emerald-700/80">
            Última verificação: {lastUpdatedTime}
          </span>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              statusFilter === key
                ? "bg-accent text-white shadow-sm font-semibold"
                : "bg-bg-subtle text-text-secondary hover:bg-border/60 hover:text-text"
            }`}
          >
            <span>{label}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                statusFilter === key
                  ? "bg-white/20 text-white font-bold"
                  : "bg-gray-200/70 text-gray-700 font-semibold"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            Nenhum pedido encontrado
          </h3>
          <p className="text-text-secondary">
            Não há pedidos com status "{statusFilters.find(f => f.key === statusFilter)?.label || statusFilter}" no momento.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className={`hover:shadow-lg transition-shadow ${
                order.status === "pending" ? "border-l-4 border-l-warning" : ""
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Order Info */}
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <h3 className="text-lg font-bold text-text">
                          Pedido #{order.order_number}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          {formatDateTime(order.created_at)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Details */}
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <Package className="w-4 h-4" />
                      <span>
                        {getOrderTypeLabel(order.order_type)} •{" "}
                        {order.table_number ? order.table_number : "Balcão / Retirada"}
                      </span>
                    </div>
                    {order.customer_phone && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <Phone className="w-4 h-4" />
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="text-accent hover:underline"
                        >
                          {order.customer_phone}
                        </a>
                      </div>
                    )}
                    {order.customer_name && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <User className="w-4 h-4" />
                        <span>{order.customer_name}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <span className="font-semibold text-text">
                        {order.items?.length || 0} {order.items?.length === 1 ? "item" : "itens"}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-text text-lg">
                        {formatCurrency(order.total)}
                      </span>
                    </div>

                    {/* Endereço de Entrega no Card Principal */}
                    {(() => {
                      const meta = extractOrderMetadata(order.customer_notes);
                      if (!meta.address) return null;
                      return (
                        <div className="sm:col-span-2 flex items-start space-x-2 p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-lg text-xs">
                          <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-amber-900 block">
                              Endereço de Entrega:
                            </span>
                            <span className="text-gray-900 font-semibold break-words">
                              {meta.address}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Customer Notes */}
                  {order.customer_notes && (
                    <div className="flex items-start space-x-2 text-sm bg-bg-subtle rounded-lg p-3">
                      <MessageSquare className="w-4 h-4 text-accent-secondary mt-0.5" />
                      <div>
                        <p className="font-medium text-text">Observações do Cliente:</p>
                        <p className="text-text-secondary">
                          {order.customer_notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2 lg:min-w-[160px]">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handleViewDetails(order)}
                  >
                    Ver Detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handlePrintOrder(order)}
                    className="flex items-center justify-center gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                    title="Imprimir comanda para grampear na sacola"
                  >
                    <Printer className="w-3.5 h-3.5 text-gray-600" />
                    <span>Imprimir Comanda</span>
                  </Button>

                  {order.status === "pending" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => handleStatusUpdate(order.id, "accepted")}
                      >
                        Aceitar Pedido
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowRejectModal(true);
                        }}
                      >
                        Recusar
                      </Button>
                    </>
                  )}

                  {order.status === "accepted" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() =>
                          handleStatusUpdate(order.id, "completed")
                        }
                      >
                        Concluir Entrega
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowRejectModal(true);
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showDetailsModal}
        order={selectedOrder}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOrder(null);
        }}
      />

      {/* Reject Modal */}
      <RejectOrderModal
        isOpen={showRejectModal}
        order={selectedOrder}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedOrder(null);
        }}
        onReject={handleStatusUpdate}
      />
    </div>
  );
};

// Order Details Modal Component
interface OrderDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  order,
  onClose,
}) => {
  if (!order) return null;

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    accepted: "Em Preparo",
    completed: "Concluído",
    cancelled: "Cancelado",
    rejected: "Recusado",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalhes do Pedido #${order.order_number}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-bg-subtle rounded-lg">
          <span className="font-medium text-text">Status Atual</span>
          <Badge
            variant={
              order.status === "completed"
                ? "success"
                : order.status === "pending"
                ? "warning"
                : "neutral"
            }
          >
            {statusLabels[order.status] || order.status}
          </Badge>
        </div>

        {/* Customer Info */}
        <div>
          <h4 className="font-semibold text-text mb-3">Dados do Cliente</h4>
          <div className="space-y-2 text-sm">
            {order.customer_name && (
              <p className="text-text-secondary">
                <strong className="text-text">Nome:</strong>{" "}
                {order.customer_name}
              </p>
            )}
            {order.customer_phone && (
              <p className="text-text-secondary flex items-center gap-2">
                <strong className="text-text">Telefone:</strong>{" "}
                <a
                  href={`https://wa.me/55${order.customer_phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline flex items-center gap-1 font-semibold"
                >
                  {order.customer_phone}
                  <ExternalLink className="w-3.5 h-3.5 text-accent" />
                </a>
              </p>
            )}
            <p className="text-text-secondary">
              <strong className="text-text">Tipo de Pedido:</strong>{" "}
              {getOrderTypeLabel(order.order_type)}
            </p>
            {order.table_number && (
              <p className="text-text-secondary">
                <strong className="text-text">Mesa / Região:</strong>{" "}
                {order.table_number}
              </p>
            )}

            {/* Endereço de Entrega Destacado */}
            {(() => {
              const meta = extractOrderMetadata(order.customer_notes);
              if (!meta.address) return null;
              return (
                <div className="mt-3 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      Endereço Completo de Entrega
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${meta.address}, Goiânia - GO`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-1"
                    >
                      Abrir no Maps
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="font-bold text-sm sm:text-base text-gray-900 leading-snug">
                    {meta.address}
                  </p>
                </div>
              );
            })()}

            {/* Talheres */}
            {(() => {
              const meta = extractOrderMetadata(order.customer_notes);
              if (meta.cutlery === null) return null;
              return (
                <div className="pt-1.5 flex items-center gap-2">
                  <strong className="text-text text-sm">Talheres:</strong>
                  <Badge
                    variant={meta.cutlery ? "success" : "neutral"}
                    className="font-bold text-xs"
                  >
                    {meta.cutlery
                      ? "🍴 COM TALHER E GUARDANAPO"
                      : "🌱 SEM TALHER (Consumo em Casa/Escritório)"}
                  </Badge>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Order Items */}
        <div>
          <h4 className="font-semibold text-text mb-3">Itens do Pedido</h4>
          <div className="space-y-3">
            {order.items?.map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-start justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-text">
                    {item.quantity}x {item.name}
                  </p>
                  {item.size && (
                    <p className="text-sm text-text-secondary">
                      Tamanho: {item.size}
                    </p>
                  )}
                  {item.addons && item.addons.length > 0 && (
                    <p className="text-sm text-text-secondary">
                      Adicionais: {item.addons.join(", ")}
                    </p>
                  )}
                </div>
                <p className="font-semibold text-text">
                  {formatCurrency(item.item_total || item.subtotal || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-text-secondary">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.tax !== undefined && order.tax !== null && (
            <div className="flex justify-between text-text-secondary">
              <span>Taxa de Entrega / Serviço</span>
              <span className={order.tax === 0 ? "text-emerald-600 font-medium" : ""}>
                {order.tax === 0 ? "Grátis (R$ 0,00)" : formatCurrency(order.tax)}
              </span>
            </div>
          )}
          {Boolean(order.discount && order.discount > 0) && (
            <div className="flex justify-between text-success">
              <span>Desconto</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-text pt-2 border-t border-border">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Notes */}
        {order.customer_notes && (
          <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-lg p-4 space-y-1.5">
            <h4 className="font-semibold text-text">Observações do Pedido</h4>
            {(() => {
              const meta = extractOrderMetadata(order.customer_notes);
              return (
                <>
                  {meta.cleanNotes ? (
                    <div className="p-2.5 bg-white rounded-md border border-accent-secondary/20 text-sm font-semibold text-gray-900">
                      "{meta.cleanNotes}"
                    </div>
                  ) : null}
                  <p className="text-text-secondary text-xs font-mono break-words pt-1">
                    {order.customer_notes}
                  </p>
                </>
              );
            })()}
          </div>
        )}

        {/* Payment Info */}
        {order.payment_method && (
          <div>
            <h4 className="font-semibold text-text mb-2">Pagamento</h4>
            <p className="text-text-secondary text-sm">
              Forma: {order.payment_method}
            </p>
            {order.payment_transaction_id && (
              <p className="text-text-secondary text-sm">
                ID da Transação: {order.payment_transaction_id}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handlePrintOrder(order)}
            className="flex items-center justify-center gap-2 border-gray-300 font-bold hover:bg-gray-50 text-gray-800"
            fullWidth
          >
            <Printer className="w-4 h-4 text-gray-700" />
            Imprimir Comanda (Sacola)
          </Button>
          <Button onClick={onClose} fullWidth>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Cancel Order Modal Component
interface RejectOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onReject: (orderId: string, status: string, notes?: string) => void;
}

const RejectOrderModal: React.FC<RejectOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onReject,
}) => {
  const [reason, setReason] = useState("");

  const handleCancel = () => {
    if (!order) return;
    onReject(order.id, "cancelled", reason);
    onClose();
    setReason("");
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancelar Pedido" size="md">
      <div className="space-y-4">
        <Alert
          type="warning"
          message="Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita."
        />

        <Textarea
          label="Motivo do Cancelamento (Opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Produto esgotado, cozinha fechada, solicitação do cliente..."
          rows={3}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            Voltar
          </Button>
          <Button variant="danger" onClick={handleCancel} fullWidth>
            Confirmar Cancelamento
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Orders;
