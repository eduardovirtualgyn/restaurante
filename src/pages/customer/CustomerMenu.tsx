import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  CheckCircle,
  Package,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Modal,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToMenuItems,
  createOrder,
} from "../../services/restaurantService";
import type { MenuItem } from "../../config/supabase";
import { formatCurrency, isValidPhone } from "../../utils/helpers";
import { supabase } from "../../config/supabase";
import { getDefaultGoianoMenu, normalizeItemShift } from "../../data/defaultMenu";

interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: { name: string; price: number };
  selectedAddons: { name: string; price: number }[];
  itemTotal: number;
}

const CustomerMenu: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  // Load restaurant and menu
  useEffect(() => {
    loadRestaurant();
  }, [slug]);

  useEffect(() => {
    if (restaurant?.id) {
      const subscription = subscribeToMenuItems(restaurant.id, (data) => {
        if (data && data.length > 0) {
          setMenuItems(data);
        } else {
          setMenuItems(getDefaultGoianoMenu(restaurant.id));
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [restaurant]);

  const loadRestaurant = async () => {
    if (!slug) return;

    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (!error && data) {
        setRestaurant(data);
        return;
      }
    } catch (e) {
      console.log("Supabase fetch failed, loading fallback", e);
    }

    // 1. Check custom restaurants created locally (like Cantinho da Rose)
    const custom = JSON.parse(
      localStorage.getItem("custom_restaurants") || "[]"
    );
    const foundCustom = custom.find(
      (r: any) =>
        r.slug === slug ||
        r.slug?.toLowerCase() === slug?.toLowerCase() ||
        (slug && r.name && r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug.toLowerCase()) ||
        (slug && slug.includes("cantinho") && r.name?.toLowerCase().includes("cantinho"))
    );

    if (foundCustom) {
      const updatedCustom = {
        ...foundCustom,
        restaurant_type: "Marmitaria Executiva • Turno do Almoço",
      };
      setRestaurant(updatedCustom);
      const savedMenu = localStorage.getItem(`menu_${foundCustom.id}`);

      if (savedMenu !== null) {
        try {
          const parsed = JSON.parse(savedMenu);
          const hasNight = parsed.some(
            (i: any) =>
              i.name &&
              (i.name.toLowerCase().includes("jantinha") ||
                i.name.toLowerCase().includes("pit-dog") ||
                i.name.toLowerCase().includes("espeto") ||
                i.name.toLowerCase().includes("combo casal"))
          );
          const hasChurrasco = parsed.some(
            (i: any) => i.name && i.name.toLowerCase().includes("churrasco")
          );
          const hasGuarana2L = parsed.some(
            (i: any) =>
              i.name && i.name.toLowerCase().includes("guaraná antarctica 2")
          );
          const hasLocalGuaranaPic = parsed.some(
            (i: any) => i.image_url === "/images/guarana_2l.jpg"
          );
          const hasLocalCocaPic = parsed.some(
            (i: any) => i.image_url === "/images/coca_cola_2l.jpg"
          );
          if (hasNight || !hasChurrasco || !hasGuarana2L || !hasLocalGuaranaPic || !hasLocalCocaPic) {
            const fullItems = getDefaultGoianoMenu(foundCustom.id);
            setMenuItems(fullItems);
            localStorage.setItem(`menu_${foundCustom.id}`, JSON.stringify(fullItems));
            localStorage.setItem(`menu_initialized_${foundCustom.id}`, "true");
          } else {
            const normalized = parsed.map((item: any) => ({
              ...item,
              shift: normalizeItemShift(item),
            }));
            setMenuItems(normalized);
            localStorage.setItem(`menu_${foundCustom.id}`, JSON.stringify(normalized));
          }
        } catch {
          setMenuItems([]);
        }
      } else {
        const fullItems = getDefaultGoianoMenu(foundCustom.id);
        setMenuItems(fullItems);
        localStorage.setItem(`menu_${foundCustom.id}`, JSON.stringify(fullItems));
        localStorage.setItem(`menu_initialized_${foundCustom.id}`, "true");
      }
      setLoading(false);
      return;
    }

    // 2. Cardápio de demonstração padrão para testes imediatos
    if (slug === "demo-restaurant" || slug === "burger-vip" || slug === "demo" || !foundCustom) {
      const demoId = "demo-restaurant-123";
      setRestaurant({
        id: demoId,
        name: "Cantinho da Rose - Marmitaria Executiva",
        slug: slug || "cantinho-da-rose",
        restaurant_type: "Marmitaria Executiva",
        is_active: true,
        logo_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=150&auto=format&fit=crop&q=80",
      });
      const savedDemo = localStorage.getItem(`menu_${demoId}`);
      if (savedDemo !== null) {
        try {
          const parsed = JSON.parse(savedDemo);
          const hasNight = parsed.some(
            (i: any) =>
              i.name &&
              (i.name.toLowerCase().includes("jantinha") ||
                i.name.toLowerCase().includes("pit-dog") ||
                i.name.toLowerCase().includes("espeto") ||
                i.name.toLowerCase().includes("combo casal"))
          );
          const hasChurrasco = parsed.some(
            (i: any) => i.name && i.name.toLowerCase().includes("churrasco")
          );
          const hasGuarana2L = parsed.some(
            (i: any) =>
              i.name && i.name.toLowerCase().includes("guaraná antarctica 2")
          );
          const hasLocalGuaranaPic = parsed.some(
            (i: any) => i.image_url === "/images/guarana_2l.jpg"
          );
          const hasLocalCocaPic = parsed.some(
            (i: any) => i.image_url === "/images/coca_cola_2l.jpg"
          );
          if (hasNight || !hasChurrasco || !hasGuarana2L || !hasLocalGuaranaPic || !hasLocalCocaPic) {
            const demoItems = getDefaultGoianoMenu(demoId);
            setMenuItems(demoItems);
            localStorage.setItem(`menu_${demoId}`, JSON.stringify(demoItems));
            localStorage.setItem(`menu_initialized_${demoId}`, "true");
          } else {
            const normalized = parsed.map((item: any) => ({
              ...item,
              shift: normalizeItemShift(item),
            }));
            setMenuItems(normalized);
            localStorage.setItem(`menu_${demoId}`, JSON.stringify(normalized));
          }
        } catch {
          setMenuItems(getDefaultGoianoMenu(demoId));
        }
      } else {
        const demoItems = getDefaultGoianoMenu(demoId);
        setMenuItems(demoItems);
        localStorage.setItem(`menu_${demoId}`, JSON.stringify(demoItems));
        localStorage.setItem(`menu_initialized_${demoId}`, "true");
      }
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  const getShiftStatus = () => {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;

    // Turno Único: Almoço Executivo das 10h30 às 15h00
    if (hours >= 10.5 && hours <= 15.0) {
      return {
        key: "lunch" as const,
        shortLabel: "Aberto Agora",
        title: "☀️ Marmitaria Executiva Aberta",
        subtext: "Almoço Executivo & Marmita Família (10h30 às 15h00)",
        isOpen: true,
        icon: "🍲",
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-300",
        dotColor: "bg-emerald-500",
      };
    }

    // Fora do horário de almoço
    return {
      key: "lunch" as const,
      shortLabel: "Cozinha em Preparação",
      title: "🟡 Cozinha em Preparação",
      subtext: "Horário exclusivo do Almoço Executivo: 10h30 às 15h00",
      isOpen: false,
      icon: "🍲",
      badgeBg: "bg-amber-50 text-amber-900 border-amber-300",
      dotColor: "bg-amber-500",
    };
  };

  const shiftStatus = getShiftStatus();

  const categories = [
    "all",
    ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory && item.is_available;
  });

  const addToCart = (
    item: MenuItem,
    selectedSize?: any,
    selectedAddons: any[] = []
  ) => {
    const basePrice = selectedSize ? selectedSize.price : item.base_price;
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0
    );
    const itemTotal = basePrice + addonsTotal;

    const cartItem: CartItem = {
      ...item,
      quantity: 1,
      selectedSize,
      selectedAddons,
      itemTotal,
    };

    const existingIndex = cart.findIndex(
      (ci) =>
        ci.id === item.id &&
        ci.selectedSize?.name === selectedSize?.name &&
        JSON.stringify(ci.selectedAddons) === JSON.stringify(selectedAddons)
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, cartItem]);
    }

    setShowItemModal(false);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleItemClick = (item: MenuItem) => {
    if (
      (item.sizes && item.sizes.length > 0) ||
      (item.addons && item.addons.length > 0)
    ) {
      setSelectedItem(item);
      setShowItemModal(true);
    } else {
      addToCart(item);
    }
  };

  if (loading) {
    return <Loading text="Loading menu..." />;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
        <Card className="text-center p-8">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-text mb-2">
            Restaurante Não Encontrado
          </h2>
          <p className="text-text-secondary">
            O restaurante procurado não foi encontrado ou está temporariamente inativo.
          </p>
        </Card>
      </div>
    );
  }

  const getItemQuantity = (itemId: string) => {
    return cart.reduce((sum, cartItem) => {
      if (cartItem.id === itemId) {
        return sum + cartItem.quantity;
      }
      return sum;
    }, 0);
  };

  const handleAddSimple = (item: MenuItem) => {
    addToCart(item);
  };

  const handleRemoveItem = (itemId: string) => {
    const index = cart.findIndex((ci) => ci.id === itemId);
    if (index >= 0) {
      updateQuantity(index, -1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-screen-lg mx-auto px-4 py-3">
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-3">
              {restaurant.logo_url && (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-12 h-12 rounded-xl object-cover shadow-sm border border-gray-100"
                />
              )}
              <div>
                <h1 className="font-bold text-lg text-gray-800 leading-tight">
                  {restaurant.name}
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  {restaurant.restaurant_type || "Restaurante & Delivery"}
                </p>
              </div>
            </div>

            {/* Live Clock & Shift Badge */}
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${shiftStatus.badgeBg}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${shiftStatus.dotColor} animate-pulse`}
                />
                {shiftStatus.shortLabel}
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Agora: <strong className="text-gray-700">{currentTimeStr}</strong>
              </p>
            </div>
          </div>

          {/* Active Shift Info Banner */}
          <div className="mb-2.5 p-2.5 rounded-xl bg-gray-50/90 border border-gray-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-xl">{shiftStatus.icon}</span>
              <div>
                <span className="font-bold text-gray-800 block">
                  {shiftStatus.title}
                </span>
                <span className="text-gray-500 text-[11px]">
                  {shiftStatus.subtext}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 hidden sm:inline-block">
              Marmitaria Executiva
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar marmitas executivas, marmita família, bebidas ou sobremesas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b sticky top-[138px] z-30 shadow-2xs">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category || "all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === category
                    ? "bg-accent text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {category === "all" ? "Todas as Opções" : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-screen-lg mx-auto px-4 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 p-8 shadow-2xs">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800 text-base mb-1">
              Nenhum item encontrado neste turno
            </h3>
            <p className="text-gray-500 text-xs mb-4">
              {searchTerm || categoryFilter !== "all"
                ? "Tente ajustar seus termos de busca ou mudar a categoria."
                : "Clique em 'Ver Tudo' ou selecione outro turno acima para conferir os itens."}
            </p>
            <button
              onClick={() => {
                setCategoryFilter("all");
                setSearchTerm("");
              }}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:shadow-md transition-shadow"
            >
              Exibir Cardápio Completo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const quantity = getItemQuantity(item.id);
              const hasVariations =
                (item.sizes && item.sizes.length > 0) ||
                (item.addons && item.addons.length > 0);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl overflow-hidden shadow-xs border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="relative h-36">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}

                    {/* Destaque / Highlight Badge */}
                    {item.category?.includes("Família") ? (
                      <div className="absolute top-2 left-2">
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                          ⭐ Família (3 a 4 pessoas)
                        </span>
                      </div>
                    ) : item.name.includes("Campeão") ? (
                      <div className="absolute top-2 left-2">
                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                          🔥 Mais Pedido
                        </span>
                      </div>
                    ) : item.name.includes("Econômico") ? (
                      <div className="absolute top-2 left-2">
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                          💰 Melhor Custo-Benefício
                        </span>
                      </div>
                    ) : null}

                    {!item.is_available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">
                          Esgotado
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2 h-10 leading-tight">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-end justify-between mt-2 pt-2 border-t border-gray-50">
                      <div>
                        <p className="font-bold text-gray-800">
                          {item.sizes && item.sizes.length > 0
                            ? formatCurrency(
                                Math.min(...item.sizes.map((s) => s.price))
                              )
                            : formatCurrency(item.base_price)}
                        </p>
                      </div>

                      {item.is_available && (
                        <div className="flex-shrink-0">
                          {quantity === 0 ? (
                            <button
                              onClick={() =>
                                hasVariations
                                  ? handleItemClick(item)
                                  : handleAddSimple(item)
                              }
                              className="px-5 py-1.5 border-2 border-accent text-accent font-bold text-xs rounded-md hover:shadow-md transition-shadow"
                            >
                              PEDIR
                            </button>
                          ) : (
                            <div className="flex items-center bg-accent text-white rounded-md">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="px-2 py-1 hover:bg-accent-hover rounded-l-md"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 font-bold text-sm">
                                {quantity}
                              </span>
                              <button
                                onClick={() =>
                                  hasVariations
                                    ? handleItemClick(item)
                                    : handleAddSimple(item)
                                }
                                className="px-2 py-1 hover:bg-accent-hover rounded-r-md"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Modal */}
      <CartModal
        isOpen={showCart}
        cart={cart}
        onClose={() => setShowCart(false)}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={() => {
          setShowCart(false);
          setShowCheckout(true);
        }}
      />

      {/* Item Customization Modal */}
      <ItemCustomizationModal
        isOpen={showItemModal}
        item={selectedItem}
        onClose={() => setShowItemModal(false)}
        onAdd={addToCart}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        cart={cart}
        restaurantId={restaurant.id}
        restaurantSlug={restaurant.slug || slug || "cantinho-da-rose"}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => {
          setCart([]);
          setShowCheckout(false);
        }}
      />

      {/* Bottom Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-accent text-white shadow-[0_-2px_20px_rgba(0,0,0,0.15)] z-40">
          <button
            onClick={() => setShowCart(true)}
            className="max-w-screen-lg mx-auto w-full px-4 py-3.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white text-accent font-bold text-sm w-6 h-6 rounded flex items-center justify-center">
                {cartCount}
              </div>
              <span className="font-bold text-base">
                {formatCurrency(
                  cart.reduce(
                    (sum, item) => sum + item.itemTotal * item.quantity,
                    0
                  )
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <span>Ver Pedido</span>
              <span className="text-lg">›</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

// Cart Modal Component
interface CartModalProps {
  isOpen: boolean;
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onCheckout: () => void;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}) => {
  const total = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Seu Pedido" size="lg">
      <div className="space-y-6">
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
            <p className="text-text-secondary">Sua sacola está vazia</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-bg-subtle rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-text">{item.name}</h4>
                    {item.selectedSize && (
                      <p className="text-sm text-text-secondary">
                        Tamanho: {item.selectedSize.name}
                      </p>
                    )}
                    {item.selectedAddons.length > 0 && (
                      <p className="text-sm text-text-secondary">
                        Adicionais:{" "}
                        {item.selectedAddons.map((a) => a.name).join(", ")}
                      </p>
                    )}
                    <p className="text-accent font-semibold mt-1">
                      {formatCurrency(item.itemTotal)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(index, -1)}
                      className="p-1 rounded-full bg-border hover:bg-text-secondary/20"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(index, 1)}
                      className="p-1 rounded-full bg-border hover:bg-text-secondary/20"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(index)}
                    className="p-1 text-error hover:bg-error/10 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-xl font-bold text-text mb-4">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Button onClick={onCheckout} fullWidth size="lg">
                Avançar para Pagamento
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// Item Customization Modal Component
interface ItemCustomizationModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: MenuItem, selectedSize?: any, selectedAddons?: any[]) => void;
}

const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  isOpen,
  item,
  onClose,
  onAdd,
}) => {
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);

  useEffect(() => {
    if (item?.sizes && item.sizes.length > 0) {
      setSelectedSize(item.sizes[0]);
    }
  }, [item]);

  if (!item) return null;

  const toggleAddon = (addon: any) => {
    if (selectedAddons.find((a) => a.name === addon.name)) {
      setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const calculateTotal = () => {
    const basePrice = selectedSize ? selectedSize.price : item.base_price;
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0
    );
    return basePrice + addonsTotal;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item.name} size="md">
      <div className="space-y-6">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-48 object-cover rounded-lg"
          />
        )}

        {item.description && (
          <p className="text-text-secondary">{item.description}</p>
        )}

        {/* Sizes */}
        {item.sizes && item.sizes.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">Escolha o Tamanho</h4>
            <div className="space-y-2">
              {item.sizes.map((size) => (
                <button
                  key={size.name}
                  onClick={() => setSelectedSize(size)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    selectedSize?.name === size.name
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <span className="font-medium text-text">{size.name}</span>
                  <span className="text-accent font-semibold">
                    {formatCurrency(size.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Addons */}
        {item.addons && item.addons.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">Acompanhamentos / Adicionais (Opcional)</h4>
            <div className="space-y-2">
              {item.addons.map((addon) => (
                <button
                  key={addon.name}
                  onClick={() => toggleAddon(addon)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                    selectedAddons.find((a) => a.name === addon.name)
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <span className="font-medium text-text">{addon.name}</span>
                  <span className="text-accent font-semibold">
                    +{formatCurrency(addon.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex justify-between text-xl font-bold text-text mb-4">
            <span>Total</span>
            <span>{formatCurrency(calculateTotal())}</span>
          </div>
          <Button
            onClick={() => onAdd(item, selectedSize, selectedAddons)}
            fullWidth
            size="lg"
          >
            Adicionar ao Pedido
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Checkout Modal Component
interface CheckoutModalProps {
  isOpen: boolean;
  cart: CartItem[];
  restaurantId: string;
  restaurantSlug?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  restaurantId,
  restaurantSlug,
  onClose,
  onSuccess,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"table" | "takeaway">("table");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );
  const total = subtotal; // Sem taxas extras para modelo brasileiro

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!customerName.trim()) {
      setError("Por favor, digite seu nome completo.");
      return;
    }

    if (!isValidPhone(customerPhone)) {
      setError("Por favor, digite um telefone/WhatsApp válido com DDD (ex: 11 98765-4321).");
      return;
    }

    if (orderType === "table" && !tableNumber.trim()) {
      setError("Por favor, informe o número da mesa ou balcão.");
      return;
    }

    setLoading(true);

    const orderNumber = `PED${Math.floor(100000 + Math.random() * 899999)}`;
    const newOrder: any = {
      id: `ord-${Date.now()}`,
      restaurant_id: restaurantId,
      order_number: orderNumber,
      order_type: orderType === "table" ? "table" : "phone",
      table_number:
        orderType === "table"
          ? tableNumber
            ? `Mesa ${tableNumber}`
            : "Mesa"
          : "Delivery / Retirada",
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      items: cart.map((item) => ({
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        base_price: item.base_price,
        selected_size: item.selectedSize,
        selected_addons: item.selectedAddons,
        item_total: item.itemTotal,
      })),
      subtotal,
      tax: 0,
      total,
      status: "pending",
      customer_notes: notes.trim(),
      created_at: new Date().toISOString(),
    };

    // 1. Salva localmente em todas as chaves pertinentes para garantir sincronização no painel
    const keysToSave = [
      `orders_${restaurantId}`,
      `orders_${restaurantSlug || "cantinho-da-rose"}`,
      "orders_demo-restaurant-123",
      "orders_cantinho-da-rose",
    ];

    keysToSave.forEach((k) => {
      try {
        const prev = JSON.parse(localStorage.getItem(k) || "[]");
        const filtered = prev.filter(
          (p: any) =>
            p.order_number !== newOrder.order_number && p.id !== newOrder.id
        );
        localStorage.setItem(k, JSON.stringify([newOrder, ...filtered]));
      } catch (e) {
        console.warn(`Erro ao salvar na chave ${k}:`, e);
      }
    });

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("local-data-updated"));

    // 2. Tenta enviar para o Supabase se conectado
    try {
      await createOrder(newOrder);
    } catch (e) {
      console.warn("Supabase createOrder skipped:", e);
    }

    setPlacedOrder(newOrder);
    setLoading(false);
    setSuccess(true);
  };

  const handleWhatsAppSend = () => {
    if (!placedOrder) return;
    const itemsList = cart
      .map(
        (i) =>
          `• ${i.quantity}x ${i.name} - ${formatCurrency(
            i.itemTotal * i.quantity
          )}`
      )
      .join("\n");

    const message = `*Novo Pedido #${placedOrder.order_number}*\n\n• *Cliente:* ${customerName}\n• *Telefone:* ${customerPhone}\n• *Tipo:* ${
      orderType === "table" ? `Mesa ${tableNumber}` : "Delivery / Retirada"
    }\n\n*Itens do Pedido:*\n${itemsList}\n\n• *Total:* ${formatCurrency(
      total
    )}${notes ? `\n• *Observações:* ${notes}` : ""}\n\n_Pedido gerado via Cardápio Digital._`;

    // Busca telefone do restaurante no localStorage
    const custom = JSON.parse(
      localStorage.getItem("custom_restaurants") || "[]"
    );
    const rest = custom.find((r: any) => r.id === restaurantId);
    const phone = rest?.phone ? rest.phone.replace(/\D/g, "") : "";
    const fullPhone = phone.startsWith("55") ? phone : phone ? `55${phone}` : "";

    const url = fullPhone
      ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setTableNumber("");
    setNotes("");
    setOrderType("table");
    setSuccess(false);
    setPlacedOrder(null);
  };

  if (success && placedOrder) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Pedido Realizado com Sucesso!" size="md">
        <div className="text-center py-6 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-text mb-1">
              Pedido #{placedOrder.order_number}
            </h3>
            <p className="text-text-secondary text-sm">
              Seu pedido já foi recebido pelo painel do restaurante e está aguardando confirmação.
            </p>
          </div>

          <div className="bg-bg-subtle rounded-lg p-4 text-left text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-text-secondary">Total a Pagar:</span>
              <strong className="text-text font-bold text-base">
                {formatCurrency(placedOrder.total)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Tipo:</span>
              <span className="text-text font-medium">
                {placedOrder.table_number || "Balcão"}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              size="lg"
              onClick={handleWhatsAppSend}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold"
            >
              📱 Enviar no WhatsApp do Restaurante
            </Button>

            <Button
              onClick={() => {
                onSuccess();
                resetForm();
                onClose();
              }}
              variant="outline"
              fullWidth
            >
              Concluir
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finalizar Pedido" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        {/* Order Type */}
        <div>
          <label className="label mb-3">Como deseja receber?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrderType("table")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors ${
                orderType === "table"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent/50"
              }`}
            >
              Mesa / Salão
            </button>
            <button
              type="button"
              onClick={() => setOrderType("takeaway")}
              className={`p-4 rounded-lg border-2 font-semibold transition-colors ${
                orderType === "takeaway"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent/50"
              }`}
            >
              Delivery / Retirada
            </button>
          </div>
        </div>

        {/* Table Number (only for table orders) */}
        {orderType === "table" && (
          <Input
            label="Número da Mesa"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="Ex: 04"
            required
          />
        )}

        {/* Customer Details */}
        <Input
          label="Seu Nome Completo"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Ex: Carlos Eduardo"
          required
        />

        <Input
          label="WhatsApp com DDD"
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Ex: (11) 98765-4321"
          required
          helperText="Usaremos este número para atualizações e confirmação do pedido"
        />

        {/* Special Instructions */}
        <div>
          <label className="label mb-2">Observações do Pedido (Opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Sem cebola, ponto da carne bem passado, troco para 50..."
            rows={3}
            className="input-field"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-bg-subtle rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-text mb-3">Resumo da Sacola</h4>
          {cart.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {item.quantity}x {item.name}
                {item.selectedSize && ` (${item.selectedSize.name})`}
              </span>
              <span className="text-text font-medium">
                {formatCurrency(item.itemTotal * item.quantity)}
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-xl font-bold text-text pt-2 border-t border-border">
              <span>Total a Pagar</span>
              <span className="text-accent">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Voltar
          </Button>
          <Button type="submit" loading={loading} fullWidth size="lg">
            Confirmar Pedido
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerMenu;
