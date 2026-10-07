import { useState, useEffect } from "react";
import LoginView from "./components/LoginView";
import MainDashboard from "./components/MainDashboard";
import { authApi, getUser } from "./services/api";
import { RefreshCw } from "lucide-react";
import { User } from "./types";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    // Attempt to load profile from storage on initial load
    async function initSession() {
      const storedUser = getUser();
      if (storedUser) {
        try {
          // Re-validate session with API backend to ensure session key is fresh
          const authenticatedProfile = await authApi.getMe();
          setCurrentUser(authenticatedProfile);
        } catch {
          // Session expired or server rebooted, clean state
          setCurrentUser(null);
        }
      }
      setLoading(false);
    }
    initSession();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await authApi.logout();
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#030712] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase font-mono">
            {t("loadingData")}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#030712] relative">
      {currentUser ? (
        <MainDashboard user={currentUser} onLogout={handleLogout} />
      ) : (
        <LoginView onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
