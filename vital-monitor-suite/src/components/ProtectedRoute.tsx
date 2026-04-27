import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type Role } from "@/context/AuthContext";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** If provided, only these roles can access. Admin always allowed. */
  allow?: Role[];
}

export function ProtectedRoute({ children, allow }: Props) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (allow && user.role !== "admin" && !allow.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
}
