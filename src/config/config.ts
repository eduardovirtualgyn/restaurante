// Supabase Configuration
// Replace these with your actual Supabase project credentials
// Get them from: https://app.supabase.com/project/_/settings/api

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_URL !== "YOUR_SUPABASE_URL"
    ? import.meta.env.VITE_SUPABASE_URL
    : "https://xyzcompany.supabase.co";

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY"
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder_key";

// Application Configuration
export const APP_CONFIG = {
  appName: "FoodOrder Brasil",
  defaultCurrency: "R$ ",
  taxRate: 0.0,
  orderPrefix: "PED",

  // Subscription plans
  plans: {
    free_trial: {
      name: "Teste Grátis",
      price: 0,
      duration: "14 dias",
      features: [
        "Até 50 pedidos/mês",
        "Gestão de cardápio",
        "Cardápio com QR Code",
        "Suporte por e-mail",
      ],
    },
    starter: {
      name: "Iniciante",
      price: 97,
      duration: "por mês",
      features: [
        "Pedidos ilimitados",
        "Gestão completa de cardápio",
        "Pedidos via QR Code",
        "Relatórios de vendas",
        "Suporte via WhatsApp",
      ],
    },
    pro: {
      name: "Profissional",
      price: 197,
      duration: "por mês",
      features: [
        "Tudo do plano Iniciante",
        "Múltiplas localizações",
        "Métricas e análises avançadas",
        "Personalização de marca",
        "Suporte prioritário VIP",
      ],
    },
  },

  // Restaurant types
  restaurantTypes: [
    "Hamburgueria",
    "Pizzaria",
    "Restaurante Tradicional",
    "Sushi & Comida Japonesa",
    "Doceria & Confeitaria",
    "Açaí & Sorveteria",
    "Cafeteria",
    "Dark Kitchen",
    "Outro",
  ],

  // Menu categories
  menuCategories: [
    "Hambúrgueres",
    "Pizzas",
    "Porções & Entradas",
    "Pratos Principais",
    "Bebidas",
    "Sobremesas",
    "Combos Promocionais",
    "Outros",
  ],

  // Order statuses
  orderStatuses: {
    pending: { label: "Pendente", color: "warning" },
    accepted: { label: "Aceito", color: "accent-secondary" },
    preparing: { label: "Na Cozinha", color: "accent-secondary" },
    ready: { label: "Pronto", color: "success" },
    completed: { label: "Finalizado", color: "success" },
    cancelled: { label: "Cancelado", color: "error" },
    rejected: { label: "Rejeitado", color: "error" },
  },

  // Payment methods
  paymentMethods: ["Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"],

  // Registration sources
  heardFromOptions: [
    "Pesquisa no Google",
    "Instagram / Redes Sociais",
    "Indicação de Parceiro",
    "Anúncio",
    "Outro",
  ],
};
