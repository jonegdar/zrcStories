import React, { useCallback, useMemo, useState } from "react";
import { AdminAuthContext } from "./adminAuthContext";
import {
  ADMIN_SESSION_TTL_MS,
  clearAdminSession,
  loadAdminSession,
  saveAdminSession,
} from "./adminAuthStorage";

const ADMIN_USERNAME = "pshs-zrc!";
const ADMIN_PASSWORD = "articleMaker3000$#@";

function createSession() {
  const now = Date.now();
  return {
    v: 1,
    iat: now,
    exp: now + ADMIN_SESSION_TTL_MS,
  };
}

function matchesCredentials(username, password) {
  return String(username) === ADMIN_USERNAME && String(password) === ADMIN_PASSWORD;
}

export default function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(() => loadAdminSession());
  const isAuthenticated = Boolean(session);
  const isConfigured = true;

  const checkCredentials = useCallback((username, password) => {
    return matchesCredentials(username, password);
  }, []);

  const login = useCallback(async (username, password) => {
    if (!matchesCredentials(username, password)) {
      return { ok: false, reason: "invalid" };
    }
    const nextSession = createSession();
    saveAdminSession(nextSession);
    setSession(nextSession);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    clearAdminSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isConfigured,
      session,
      checkCredentials,
      login,
      logout,
    }),
    [isAuthenticated, isConfigured, session, checkCredentials, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
