import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { useAuthStore } from "./store/authStore";
import { AppShell } from "./components/layout/AppShell";
import { ChatPage } from "./pages/ChatPage";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/LandingPage";
import { SparkleLogo } from "./components/ui/Icons";
import { Toaster } from "./components/ui/Toaster";
import { ConfirmModal } from "./components/ui/ConfirmModal";
import {
  TermsPage,
  PrivacyPage,
  FaqPage,
  ContactPage,
} from "./pages/StaticPages";
import { useTranslation } from "react-i18next";

export default function App() {
  const { t } = useTranslation();

  const { status, bootstrap } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    bootstrap();
    setMounted(true);

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
        <h1 className="text-xl font-semibold mb-2">{t("app.offlineTitle")}</h1>
        <p className="text-muted text-sm mb-6">{t("app.offlineDesc")}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-accent text-accent-fg rounded-lg text-sm">
          {t("app.retry")}
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            status === "authed" ? (
              <Navigate to="/chat" replace />
            ) : (
              <LoginPage />
            )
          }
        />

        <Route
          path="/"
          element={
            status === "authed" ? (
              <Navigate to="/chat" replace />
            ) : (
              <LandingPage />
            )
          }
        />

        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {status === "authed" ? (
          <Route element={<AppShell />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
          </Route>
        ) : (
          <>
            <Route path="/chat" element={<Navigate to="/login" replace />} />
            <Route
              path="/chat/:id"
              element={<Navigate to="/login" replace />}
            />
          </>
        )}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <ConfirmModal />
    </BrowserRouter>
  );
}
