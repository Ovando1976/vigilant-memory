import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/signin" state={{ from: loc }} replace />;
  if (!isAdmin) return <p style={{ padding: 24 }}>Not authorized</p>;
  return children;
}
