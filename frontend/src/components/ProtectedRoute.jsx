import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, requiredRole }) {
  try {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;

    console.log("🔒 ProtectedRoute check:", { token: !!token, user });

    // ❌ Pas connecté
    if (!token || !user) {
      return <Navigate to="/" replace />;
    }

    // ❌ Mauvais rôle
    if (requiredRole && user.role !== requiredRole) {
      return user.role === "admin"
        ? <Navigate to="/admin" replace />
        : <Navigate to="/jeune" replace />;
    }

    return children;

  } catch (error) {
    console.error("❌ Erreur ProtectedRoute:", error);
    localStorage.clear();
    return <Navigate to="/" replace />;
  }
}

export default ProtectedRoute;   // ✅ ✅ ✅ مهم جداً