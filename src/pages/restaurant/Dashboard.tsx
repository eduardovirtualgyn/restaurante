import React, { useEffect, useState } from "react";
import {
  useNavigate,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import {
  Store as StoreIcon,
  LogOut,
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  FileText,
  Settings,
} from "lucide-react";
import RestaurantHome from "./RestaurantHome";
import Orders from "./Orders";
import Menu from "./Menu";
import Reports from "./Reports";
import RestaurantSettings from "./RestaurantSettings";

const RestaurantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
    } else {
      const parsedUser = JSON.parse(userData);
      const email = (parsedUser.email || "").toLowerCase().trim();

      // Resolve restaurant name and slug from all local storage sources
      const custom = JSON.parse(
        localStorage.getItem("custom_restaurants") || "[]"
      );
      const foundCustom = custom.find(
        (r: any) =>
          r.id === parsedUser.restaurant_id ||
          (email && r.email && r.email.toLowerCase() === email)
      );

      const accounts = JSON.parse(
        localStorage.getItem("restaurant_accounts") || "{}"
      );
      const foundAccount = accounts[email];

      const pending = JSON.parse(
        localStorage.getItem("custom_pending_requests") || "[]"
      );
      const foundPending = pending.find(
        (r: any) => email && r.email && r.email.toLowerCase() === email
      );

      let resolvedName =
        foundCustom?.name ||
        foundAccount?.restaurant_name ||
        foundPending?.restaurant_name ||
        (parsedUser.restaurant?.name !== "Demo Restaurant" &&
        parsedUser.restaurant?.name !== "Meu Restaurante"
          ? parsedUser.restaurant?.name
          : null);

      if (!resolvedName) {
        if (parsedUser.restaurant_id === "demo-restaurant-123") {
          resolvedName = "Cantinho da Rose - Marmitaria Executiva";
        } else {
          resolvedName = "Cantinho da Rose - Marmitaria Executiva";
        }
      }

      let resolvedSlug =
        foundCustom?.slug ||
        foundAccount?.slug ||
        parsedUser.restaurant?.slug ||
        resolvedName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const resolvedRestaurant = {
        name: resolvedName,
        slug: resolvedSlug,
      };

      // Keep user object in sync in localStorage
      const updatedUser = {
        ...parsedUser,
        restaurant: {
          ...(parsedUser.restaurant || {}),
          ...resolvedRestaurant,
        },
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setRestaurant(resolvedRestaurant);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  const navItems = [
    { path: "/restaurant", icon: LayoutDashboard, label: "Painel" },
    { path: "/restaurant/orders", icon: ShoppingBag, label: "Pedidos" },
    { path: "/restaurant/menu", icon: UtensilsCrossed, label: "Cardápio" },
    { path: "/restaurant/reports", icon: FileText, label: "Relatórios" },
    { path: "/restaurant/settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="min-h-screen bg-bg-subtle">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-border sticky top-0 z-40">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <StoreIcon className="w-8 h-8 text-accent" />
              <div>
                <h1 className="text-lg font-bold text-text">
                  {restaurant?.name || "Restaurante"}
                </h1>
                <p className="text-xs text-text-secondary">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-text-secondary hover:text-error transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Desconectar</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="bg-white border-b border-border">
        <div className="container-custom">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-accent text-accent font-medium"
                      : "border-transparent text-text-secondary hover:text-text"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-custom py-8">
        <Routes>
          <Route index element={<RestaurantHome />} />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<Menu />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<RestaurantSettings />} />
        </Routes>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
