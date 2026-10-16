import React, { useEffect, useState, useCallback } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Store as StoreIcon,
  CheckCircle,
  X,
  Clock,
  AlertCircle,
  Copy,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Alert,
  Badge,
  Loading,
} from "../../components/ui";
import {
  subscribeToPendingRequests,
  createRestaurantAccount,
  rejectRegistrationRequest,
} from "../../services/adminService";
import type { RegistrationRequest } from "../../config/supabase";
import { formatDateTime, copyToClipboard } from "../../utils/helpers";
import { APP_CONFIG } from "../../config/config";

const PendingRequests: React.FC = () => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<RegistrationRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);

  const loadRequests = useCallback((data?: RegistrationRequest[]) => {
    const approvedIds: string[] = JSON.parse(
      localStorage.getItem("approved_requests") || "[]"
    );
    const customPending: RegistrationRequest[] = JSON.parse(
      localStorage.getItem("custom_pending_requests") || "[]"
    );

    const defaultRequests: RegistrationRequest[] = [
      {
        id: "req-1",
        restaurant_name: "Cantina do Nonno",
        owner_name: "Carlos Santoro",
        phone: "(11) 98888-7777",
        email: "contato@cantinadononno.com.br",
        city: "São Paulo - SP",
        address: "Rua Treze de Maio, 450",
        restaurant_type: "Restaurante Tradicional",
        heard_from: "Instagram",
        notes: "Gostaria de testar o plano Profissional com QR codes nas mesas.",
        status: "pending",
        created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      {
        id: "req-2",
        restaurant_name: "Açaí Tropical Power",
        owner_name: "Fernanda Lima",
        phone: "(21) 97777-6666",
        email: "fernanda@acaitropical.com.br",
        city: "Niterói - RJ",
        address: "Av. Beira Mar, 80",
        restaurant_type: "Açaí & Sorveteria",
        heard_from: "Indicação de Parceiro",
        notes: "Preciso de cardápio rápido para delivery no WhatsApp.",
        status: "pending",
        created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
      },
    ];

    const baseList = data && data.length > 0 ? data : defaultRequests;
    const map = new Map<string, RegistrationRequest>();
    [...customPending, ...baseList].forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });

    const combined = Array.from(map.values());
    setRequests(combined.filter((r) => !approvedIds.includes(r.id)));
    setLoading(false);
  }, []);

  // Real-time subscription & multi-tab auto sync
  useEffect(() => {
    loadRequests();

    const subscription = subscribeToPendingRequests((data) => {
      loadRequests(data);
    });

    const handleSync = () => {
      loadRequests();
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("local-data-updated", handleSync);

    // Polling interval to automatically reflect new registrations from other tabs without manual reload
    const interval = setInterval(() => {
      loadRequests();
    }, 2000);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("local-data-updated", handleSync);
      clearInterval(interval);
    };
  }, [loadRequests]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadRequests();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleCreateAccount = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setShowCreateModal(true);
  };

  const handleReject = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  if (loading) {
    return <Loading text="Carregando pedidos pendentes..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text mb-1">
            Pedidos Pendentes
          </h2>
          <p className="text-text-secondary">
            Revise e aprove os cadastros de novos restaurantes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            }
            onClick={handleManualRefresh}
          >
            Atualizar
          </Button>
          <Badge variant="warning" className="text-base px-3 py-1.5 font-semibold">
            {requests.length}{" "}
            {requests.length === 1 ? "Pendente" : "Pendentes"}
          </Badge>
        </div>
      </div>

      {/* Real-time indicator */}
      {requests.length > 0 && (
        <div className="flex items-center space-x-2 text-sm text-success">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span>Sincronização em tempo real ativa</span>
        </div>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text mb-2">
            Tudo em dia!
          </h3>
          <p className="text-text-secondary">
            No momento, não há pedidos de registro pendentes.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {requests.map((request) => (
            <Card
              key={request.id}
              className="hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Request Details */}
                <div className="flex-1 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-text mb-1">
                        {request.restaurant_name}
                      </h3>
                      <Badge variant="neutral">{request.restaurant_type}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-secondary flex items-center justify-end">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDateTime(request.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <StoreIcon className="w-4 h-4" />
                      <span className="font-medium text-text">
                        {request.owner_name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <Phone className="w-4 h-4" />
                      <a
                        href={`tel:${request.phone}`}
                        className="text-accent hover:underline"
                      >
                        {request.phone}
                      </a>
                    </div>
                    {request.email && (
                      <div className="flex items-center space-x-2 text-text-secondary">
                        <Mail className="w-4 h-4" />
                        <a
                          href={`mailto:${request.email}`}
                          className="text-accent hover:underline truncate"
                        >
                          {request.email}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {request.city}
                        {request.address && `, ${request.address}`}
                      </span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(request.heard_from || request.notes) && (
                    <div className="bg-bg-subtle rounded-lg p-3 space-y-2 text-sm">
                      {request.heard_from && (
                        <p className="text-text-secondary">
                          <strong className="text-text">Heard from:</strong>{" "}
                          {request.heard_from}
                        </p>
                      )}
                      {request.notes && (
                        <p className="text-text-secondary">
                          <strong className="text-text">Notes:</strong>{" "}
                          {request.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2 md:min-w-[140px]">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    icon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => handleCreateAccount(request)}
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<X className="w-4 h-4" />}
                    onClick={() => handleReject(request)}
                  >
                    Rejeitar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Account Modal */}
      <CreateAccountModal
        isOpen={showCreateModal}
        request={selectedRequest}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedRequest(null);
        }}
        onSuccess={(creds) => {
          if (selectedRequest) {
            // 1. Remove da tela imediatamente
            setRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));

            // 2. Salva o ID aprovado no localStorage
            const approved = JSON.parse(
              localStorage.getItem("approved_requests") || "[]"
            );
            localStorage.setItem(
              "approved_requests",
              JSON.stringify([...approved, selectedRequest.id])
            );

            // 3. Adiciona o restaurante aprovado em custom_restaurants no localStorage
            const custom = JSON.parse(
              localStorage.getItem("custom_restaurants") || "[]"
            );
            const newRest = {
              id: selectedRequest.id,
              name: selectedRequest.restaurant_name,
              slug: selectedRequest.restaurant_name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-"),
              owner_name: selectedRequest.owner_name,
              phone: selectedRequest.phone,
              email: creds.email || selectedRequest.email,
              city: selectedRequest.city,
              restaurant_type: selectedRequest.restaurant_type,
              subscription_plan: creds.plan || "free_trial",
              status: "active",
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            localStorage.setItem(
              "custom_restaurants",
              JSON.stringify([newRest, ...custom])
            );

            // 4. Salva credenciais de acesso para permitir login imediato
            const accounts = JSON.parse(
              localStorage.getItem("restaurant_accounts") || "{}"
            );
            const emailKey = (creds.email || selectedRequest.email || "").toLowerCase().trim();
            if (emailKey) {
              accounts[emailKey] = {
                id: selectedRequest.id,
                restaurant_id: selectedRequest.id,
                restaurant_name: selectedRequest.restaurant_name,
                slug: newRest.slug,
                password: creds.password,
                email: emailKey,
                temp_password: true,
              };
              localStorage.setItem("restaurant_accounts", JSON.stringify(accounts));
            }

            window.dispatchEvent(new Event("local-data-updated"));
          }

          setShowCreateModal(false);
          setCredentials({
            ...creds,
            restaurantName: selectedRequest?.restaurant_name,
            phone: selectedRequest?.phone,
          });
          setShowCredentialsModal(true);
        }}
      />

      {/* Reject Modal */}
      <RejectModal
        isOpen={showRejectModal}
        request={selectedRequest}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedRequest(null);
        }}
        onSuccess={(rejectedId) => {
          setRequests((prev) => prev.filter((r) => r.id !== rejectedId));
          const approved = JSON.parse(
            localStorage.getItem("approved_requests") || "[]"
          );
          localStorage.setItem(
            "approved_requests",
            JSON.stringify([...approved, rejectedId])
          );

          const custom = JSON.parse(
            localStorage.getItem("custom_pending_requests") || "[]"
          );
          localStorage.setItem(
            "custom_pending_requests",
            JSON.stringify(custom.filter((r: any) => r.id !== rejectedId))
          );

          window.dispatchEvent(new Event("local-data-updated"));
        }}
      />

      {/* Credentials Display Modal */}
      <CredentialsModal
        isOpen={showCredentialsModal}
        credentials={credentials}
        onClose={() => {
          setShowCredentialsModal(false);
          setCredentials(null);
        }}
      />
    </div>
  );
};

// Create Account Modal Component
interface CreateAccountModalProps {
  isOpen: boolean;
  request: RegistrationRequest | null;
  onClose: () => void;
  onSuccess: (credentials: any) => void;
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  request,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    subscriptionPlan: "free_trial",
    internalNotes: "",
    sendViaSMS: true,
    sendViaWhatsApp: true,
    sendViaEmail: true,
  });

  useEffect(() => {
    if (request) {
      setFormData((prev) => ({
        ...prev,
        email: request.email || "",
      }));
    }
  }, [request]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email) {
      setError("O e-mail é obrigatório");
      return;
    }

    if (!request) return;

    setLoading(true);
    const result = await createRestaurantAccount(request.id, {
      email: formData.email,
      subscriptionPlan: formData.subscriptionPlan,
      internalNotes: formData.internalNotes,
    });

    setLoading(false);

    if (result.success && result.credentials) {
      onSuccess({
        ...result.credentials,
        plan: formData.subscriptionPlan,
      });
    } else {
      setError(result.error || "Falha ao criar conta");
    }
  };

  if (!request) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Aprovar e Criar Conta do Restaurante"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        {/* Restaurant Info */}
        <div className="bg-bg-subtle rounded-lg p-4">
          <h4 className="font-semibold text-text mb-2">Dados do Restaurante</h4>
          <div className="space-y-1 text-sm">
            <p className="text-text">
              <strong>Nome:</strong> {request.restaurant_name}
            </p>
            <p className="text-text-secondary">
              <strong>Responsável:</strong> {request.owner_name}
            </p>
            <p className="text-text-secondary">
              <strong>Telefone/WhatsApp:</strong> {request.phone}
            </p>
            <p className="text-text-secondary">
              <strong>Cidade:</strong> {request.city}
            </p>
          </div>
        </div>

        {/* Account Details */}
        <Input
          label="E-mail de Acesso"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="contato@restaurante.com.br"
          required
          helperText="Será utilizado para login no painel do restaurante"
        />

        <Select
          label="Plano de Assinatura"
          value={formData.subscriptionPlan}
          onChange={(e) =>
            setFormData({ ...formData, subscriptionPlan: e.target.value })
          }
          options={Object.keys(APP_CONFIG.plans).map((key) => ({
            value: key,
            label: APP_CONFIG.plans[key as keyof typeof APP_CONFIG.plans].name,
          }))}
        />

        <Textarea
          label="Observações Internas (Opcional)"
          value={formData.internalNotes}
          onChange={(e) =>
            setFormData({ ...formData, internalNotes: e.target.value })
          }
          placeholder="Adicione anotações sobre este restaurante..."
          rows={2}
        />

        {/* Send Credentials Via */}
        <div>
          <label className="label mb-3">Enviar Credenciais Por</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendViaWhatsApp}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sendViaWhatsApp: e.target.checked,
                  })
                }
                className="rounded border-border text-primary"
              />
              <span className="text-text">WhatsApp (Recomendado)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendViaEmail}
                onChange={(e) =>
                  setFormData({ ...formData, sendViaEmail: e.target.checked })
                }
                className="rounded border-border text-primary"
              />
              <span className="text-text">E-mail</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendViaSMS}
                onChange={(e) =>
                  setFormData({ ...formData, sendViaSMS: e.target.checked })
                }
                className="rounded border-border text-primary"
              />
              <span className="text-text">SMS</span>
            </label>
          </div>
        </div>

        {/* Info */}
        <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-lg p-3 text-sm">
          <AlertCircle className="w-4 h-4 text-accent-secondary inline mr-2" />
          <span className="text-text-secondary">
            Uma senha temporária segura será gerada automaticamente e liberada para o restaurante.
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Criar Conta & Liberar Acesso
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Reject Modal Component
interface RejectModalProps {
  isOpen: boolean;
  request: RegistrationRequest | null;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

const RejectModal: React.FC<RejectModalProps> = ({
  isOpen,
  request,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleReject = async () => {
    if (!reason.trim()) {
      setError("Por favor, informe o motivo da rejeição");
      return;
    }

    if (!request) return;

    setLoading(true);
    await rejectRegistrationRequest(request.id, reason);
    setLoading(false);

    onSuccess(request.id);
    onClose();
    setReason("");
  };

  if (!request) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rejeitar Solicitação de Cadastro"
      size="md"
    >
      <div className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <p className="text-text-secondary">
          Tem certeza de que deseja rejeitar o cadastro do restaurante{" "}
          <strong className="text-text">{request.restaurant_name}</strong>?
        </p>

        <Textarea
          label="Motivo da Rejeição"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError("");
          }}
          placeholder="Descreva o motivo para manter no histórico..."
          required
          rows={3}
        />

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleReject}
            loading={loading}
            fullWidth
          >
            Confirmar Rejeição
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Credentials Display Modal
interface CredentialsModalProps {
  isOpen: boolean;
  credentials: any;
  onClose: () => void;
}

const CredentialsModal: React.FC<CredentialsModalProps> = ({
  isOpen,
  credentials,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!credentials) return null;

  const restaurantName = credentials.restaurantName || "Restaurante";
  const messageText = `*Parabéns! Sua conta no Cardápio Digital foi aprovada!*\n\n• *Restaurante:* ${restaurantName}\n• *E-mail de Login:* ${credentials?.email}\n• *Senha Inicial:* ${credentials?.password}\n• *Link do Painel:* ${credentials?.loginUrl}\n\nRecomendamos alterar sua senha no menu de Configurações após o primeiro acesso.`;

  const handleCopy = async () => {
    const success = await copyToClipboard(messageText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppSend = () => {
    const phone = credentials.phone ? credentials.phone.replace(/\D/g, "") : "";
    const encoded = encodeURIComponent(messageText);
    if (phone) {
      const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
      window.open(`https://wa.me/${fullPhone}?text=${encoded}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
  };

  const handleEmailSend = () => {
    const subject = encodeURIComponent("Seu Acesso ao Cardápio Digital foi Liberado!");
    const body = encodeURIComponent(messageText);
    window.open(`mailto:${credentials.email}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conta Criada com Sucesso!"
      size="md"
    >
      <div className="space-y-6">
        {/* Success Message */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <p className="text-text-secondary">
            O restaurante foi ativado na plataforma e já pode acessar seu painel administrativo.
          </p>
        </div>

        {/* Credentials */}
        <div className="bg-bg-subtle rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-text mb-3">Credenciais de Acesso</h4>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-text-secondary">E-mail de Login</label>
              <p className="font-mono text-text font-medium">{credentials.email}</p>
            </div>
            <div>
              <label className="text-xs text-text-secondary">
                Senha Temporária
              </label>
              <p className="font-mono text-primary font-bold text-lg">
                {credentials.password}
              </p>
            </div>
            <div>
              <label className="text-xs text-text-secondary">Link do Painel</label>
              <p className="font-mono text-text text-sm break-all">
                {credentials.loginUrl}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
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
            icon={<Copy className="w-4 h-4" />}
            onClick={handleCopy}
          >
            {copied ? "Copiado com Sucesso!" : "Copiar Texto Completo"}
          </Button>
        </div>

        <Button onClick={onClose} fullWidth>
          Concluir
        </Button>
      </div>
    </Modal>
  );
};

export default PendingRequests;
