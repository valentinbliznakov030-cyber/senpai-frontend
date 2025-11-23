import { createContext, useState, useEffect, useCallback } from "react";

export const AuthContext = createContext();

export const AuthProvider = 
({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("jwtToken"));
  
  // Load user from localStorage on initialization
  const loadUserFromStorage = () => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Error loading user from localStorage:", error);
      return null;
    }
  };
  
  const [user, setUser] = useState(loadUserFromStorage());
  const [isLoggedIn, setIsLoggedIn] = useState(!!token);

  // Load user data from server on mount if we have a token
  // Only fetch once when component mounts, not on every token change
  useEffect(() => {
    const loadUserFromServer = async () => {
      if (!token) return;
      
      const currentUser = loadUserFromStorage();
      
      // Only fetch if we have token but no user in storage, or if user doesn't have profilePictureUrl
      // This prevents unnecessary requests on every page navigation
      if (!currentUser || !currentUser.profilePictureUrl) {
        try {
          const response = await fetch("http://localhost:8080/api/v1/member/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
          } else if (response.status === 401) {
            // Token expired or invalid
            setToken(null);
            setUser(null);
            localStorage.removeItem("jwtToken");
            localStorage.removeItem("user");
          }
        } catch (error) {
          console.error("Error loading user from server:", error);
          // If server is down, keep using localStorage data
          // Don't make repeated requests if server is down
        }
      }
    };

    // Only run once on mount, not on every token change
    // This prevents unnecessary requests when navigating between pages
    loadUserFromServer();
  }, []); // Empty dependency array - only run once on mount

  // 🔥 Следим всяка промяна в токена
  useEffect(() => {
    if (token) {
      localStorage.setItem("jwtToken", token);
      setIsLoggedIn(true);
      // If user is not set but we have a token, try to load from storage
      if (!user) {
        const storedUser = loadUserFromStorage();
        if (storedUser) {
          setUser(storedUser);
        }
      }
    } else {
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("user");
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
