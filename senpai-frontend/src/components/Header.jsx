import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/header.css";
import userAvatar from "../assets/user-avatar.jpg";
import { useAuth } from "../hooks/useAuth";

const Header = () => {
  const { isLoggedIn, logout, user } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(false);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  
// --- НОВА ФУНКЦИЯ: Извличане на предложения (Преместена извън useEffect) ---
const fetchSuggestions = async (searchQuery) => {
    // Не изпращаме заявка, ако низът е празен
    if (!searchQuery.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
    }

    try {
        const resp = await fetch(
            `http://localhost:3030/api/v1/search?keyword=${encodeURIComponent(searchQuery)}&page=1`
        );

        // По-добра обработка на грешките (включително 429)
        if (!resp.ok) {
            console.error(`Search API Error: HTTP status ${resp.status}`);
            setSuggestions([]); 
            // Може да добавите логика за временно съобщение за Rate Limit
            return;
        }

        const data = await resp.json();
        setSuggestions(data.data?.response || []);
        setShowSuggestions(true);
    } catch (error) {
        console.error("Fetch error during search:", error);
        setSuggestions([]);
        setShowSuggestions(false);
    }
};


// --- ПРЕРАБОТЕН SEARCH LOGIC С DEBOUNCE ---
  useEffect(() => {
    // 1. Изчистване, ако търсенето е празно
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 2. Дефиниране на таймера за Debounce (500 ms)
    const delayDebounceFn = setTimeout(() => {
        fetchSuggestions(query);
    }, 500);

    // 3. Cleanup функция: Отменя предишния таймер, ако query се промени отново бързо
    return () => clearTimeout(delayDebounceFn);
  }, [query]);
// ----------------------------------------------------------------------

  // Close search dropdown
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close profile dropdown
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header>
      {/* LEFT */}
      <div className="header-left">
        <Link to="/" className="logo-text">
          Senpai<span>BG</span>
        </Link>
      </div>

      {/* CENTER */}
      <div className="header-center">
        <nav>
          <ul>
            <li><Link to="/">Начало</Link></li>
            <li><Link to="/top-airing">Top Airing</Link></li>
            <li><Link to="/most-popular">Most Popular</Link></li>
          </ul>
        </nav>
      </div>

      {/* RIGHT */}
      <div className="header-right">

        {/* SEARCH */}
        <div className="search-wrapper" ref={searchRef}>
          <div className="search">
            <input
              type="text"
              placeholder="Търсене..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {showSuggestions && (
            <div className="search-suggestions">
              {suggestions.slice(0, 5).map((anime) => (
                <Link
                  key={anime.id}
                  to={`/anime-details?animeId=${anime.id}`}
                  onClick={() => {
                        setShowSuggestions(false);
                        setQuery(""); // Изчистване на полето при клик
                    }}
                >
                  <img src={anime.poster} alt={anime.title} />
                  <span>{anime.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* AUTH */}
        {isLoggedIn ? (
          <div
            className="profile-menu"
            ref={dropdownRef}
            onClick={() => setOpenDropdown(!openDropdown)}
          >
            <div className="profile-avatar">
              <img src={user?.profilePictureUrl || userAvatar} />
            </div>

            <div className={`dropdown ${openDropdown ? "show" : ""}`}>
              <Link to="/profile">👤 Моят профил</Link>
              <Link to="/favorites">💖 Любими</Link>
              {user?.role === "ADMIN" && (
                <Link to="/admin">⚙️ Админ панел</Link>
              )}
              <button onClick={logout}>🚪 Изход</button>
            </div>
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="btn btn-outline">Вход</Link>
            <Link to="/register" className="btn btn-primary">Регистрация</Link>
          </div>
        )}

      </div>
    </header>
  );
};

export default Header;