import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Phone,
  Eye,
  EyeOff,
  Lock,
  User,
  Languages,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useAuthStore } from "../stores/authStore";
import authService from "../services/authService";
import logoChock from "./figma/logoChock.jpg";

interface LoginProps {
  onLogin: (username: string) => void;
}

type Language = "es" | "en";

const translations = {
  es: {
    username: "Usuario",
    usernamePlaceholder: "Ingresa tu usuario",
    password: "Contraseña",
    passwordPlaceholder: "Ingresa tu contraseña",
    loginButton: "Iniciar Sesión",
    loggingIn: "Iniciando sesión...",
    welcome: "¡Bienvenido!",
    errorFields: "Por favor completa todos los campos",
    errorCredentials: "Credenciales incorrectas",
  },
  en: {
    username: "Username",
    usernamePlaceholder: "Enter your username",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    loginButton: "Sign In",
    loggingIn: "Signing in...",
    welcome: "Welcome!",
    errorFields: "Please fill in all fields",
    errorCredentials: "Invalid credentials",
  },
};

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<Language>("es");

  const t = translations[language];

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "es" ? "en" : "es"));
  };

  const { setSession, setCredentials, setError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error(t.errorFields);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[Login] Attempting login for user:', username);

      // Call the auth service
      const session = await authService.login(username, password, false);

      console.log('[Login] Login successful, session:', session);

      // Store session in Zustand store
      setSession(session);

      // Store credentials for session refresh (optional)
      setCredentials(username, password);

      // Show success message with user info
      const fullName = session.user?.name || username;
      toast.success(`${t.welcome} ${fullName}!`);

      // Call parent callback
      onLogin(username);

    } catch (error: any) {
      console.error('[Login] Login failed:', error);

      let errorMessage = t.errorCredentials;

      if (error.message) {
        if (error.message.includes('Invalid credentials')) {
          errorMessage = language === 'es' ? 'Usuario o contraseña incorrectos' : 'Invalid username or password';
        } else if (error.message.includes('not found')) {
          errorMessage = language === 'es' ? 'Usuario no encontrado' : 'User not found';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = language === 'es' ? 'Error de conexión con el servidor' : 'Connection error';
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex relative overflow-hidden">
      {/* Background Image - Full Screen */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80"
          alt="Snowy mountain background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />
      </div>

      {/* Animated particles background */}
      <div className="absolute inset-0 z-[1]">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Language Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 ease-out group"
        >
          <Languages className="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-300 ease-out" />
          <span className="text-white uppercase tracking-wider">
            {language}
          </span>
        </button>
      </div>

      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12 relative z-10">
        <Card className="w-full max-w-md shadow-2xl border-white/20 bg-white/95 backdrop-blur-md">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-48 h-24 flex items-center justify-center overflow-hidden rounded-lg">
              <ImageWithFallback
                src={logoChock}
                alt="GesCall Logo"
                className="w-full h-full object-cover scale-125"
              />
            </div>
            <CardTitle className="text-slate-900">
              {language === "es"
                ? "Panel de Administración"
                : "Admin Panel"}
            </CardTitle>
            <CardDescription>
              {language === "es"
                ? "Ingresa tus credenciales para continuar"
                : "Enter your credentials to continue"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t.username}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="username"
                    placeholder={t.usernamePlaceholder}
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    className="pl-9"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t.password}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    className="pl-9 pr-9"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? t.loggingIn : t.loginButton}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Empty space with animated background */}
      <div className="hidden lg:block lg:w-1/2 relative z-10"></div>
    </div>
  );
}