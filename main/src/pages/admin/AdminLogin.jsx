import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import { useAdminAuth } from "../../features/admin/auth/useAdminAuth";

function sanitizeNext(value) {
  const raw = String(value || "");
  if (!raw.startsWith("/")) return "/admin";
  if (raw.startsWith("//")) return "/admin";
  if (raw.startsWith("/admin")) return raw;
  return "/admin";
}

function generatePin4() {
  try {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return String(bytes[0] % 10000).padStart(4, "0");
  } catch {
    return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  }
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isConfigured, checkCredentials, login } = useAdminAuth();
  const [stage, setStage] = useState("credentials"); // credentials | pin
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [expectedPin, setExpectedPin] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const next = useMemo(
    () => sanitizeNext(searchParams.get("next")),
    [searchParams],
  );

  useEffect(() => {
    document.title = "Admin Login";
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate(next, { replace: true });
  }, [isAuthenticated, navigate, next]);

  function resetToCredentials() {
    setStage("credentials");
    setExpectedPin("");
    setPin("");
  }

  function onSubmitCredentials(event) {
    event.preventDefault();
    setError("");

    if (!checkCredentials(username, password)) {
      setError("Incorrect username or password.");
      return;
    }

    setExpectedPin(generatePin4());
    setPin("");
    setStage("pin");
  }

  async function onSubmitPin(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (pin.trim() !== expectedPin) {
        setError("Incorrect PIN. Try again.");
        return;
      }

      const result = await login(username, password);
      if (!result.ok) {
        setError("Incorrect username or password.");
        resetToCredentials();
        return;
      }

      navigate(next, { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-28 md:pt-32 pb-8 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-[92vw] max-w-md mx-auto">
            <div
              className="rounded-3xl p-6 md:p-7"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--glass-shadow)",
                backdropFilter: "var(--glass-backdrop)",
                WebkitBackdropFilter: "var(--glass-backdrop)",
              }}
            >
              <h1 className="text-2xl md:text-3xl font-semibold">
                Administrator Login
              </h1>
              <p className="text-sm opacity-80 mt-2">
                This login is only for the site administrator.
              </p>

              {!isConfigured && (
                <div
                  className="mt-4 rounded-2xl px-4 py-3 text-sm"
                  style={{
                    background: "rgba(255, 240, 220, 0.75)",
                    border: "1px solid rgba(234, 88, 12, 0.25)",
                    color: "#7c2d12",
                  }}
                >
                  Admin login is not configured.
                </div>
              )}

              <div className="mt-5 relative overflow-hidden">
                <div
                  className={`flex w-[200%] transition-transform duration-300 ease-out ${
                    stage === "pin" ? "-translate-x-1/2" : "translate-x-0"
                  }`}
                >
                <div className="w-1/2 pr-2">
                  <form onSubmit={onSubmitCredentials}>
                    <label className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                      Username
                    </label>
                      <input
                        type="text"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-2 w-full rounded-2xl px-4 py-3 outline-none text-sm"
                        style={{
                          background: "rgba(255,255,255,0.84)",
                          border: "1.5px solid rgba(255,255,255,0.95)",
                          boxShadow: "0 10px 24px rgba(11,18,32,0.10)",
                          color: "var(--glass-text)",
                        }}
                        placeholder="Enter admin username"
                        disabled={submitting}
                      />

                      <label className="block text-xs font-semibold tracking-wide uppercase opacity-80 mt-4">
                        Password
                      </label>
                      <div className="mt-2 relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-2xl pl-4 pr-12 py-3 outline-none text-sm"
                          style={{
                            background: "rgba(255,255,255,0.84)",
                            border: "1.5px solid rgba(255,255,255,0.95)",
                            boxShadow: "0 10px 24px rgba(11,18,32,0.10)",
                            color: "var(--glass-text)",
                          }}
                          placeholder="Enter admin password"
                          disabled={submitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          style={{ color: "var(--glass-text)" }}
                          disabled={submitting}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          submitting || !username.trim() || !password.trim() || !isConfigured
                        }
                        className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                        style={{
                          background: "var(--theme-orange)",
                          color: "white",
                          boxShadow: "0 12px 26px rgba(234, 88, 12, 0.28)",
                        }}
                      >
                        Login as Admin
                      </button>

                      {stage === "credentials" && error && (
                        <div className="mt-3 text-sm text-red-700">{error}</div>
                      )}
                    </form>
                  </div>

                  <div className="w-1/2 pl-2">
                    <form onSubmit={onSubmitPin}>
                      <div
                        className="rounded-2xl px-4 py-3 text-sm flex items-center justify-between gap-3"
                        style={{
                          background: "rgba(255,255,255,0.76)",
                          border: "1px solid rgba(15, 23, 42, 0.10)",
                        }}
                      >
                        <div>
                          <div className="text-[10px] font-semibold tracking-[0.14em] opacity-70">
                            PIN
                          </div>
                          <div className="text-xl font-semibold tabular-nums tracking-[0.12em]">
                            {expectedPin}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpectedPin(generatePin4())}
                          className="rounded-full px-3 py-2 text-xs font-semibold border"
                          style={{
                            background: "rgba(255,255,255,0.85)",
                            borderColor: "rgba(15, 23, 42, 0.12)",
                            color: "var(--glass-text)",
                          }}
                        >
                          New PIN
                        </button>
                      </div>

                      <label className="block text-xs font-semibold tracking-wide uppercase opacity-80 mt-4">
                        Enter the 4-digit PIN above to confirm login
                      </label>
                      <input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="mt-2 w-full rounded-2xl px-4 py-3 outline-none text-sm tracking-[0.18em] text-center tabular-nums"
                        style={{
                          background: "rgba(255,255,255,0.84)",
                          border: "1.5px solid rgba(255,255,255,0.95)",
                          boxShadow: "0 10px 24px rgba(11,18,32,0.10)",
                          color: "var(--glass-text)",
                          letterSpacing: "0.32em",
                        }}
                        placeholder="____"
                        disabled={submitting}
                      />

                      {stage === "pin" && error && (
                        <div className="mt-3 text-sm text-red-700">{error}</div>
                      )}

                      <button
                        type="submit"
                        disabled={submitting || pin.trim().length !== 4 || !isConfigured}
                        className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                        style={{
                          background: "var(--theme-orange)",
                          color: "white",
                          boxShadow: "0 12px 26px rgba(234, 88, 12, 0.28)",
                        }}
                      >
                        {submitting ? "Signing in..." : "Sign in"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          resetToCredentials();
                        }}
                        disabled={submitting}
                        className="mt-3 w-full rounded-2xl px-4 py-3 text-sm font-semibold border transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                        style={{
                          background: "rgba(255,255,255,0.82)",
                          borderColor: "rgba(15, 23, 42, 0.12)",
                          color: "var(--glass-text)",
                        }}
                      >
                        Back
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs opacity-70 mt-4 text-center">
              Tip: bookmark <code>/admin</code> after you sign in.
            </p>
          </div>
        </div>
        <Footer />
      </main>
    </>
  );
}
