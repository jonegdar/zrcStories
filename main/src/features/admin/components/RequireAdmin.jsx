import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../auth/useAdminAuth";

export default function RequireAdmin({ children }) {
  const location = useLocation();
  const { isAuthenticated } = useAdminAuth();

  if (isAuthenticated) return children;

  const next = `${location.pathname}${location.search}${location.hash}`;
  return (
    <Navigate
      to={`/admin/login?next=${encodeURIComponent(next)}`}
      replace
    />
  );
}
