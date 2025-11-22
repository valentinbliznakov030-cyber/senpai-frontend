import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, logout } = useAuth();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    const checkServer = async () => {
      if (!isLoggedIn) {
        setChecking(false);
        return;
      }

      try {
        const resp = await authFetch("http://localhost:8080/api/v1/member/me");

        if (resp.status === 401) {
          setTokenError(true);
        }
      } catch {
        setError(true);
      } finally {
        setChecking(false);
      }
    };

    checkServer();
  }, [isLoggedIn]);

  // ⏳ Докато проверяваме – не рендерираме страницата
  if (checking) return null;

  if(tokenError)return <Navigate to="/login" replace />;
  
  // ❌ Token invalid / server down
  if (error) return <Navigate to="/error-code" replace />;

  // ❌ Not logged in at all
  if (!isLoggedIn) return <Navigate to="/login" replace />;

  // 🟢 Валиден достъп → рендерираме страницата
  return children;
};

export default ProtectedRoute;
