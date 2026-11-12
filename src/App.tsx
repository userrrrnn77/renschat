import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { useAuthStore } from "./store/authStore";
import { AppShell } from "./components/layout/AppShell";
import { ChatPage } from "./pages/ChatPage";
import { LoginPage } from "./pages/LoginPage";
import { SparkleLogo } from "./components/ui/Icons";
import { Toaster } from "./components/ui/Toaster";

export default function App() {
  const { status, bootstrap } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    bootstrap();
    setMounted(true);

    // Listen for global unauthorized events
    const handleUnauthorized = () => {
      useAuthStore.getState().clear();
    };
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, [bootstrap]);

  if (!mounted || status === "loading") {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center">
        <SparkleLogo className="w-10 h-10 text-accent animate-pulse" />
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-xl font-semibold mb-2">
          Tidak bisa terhubung ke server
        </h1>
        <p className="text-muted text-sm mb-6">
          Pastikan backend GenUI sudah berjalan di port 3000.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-accent text-accent-fg rounded-lg text-sm">
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={status === "authed" ? <Navigate to="/" /> : <LoginPage />}
        />

        <Route
          element={
            status === "authed" ? <AppShell /> : <Navigate to="/login" />
          }>
          <Route path="/" element={<ChatPage />} />
          <Route path="/chat/:id" element={<ChatPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
