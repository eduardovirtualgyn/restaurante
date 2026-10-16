import React, { useEffect, useState } from "react";
import {
  Search,
  Eye,
  Ban,
  CheckCircle,
  Store as StoreIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Crown,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Badge,
  Loading,
  Modal,
  Select,
  Textarea,
  Alert,
} from "../../components/ui";
import {
  subscribeToRestaurants,
  toggleRestaurantStatus,
  adminResetRestaurantCredentials,
} from "../../services/adminService";
import type { Restaurant } from "../../config/supabase";
import {
  formatDateTime,
  copyToClipboard,
  generateTempPassword,
} from "../../utils/helpers";
import { APP_CONFIG } from "../../config/config";

const AllRestaurants: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showNewCredsModal, setShowNewCredsModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState<any>(null);

  // Real-time subscription and local auto-sync
  useEffect(() => {
    const loadRestaurants = (data?: Restaurant[]) => {
      const customRestaurants: Restaurant[] = JSON.parse(
        localStorage.getItem("custom_restaurants") || "[]"
      );
      const defaultRestaurants: Restaurant[] = [
        {
          id: "demo-restaurant-123",
          name: "Cantinho da Rose - Marmitaria Executiva",
          slug: "cantinho-da-rose",
          owner_name: "Rose",
          phone: "(62) 99999-8888",
          email: "contato@cantinhodarose.com.br",
          city: "Goiânia - GO",
          restaurant_type: "Marmitaria Executiva • Turno do Almoço",
          subscription_plan: "pro",
          status: "active",
          is_active: true,
          created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "rest-1",
          name: "Burger Artesanal VIP",
          slug: "burger-vip",
          owner_name: "Lucas Medeiros",
          phone: "(11) 98765-4321",
          email: "contato@burgervip.com.br",
          city: "São Paulo - SP",
          restaurant_type: "Hamburgueria Gourmet",
          subscription_plan: "pro",
          status: "active",
          is_active: true,
          created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "rest-2",
          name: "Pizzaria Bella Napoli",
          slug: "bella-napoli",
          owner_name: "Giovanni Rossi",
          phone: "(11) 97654-3210",
          email: "contato@bellanapoli.com.br",
          city: "Campinas - SP",
          restaurant_type: "Pizzaria Tradicional",
          subscription_plan: "starter",
          status: "active",
          is_active: true,
          created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "rest-3",
          name: "Sushi Sakura Express",
          slug: "sushi-sakura",
          owner_name: "Kenji Sato",
          phone: "(21) 98123-4567",
          email: "kenji@sushisakura.com.br",
          city: "Rio de Janeiro - RJ",
          restaurant_type: "Comida Japonesa",
          subscription_plan: "free_trial",
          status: "trial",
          is_active: true,
          created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const baseList = data && data.length > 0 ? data : defaultRestaurants;
      const map = new Map<string, Restaurant>();
      [...customRestaurants, ...baseList].forEach((item) => {
        if (!map.has(item.id)) {
          map.set(item.id, item);
        }
      });
      setRestaurants(Array.from(map.values()));
      setLoading(false);
    };

    loadRestaurants();

    const subscription = subscribeToRestaurants((data) => {
      loadRestaurants(data);
    });

    const handleSync = () => {
      loadRestaurants();
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("local-data-updated", handleSync);

    const interval = setInterval(() => {
      loadRestaurants();
    }, 2000);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("local-data-updated", handleSync);
      clearInterval(interval);
    };
  }, []);

  // Filter restaurants
  useEffect(() => {
    let filtered = restaurants;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.owner_name?.toLowerCase().includes(term) ||
          r.phone?.toLowerCase().includes(term) ||
          r.city?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredRestaurants(filtered);
  }, [restaurants, searchTerm, statusFilter]);

  const handleViewDetails = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowDetailsModal(true);
  };

  const handleToggleBlock = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowBlockModal(true);
  };

  const handleResetCredentials = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowResetModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Ativo</Badge>;
      case "blocked":
        return <Badge variant="error">Bloqueado</Badge>;
      case "trial":
        return <Badge variant="warning">Teste Grátis</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    const planConfig = APP_CONFIG.plans[plan as keyof typeof APP_CONFIG.plans];
    if (!planConfig) return null;

    return (
      <Badge
        variant={plan === "pro" || plan === "enterprise" ? "success" : "neutral"}
        className="flex items-center space-x-1"
      >
        {(plan === "pro" || plan === "enterprise") && <Crown className="w-3 h-3" />}
        <span>{planConfig.name}</span>
      </Badge>
    );
  };

  if (loading) {
    return <Loading text="Carregando restaurantes..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Todos os Restaurantes</h2>
          <p className="text-text-secondary">
            Gerencie todos os restaurantes cadastrados na plataforma
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="neutral" className="text-lg px-4 py-2">
            {restaurants.length} Total
          </Badge>
          <Badge variant="success" className="text-lg px-4 py-2">
            {restaurants.filter((r) => r.status === "active").length} Ativos
          </Badge>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>Atualizações em tempo real ativas</span>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome, proprietário, telefone ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />
          </div>
          <div className="sm:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "all", label: "Todos os Status" },
                { value: "active", label: "Ativos" },
                { value: "blocked", label: "Bloqueados" },
                { value: "trial", label: "Em Teste" },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Restaurants List */}
      {filteredRestaurants.length === 0 ? (
        <Card className="text-center py-12">
          <StoreIcon className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            Nenhum restaurante encontrado
          </h3>
          <p className="text-text-secondary">
            {searchTerm || statusFilter !== "all"
              ? "Tente ajustar seus filtros de busca"
              : "Nenhum restaurante cadastrado ainda"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRestaurants.map((restaurant) => (
            <Card
              key={restaurant.id}
              className="hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Restaurant Info */}
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-bold text-text">
                          {restaurant.name}
                        </h3>
                        {getStatusBadge(restaurant.status)}
                        {restaurant.subscription_plan &&
                          getPlanBadge(restaurant.subscription_plan)}
                      </div>
                      <p className="text-sm text-text-secondary">
                        {restaurant.restaurant_type}
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                    {restaurant.owner_name && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <StoreIcon className="w-4 h-4" />
                        <span className="text-text">
                          {restaurant.owner_name}
                        </span>
                      </div>
                    )}
                    {restaurant.phone && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <Phone className="w-4 h-4" />
                        <a
                          href={`tel:${restaurant.phone}`}
                          className="text-accent hover:underline"
                        >
                          {restaurant.phone}
                        </a>
                      </div>
                    )}
                    {restaurant.email && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <Mail className="w-4 h-4" />
                        <a
                          href={`mailto:${restaurant.email}`}
                          className="text-accent hover:underline truncate"
                        >
                          {restaurant.email}
                        </a>
                      </div>
                    )}
                    {restaurant.city && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <MapPin className="w-4 h-4" />
                        <span>{restaurant.city}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateTime(restaurant.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2 md:min-w-[150px]">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<Eye className="w-4 h-4" />}
                    onClick={() => handleViewDetails(restaurant)}
                  >
                    Detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    className="border-primary/40 text-primary hover:bg-primary/5 font-medium"
                    icon={<KeyRound className="w-4 h-4" />}
                    onClick={() => handleResetCredentials(restaurant)}
                  >
                    Resetar Senha
                  </Button>
                  <Button
                    variant={
                      restaurant.status === "blocked" ? "secondary" : "danger"
                    }
                    size="sm"
                    fullWidth
                    icon={
                      restaurant.status === "blocked" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )
                    }
                    onClick={() => handleToggleBlock(restaurant)}
                  >
                    {restaurant.status === "blocked" ? "Desbloquear" : "Bloquear"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <DetailsModal
        isOpen={showDetailsModal}
        restaurant={selectedRestaurant}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRestaurant(null);
        }}
        onResetCredentials={(rest) => {
          setShowDetailsModal(false);
          handleResetCredentials(rest);
        }}
      />

      {/* Block/Unblock Modal */}
      <BlockModal
        isOpen={showBlockModal}
        restaurant={selectedRestaurant}
        onClose={() => {
          setShowBlockModal(false);
          setSelectedRestaurant(null);
        }}
      />

      {/* Reset Credentials Modal */}
      <ResetCredentialsModal
        isOpen={showResetModal}
        restaurant={selectedRestaurant}
        onClose={() => {
          setShowResetModal(false);
          setSelectedRestaurant(null);
        }}
        onSuccess={(creds) => {
          setShowResetModal(false);
          setNewCredentials(creds);
          setShowNewCredsModal(true);
        }}
      />

      {/* New Credentials Display / WhatsApp Share Modal */}
      <NewCredentialsModal
        isOpen={showNewCredsModal}
        credentials={newCredentials}
        restaurant={selectedRestaurant}
        onClose={() => {
          setShowNewCredsModal(false);
          setNewCredentials(null);
          setSelectedRestaurant(null);
        }}
      />
    </div>
  );
};

// Details Modal Component
interface DetailsModalProps {
  isOpen: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
  onResetCredentials: (restaurant: Restaurant) => void;
}

const DetailsModal: React.FC<DetailsModalProps> = ({
  isOpen,
  restaurant,
  onClose,
  onResetCredentials,
}) => {
  if (!restaurant) return null;

  const planConfig =
    APP_CONFIG.plans[
      restaurant.subscription_plan as keyof typeof APP_CONFIG.plans
    ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes do Restaurante"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-text mb-2">
              {restaurant.name}
            </h3>
            <div className="flex items-center space-x-2">
              <Badge variant="neutral">{restaurant.restaurant_type}</Badge>
              {restaurant.subscription_plan && planConfig && (
                <Badge variant="success">{planConfig.name}</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            {restaurant.status === "active" ? (
              <Badge variant="success">Ativo</Badge>
            ) : restaurant.status === "blocked" ? (
              <Badge variant="error">Bloqueado</Badge>
            ) : (
              <Badge variant="warning">{restaurant.status}</Badge>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoItem label="Proprietário / Gerente" value={restaurant.owner_name} />
          <InfoItem
            label="Telefone / WhatsApp"
            value={restaurant.phone}
            link={`tel:${restaurant.phone}`}
          />
          <InfoItem
            label="E-mail de Login"
            value={restaurant.email}
            link={`mailto:${restaurant.email}`}
          />
          <InfoItem label="Cidade" value={restaurant.city} />
          <InfoItem label="Endereço" value={restaurant.address} fullWidth />
          <InfoItem
            label="Data de Cadastro"
            value={formatDateTime(restaurant.created_at)}
          />
          <InfoItem
            label="Última Atualização"
            value={formatDateTime(restaurant.updated_at)}
          />
        </div>

        {/* Subscription Details */}
        {planConfig && (
          <div className="bg-bg-subtle rounded-lg p-4">
            <h4 className="font-semibold text-text mb-3">
              Detalhes do Plano
            </h4>
            <div className="space-y-2 text-sm">
              <p className="text-text-secondary">
                <strong className="text-text">Plano:</strong> {planConfig.name}{" "}
                (R$ {planConfig.price}/mês)
              </p>
              <p className="text-text-secondary">
                <strong className="text-text">Recursos:</strong>{" "}
                {planConfig.features.join(", ")}
              </p>
              {restaurant.trial_ends_at && (
                <p className="text-warning">
                  <strong>Término do Teste:</strong>{" "}
                  {formatDateTime(restaurant.trial_ends_at)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Internal Notes */}
        {restaurant.internal_notes && (
          <div className="bg-bg-subtle rounded-lg p-4">
            <h4 className="font-semibold text-text mb-2">Anotações Internas</h4>
            <p className="text-text-secondary text-sm">
              {restaurant.internal_notes}
            </p>
          </div>
        )}

        {/* Block Reason (if blocked) */}
        {restaurant.status === "blocked" && restaurant.block_reason && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-4">
            <h4 className="font-semibold text-danger mb-2">Motivo do Bloqueio</h4>
            <p className="text-text-secondary text-sm">
              {restaurant.block_reason}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/5 font-medium"
            icon={<KeyRound className="w-4 h-4" />}
            onClick={() => onResetCredentials(restaurant)}
          >
            Resetar Senha e Acesso
          </Button>
          <Button onClick={onClose} fullWidth>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Reset Credentials Modal Component
interface ResetCredentialsModalProps {
  isOpen: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
  onSuccess: (credentials: any) => void;
}

const ResetCredentialsModal: React.FC<ResetCredentialsModalProps> = ({
  isOpen,
  restaurant,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (restaurant) {
      setEmail(restaurant.email || "");
      setPassword(generateTempPassword());
      setError("");
    }
  }, [restaurant]);

  if (!restaurant) return null;

  const handleGenerateRandom = () => {
    setPassword(generateTempPassword());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("O e-mail de login é obrigatório.");
      return;
    }
    if (!password.trim()) {
      setError("A senha não pode ficar em branco.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await adminResetRestaurantCredentials(
      restaurant.id,
      email.trim(),
      password.trim(),
      restaurant.name,
      restaurant.slug
    );

    setLoading(false);

    if (res.success) {
      onSuccess({
        restaurantName: restaurant.name,
        email: res.email,
        password: res.password,
        loginUrl: res.loginUrl,
      });
    } else {
      setError(res.error || "Falha ao redefinir credenciais");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resetar Acesso: ${restaurant.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert type="error" message={error} />}

        <div className="bg-bg-subtle rounded-lg p-3 text-sm">
          <p className="text-text font-medium">{restaurant.name}</p>
          <p className="text-text-secondary text-xs">
            Responsável: {restaurant.owner_name} | {restaurant.phone}
          </p>
        </div>

        <Input
          label="E-mail de Login"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ex: contato@restaurante.com.br"
          required
          helperText="O restaurante usará este e-mail para entrar no painel"
        />

        <div>
          <label className="label mb-1">Nova Senha</label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a nova senha"
              required
              className="font-mono font-bold"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateRandom}
              className="whitespace-nowrap"
            >
              Gerar Nova
            </Button>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Você pode digitar uma senha própria ou gerar uma automática segura.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Salvar e Atualizar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// New Credentials Modal (with 1-click WhatsApp copy)
interface NewCredentialsModalProps {
  isOpen: boolean;
  credentials: any;
  restaurant: Restaurant | null;
  onClose: () => void;
}

const NewCredentialsModal: React.FC<NewCredentialsModalProps> = ({
  isOpen,
  credentials,
  restaurant,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!credentials) return null;

  const messageText = `*Novos Dados de Acesso - Cardápio Digital*\n\n• *Restaurante:* ${credentials.restaurantName}\n• *E-mail:* ${credentials.email}\n• *Nova Senha:* ${credentials.password}\n• *Link do Painel:* ${credentials.loginUrl}\n\nRecomendamos alterar sua senha no menu de Configurações após o primeiro acesso.`;

  const handleCopy = async () => {
    const success = await copyToClipboard(messageText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppSend = () => {
    const phone = restaurant?.phone ? restaurant.phone.replace(/\D/g, "") : "";
    const encoded = encodeURIComponent(messageText);
    if (phone) {
      const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
      window.open(`https://wa.me/${fullPhone}?text=${encoded}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
  };

  const handleEmailSend = () => {
    const subject = encodeURIComponent("Seus Novos Dados de Acesso - Cardápio Digital");
    const body = encodeURIComponent(messageText);
    window.open(`mailto:${credentials.email}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Acesso Redefinido com Sucesso!"
      size="md"
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h3 className="text-lg font-bold text-text">Senha Atualizada</h3>
          <p className="text-text-secondary text-sm">
            O restaurante <strong>{credentials.restaurantName}</strong> já pode efetuar login com as novas credenciais.
          </p>
        </div>

        <div className="bg-bg-subtle rounded-lg p-4 space-y-3 border border-border">
          <div>
            <label className="text-xs text-text-secondary">E-mail de Login</label>
            <p className="font-mono text-text font-medium">{credentials.email}</p>
          </div>
          <div>
            <label className="text-xs text-text-secondary">Nova Senha</label>
            <p className="font-mono text-primary font-bold text-lg">
              {credentials.password}
            </p>
          </div>
          <div>
            <label className="text-xs text-text-secondary">URL de Acesso</label>
            <p className="font-mono text-text text-sm break-all">
              {credentials.loginUrl}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={handleWhatsAppSend}
            >
              Enviar no WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              fullWidth
              icon={<Mail className="w-4 h-4" />}
              onClick={handleEmailSend}
            >
              Enviar por E-mail
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            fullWidth
            icon={
              copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )
            }
            onClick={handleCopy}
          >
            {copied ? "Copiado!" : "Copiar Texto Completo"}
          </Button>
        </div>

        <Button onClick={onClose} fullWidth>
          Concluir
        </Button>
      </div>
    </Modal>
  );
};

// Block Modal Component
interface BlockModalProps {
  isOpen: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
}

const BlockModal: React.FC<BlockModalProps> = ({
  isOpen,
  restaurant,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const isBlocked = restaurant?.status === "blocked";

  const handleToggle = async () => {
    if (!isBlocked && !reason.trim()) {
      setError("Por favor, forneça o motivo do bloqueio");
      return;
    }

    if (!restaurant) return;

    setLoading(true);
    const success = await toggleRestaurantStatus(
      restaurant.id,
      isBlocked,
      reason
    );
    setLoading(false);

    if (success) {
      onClose();
      setReason("");
    } else {
      setError(`Falha ao ${isBlocked ? "desbloquear" : "bloquear"} restaurante`);
    }
  };

  if (!restaurant) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBlocked ? "Desbloquear Restaurante" : "Bloquear Restaurante"}
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <p className="text-text-secondary">
          {isBlocked ? (
            <>
              Tem certeza de que deseja desbloquear o restaurante{" "}
              <strong className="text-text">{restaurant.name}</strong>? Ele voltará a ter acesso total ao painel.
            </>
          ) : (
            <>
              Tem certeza de que deseja bloquear o restaurante{" "}
              <strong className="text-text">{restaurant.name}</strong>? Ele perderá o acesso ao painel imediatamente.
            </>
          )}
        </p>

        {!isBlocked && (
          <Textarea
            label="Motivo do Bloqueio"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
            placeholder="Informe o motivo para registro interno..."
            required
            rows={3}
          />
        )}

        {isBlocked && restaurant.block_reason && (
          <div className="bg-bg-subtle rounded-lg p-3 text-sm">
            <p className="text-text-secondary">
              <strong className="text-text">Bloqueado anteriormente por:</strong>{" "}
              {restaurant.block_reason}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            variant={isBlocked ? "secondary" : "danger"}
            onClick={handleToggle}
            loading={loading}
            fullWidth
          >
            {isBlocked ? "Confirmar Desbloqueio" : "Confirmar Bloqueio"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Helper Component
interface InfoItemProps {
  label: string;
  value?: string | null;
  link?: string;
  fullWidth?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
  link,
  fullWidth,
}) => {
  if (!value) return null;

  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <label className="text-xs text-text-secondary">{label}</label>
      {link ? (
        <a href={link} className="block text-text hover:text-accent truncate">
          {value}
        </a>
      ) : (
        <p className="text-text">{value}</p>
      )}
    </div>
  );
};

export default AllRestaurants;
