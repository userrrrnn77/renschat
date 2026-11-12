import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "../store/authStore";
import { SparkleLogo } from "../components/ui/Icons";
import { Spinner } from "../components/ui/Spinner";

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, register } = useAuthStore();

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
      else setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-2xl p-8 shadow-sm animate-in fade-in zoom-in-95">
        <div className="flex flex-col items-center mb-8">
          <SparkleLogo className="w-8 h-8 text-accent mb-2" />
          <h1 className="text-2xl font-serif font-semibold text-ink">GenUI</h1>
        </div>

        <div className="flex bg-surface2 p-1 rounded-lg mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${isLogin ? "bg-surface shadow-sm text-ink" : "text-muted"}`}>
            Masuk
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${!isLogin ? "bg-surface shadow-sm text-ink" : "text-muted"}`}>
            Daftar
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-lg border border-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Nama
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Email
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Password
            </label>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full flex justify-center items-center h-10 bg-accent hover:bg-accent-hover text-accent-fg font-medium rounded-lg text-sm transition-colors mt-2">
            {loading ? (
              <Spinner className="w-5 h-5" />
            ) : isLogin ? (
              "Masuk"
            ) : (
              "Daftar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
