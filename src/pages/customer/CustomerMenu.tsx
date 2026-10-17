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
  Copy,
  Check,
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
import {
  formatCurrency,
  isValidPhone,
  copyToClipboard,
} from "../../utils/helpers";
import { supabase } from "../../config/supabase";
import {
  getDefaultGoianoMenu,
  normalizeItemShift,
} from "../../data/defaultMenu";
import { APP_CONFIG } from "../../config/config";

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
        name: "Cantinho da Rose - Comida Caseira & Marmitaria",
        slug: slug || "cantinho-da-rose",
        restaurant_type: "Marmitaria Executiva & Comida Afetiva",
        is_active: true,
        logo_url: "/images/cantinho_da_rose_logo.png",
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

  const getItemCategory = (item: any): string => {
    if (item.category && item.category.trim()) return item.category.trim();
    const name = (item.name || "").toLowerCase();
    if (
      name.includes("coca") ||
      name.includes("guaraná") ||
      name.includes("guarana") ||
      name.includes("água") ||
      name.includes("agua") ||
      name.includes("refrigerante") ||
      name.includes("lata") ||
      name.includes("suco") ||
      name.includes("bebida")
    ) {
      return "Bebidas Geladas";
    }
    if (name.includes("pudim") || name.includes("sobremesa") || name.includes("doce")) {
      return "Sobremesas da Casa";
    }
    if (name.includes("família") || name.includes("familia") || name.includes("corporativ")) {
      return "⭐ Combos Família";
    }
    return "Marmitas Executivas";
  };

  const itemsWithCategory = menuItems.map((item) => ({
    ...item,
    category: getItemCategory(item),
  }));

  const categoryOrder = [
    "all",
    "Marmitas Executivas",
    "⭐ Combos Família",
    "Bebidas Geladas",
    "Sobremesas da Casa",
  ];

  const presentCategories = new Set(itemsWithCategory.map((item) => item.category));
  const categories = categoryOrder.filter(
    (cat) => cat === "all" || presentCategories.has(cat)
  );

  const filteredItems = itemsWithCategory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchTerm.toLowerCase()));
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
              <div className="relative flex-shrink-0">
                <img
                  src={restaurant.logo_url || "/images/cantinho_da_rose_logo.png"}
                  alt={restaurant.name}
                  className="w-12 h-12 rounded-full object-cover shadow-sm border-2 border-amber-400 bg-amber-50"
                />
              </div>
              <div>
                <h1 className="font-bold text-base sm:text-lg text-gray-900 leading-tight">
                  {restaurant.name}
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  {restaurant.restaurant_type || "Marmitaria Executiva & Comida Afetiva"}
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

      {/* Hero Showcase Cantinho da Rose */}
      <div className="max-w-screen-lg mx-auto px-4 pt-3.5 pb-1">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#741b12] via-[#94271c] to-[#45100a] text-white shadow-lg p-4 sm:p-6 border border-amber-500/25">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-60 h-60 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative z-10">
            {/* Imagem Oficial com Moldura Dourada */}
            <div className="flex-shrink-0 relative group">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-300/80 bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-sm p-1 transition-transform duration-300 group-hover:scale-105">
                <img
                  src="/images/cantinho_da_rose_logo.png"
                  alt="Cantinho da Rose - Comida Caseira"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 font-black text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider whitespace-nowrap">
                Tempero Raiz
              </span>
            </div>

            {/* Conteúdo & Storytelling */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  ⭐ 4.9 • Almoço Favorito da Região
                </span>
                <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  🛵 +2.500 Marmitas Entregues
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-amber-100 tracking-tight leading-tight">
                Cantinho da Rose
              </h2>
              <p className="text-xs sm:text-sm text-amber-200/90 font-medium italic mt-0.5">
                "O autêntico sabor da comida caseira com tempero raiz de Goiânia."
              </p>
              <p className="text-xs sm:text-sm text-white/85 mt-2 leading-relaxed max-w-xl">
                Feijão carioca de caldo encorpado feito no alho dourado, carnes suculentas seladas na hora e aquele aconchego de comida de mãe quentinha na sua mesa ou trabalho!
              </p>

              {/* Selos de Confiança e Benefícios */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 pt-2.5 border-t border-white/15 text-xs text-amber-200/95 font-medium">
                <span className="flex items-center gap-1">
                  <span>🌡️</span>
                  <span>Marmita Térmica Quentinha</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>⚡</span>
                  <span>Pix Copia-e-Cola Rápido</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>🎁</span>
                  <span>10 Comandas = 1 Marmita Grátis</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Promocional: Almoço da Firma / Família */}
      <div className="max-w-screen-lg mx-auto px-4 py-1.5">
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/80 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <span className="text-2xl sm:text-3xl">💼</span>
            <div>
              <p className="font-extrabold text-xs sm:text-sm text-gray-900 leading-tight">
                Almoço da Firma ou da Família?
              </p>
              <p className="text-[11px] text-gray-600">
                Peça o <strong>Combo Família (3 a 4 pessoas)</strong> e ganhe <strong>1 Refrigerante 2L Gelado</strong> de presente!
              </p>
            </div>
          </div>
          <button
            onClick={() => setCategoryFilter("⭐ Combos Família")}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            <span>Ver Combos</span>
            <span>→</span>
          </button>
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
                              className="px-3.5 py-1.5 border-2 border-accent text-accent hover:bg-accent hover:text-white font-bold text-xs rounded-md hover:shadow-xs transition-all flex items-center gap-1 active:scale-95"
                              title={hasVariations ? "Escolher opções" : "Adicionar ao carrinho"}
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>{hasVariations ? "PEDIR" : "ADICIONAR"}</span>
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

        {/* Programa Fidelidade da Rose */}
        <div className="pt-6 pb-2">
          <div className="bg-white border-2 border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                  🎁
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-gray-900 flex items-center justify-center sm:justify-start gap-1.5">
                    <span>Programa Fidelidade da Rose</span>
                    <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-2 py-0.5 rounded-full uppercase">
                      Exclusivo
                    </span>
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Guarde os comprovantes impressos que acompanham a sua sacola! Juntando <strong>10 comandas</strong>, você ganha <strong>1 Marmita Executiva Grátis</strong> no próximo pedido!
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right flex-shrink-0">
                <span className="inline-block text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                  🌱 Marmitas 100% Lacradas & Higienizadas
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Modal */}
      <CartModal
        isOpen={showCart}
        cart={cart}
        upsellItems={menuItems.filter(
          (i) =>
            i.is_available &&
            (i.name.toLowerCase().includes("lata") ||
              i.name.toLowerCase().includes("pudim") ||
              i.name.toLowerCase().includes("água") ||
              i.name.toLowerCase().includes("agua"))
        )}
        onAddSimple={handleAddSimple}
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
        restaurantPhone={restaurant.phone}
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
  upsellItems?: MenuItem[];
  onAddSimple?: (item: MenuItem) => void;
  onClose: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onCheckout: () => void;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  upsellItems = [],
  onAddSimple,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Sua Sacola de Almoço" size="lg">
      <div className="space-y-5">
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
            <p className="text-text-secondary">Sua sacola está vazia</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3.5 bg-bg-subtle rounded-xl border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-text truncate">{item.name}</h4>
                    {item.selectedSize && (
                      <p className="text-xs text-text-secondary">
                        Tamanho: {item.selectedSize.name}
                      </p>
                    )}
                    {item.selectedAddons.length > 0 && (
                      <p className="text-xs text-text-secondary">
                        Adicionais:{" "}
                        {item.selectedAddons.map((a) => a.name).join(", ")}
                      </p>
                    )}
                    <p className="text-accent font-bold text-sm mt-1">
                      {formatCurrency(item.itemTotal)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-white border border-border rounded-lg p-1">
                    <button
                      onClick={() => onUpdateQuantity(index, -1)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-700"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(index, 1)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(index)}
                    className="p-1.5 text-gray-400 hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Upsell Cross-sell Section */}
            {upsellItems && upsellItems.length > 0 && (
              <div className="pt-3 border-t border-border/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <span>✨</span> Que tal completar seu almoço?
                  </span>
                  <span className="text-[10px] text-amber-800 bg-amber-100 font-bold px-2 py-0.5 rounded-full">
                    Acompanhamentos
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {upsellItems.slice(0, 4).map((item) => {
                    const quantity =
                      cart.find((c) => c.id === item.id)?.quantity || 0;
                    return (
                      <div
                        key={item.id}
                        className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-col justify-between"
                      >
                        <div>
                          <p className="font-bold text-xs text-gray-900 line-clamp-1">
                            {item.name}
                          </p>
                          <p className="text-[11px] font-extrabold text-amber-900 mt-0.5">
                            {formatCurrency(item.base_price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAddSimple && onAddSimple(item)}
                          className="mt-2 w-full py-1.5 px-2 bg-accent text-white font-bold text-[11px] rounded-lg hover:bg-accent-hover transition-all flex items-center justify-center gap-1 shadow-2xs active:scale-95"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>
                            {quantity > 0 ? `+1 (${quantity} no carrinho)` : "Adicionar"}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-3.5 space-y-2">
              <div className="flex justify-between items-center text-sm text-text-secondary">
                <span>Subtotal dos Itens:</span>
                <span className="font-semibold text-text">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                <span>🛵 Taxa de Entrega:</span>
                <span className="font-bold">Calculada na próxima etapa</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-text pt-1">
                <span>Total dos Itens</span>
                <span className="text-accent text-xl">{formatCurrency(total)}</span>
              </div>
              <Button onClick={onCheckout} fullWidth size="lg" className="font-bold">
                Avançar para Entrega e Pagamento
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

// Delivery regions configuration
export const DELIVERY_REGIONS = [
  {
    id: "regiao-1",
    name: "Região 1 - Vila Mutirão / Arredores",
    fee: 0,
    label: "Grátis (R$ 0,00)",
    shortName: "Vila Mutirão e Arredores",
  },
  {
    id: "regiao-2",
    name: "Região 2 - Jardim Curitiba / Finsocial / Morada do Sol",
    fee: 5.0,
    label: "R$ 5,00",
    shortName: "Jd. Curitiba / Finsocial / Morada do Sol",
  },
  {
    id: "regiao-3",
    name: "Região 3 - Outros bairros da Região Noroeste",
    fee: 8.0,
    label: "R$ 8,00",
    shortName: "Outros Bairros Noroeste",
  },
  {
    id: "balcao",
    name: "Retirada no Balcão",
    fee: 0,
    label: "Grátis (Sem taxa)",
    shortName: "Retirada no Balcão",
  },
];

// Checkout Modal Component
interface CheckoutModalProps {
  isOpen: boolean;
  cart: CartItem[];
  restaurantId: string;
  restaurantSlug?: string;
  restaurantPhone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  restaurantId,
  restaurantSlug,
  restaurantPhone,
  onClose,
  onSuccess,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"table" | "takeaway">("table");
  const [tableNumber, setTableNumber] = useState("");
  const [deliveryRegion, setDeliveryRegion] = useState("regiao-1");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [needsCutlery, setNeedsCutlery] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.itemTotal * item.quantity,
    0
  );

  const selectedRegion =
    DELIVERY_REGIONS.find((r) => r.id === deliveryRegion) || DELIVERY_REGIONS[0];
  const isBalcao = orderType === "takeaway" && deliveryRegion === "balcao";
  const deliveryFee =
    orderType === "table" ? 0 : isBalcao ? 0 : selectedRegion.fee;
  const total = subtotal + deliveryFee;

  const pixKey = APP_CONFIG.pixKey || "00.000.000/0001-00";
  const pixName = APP_CONFIG.pixBeneficiary || "Cantinho da Rose";

  const handleCopyPix = () => {
    copyToClipboard(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!customerName.trim()) {
      setError("Por favor, digite seu nome completo.");
      return;
    }

    if (!isValidPhone(customerPhone)) {
      setError(
        "Por favor, digite um telefone/WhatsApp válido com DDD (ex: 11 98765-4321)."
      );
      return;
    }

    if (orderType === "table" && !tableNumber.trim()) {
      setError("Por favor, informe o número da mesa no salão.");
      return;
    }

    if (orderType === "takeaway" && !isBalcao && !deliveryAddress.trim()) {
      setError(
        "Por favor, informe seu endereço completo de entrega (Rua, Número, Bairro/Referência)."
      );
      return;
    }

    setLoading(true);

    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const finalRestaurantId = isUUID.test(restaurantId)
      ? restaurantId
      : "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    const orderNumber = `PED${Math.floor(100000 + Math.random() * 899999)}`;

    const cutleryTag = needsCutlery ? "[COM TALHER]" : "[SEM TALHER]";
    const regionTag =
      orderType === "table"
        ? `[MESA: ${tableNumber.trim()}]`
        : isBalcao
        ? "[RETIRADA NO BALCÃO]"
        : `[DELIVERY: ${selectedRegion.shortName} | Taxa: ${
            deliveryFee > 0 ? formatCurrency(deliveryFee) : "Grátis"
          }]`;

    const fullNotes = [
      notes.trim(),
      cutleryTag,
      regionTag,
      orderType === "takeaway" && !isBalcao
        ? `Endereço: ${deliveryAddress.trim()}`
        : null,
    ]
      .filter(Boolean)
      .join(" • ");

    // Objeto limpo para o banco de dados Supabase (sem id forçado para gerar UUID)
    const supabasePayload: any = {
      restaurant_id: finalRestaurantId,
      order_number: orderNumber,
      order_type:
        orderType === "table" ? "table" : isBalcao ? "counter" : "phone",
      table_number:
        orderType === "table"
          ? `Mesa ${tableNumber.trim()}`
          : isBalcao
          ? "Retirada no Balcão"
          : `Entrega: ${selectedRegion.shortName}`,
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
      tax: deliveryFee,
      total,
      status: "pending",
      customer_notes: fullNotes,
    };

    let createdId = `ord-${Date.now()}`;

    // 1. Tenta enviar para o Supabase em nuvem
    try {
      const { data: created, error: supaErr } = await createOrder(supabasePayload);
      if (supaErr) {
        console.error("Erro ao inserir pedido no Supabase:", supaErr);
      } else if (created && created.id) {
        createdId = created.id;
      }
    } catch (e) {
      console.warn("Supabase createOrder skipped:", e);
    }

    const newOrder = {
      ...supabasePayload,
      id: createdId,
      created_at: new Date().toISOString(),
    };

    // 2. Salva localmente em todas as chaves pertinentes para garantir sincronização no painel
    const keysToSave = [
      `orders_${restaurantId}`,
      `orders_${finalRestaurantId}`,
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

    setPlacedOrder(newOrder);
    setLoading(false);
    setSuccess(true);
  };

  const handleWhatsAppSend = () => {
    if (!placedOrder) return;
    const itemsList = cart
      .map(
        (i) =>
          `• ${i.quantity}x ${i.name}${
            i.selectedSize ? ` (${i.selectedSize.name})` : ""
          }${
            i.selectedAddons && i.selectedAddons.length > 0
              ? ` [${i.selectedAddons.map((a) => a.name).join(", ")}]`
              : ""
          } - ${formatCurrency(i.itemTotal * i.quantity)}`
      )
      .join("\n");

    const orderDestination =
      orderType === "table"
        ? `Mesa ${tableNumber}`
        : isBalcao
        ? "Retirada no Balcão"
        : `Entrega em ${selectedRegion.shortName}`;

    const cutleryLabel = needsCutlery ? "SIM [COM TALHER]" : "NÃO [SEM TALHER]";

    const message = `*Novo Pedido #${placedOrder.order_number}*

• *Cliente:* ${customerName}
• *Telefone:* ${customerPhone}
• *Tipo:* ${orderDestination}
${
  orderType === "takeaway" && !isBalcao && deliveryAddress
    ? `• *Endereço:* ${deliveryAddress}\n`
    : ""
}• *Talheres descartáveis:* ${cutleryLabel}

*Itens do Pedido:*
${itemsList}

• *Subtotal dos Itens:* ${formatCurrency(subtotal)}
• *Taxa de Entrega:* ${
      deliveryFee > 0 ? formatCurrency(deliveryFee) : "Grátis (R$ 0,00)"
    }
• *TOTAL GERAL:* ${formatCurrency(total)}${
      notes ? `\n\n• *Observações:* ${notes}` : ""
    }

--------------------------------------------------
*PAGAMENTO VIA PIX (CHAVE CNPJ):*
\`${pixKey}\`
*Favorecido:* ${pixName}
--------------------------------------------------
*Por favor, anexe o comprovante nesta conversa para agilizarmos a saída do motoboy!*

_Pedido gerado via Cardápio Digital._`;

    // Busca telefone do restaurante (prop prioritária ou localStorage)
    const custom = JSON.parse(
      localStorage.getItem("custom_restaurants") || "[]"
    );
    const rest = custom.find((r: any) => r.id === restaurantId);
    const rawPhone =
      restaurantPhone ||
      (rest?.phone ? rest.phone : "") ||
      "";
    const phone = rawPhone.replace(/\D/g, "");
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
    setDeliveryAddress("");
    setDeliveryRegion("regiao-1");
    setNeedsCutlery(false);
    setNotes("");
    setOrderType("table");
    setSuccess(false);
    setPlacedOrder(null);
  };

  if (success && placedOrder) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Pedido Realizado com Sucesso!" size="md">
        <div className="text-center py-4 space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 mx-auto">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-text mb-0.5">
              Pedido #{placedOrder.order_number}
            </h3>
            <p className="text-text-secondary text-xs">
              Seu pedido já foi enviado para a cozinha do Cantinho da Rose!
            </p>
          </div>

          {/* Pix Copia e Cola Card */}
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5 text-left space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <span>⚡</span> Pagamento via Pix (Chave CNPJ)
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                Oficial
              </span>
            </div>

            <div className="flex items-center justify-between bg-white border border-emerald-300 rounded-lg p-2.5 shadow-2xs">
              <code className="text-xs sm:text-sm font-mono font-bold text-gray-800 select-all break-all">
                {pixKey}
              </code>
              <button
                type="button"
                onClick={handleCopyPix}
                className="ml-2 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95 shadow-2xs"
              >
                {copiedPix ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Pix</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] text-emerald-800 flex justify-between pt-0.5">
              <span>Favorecido: <strong>{pixName}</strong></span>
              <span>Total: <strong>{formatCurrency(placedOrder.total)}</strong></span>
            </div>
            <p className="text-[11px] text-emerald-700 italic">
              Copie a chave, faça o Pix no seu banco e anexe o comprovante no WhatsApp abaixo.
            </p>
          </div>

          <div className="bg-bg-subtle rounded-lg p-3 text-left text-xs space-y-1.5 border border-border/60">
            <div className="flex justify-between">
              <span className="text-text-secondary">Destino:</span>
              <span className="text-text font-medium">{placedOrder.table_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Talheres Descartáveis:</span>
              <span className="text-text font-medium">
                {needsCutlery ? "SIM [COM TALHER]" : "NÃO [SEM TALHER]"}
              </span>
            </div>
            <div className="flex justify-between font-bold text-sm text-text pt-1 border-t border-border/50">
              <span>Total a Pagar:</span>
              <span className="text-accent">{formatCurrency(placedOrder.total)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              size="lg"
              onClick={handleWhatsAppSend}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <span>📱</span> Enviar Pedido e Comprovante no WhatsApp
            </Button>

            <Button
              onClick={() => {
                onSuccess();
                resetForm();
                onClose();
              }}
              variant="outline"
              fullWidth
              size="md"
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
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert type="error" message={error} />}

        {/* Order Type */}
        <div>
          <label className="label mb-2 block font-semibold text-sm text-text">
            Como deseja receber o seu almoço?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrderType("table")}
              className={`p-3.5 rounded-xl border-2 font-semibold text-sm transition-all flex flex-col items-center justify-center gap-1 ${
                orderType === "table"
                  ? "border-accent bg-accent/10 text-accent shadow-xs"
                  : "border-border hover:border-accent/40 text-text-secondary"
              }`}
            >
              <span className="text-lg">🍽️</span>
              <span>Mesa (Salão)</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderType("takeaway")}
              className={`p-3.5 rounded-xl border-2 font-semibold text-sm transition-all flex flex-col items-center justify-center gap-1 ${
                orderType === "takeaway"
                  ? "border-accent bg-accent/10 text-accent shadow-xs"
                  : "border-border hover:border-accent/40 text-text-secondary"
              }`}
            >
              <span className="text-lg">🛵</span>
              <span>Delivery / Retirada</span>
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
            helperText="Informe o número da sua mesa no salão para entrega direta"
          />
        )}

        {/* Delivery Region Selection (only for takeaway/delivery) */}
        {orderType === "takeaway" && (
          <div className="space-y-3">
            <div>
              <label className="label mb-2 block font-semibold text-sm text-text">
                Selecione a Região de Entrega / Retirada:
              </label>
              <div className="space-y-2">
                {DELIVERY_REGIONS.map((region) => (
                  <label
                    key={region.id}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      deliveryRegion === region.id
                        ? "border-accent bg-accent/5 text-text shadow-2xs"
                        : "border-border hover:border-gray-300 text-text-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="deliveryRegion"
                        value={region.id}
                        checked={deliveryRegion === region.id}
                        onChange={() => setDeliveryRegion(region.id)}
                        className="text-accent focus:ring-accent"
                      />
                      <span className="text-xs sm:text-sm font-medium">
                        {region.name}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        region.fee === 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {region.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Delivery Address (only if not counter pickup) */}
            {!isBalcao && (
              <Input
                label="Endereço Completo de Entrega"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Rua, Número, Bairro e Ponto de Referência"
                required
                helperText="Informe seu endereço para o motoboy entregar quentinho"
              />
            )}
          </div>
        )}

        {/* Customer Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          />
        </div>

        {/* Cutlery Toggle */}
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-accent/40 transition-colors">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={needsCutlery}
              onChange={(e) => setNeedsCutlery(e.target.checked)}
              className="w-5 h-5 text-accent rounded border-gray-300 focus:ring-accent mt-0.5"
            />
            <div>
              <span className="font-semibold text-sm text-gray-800 block">
                Precisa de talher descartável e guardanapo?
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">
                🌱 Ajude o meio ambiente: marque apenas se realmente precisar consumir fora de casa ou do escritório.
              </span>
            </div>
          </label>
        </div>

        {/* Special Instructions */}
        <div>
          <label className="label mb-1.5 block font-semibold text-sm text-text">
            Observações do Pedido (Opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Sem cebola, carne bem passada, troco para 50..."
            rows={2}
            className="input-field"
          />
        </div>

        {/* Order Summary & Financial Breakdown */}
        <div className="bg-bg-subtle rounded-xl p-4 space-y-2 border border-border/60">
          <h4 className="font-bold text-text text-sm mb-2">Resumo Financeiro</h4>
          <div className="flex justify-between text-sm text-text-secondary">
            <span>Subtotal dos Itens ({cart.reduce((s, i) => s + i.quantity, 0)} un)</span>
            <span className="font-semibold text-text">{formatCurrency(subtotal)}</span>
          </div>

          {orderType === "takeaway" && (
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Taxa de Entrega ({selectedRegion.shortName})</span>
              <span
                className={`font-bold ${
                  deliveryFee === 0 ? "text-emerald-600" : "text-text"
                }`}
              >
                {deliveryFee === 0 ? "Grátis (R$ 0,00)" : formatCurrency(deliveryFee)}
              </span>
            </div>
          )}

          {orderType === "table" && (
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Taxa de Serviço / Mesa</span>
              <span className="font-bold text-emerald-600">Grátis (R$ 0,00)</span>
            </div>
          )}

          <div className="border-t border-border pt-2 mt-2 flex justify-between items-center text-lg font-bold text-text">
            <span>Total a Pagar</span>
            <span className="text-accent text-xl">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Voltar
          </Button>
          <Button type="submit" loading={loading} fullWidth size="lg" className="font-bold">
            Confirmar Pedido ({formatCurrency(total)})
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerMenu;
