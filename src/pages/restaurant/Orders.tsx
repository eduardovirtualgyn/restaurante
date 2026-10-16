import React, { useEffect, useState, useRef } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Phone,
  User,
  MessageSquare,
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
import type { Order } from "../../config/supabase";
import { formatDateTime, formatCurrency, playSound } from "../../utils/helpers";

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

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const prevOrderCountRef = useRef(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) {
      setLoading(false);
      return;
    }

    const localOrdersKey = `orders_${user.restaurant_id}`;
    let currentOrders: Order[] = [];

    // 1. Try reading saved orders from localStorage
    const saved = localStorage.getItem(localOrdersKey);
    if (saved) {
      try {
        currentOrders = JSON.parse(saved);
      } catch (e) {
        console.warn("Erro ao carregar pedidos locais:", e);
      }
    }

    // 2. If no saved orders exist, seed initial realistic orders for testing
    if (currentOrders.length === 0) {
      const restName = user.restaurant?.name || "Restaurante";
      currentOrders = [
        {
          id: `ord-${user.restaurant_id}-1`,
          restaurant_id: user.restaurant_id,
          order_number: `PED${Math.floor(100000 + Math.random() * 899999)}`,
          order_type: "phone",
          customer_name: "Mariana Silva",
          customer_phone: "(11) 99876-5432",
          table_number: "Rua das Flores, 142 - Apto 34B",
          items: [
            {
              menu_item_id: "item-1",
              name: `Prato Especial do ${restName}`,
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
          customer_notes: "Sem cebola em um dos pratos, por favor. Pagamento via Pix.",
          created_at: new Date(Date.now() - 4 * 60000).toISOString(),
        },
        {
          id: `ord-${user.restaurant_id}-2`,
          restaurant_id: user.restaurant_id,
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
              name: "Refrigerante Lata 350ml",
              quantity: 2,
              base_price: 6.5,
              item_total: 13.0,
            },
          ],
          subtotal: 37.0,
          tax: 0,
          total: 37.0,
          status: "accepted",
          customer_notes: "Trazer gelo e limão para as bebidas.",
          created_at: new Date(Date.now() - 16 * 60000).toISOString(),
        },
      ];
      localStorage.setItem(localOrdersKey, JSON.stringify(currentOrders));
    }

    setOrders(currentOrders);
    setLoading(false);

    // 3. Optional Supabase real-time sync if online
    try {
      const subscription = subscribeToOrders(user.restaurant_id, (data) => {
        if (data && data.length > 0) {
          if (data.length > prevOrderCountRef.current) {
            const newOrders = data.filter(
              (order) =>
                order.status === "pending" &&
                !orders.find((o) => o.id === order.id)
            );
            if (newOrders.length > 0) {
              playSound("notification");
            }
          }
          prevOrderCountRef.current = data.length;
          setOrders(data);
          localStorage.setItem(localOrdersKey, JSON.stringify(data));
        }
        setLoading(false);
      });

      return () => {
        subscription?.unsubscribe?.();
      };
    } catch (e) {
      console.warn("Supabase subscription skipped:", e);
      setLoading(false);
    }
  }, []);

  const filteredOrders = orders
    .filter((order) => order.status === statusFilter)
    .sort((a, b) => {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setOrders((prev) => {
      const updated = prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus as any } : o
      );
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.restaurant_id) {
        localStorage.setItem(`orders_${user.restaurant_id}`, JSON.stringify(updated));
      }
      return updated;
    });

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

  const statusFilters = [
    { key: "pending", label: "Pendentes" },
    { key: "accepted", label: "Em Preparo" },
    { key: "completed", label: "Concluídos" },
    { key: "cancelled", label: "Cancelados" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Gestão de Pedidos</h2>
          <p className="text-text-secondary">
            Gerencie e acompanhe todos os pedidos do seu restaurante em tempo real
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="warning" className="text-lg px-4 py-2 animate-pulse">
            {pendingCount} {pendingCount === 1 ? "Pendente" : "Pendentes"}
          </Badge>
        )}
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>Atualizações automáticas ativas • Alertas sonoros habilitados</span>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === key
                ? "bg-accent text-white"
                : "bg-bg-subtle text-text-secondary hover:bg-border"
            }`}
          >
            {label}
            {key === "pending" && ` (${pendingCount})`}
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
              <p className="text-text-secondary">
                <strong className="text-text">Telefone:</strong>{" "}
                {order.customer_phone}
              </p>
            )}
            <p className="text-text-secondary">
              <strong className="text-text">Tipo de Pedido:</strong>{" "}
              {getOrderTypeLabel(order.order_type)}
            </p>
            {order.table_number && (
              <p className="text-text-secondary">
                <strong className="text-text">Mesa / Local:</strong>{" "}
                {order.table_number}
              </p>
            )}
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
          {order.tax > 0 && (
            <div className="flex justify-between text-text-secondary">
              <span>Taxa de Entrega / Serviço</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
          )}
          {order.discount && order.discount > 0 && (
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
          <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-lg p-4">
            <h4 className="font-semibold text-text mb-2">Observações do Cliente</h4>
            <p className="text-text-secondary text-sm">
              {order.customer_notes}
            </p>
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

        <Button onClick={onClose} fullWidth>
          Fechar
        </Button>
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
