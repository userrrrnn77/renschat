// src/pages/LoginPage.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuthStore } from "../store/authStore";
import { SparkleLogo } from "../components/ui/Icons";
import { Spinner } from "../components/ui/Spinner";
import { Mail, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/cn";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, register } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      if (urlError === "google_failed")
        setError("Gagal masuk dengan Google. Silakan coba lagi.");
      else if (urlError === "state_missing")
        setError("Sesi OAuth tidak valid. Silakan coba lagi.");
      else setError("Terjadi kesalahan saat login.");

      // Hapus query dari URL
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({
          email,
          password,
          name,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
      navigate("/");
    } catch (err: any) {
      if (err.status === 401) setError("Email atau password salah");
      else if (err.status === 409) setError("Email sudah terdaftar");
      else setError(err.message || "Terjadi kesalahan pada server");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  const showGoogleAuth = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden p-4 sm:p-8">
      {/* Background Ornaments */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-accent/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-5xl bg-surface/80 backdrop-blur-xl border border-line rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative z-10 animate-in fade-in zoom-in-95 duration-500 min-h-150">
        {/* KIRI: Branding Panel */}
        <div className="hidden md:flex w-full md:w-[45%] relative bg-accent flex-col justify-between p-12 overflow-hidden text-accent-fg">
          <div className="absolute top-0 right-0 w-100 h-100 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-75 h-75 bg-black/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <SparkleLogo className="w-5 h-5 text-white" animate />
            </div>
            <span className="text-xl font-bold tracking-tight">RensChat</span>
          </div>

          <div
            key={isLogin ? "login" : "register"}
            className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-semibold leading-tight mb-4">
              {isLogin ? "Welcome back." : "Mari bergabung bersama RensChat."}
            </h2>
            <p className="text-white/80 text-[15px] leading-relaxed mb-8">
              {isLogin
                ? "Senang melihatmu lagi. Lanjutkan percakapan, buat tabel, analisis dokumen, atau generate file bareng asisten AI."
                : "Tingkatkan produktivitasmu dengan asisten AI generatif yang bisa merender UI, dokumen, dan visualisasi data langsung di dalam chat."}
            </p>

            <div className="space-y-4">
              {[
                "Generative UI (Tabel, Chart, PDF)",
                "Pemahaman dokumen (RAG Pipeline)",
                "Thinking Harness & Tool Calling",
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm text-white/90">
                  <CheckCircle2 className="w-5 h-5 text-white/60" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-xs text-white/50">
            © {new Date().getFullYear()} RensChat. Dibuat untuk produktivitas.
          </div>
        </div>

        {/* KANAN: Form Panel */}
        <div className="w-full md:w-[55%] flex flex-col justify-center p-6 sm:p-10 md:p-12 relative bg-surface">
          <div className="md:hidden absolute top-6 left-6 flex items-center gap-2">
            <SparkleLogo className="w-6 h-6 text-accent" animate />
            <span className="text-lg font-semibold text-ink">RensChat</span>
          </div>

          <div className="mt-8 md:mt-0 w-full max-w-sm mx-auto">
            <div className="flex bg-surface2 p-1 rounded-xl mb-6">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError("");
                }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isLogin
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink",
                )}>
                Masuk
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError("");
                }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  !isLogin
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink",
                )}>
                Daftar
              </button>
            </div>

            <div
              key={isLogin ? "form-login" : "form-register"}
              className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-ink tracking-tight">
                  {isLogin ? "Masuk ke akunmu" : "Buat akun baru"}
                </h1>
                <p className="text-sm text-muted mt-1">
                  {isLogin
                    ? "Masukkan kredensial untuk melanjutkan."
                    : "Isi data di bawah untuk mendaftar."}
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3 bg-danger/10 text-danger text-sm rounded-xl border border-danger/20 flex items-center gap-2 animate-in fade-in">
                  <div className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                  {error}
                </div>
              )}

              {showGoogleAuth && (
                <>
                  <button
                    onClick={handleGoogleLogin}
                    type="button"
                    className="w-full flex justify-center items-center gap-2 h-11 bg-surface2 hover:bg-line text-ink font-medium rounded-xl text-sm transition-all mb-4 border border-line">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Lanjutkan dengan Google
                  </button>

                  <div className="relative flex items-center py-2 mb-4">
                    <div className="grow border-t border-line"></div>
                    <span className="shrink-0 mx-4 text-muted text-[11px] uppercase tracking-wider">
                      atau
                    </span>
                    <div className="grow border-t border-line"></div>
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted ml-1">
                      Nama Lengkap
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-bg border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted ml-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full bg-bg border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-bg border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    />
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full group flex justify-center items-center gap-2 h-11 bg-accent hover:bg-accent-hover text-accent-fg font-medium rounded-xl text-sm transition-all mt-6 disabled:opacity-70 disabled:cursor-not-allowed">
                  {loading ? (
                    <Spinner className="w-5 h-5" />
                  ) : (
                    <>
                      {isLogin ? "Masuk ke Akun" : "Buat Akun Baru"}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-8 text-xs text-muted">
              <Link to="/terms" className="hover:text-ink transition-colors">
                Syarat & Ketentuan
              </Link>
              <span className="hidden sm:inline">•</span>
              <Link to="/privacy" className="hover:text-ink transition-colors">
                Kebijakan Privasi
              </Link>
              <span className="hidden sm:inline">•</span>
              <Link to="/faq" className="hover:text-ink transition-colors">
                FAQ
              </Link>
              <span className="hidden sm:inline">•</span>
              <Link to="/contact" className="hover:text-ink transition-colors">
                Bantuan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
