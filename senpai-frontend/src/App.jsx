import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

// Providers
import { AuthProvider } from "./context/AuthContext";

// Components
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import ServerDown500 from "./pages/500";

// Pages
import Home from "./pages/Home";
import TopAiring from "./pages/TopAiring";
import MostPopular from "./pages/MostPopular";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import ServerDown from "./pages/ServerDown";
import AnimeDetails from "./pages/AnimeDetails";
import Watch from "./pages/Watch";
import Admin from "./pages/Admin";
import NotFound from "./pages/404";
import ForgotPassword from "./pages/ForgotPassword";
import Plans from "./pages/Plans";
import WatchHistory from "./pages/WatchHistory";
import Favourites from "./pages/Favourites";
import AboutUs from "./pages/AboutUs";

function AppShell() {
  const location = useLocation();
  const [serverDown, setServerDown] = React.useState(false);

  React.useEffect(() => {
    const handleServerDown = () => setServerDown(true);
    window.addEventListener("senpai-server-down", handleServerDown);
    return () => window.removeEventListener("senpai-server-down", handleServerDown);
  }, []);

  if (serverDown || location.pathname === "/500") {
    return <ServerDown500 />;
  }

  return (
    <>
      <Header />

      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/top-airing" element={<TopAiring />} />
        <Route path="/most-popular" element={<MostPopular />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="/500" element={<ServerDown500 />} />
        <Route path="/anime-details" element={<AnimeDetails />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/error-code" element={<ServerDown />} />
        <Route path="/watch" element={<Watch />} />
        <Route path="/about-us" element={<AboutUs />} />
        {/* Protected Page */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plans"
          element={
            <ProtectedRoute>
              <Plans />
            </ProtectedRoute>
          }
        />
        <Route
          path="/watch-history"
          element={
            <ProtectedRoute>
              <WatchHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favourites"
          element={
            <ProtectedRoute>
              <Favourites />
            </ProtectedRoute>
          }
        />

        {/*🔒 Future protected route */}
        {/* 
        <Route 
          path="/change-password" 
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } 
        />
        */}
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  );
}

export default App;
