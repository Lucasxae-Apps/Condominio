import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { checkIsAdmin } from "@/lib/supabase-sync";
import type { User, Session } from "@supabase/supabase-js";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
};

type AuthContextType = AuthState & {
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setState((s) => ({
        ...s,
        user,
        session,
        loading: false,
      }));
      // Check admin status
      if (user) {
        checkIsAdmin(user.id).then((admin) => {
          setState((s) => ({ ...s, isAdmin: admin }));
        });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setState((s) => ({
        ...s,
        user,
        session,
        loading: false,
        isAdmin: user ? s.isAdmin : false,
      }));
      // Re-check admin status on auth change
      if (user) {
        checkIsAdmin(user.id).then((admin) => {
          setState((s) => ({ ...s, isAdmin: admin }));
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null };
  };

  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function translateAuthError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "Email ou senha incorretos.";
  if (msg.includes("User already registered"))
    return "Este email já está cadastrado.";
  if (msg.includes("Password should be at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (msg.includes("Unable to validate email"))
    return "Email inválido.";
  if (msg.includes("Email rate limit exceeded"))
    return "Muitas tentativas. Aguarde alguns minutos.";
  return msg;
}
