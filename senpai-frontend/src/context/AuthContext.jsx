import { createContext, useState, useEffect, useCallback } from "react";

export const AuthContext = createContext();

export const AuthProvider = 
({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("jwtToken"));
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!token);

  // 🔥 Следим всяка промяна в токена
  useEffect(() => {
    if (token) {
      localStorage.setItem("jwtToken", token);
      setIsLoggedIn(true);
    } else {
      localStorage.removeItem("jwtToken");
      setIsLoggedIn(false);
      setUser(null);
    }
  }, [token]);

  // 🟢 Извиква се след login() от Login.jsx
  const login = (jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);

    localStorage.setItem("jwtToken", jwtToken);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // 🔴 Извиква се при logout или при expired token
  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  useEffect(() => {
    const handleForceLogout = () => {
      logout();
    };

    window.addEventListener("senpai-force-logout", handleForceLogout);
    return () => window.removeEventListener("senpai-force-logout", handleForceLogout);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoggedIn,
        setUser,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
