import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Condomínio - Entrar" },
      { name: "description", content: "Faça login no Condomínio Fácil." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password.trim()) {
      setError("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error: err } = await signIn(email.trim(), password);
        if (err) {
          setError(err);
        } else {
          navigate({ to: "/" });
        }
      } else {
        const { error: err } = await signUp(email.trim(), password);
        if (err) {
          setError(err);
        } else {
          setSuccess(
            "Conta criada! Verifique seu email para confirmar o cadastro.",
          );
          setMode("login");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Building2 className="size-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Condomínio Fácil
          </h1>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login"
              ? "Entre para gerenciar seu condomínio"
              : "Crie sua conta para começar"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-base"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pr-12 text-base"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary" role="status">
              {success}
            </p>
          )}

          <Button
            type="submit"
            className="h-12 w-full text-base font-semibold"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 size-5 animate-spin" />
            ) : null}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        {/* Toggle mode */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setSuccess(null);
            }}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {mode === "login"
              ? "Não tem conta? Cadastre-se"
              : "Já tem conta? Faça login"}
          </button>
        </div>
      </div>
    </div>
  );
}
