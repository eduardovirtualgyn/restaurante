import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Store, ArrowLeft, CheckCircle } from "lucide-react";
import {
  Button,
  Input,
  Select,
  Textarea,
  Alert,
  Card,
} from "../../components/ui";
import { APP_CONFIG } from "../../config/config";
import { supabase } from "../../config/supabase";
import { isValidEmail, isValidPhone } from "../../utils/helpers";

interface FormData {
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  restaurant_type: string;
  heard_from: string;
  notes: string;
}

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>({
    restaurant_name: "",
    owner_name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    restaurant_type: "",
    heard_from: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.restaurant_name.trim()) {
      newErrors.restaurant_name = "O nome do restaurante é obrigatório";
    }

    if (!formData.owner_name.trim()) {
      newErrors.owner_name = "O nome do responsável é obrigatório";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "O telefone/WhatsApp é obrigatório";
    } else if (!isValidPhone(formData.phone)) {
      newErrors.phone =
        "Digite um WhatsApp/celular válido com DDD (ex: 11 98765-4321 ou 11987654321)";
    }

    if (!formData.email.trim()) {
      newErrors.email = "O e-mail é obrigatório";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Por favor, digite um e-mail válido";
    }

    if (!formData.city.trim()) {
      newErrors.city = "A cidade é obrigatória";
    }

    if (!formData.restaurant_type) {
      newErrors.restaurant_type = "Selecione o tipo de estabelecimento";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Insert registration request into Supabase (if connected)
      const { error: insertError } = await supabase
        .from("registration_requests")
        .insert([
          {
            restaurant_name: formData.restaurant_name.trim(),
            owner_name: formData.owner_name.trim(),
            phone: formData.phone.replace(/[\s\-()]/g, ""),
            email: formData.email.trim() || null,
            city: formData.city.trim(),
            address: formData.address.trim() || null,
            restaurant_type: formData.restaurant_type,
            heard_from: formData.heard_from || null,
            notes: formData.notes.trim() || null,
            status: "pending",
          },
        ])
        .select();

      if (insertError) {
        console.warn("Supabase offline, using local storage:", insertError);
      }

      // Salva no localStorage para o painel de administração atualizar imediatamente
      const newRequest = {
        id: `req-${Date.now()}`,
        restaurant_name: formData.restaurant_name.trim(),
        owner_name: formData.owner_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        city: formData.city.trim(),
        address: formData.address.trim() || null,
        restaurant_type: formData.restaurant_type,
        heard_from: formData.heard_from || null,
        notes: formData.notes.trim() || null,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      const existingRequests = JSON.parse(
        localStorage.getItem("custom_pending_requests") || "[]"
      );
      localStorage.setItem(
        "custom_pending_requests",
        JSON.stringify([newRequest, ...existingRequests])
      );

      // Dispara eventos em tempo real para sincronizar o painel do administrador em outras abas
      window.dispatchEvent(new Event("local-data-updated"));
      window.dispatchEvent(new Event("storage"));

      setSuccess(true);
    } catch (err: any) {
      console.warn("Supabase catch, using local storage fallback:", err);

      const newRequest = {
        id: `req-${Date.now()}`,
        restaurant_name: formData.restaurant_name.trim(),
        owner_name: formData.owner_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        city: formData.city.trim(),
        address: formData.address.trim() || null,
        restaurant_type: formData.restaurant_type,
        heard_from: formData.heard_from || null,
        notes: formData.notes.trim() || null,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      const existingRequests = JSON.parse(
        localStorage.getItem("custom_pending_requests") || "[]"
      );
      localStorage.setItem(
        "custom_pending_requests",
        JSON.stringify([newRequest, ...existingRequests])
      );

      window.dispatchEvent(new Event("local-data-updated"));
      window.dispatchEvent(new Event("storage"));

      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card className="max-w-lg w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-6">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-3">
            Pedido de Registro Enviado!
          </h1>
          <p className="text-text-secondary mb-6">
            Obrigado pelo seu interesse no {APP_CONFIG.appName}! Seu cadastro já foi recebido pela administração e você receberá o contato de ativação no{" "}
            <strong>{formData.phone}</strong>
            {formData.email && ` e no e-mail ${formData.email}`}.
          </p>
          <div className="space-y-3">
            <div className="bg-bg-subtle rounded-lg p-4 text-left">
              <h3 className="font-semibold text-text mb-2">
                O que acontece a seguir?
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start">
                  <span className="text-accent font-bold mr-2">1.</span>
                  <span>O administrador revisa seu pedido na aba de Pedidos Pendentes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent font-bold mr-2">2.</span>
                  <span>
                    A conta é aprovada e liberada para o plano selecionado
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent font-bold mr-2">3.</span>
                  <span>
                    Você recebe a senha de acesso ao seu painel via WhatsApp/E-mail
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent font-bold mr-2">4.</span>
                  <span>Você cadastra seus produtos e gera o QR Code na hora!</span>
                </li>
              </ul>
            </div>
            <Link to="/">
              <Button variant="outline" fullWidth>
                Voltar à Página Inicial
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-text-secondary hover:text-text mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para o Início
          </Link>
          <div className="flex items-center space-x-3 mb-4">
            <Store className="w-10 h-10 text-accent" />
            <div>
              <h1 className="text-3xl font-bold text-text">
                Cadastre seu Restaurante
              </h1>
              <p className="text-text-secondary">
                Comece a vender online sem taxas por pedido
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Restaurant Details */}
            <div>
              <h2 className="text-lg font-semibold text-text mb-4">
                Dados do Restaurante
              </h2>
              <div className="space-y-4">
                <Input
                  label="Nome do Restaurante"
                  name="restaurant_name"
                  value={formData.restaurant_name}
                  onChange={handleChange}
                  error={errors.restaurant_name}
                  placeholder="ex: Pizzaria Bella Massa ou Burger VIP"
                  required
                />

                <Select
                  label="Tipo de Estabelecimento"
                  name="restaurant_type"
                  value={formData.restaurant_type}
                  onChange={handleChange}
                  error={errors.restaurant_type}
                  options={APP_CONFIG.restaurantTypes.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  required
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Cidade / Estado"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    error={errors.city}
                    placeholder="ex: São Paulo - SP"
                    required
                  />

                  <Input
                    label="Endereço (Opcional)"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Rua, número e bairro"
                  />
                </div>
              </div>
            </div>

            {/* Owner Details */}
            <div>
              <h2 className="text-lg font-semibold text-text mb-4">
                Dados do Responsável
              </h2>
              <div className="space-y-4">
                <Input
                  label="Nome Completo do Proprietário / Gerente"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  error={errors.owner_name}
                  placeholder="Seu nome completo"
                  required
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="WhatsApp / Celular com DDD"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="(11) 98765-4321"
                    required
                  />

                  <Input
                    label="E-mail de Contato"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="contato@seurestaurante.com.br"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div>
              <h2 className="text-lg font-semibold text-text mb-4">
                Informações Complementares
              </h2>
              <div className="space-y-4">
                <Select
                  label="Como conheceu nossa plataforma?"
                  name="heard_from"
                  value={formData.heard_from}
                  onChange={handleChange}
                  options={APP_CONFIG.heardFromOptions.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                />

                <Textarea
                  label="Observações Adicionais (Opcional)"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Conte-nos se você já tem delivery, quantas mesas possui, ou qualquer detalhe..."
                  rows={3}
                />
              </div>
            </div>

            {/* Terms */}
            <div className="bg-bg-subtle rounded-lg p-4 text-sm text-text-secondary">
              Ao enviar esta solicitação, você inicia seu período de teste grátis de 14 dias sem taxas sobre seus pedidos.
            </div>

            {/* Submit Button */}
            <Button type="submit" loading={loading} fullWidth size="lg">
              Enviar Solicitação de Cadastro
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-text-secondary">
              Já tem uma conta cadastrada?{" "}
              <Link
                to="/login"
                className="text-accent font-medium hover:underline"
              >
                Faça login aqui
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
