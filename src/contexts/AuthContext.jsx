import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase";

const AuthContext = createContext(null);

/**
 * Provedor de autenticação — envolve toda a aplicação e disponibiliza
 * o estado da sessão para qualquer componente via useAuth().
 *
 * session === undefined → ainda carregando (aguardando resposta do Supabase)
 * session === null      → nenhum usuário logado
 * session === { ... }   → usuário autenticado
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    // Verifica se já existe uma sessão ativa ao carregar a página
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    // Ouve mudanças de estado (login, logout, expiração de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * @param {string} email
   * @param {string} password
   * @returns {{ error: string|null }}
   */
  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
