import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Package, Upload, Sparkles } from "lucide-react";
import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  Loading,
  Alert,
  Textarea,
} from "../../components/ui";
import {
  subscribeToMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "../../services/restaurantService";
import type { MenuItem } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { getDefaultGoianoMenu, normalizeItemShift } from "../../data/defaultMenu";

const Menu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) {
      setLoading(false);
      return;
    }

    const localMenuKey = `menu_${user.restaurant_id}`;
    const initKey = `menu_initialized_${user.restaurant_id}`;
    let currentItems: MenuItem[] = [];

    const saved = localStorage.getItem(localMenuKey);
    const wasInitialized = localStorage.getItem(initKey);

    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
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
          currentItems = getDefaultGoianoMenu(user.restaurant_id);
          localStorage.setItem(localMenuKey, JSON.stringify(currentItems));
          localStorage.setItem(initKey, "true");
        } else {
          currentItems = parsed.map((item: any) => ({
            ...item,
            shift: normalizeItemShift(item),
          }));
          localStorage.setItem(localMenuKey, JSON.stringify(currentItems));
        }
      } catch (e) {
        console.warn("Erro ao carregar cardápio local:", e);
        currentItems = [];
      }
    } else if (!wasInitialized) {
      // Seed inicial completo (Almoço & Jantinha Goiana) na primeira inicialização
      currentItems = getDefaultGoianoMenu(user.restaurant_id);
      localStorage.setItem(localMenuKey, JSON.stringify(currentItems));
      localStorage.setItem(initKey, "true");
    }

    setMenuItems(currentItems);
    setLoading(false);

    try {
      const subscription = subscribeToMenuItems(user.restaurant_id, (data) => {
        if (data !== undefined && data !== null) {
          const normalized = data.map((item: any) => ({
            ...item,
            shift: normalizeItemShift(item),
          }));
          setMenuItems(normalized);
          localStorage.setItem(localMenuKey, JSON.stringify(normalized));
          localStorage.setItem(initKey, "true");
        }
        setLoading(false);
      });

      return () => {
        subscription?.unsubscribe?.();
      };
    } catch (e) {
      console.warn("Supabase menu subscription skipped:", e);
      setLoading(false);
    }
  }, []);

  const categories = [
    "all",
    ...new Set(
      menuItems
        .map((item) => item.category)
        .filter(Boolean)
    ),
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleAvailability = async (item: MenuItem) => {
    setMenuItems((prev) => {
      const updated = prev.map((i) =>
        i.id === item.id ? { ...i, is_available: !i.is_available } : i
      );
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.restaurant_id) {
        localStorage.setItem(`menu_${user.restaurant_id}`, JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await toggleMenuItemAvailability(item.id, !item.is_available);
    } catch (e) {
      console.warn("Supabase toggle availability skipped:", e);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDelete = (item: MenuItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleLoadModelMenu = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;
    const fullItems = getDefaultGoianoMenu(user.restaurant_id);
    setMenuItems(fullItems);
    localStorage.setItem(`menu_${user.restaurant_id}`, JSON.stringify(fullItems));
    localStorage.setItem(`menu_initialized_${user.restaurant_id}`, "true");
    window.dispatchEvent(new Event("local-data-updated"));
  };

  if (loading) {
    return <Loading text="Carregando cardápio..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Gerenciamento de Cardápio</h2>
          <p className="text-text-secondary">
            Configure seus pratos, turnos, adicionais de upsell e disponibilidade
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            icon={<Sparkles className="w-4 h-4 text-accent" />}
            onClick={handleLoadModelMenu}
          >
            Carregar Cardápio Modelo (Almoço & Noite)
          </Button>
          <Button
            icon={<Plus className="w-5 h-5" />}
            onClick={() => setShowAddModal(true)}
          >
            Add Item
          </Button>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>
          Live updates • Availability changes update customers in real-time
        </span>
      </div>

      {/* Almoço Executivo Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50/90 border border-amber-200/90 p-3.5 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">☀️</span>
          <div>
            <h4 className="font-bold text-sm text-amber-950">
              Operação Focada: Turno da Manhã & Almoço Executivo
            </h4>
            <p className="text-xs text-amber-850">
              Horário de funcionamento: <strong>10h30 às 15h00</strong> • Gestão focada em marmitas executivas, combo família e bebidas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white text-amber-900 border border-amber-300 rounded-lg text-xs font-bold shadow-2xs">
            {menuItems.length} Pratos Cadastrados
          </span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category || "all")}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                categoryFilter === category
                  ? "bg-accent text-white"
                  : "bg-white border border-border text-text-secondary hover:bg-bg-subtle"
              }`}
            >
              {category === "all" ? "All Items" : category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            No Menu Items Found
          </h3>
          <p className="text-text-secondary mb-4">
            {searchTerm || categoryFilter !== "all"
              ? "Tente ajustar seus termos de busca ou mudar a categoria"
              : "Comece adicionando seu primeiro prato"}
          </p>
          <Button
            icon={<Plus className="w-5 h-5" />}
            onClick={() => setShowAddModal(true)}
          >
            Add First Item
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`hover:shadow-lg transition-shadow ${
                !item.is_available ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Image */}
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full lg:w-32 h-32 object-cover rounded-lg"
                  />
                )}

                {/* Details */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-bold text-text">
                          {item.name}
                        </h3>
                        <Badge
                          variant={item.is_available ? "success" : "neutral"}
                        >
                          {item.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.category && (
                          <Badge variant="neutral" className="text-xs">
                            {item.category}
                          </Badge>
                        )}
                        {(() => {
                          const itemShift = item.shift || normalizeItemShift(item);
                          if (itemShift === "lunch") {
                            return (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                ☀️ Turno Almoço (10h30 - 14h)
                              </span>
                            );
                          }
                          if (itemShift === "dinner") {
                            return (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                                🌙 Turno Noite (18h - 23h30)
                              </span>
                            );
                          }
                          return (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              ⭐ Ambos os Turnos (Dia Todo)
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-text-secondary text-sm">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div>
                      <span className="text-text-secondary">Base Price: </span>
                      <span className="text-accent font-semibold text-lg">
                        {formatCurrency(item.base_price)}
                      </span>
                    </div>

                    {item.sizes && item.sizes.length > 0 && (
                      <div>
                        <span className="text-text-secondary">Sizes: </span>
                        <span className="text-text">
                          {item.sizes.map((s) => s.name).join(", ")}
                        </span>
                      </div>
                    )}

                    {item.addons && item.addons.length > 0 && (
                      <div>
                        <span className="text-text-secondary">Add-ons: </span>
                        <span className="text-text">
                          {item.addons.length} available
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                  <Button
                    size="sm"
                    variant={item.is_available ? "outline" : "secondary"}
                    icon={
                      item.is_available ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )
                    }
                    onClick={() => handleToggleAvailability(item)}
                    fullWidth
                  >
                    {item.is_available ? "Mark Unavailable" : "Mark Available"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Edit className="w-4 h-4" />}
                    onClick={() => handleEdit(item)}
                    fullWidth
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={() => handleDelete(item)}
                    fullWidth
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modals */}
      <MenuItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={(items) => setMenuItems(items)}
        mode="add"
      />

      <MenuItemModal
        isOpen={showEditModal}
        item={selectedItem}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        onSaved={(items) => setMenuItems(items)}
        mode="edit"
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        item={selectedItem}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
        onDeleted={(items) => setMenuItems(items)}
      />
    </div>
  );
};

// Menu Item Modal (Add/Edit)
interface MenuItemModalProps {
  isOpen: boolean;
  item?: MenuItem | null;
  onClose: () => void;
  onSaved?: (items: MenuItem[]) => void;
  mode: "add" | "edit";
}

const MenuItemModal: React.FC<MenuItemModalProps> = ({
  isOpen,
  item,
  onClose,
  onSaved,
  mode,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    base_price: "",
    image_url: "",
    is_available: true,
    shift: "all" as "lunch" | "dinner" | "all",
    sizes: [] as { name: string; price: number }[],
    addons: [] as { name: string; price: number }[],
  });

  const [newSize, setNewSize] = useState({ name: "", price: "" });
  const [newAddon, setNewAddon] = useState({ name: "", price: "" });

  useEffect(() => {
    if (mode === "edit" && item) {
      setFormData({
        name: item.name,
        description: item.description || "",
        category: item.category || "",
        base_price: item.base_price.toString(),
        image_url: item.image_url || "",
        is_available: item.is_available,
        shift: item.shift || "lunch",
        sizes: item.sizes || [],
        addons: item.addons || [],
      });
    } else {
      setFormData({
        name: "",
        description: "",
        category: "",
        base_price: "",
        image_url: "",
        is_available: true,
        shift: "lunch",
        sizes: [],
        addons: [],
      });
    }
  }, [mode, item, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("A imagem deve ter no máximo 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          image_url: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.base_price) {
      setError("Nome e preço base são obrigatórios.");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) {
      setError("Restaurante não identificado no login.");
      return;
    }

    setLoading(true);

    const menuItemData = {
      restaurant_id: user.restaurant_id,
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category || undefined,
      base_price: parseFloat(formData.base_price),
      image_url: formData.image_url || undefined,
      is_available: formData.is_available,
      shift: formData.shift || "all",
      sizes: formData.sizes.length > 0 ? formData.sizes : undefined,
      addons: formData.addons.length > 0 ? formData.addons : undefined,
    };

    // 1. Atualização imediata com garantia no localStorage
    const localMenuKey = `menu_${user.restaurant_id}`;
    const initKey = `menu_initialized_${user.restaurant_id}`;
    let currentItems: MenuItem[] = [];
    try {
      currentItems = JSON.parse(localStorage.getItem(localMenuKey) || "[]");
    } catch {
      currentItems = [];
    }

    let updatedList: MenuItem[] = [];
    if (mode === "add") {
      const newItem: MenuItem = {
        id: `item-${user.restaurant_id}-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...menuItemData,
      } as MenuItem;
      updatedList = [newItem, ...currentItems];
    } else if (item) {
      updatedList = currentItems.map((i) =>
        i.id === item.id ? ({ ...i, ...menuItemData } as MenuItem) : i
      );
    }

    localStorage.setItem(localMenuKey, JSON.stringify(updatedList));
    localStorage.setItem(initKey, "true");
    window.dispatchEvent(new Event("local-data-updated"));
    if (onSaved) onSaved(updatedList);

    setLoading(false);
    onClose();

    // 2. Sincronização em background se houver backend remoto
    if (mode === "add") {
      createMenuItem(menuItemData).catch((err) => console.warn(err));
    } else if (item) {
      updateMenuItem(item.id, menuItemData).catch((err) => console.warn(err));
    }
  };

  const addSize = () => {
    if (newSize.name && newSize.price) {
      setFormData({
        ...formData,
        sizes: [
          ...formData.sizes,
          { name: newSize.name, price: parseFloat(newSize.price) },
        ],
      });
      setNewSize({ name: "", price: "" });
    }
  };

  const removeSize = (index: number) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.filter((_, i) => i !== index),
    });
  };

  const addAddon = () => {
    if (newAddon.name && newAddon.price) {
      setFormData({
        ...formData,
        addons: [
          ...formData.addons,
          { name: newAddon.name, price: parseFloat(newAddon.price) },
        ],
      });
      setNewAddon({ name: "", price: "" });
    }
  };

  const removeAddon = (index: number) => {
    setFormData({
      ...formData,
      addons: formData.addons.filter((_, i) => i !== index),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Cadastrar Novo Item no Cardápio" : "Editar Item do Cardápio"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Nome do Item / Prato"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Pizza Calabresa Especial, X-Burger Artesanal..."
          required
        />

        <Textarea
          label="Descrição dos Ingredientes / Detalhes (Opcional)"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Descreva o que acompanha, peso, ponto da carne ou ingredientes..."
          rows={2}
        />

        {/* Turno do Cardápio: Almoço Executivo */}
        <div className="border border-amber-200/90 rounded-xl p-3 bg-amber-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">☀️</span>
            <div>
              <span className="font-bold text-xs text-amber-950 block">Turno: Almoço Executivo</span>
              <span className="text-[11px] text-amber-800">Horário de funcionamento exclusivo das 10h30 às 15h00</span>
            </div>
          </div>
          <span className="text-[10px] bg-white text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded shadow-2xs">
            Turno Único
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Categoria do Cardápio"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            placeholder="Ex: Lanches, Pizzas, Bebidas, Sobremesas"
          />

          <Input
            label="Preço Base (R$)"
            type="number"
            step="0.01"
            value={formData.base_price}
            onChange={(e) =>
              setFormData({ ...formData, base_price: e.target.value })
            }
            placeholder="0.00"
            required
          />
        </div>

        {/* Upload de Imagem do Computador ou Link */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-text">
            Foto do Produto (Upload do seu Computador ou Celular)
          </label>

          {formData.image_url ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-border h-48 bg-gray-50 flex items-center justify-center group shadow-inner">
              <img
                src={formData.image_url}
                alt="Prévia do produto"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, image_url: "" })}
                className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-colors"
                title="Remover foto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-300 hover:border-accent hover:bg-accent/5 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center">
              <Upload className="w-9 h-9 text-accent mb-2" />
              <span className="text-sm font-semibold text-text">
                Clique para escolher uma imagem do seu computador ou celular
              </span>
              <span className="text-xs text-text-secondary mt-1">
                Formatos aceitos: JPG, PNG, WebP (não precisa buscar links na internet)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          <div className="pt-1">
            <Input
              label="Ou informe uma URL externa (Opcional)"
              value={formData.image_url.startsWith("data:") ? "" : formData.image_url}
              onChange={(e) =>
                setFormData({ ...formData, image_url: e.target.value })
              }
              placeholder="https://exemplo.com/foto.jpg"
            />
          </div>
        </div>

        {/* Variações de Tamanho */}
        <div className="border border-border/80 rounded-xl p-4 bg-gray-50/50">
          <label className="font-semibold text-text block mb-1">
            Tamanhos / Variações (Opcional)
          </label>
          <p className="text-xs text-text-secondary mb-3">
            Defina opções de tamanho para o cliente escolher (Ex: Pequena, Média, Grande, Broto).
          </p>

          <div className="space-y-2 mb-3">
            {formData.sizes.map((size, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 bg-white border border-border rounded-lg shadow-sm"
              >
                <span className="text-sm font-medium text-text">
                  {size.name} - <strong className="text-accent">{formatCurrency(size.price)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => removeSize(index)}
                  className="text-error hover:bg-error/10 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Nome do tamanho (ex: Grande)"
              value={newSize.name}
              onChange={(e) => setNewSize({ ...newSize, name: e.target.value })}
            />
            <Input
              placeholder="Preço (R$)"
              type="number"
              step="0.01"
              value={newSize.price}
              onChange={(e) =>
                setNewSize({ ...newSize, price: e.target.value })
              }
            />
            <Button type="button" onClick={addSize} variant="outline">
              Adicionar
            </Button>
          </div>
        </div>

        {/* Adicionais & Upsell */}
        <div className="border-2 border-accent/20 rounded-xl p-4 bg-accent/5">
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-text flex items-center gap-1.5 text-accent">
              <Sparkles className="w-4 h-4 text-accent" />
              Adicionais & Upsell (Opcional - Aumente seu ticket)
            </label>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            O cliente verá essas opções na hora de adicionar o produto à sacola. Perfeito para complementos (Ex: + Borda de Catupiry, + Bacon Extra, + Refrigerante).
          </p>

          <div className="space-y-2 mb-3">
            {formData.addons.map((addon, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 bg-white border border-accent/30 rounded-lg shadow-sm"
              >
                <span className="text-sm font-medium text-text">
                  {addon.name} - <strong className="text-accent">+{formatCurrency(addon.price)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => removeAddon(index)}
                  className="text-error hover:bg-error/10 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Nome do adicional (ex: Borda Recheada)"
              value={newAddon.name}
              onChange={(e) =>
                setNewAddon({ ...newAddon, name: e.target.value })
              }
            />
            <Input
              placeholder="Valor adicional (R$)"
              type="number"
              step="0.01"
              value={newAddon.price}
              onChange={(e) =>
                setNewAddon({ ...newAddon, price: e.target.value })
              }
            />
            <Button type="button" onClick={addAddon} variant="outline">
              Adicionar
            </Button>
          </div>
        </div>

        {/* Disponibilidade */}
        <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-3 rounded-lg border border-border">
          <input
            type="checkbox"
            checked={formData.is_available}
            onChange={(e) =>
              setFormData({ ...formData, is_available: e.target.checked })
            }
            className="w-4 h-4 text-accent rounded border-border"
          />
          <span className="text-sm font-medium text-text">Disponível para pedidos no cardápio</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            {mode === "add" ? "Salvar Item no Cardápio" : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Delete Modal
interface DeleteModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onDeleted?: (items: MenuItem[]) => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  item,
  onClose,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!item) return;

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.restaurant_id) {
      const localMenuKey = `menu_${user.restaurant_id}`;
      const initKey = `menu_initialized_${user.restaurant_id}`;
      let currentItems: MenuItem[] = [];
      try {
        currentItems = JSON.parse(localStorage.getItem(localMenuKey) || "[]");
      } catch {
        currentItems = [];
      }
      const updated = currentItems.filter((i) => i.id !== item.id);
      localStorage.setItem(localMenuKey, JSON.stringify(updated));
      localStorage.setItem(initKey, "true");
      window.dispatchEvent(new Event("local-data-updated"));
      if (onDeleted) onDeleted(updated);
    }

    setLoading(false);
    onClose();

    deleteMenuItem(item.id).catch((err) => console.warn(err));
  };

  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir Item do Cardápio" size="md">
      <div className="space-y-4">
        <Alert
          type="warning"
          message={`Tem certeza que deseja excluir o item "${item.name}"? Esta ação não pode ser desfeita.`}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={loading}
            fullWidth
          >
            Excluir Item
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Menu;
