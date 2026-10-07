import React, { useState, useEffect } from "react";
import { authApi } from "../services/api";
import { Lock, Mail, User as UserIcon, Shield, ArrowRight, AlertTriangle, Globe } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "executive">("executive");
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    const emailParam = params.get("email") || params.get("inviteEmail");
    const roleParam = params.get("role") || params.get("inviteRole");
    const inviteIdParam = params.get("inviteId");

    if (modeParam === "signup") {
      setIsSignUp(true);
    }
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    if (roleParam === "admin" || roleParam === "executive") {
      setRole(roleParam as "admin" | "executive");
    }
    if (inviteIdParam) {
      setInviteId(inviteIdParam);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotPasswordMsg(null);
    setLoading(true);

    if (!email || !password || (isSignUp && !name)) {
      setError(t("errorAllFields"));
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const res = await authApi.register({ email, password, name, role, inviteId: inviteId || undefined });
        onLoginSuccess(res.user);
      } else {
        const res = await authApi.login({ email, password });
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || t("authFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError(t("passwordResetError"));
      return;
    }
    setForgotPasswordMsg(t("passwordResetMsg"));
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#030712] relative overflow-hidden font-sans">
      {/* Visual background accents */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[140px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-900/15 blur-[140px]" />

      {/* Language Selector Top Right */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-1.5 bg-[#0b1329] border border-blue-950/70 rounded-xl p-2 text-xs text-slate-300 shadow-xl">
        <Globe className="w-3.5 h-3.5 text-blue-500 mr-0.5" />
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={`px-1.5 py-0.5 rounded-md transition ${language === "en" ? "bg-blue-600 text-white font-semibold" : "hover:text-white"}`}
        >
          EN
        </button>
        <span className="text-blue-950">|</span>
        <button
          type="button"
          onClick={() => setLanguage("es")}
          className={`px-1.5 py-0.5 rounded-md transition ${language === "es" ? "bg-blue-600 text-white font-semibold" : "hover:text-white"}`}
        >
          ES
        </button>
      </div>

      <div className="w-full max-w-md p-2 z-10">
        <div className="bg-[#0b1329] border border-blue-950/70 p-8 rounded-2xl shadow-2xl relative">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <span className="font-mono font-bold text-xl text-white tracking-wider">LH</span>
            </div>
            <h1 id="app-title" className="text-2xl font-bold text-slate-100 font-sans tracking-tight">
              Lepus<span className="text-blue-500">Hub</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 text-center">
              {isSignUp ? t("acceleratedCrm") : t("secureSales")}
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-red-950/40 border border-red-800/50 p-3 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 font-medium">{error}</p>
            </div>
          )}

          {forgotPasswordMsg && (
            <div className="mb-5 bg-blue-950/40 border border-blue-800/50 p-3 rounded-lg flex items-start gap-2.5">
              <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300 font-medium leading-relaxed">{forgotPasswordMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  {t("fullName")}
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder={t("fullNamePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#0d1b3e]/60 border border-blue-900/40 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-200 text-sm transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                {t("emailAddress")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="executive@lepushub.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0d1b3e]/60 border border-blue-900/40 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-200 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t("password")}
                </label>
                {!isSignUp && (
                  <button
                    onClick={handleForgotPassword}
                    type="button"
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    {t("forgotPassword")}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0d1b3e]/60 border border-blue-900/40 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-200 text-sm transition-all"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  {t("role")}
                </label>
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setRole("executive")}
                    className={`py-2 px-3 border rounded-xl text-xs font-medium text-center transition-all ${
                      role === "executive"
                        ? "bg-blue-600/20 border-blue-500 text-blue-400"
                        : "bg-[#0d1b3e]/40 border-blue-900/30 text-slate-400 hover:bg-[#0d1b3e]/80"
                    }`}
                  >
                    {t("roleExecutive")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`py-2 px-3 border rounded-xl text-xs font-medium text-center transition-all ${
                      role === "admin"
                        ? "bg-blue-600/20 border-blue-500 text-blue-400"
                        : "bg-[#0d1b3e]/40 border-blue-900/30 text-slate-400 hover:bg-[#0d1b3e]/80"
                    }`}
                  >
                    {t("roleAdmin")}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-blue-600 text-white font-medium text-sm rounded-xl hover:bg-blue-500 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_14px_rgba(37,99,235,0.3)] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-white animate-spin" />
              ) : (
                <>
                  {isSignUp ? t("signUp") : t("signIn")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-blue-950/70 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setForgotPasswordMsg(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
            >
              {isSignUp ? (
                <>
                  {t("registeredQuestion")}{" "}
                  <span className="text-blue-500 font-semibold underline">
                    {t("signInUnderline")}
                  </span>
                </>
              ) : (
                <>
                  {t("newJoiner")}{" "}
                  <span className="text-blue-500 font-semibold underline">
                    {t("createAccountUnderline")}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
