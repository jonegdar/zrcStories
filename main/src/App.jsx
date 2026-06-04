import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollManager from "./core/scroll/ScrollManager";
import AdminAuthProvider from "./features/admin/auth/AdminAuthProvider";
import RequireAdmin from "./features/admin/components/RequireAdmin";

const Home = lazy(() => import("./pages/Home"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Events = lazy(() => import("./pages/Events"));
const Article = lazy(() => import("./pages/Article"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const ArticleMaker = lazy(() => import("./pages/admin/ArticleMaker"));

export default function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <AdminAuthProvider>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center px-4">
              <div className="text-sm opacity-75">Loading...</div>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/events" element={<Events />} />
            <Route path="/articles/:id" element={<Article />} />
            <Route path="/search" element={<SearchResults />} />

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminHome />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/articles/new"
              element={
                <RequireAdmin>
                  <ArticleMaker />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/articles/:id/edit"
              element={
                <RequireAdmin>
                  <ArticleMaker />
                </RequireAdmin>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
