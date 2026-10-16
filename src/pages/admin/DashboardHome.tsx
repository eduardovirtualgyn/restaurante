import React, { useEffect, useState } from "react";
import {
  Store as StoreIcon,
  FileText,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Card, Loading } from "../../components/ui";
import { getPlatformStats } from "../../services/adminService";
import { formatCurrency } from "../../utils/helpers";
import { Link } from "react-router-dom";

const DashboardHome: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeRestaurants: 0,
    pendingRequests: 0,
    totalOrders: 0,
    todayRevenue: 0,
  });

  useEffect(() => {
    loadStats();

    const handleSync = () => {
      loadStats();
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("local-data-updated", handleSync);

    const interval = setInterval(() => {
      loadStats();
    }, 2000);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("local-data-updated", handleSync);
      clearInterval(interval);
    };
  }, []);

  const loadStats = async () => {
    const data = await getPlatformStats();
    setStats(data);
    setLoading(false);
  };

  if (loading) {
    return <Loading text="Carregando dados da plataforma..." />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">Visão Geral da Plataforma</h2>
        <p className="text-text-secondary">
          Monitore o desempenho e novos pedidos da sua rede de restaurantes
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">
                Restaurantes Ativos
              </p>
              <p className="text-3xl font-bold text-text">
                {stats.activeRestaurants}
              </p>
            </div>
            <div className="p-3 bg-success/10 rounded-lg">
              <StoreIcon className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">
                Pedidos Pendentes
              </p>
              <p className="text-3xl font-bold text-text">
                {stats.pendingRequests}
              </p>
              {stats.pendingRequests > 0 && (
                <Link
                  to="/admin/requests"
                  className="text-sm text-accent hover:underline mt-2 inline-block font-medium"
                >
                  Avaliar agora →
                </Link>
              )}
            </div>
            <div className="p-3 bg-warning/10 rounded-lg">
              <FileText className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">Total de Pedidos</p>
              <p className="text-3xl font-bold text-text">
                {stats.totalOrders}
              </p>
              <p className="text-sm text-success flex items-center mt-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                Histórico geral
              </p>
            </div>
            <div className="p-3 bg-accent-secondary/10 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-accent-secondary" />
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">
                Faturamento de Hoje
              </p>
              <p className="text-3xl font-bold text-text">
                {formatCurrency(stats.todayRevenue)}
              </p>
              <p className="text-sm text-text-secondary mt-1">Total da rede</p>
            </div>
            <div className="p-3 bg-success/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-text mb-4">Ações Rápidas</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/admin/requests"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-bg-subtle transition-all"
          >
            <FileText className="w-8 h-8 text-accent mb-2" />
            <h4 className="font-semibold text-text mb-1">Novos Cadastros</h4>
            <p className="text-sm text-text-secondary">
              {stats.pendingRequests} aguardando liberação
            </p>
          </Link>

          <Link
            to="/admin/restaurants"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-bg-subtle transition-all"
          >
            <StoreIcon className="w-8 h-8 text-accent mb-2" />
            <h4 className="font-semibold text-text mb-1">Gerenciar Restaurantes</h4>
            <p className="text-sm text-text-secondary">
              {stats.activeRestaurants} estabelecimentos ativos
            </p>
          </Link>

          <Link
            to="/admin/analytics"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-bg-subtle transition-all"
          >
            <TrendingUp className="w-8 h-8 text-accent mb-2" />
            <h4 className="font-semibold text-text mb-1">Ver Métricas</h4>
            <p className="text-sm text-text-secondary">
              Gráficos de vendas e faturamento
            </p>
          </Link>
        </div>
      </Card>

      {/* Alert if pending requests */}
      {stats.pendingRequests > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-warning mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-text mb-1">Ação Necessária</h4>
            <p className="text-text-secondary text-sm">
              Você tem {stats.pendingRequests} {stats.pendingRequests === 1 ? "novo cadastro de restaurante" : "novos cadastros de restaurantes"} aguardando aprovação.{" "}
              <Link
                to="/admin/requests"
                className="text-accent hover:underline font-medium"
              >
                Avaliar agora →
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
