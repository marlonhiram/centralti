import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { C } from "../components/UI";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const { error } = await signIn(email, senha);

    setCarregando(false);
    if (error) setErro("E-mail ou senha incorretos.");
  }

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: C.royalDark,
      fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{
        background: C.white,
        borderRadius: 12,
        padding: "40px 36px",
        width: 340,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}>

        {/* Logo / Título */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48,
            background: C.royalDark,
            borderRadius: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            marginBottom: 12,
          }}>🖥</div>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 18, color: C.slate800 }}>
            Central TI
          </div>
          <div style={{ fontSize: 12, color: C.slate400, marginTop: 2 }}>
            Acesse sua conta para continuar
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* E-mail */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.slate600, display: "block", marginBottom: 5 }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={{
                width: "100%", padding: "9px 12px",
                border: `1.5px solid ${erro ? C.red : C.slate200}`,
                borderRadius: 7, fontSize: 13, color: C.slate800,
                outline: "none", fontFamily: "'Nunito', sans-serif",
                boxSizing: "border-box", background: C.white,
              }}
            />
          </div>

          {/* Senha */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.slate600, display: "block", marginBottom: 5 }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%", padding: "9px 12px",
                border: `1.5px solid ${erro ? C.red : C.slate200}`,
                borderRadius: 7, fontSize: 13, color: C.slate800,
                outline: "none", fontFamily: "'Nunito', sans-serif",
                boxSizing: "border-box", background: C.white,
              }}
            />
          </div>

          {/* Erro */}
          {erro && (
            <div style={{
              background: C.redLight, color: C.red,
              borderRadius: 6, padding: "8px 12px",
              fontSize: 12, fontWeight: 600, marginBottom: 14,
            }}>
              {erro}
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={carregando}
            style={{
              width: "100%", padding: "10px",
              background: carregando ? C.royalLight : C.royalDark,
              color: C.white, border: "none", borderRadius: 7,
              fontSize: 13, fontWeight: 700, cursor: carregando ? "not-allowed" : "pointer",
              fontFamily: "'Nunito', sans-serif", transition: "background .15s",
            }}
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
