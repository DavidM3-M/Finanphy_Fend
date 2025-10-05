import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: "Admin" | "User";
}

export default function PrivateRoute({ children, requiredRole }: PrivateRouteProps) {
  const { token, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="text-center p-10">Cargando...</div>;
  }

  if (!token || !user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}