import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, ArrowLeft, Mail, Lock, AlertCircle } from "lucide-react";
import { Button, Input, Alert, Card } from "../../components/ui";
import { APP_CONFIG } from "../../config/config";
import { supabase } from "../../config/supabase";
import { isValidEmail, hashPassword } from "../../utils/helpers";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter both email and password");
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const emailKey = formData.email.toLowerCase().trim();
      const passwordHash = await hashPassword(formData.password);

      // 1. Verifica contas locais primeiro (cadastradas ou resetadas pelo administrador)
      const localAccounts = JSON.parse(
        localStorage.getItem("restaurant_accounts") || "{}"
      );
      if (localAccounts[emailKey]) {
        const acc = localAccounts[emailKey];
        if (
          acc.password === formData.password ||
          acc.passwordHash === passwordHash
        ) {
          const custom = JSON.parse(
            localStorage.getItem("custom_restaurants") || "[]"
          );
          const foundRest = custom.find(
            (r: any) => r.id === acc.restaurant_id || r.email === emailKey
          );
          const pending = JSON.parse(
            localStorage.getItem("custom_pending_requests") || "[]"
          );
          const foundPending = pending.find(
            (r: any) => r.email === emailKey
          );

          const restaurantName =
            acc.restaurant_name ||
            foundRest?.name ||
            foundPending?.restaurant_name ||
            "Restaurante";

          const restaurantSlug =
            acc.slug ||
            foundRest?.slug ||
            restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

          localStorage.setItem(
            "user",
            JSON.stringify({
              id: acc.id || "user-" + Date.now(),
              email: emailKey,
              role: "owner",
              restaurant_id: acc.restaurant_id || foundRest?.id || "rest-" + Date.now(),
              restaurant: {
                name: restaurantName,
                slug: restaurantSlug,
                is_active: true,
              },
              temp_password: acc.temp_password || false,
            })
          );
          navigate("/restaurant");
          return;
        }
      }

      // 2. Se não encontrou nas contas locais ou se o Supabase estiver online, tenta via RPC
      const { data: loginData, error: loginError } = await supabase.rpc(
        "restaurant_login",
        {
          p_email: emailKey,
          p_password_hash: passwordHash,
        }
      );

      if (loginError) {
        console.warn("Supabase login RPC offline ou não configurado:", loginError);
        // Se a conta for da cantina do nonno ou do demo:
        if (
          emailKey.includes("cantina") ||
          emailKey.includes("acai") ||
          emailKey.includes("burger")
        ) {
          handleDemoLogin();
          return;
        }
        setError("E-mail ou senha incorretos. Caso tenha esquecido, solicite a redefinição ao administrador.");
        setLoading(false);
        return;
      }

      if (!loginData || loginData.length === 0) {
        // Check if registration is still pending
        const { data: registrationData } = await supabase
          .from("registration_requests")
          .select("status")
          .eq("email", formData.email.toLowerCase())
          .single();

        if (registrationData && registrationData.status === "pending") {
          setError("pending");
          setLoading(false);
          return;
        }

        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      const userData = loginData[0];

      // Check if restaurant is active
      if (!userData.restaurant_is_active) {
        setError(
          "Your restaurant account has been deactivated. Please contact support."
        );
        setLoading(false);
        return;
      }

      // Login successful - store user data in localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: userData.id,
          email: userData.email,
          role: userData.role,
          restaurant_id: userData.restaurant_id,
          restaurant: {
            name: userData.restaurant_name,
            slug: userData.restaurant_slug,
            is_active: userData.restaurant_is_active,
          },
          temp_password: userData.temp_password,
        })
      );

      // Redirect to restaurant dashboard
      navigate("/restaurant");
    } catch (err: any) {
      console.error("Login error:", err);
      // Show detailed error for debugging
      const errorMsg =
        err?.message ||
        err?.toString() ||
        "Network error. Please check your connection.";
      setError(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "demo-user-123",
        email: "contato@burgervip.com.br",
        role: "owner",
        restaurant_id: "demo-restaurant-123",
        restaurant: {
          name: "Burger Artesanal VIP",
          slug: "burger-vip",
          is_active: true,
        },
        temp_password: false,
      })
    );
    navigate("/restaurant");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link
          to="/"
          className="inline-flex items-center text-text-secondary hover:text-text mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Login Card */}
        <Card>
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/5 mb-4">
              <Store className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Welcome Back</h1>
            <p className="text-text-secondary">
              Login to your restaurant dashboard
            </p>
          </div>

          {/* Pending Registration Alert */}
          {error === "pending" && (
            <Alert
              type="warning"
              title="Account Pending Verification"
              message="Your registration is under review. Our team will contact you within 24 hours to complete the setup."
              className="mb-6"
            />
          )}

          {/* Error Alert */}
          {error && error !== "pending" && (
            <Alert type="error" message={error} className="mb-6" />
          )}

          {/* Demo Credentials */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-800 mb-2">
              🎯 Demo Account - Try it out!
            </p>
            <div className="text-sm text-blue-700 space-y-1">
              <p>
                <span className="font-medium">Email:</span>{" "}
                demorestaurant@gmail.com
              </p>
              <p>
                <span className="font-medium">Password:</span> ATVSW679
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              icon={<Mail className="w-5 h-5" />}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              icon={<Lock className="w-5 h-5" />}
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-text-secondary">
                <input type="checkbox" className="mr-2 rounded border-border" />
                Remember me
              </label>
              <a href="#" className="text-accent hover:underline">
                Forgot password?
              </a>
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg">
              Entrar
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-text-secondary">ou teste agora</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              fullWidth
              size="lg"
              onClick={handleDemoLogin}
              className="border-accent text-accent hover:bg-accent/5 font-semibold"
            >
              🚀 Acessar Painel Demonstração (Sem Cadastro)
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center text-sm text-text-secondary">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-accent font-medium hover:underline"
            >
              Register your restaurant
            </Link>
          </div>

          {/* Admin Login */}
          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link
              to="/admin/login"
              className="text-sm text-text-secondary hover:text-text flex items-center justify-center"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Admin Login
            </Link>
          </div>
        </Card>

        {/* Help Text */}
        <p className="mt-6 text-center text-sm text-text-secondary">
          Need help? Contact us at support@{APP_CONFIG.appName.toLowerCase()}
          .com
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
