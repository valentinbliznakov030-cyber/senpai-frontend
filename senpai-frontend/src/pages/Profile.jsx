import React, { useEffect, useState } from "react";
import "../styles/profile.css";
import "../styles/more.css";
import userAvatar from "../assets/user-avatar.jpg";
import { redirectToServerDown } from "../utils/serverDownRedirect";

import { authFetch } from "../utils/authFetch";
import { useAuth } from "../hooks/useAuth";

/* =====================================================
   safeFetch — helper за неавтентифицирани заявки
===================================================== */
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = res.ok ? await res.json() : null;

    return {
      ok: res.ok,
      data,
      status: res.status,
      networkError: false,
    };
  } catch (err) {
    console.error("Network error:", err);
    redirectToServerDown();
    return {
      ok: false,
      error: err,
      networkError: true,
    };
  }
}

const Profile = () => {

  // 🟣 ВЗИМАМЕ user И setUser ОТ AUTH PROVIDER
  const { user: authUser, setUser: setAuthUser, logout } = useAuth();

  // 🟣 ЛОКАЛНО СЪСТОЯНИЕ — първоначално копираме authUser
  const [user, setUser] = useState(authUser);

  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingFav, setLoadingFav] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // EDIT PANEL
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: authUser?.username || "",
    email: authUser?.email || "",
  });
  const [editMessage, setEditMessage] = useState("");

  // PROFILE PICTURE
  const [pfpFile, setPfpFile] = useState(null);
  const [pfpPreview, setPfpPreview] = useState(null);
  const [pfpMessage, setPfpMessage] = useState("");

  // 🟣 LOAD USER DATA (винаги дърпаме най-ново)
  useEffect(() => {
    const fetchUser = async () => {
      const resp = await authFetch("http://localhost:8080/api/v1/member/me");

      if (resp.ok) {
        const data = await resp.json();

        setUser(data);          // локален профил
        setAuthUser(data);      // 🟣 ОБНОВЯВАМЕ AUTH PROVIDER

        setEditForm({
          username: data.username,
          email: data.email,
        });
      }

      setLoadingUser(false);
    };

    fetchUser();
  }, []);

  // 🟣 Helper → fetch anime by hiAnimeId
  const fetchAnimeByHiAnimeId = async (hiAnimeId) => {
    if (!hiAnimeId) return null;
    
    const result = await safeFetch(`http://localhost:3030/api/v1/anime/${hiAnimeId}`);
    if (result.networkError || !result.ok) return null;
    if (!result.data?.success || !result.data?.data) return null;

    return result.data.data;
  };

  // 🟣 LOAD FAVORITES
  useEffect(() => {
    const loadFavorites = async () => {
      const resp = await authFetch(
        "http://localhost:8080/api/v1/favourite?page=1&size=5"
      );

      if (resp.ok) {
        const data = await resp.json();
        const favList = data.animes || [];

        const mapped = await Promise.all(
          favList.map(async (fav) => {
            // Fetch anime details by hiAnimeId
            const animeData = await fetchAnimeByHiAnimeId(fav.hiAnimeId);
            if (!animeData) return null;

            return {
              id: fav.id,
              hiAnimeId: fav.hiAnimeId,
              title: animeData.title,
              poster: animeData.poster,
              duration: animeData.duration,
              type: animeData.type,
            };
          })
        );

        setFavorites(mapped.filter(Boolean));
      }

      setLoadingFav(false);
    };

    loadFavorites();
  }, []);

  // 🟣 LOAD HISTORY
  useEffect(() => {
    const loadHistory = async () => {
      const resp = await authFetch(
        "http://localhost:8080/api/v1/history?page=1&size=5"
      );

      if (resp.ok) {
        const data = await resp.json();
        const list = data.watchHistoryResponseInfoDtoList || [];

        const mapped = await Promise.all(
          list.map(async (h) => {
            // Fetch anime details by hiAnimeId
            const animeData = await fetchAnimeByHiAnimeId(h.hiAnimeId);
            if (!animeData) return null;

            return {
              id: h.watchHistoryId,
              hiAnimeId: h.hiAnimeId,
              title: animeData.title,
              poster: animeData.poster,
              duration: animeData.duration,
              type: animeData.type,
              episodeNumber: h.episodeNumber,
              updatedOn: h.updatedOn,
            };
          })
        );

        setHistory(mapped.filter(Boolean));
      }

      setLoadingHistory(false);
    };

    loadHistory();
  }, []);

  // 🔧 Edit form
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // 🔧 SAVE profile edits
  const handleSaveEdit = async () => {
    setEditMessage("");

    const resp = await authFetch(
      "http://localhost:8080/api/v1/member/update",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      }
    );

    const data = await resp.json().catch(() => null);

    if (resp.status === 400 && data)
      return setEditMessage(Object.values(data)[0]);

    if (resp.status === 404 && data?.message)
      return setEditMessage(data.message);

    if (resp.status === 409 && data?.message)
      return setEditMessage(data.message);

    if (resp.status === 403)
      return setEditMessage("Профилът е деактивиран / заключен.");

    if (resp.ok) {
      setEditMessage("✔ Промените са запазени!");
      setIsEditing(false);

      // 🟣 ОБНОВЯВАМЕ локалния user
      const updated = {
        ...user,
        username: editForm.username,
        email: editForm.email,
      };
      setUser(updated);

      // 🟣 ОБНОВЯВАМЕ AuthProvider user
      setAuthUser(updated);
    }
  };

  // 🔧 Profile picture select
  const handlePfpSelect = (e) => {
    const file = e.target.files[0];
    setPfpFile(file);
    setPfpPreview(URL.createObjectURL(file));
  };

  // 🔧 Upload picture
  const handleUploadPfp = async () => {
    if (!pfpFile) return;

    setPfpMessage("");

    const formData = new FormData();
    formData.append("file", pfpFile);

    const resp = await authFetch(
      "http://localhost:8080/api/v1/member/profilePicture",
      {
        method: "POST",
        body: formData,
      }
    );

    const url = await resp.text();

    if (resp.ok) {
      setPfpMessage("✔ Снимката е качена!");

      const updated = { ...user, profilePictureUrl: url };

      // 🟣 локално
      setUser(updated);

      // 🟣 в AuthProvider → Header ще се обнови
      setAuthUser(updated);
    } else {
      setPfpMessage("❌ Грешка при качване.");
    }
  };

  return (
    <main className="container profile-page-container">
      <div className="page-header">
        <h1>Моят профил</h1>
        <p>Информация, редакция, снимка, любими анимета и история</p>
      </div>

      {/* USER HEADER */}
      <div className="profile-header">
        <div className="pfp-wrapper">
          <img
            src={user?.profilePictureUrl || userAvatar}
            className="pfp"
            alt="pfp"
          />
        </div>

        <div className="user-info-text">
          <h2>{user?.username}</h2>
          
          <div className="user-details-section">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Роля:</strong> {user?.role}</p>
            {user?.registeredOn && (
              <p>
                <strong>Регистриран:</strong>{" "}
                {new Date(user.registeredOn).toLocaleDateString("bg-BG", {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>

          <div className="user-actions-section">
            <button
              className="btn btn-primary"
              onClick={() => setIsEditing(!isEditing)}
            >
              ✏ Редактирай
            </button>

            <button className="btn btn-outline" onClick={logout}>
              Изход
            </button>
          </div>
        </div>
      </div>

      {/* EDIT PANEL */}
      {isEditing && (
        <div className="edit-panel">

          <h3>Редакция на профил</h3>

          <div className="form-group">
            <label>Потребителско име</label>
            <input
              type="text"
              name="username"
              value={editForm.username}
              onChange={handleEditChange}
            />
          </div>

          <div className="form-group">
            <label>Имейл</label>
            <input
              type="email"
              name="email"
              value={editForm.email}
              onChange={handleEditChange}
            />
          </div>

          {editMessage && <p className="edit-message">{editMessage}</p>}

          <button className="btn btn-primary" onClick={handleSaveEdit}>
            Запази
          </button>

          <button
            className="btn btn-outline"
            onClick={() => setIsEditing(false)}
          >
            Откажи
          </button>

          <hr style={{ margin: "25px 0", opacity: 0.3 }} />

          <h3>Промени профилна снимка</h3>

          <div className="form-group">
            <label>Нова снимка</label>
            <input type="file" accept="image/*" onChange={handlePfpSelect} />
          </div>

          {pfpPreview && (
            <img
              src={pfpPreview}
              alt="preview"
              style={{
                width: "140px",
                borderRadius: "10px",
                marginBottom: "1rem",
                boxShadow: "0 0 15px rgba(0,168,255,0.5)",
              }}
            />
          )}

          {pfpMessage && <p className="edit-message">{pfpMessage}</p>}

          <button className="btn btn-primary" onClick={handleUploadPfp}>
            Качи снимката
          </button>
        </div>
      )}

      {/* FAVORITES */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 className="profile-section-title" style={{ margin: 0 }}>Любими анимета</h2>
        {favorites.length > 0 && (
          <a href="/favourites" className="btn btn-outline" style={{ textDecoration: "none" }}>
            Виж всички
          </a>
        )}
      </div>

      <div id="anime-grid">
        {loadingFav ? (
          <div className="loading-spinner" style={{ display: "block" }}></div>
        ) : favorites.length === 0 ? (
          <p style={{ textAlign: "center", width: "100%", gridColumn: "1/-1", opacity: 0.7 }}>
            Нямаш любими анимета 😢
          </p>
        ) : (
          favorites.map((fav) => {
            if (!fav) return null;

            return (
              <div key={fav.id} className="anime-card">
                <div className="anime-banner">
                  <img src={fav.poster} alt={fav.title} loading="lazy" />
                </div>
                <div className="anime-content">
                  <h3 className="anime-title">{fav.title}</h3>
                  <div className="anime-details">
                    {fav.duration && (
                      <span className="anime-detail anime-duration">
                        ⏱️ {fav.duration}
                      </span>
                    )}
                    {fav.type && (
                      <span className="anime-detail anime-type">{fav.type}</span>
                    )}
                  </div>
                  <a
                    href={`/anime-details?animeId=${fav.hiAnimeId}`}
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                  >
                    Виж детайли
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* HISTORY */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", marginTop: "40px" }}>
        <h2 className="profile-section-title" style={{ margin: 0 }}>Последно гледани</h2>
        {history.length > 0 && (
          <a href="/watch-history" className="btn btn-outline" style={{ textDecoration: "none" }}>
            Виж всички
          </a>
        )}
      </div>

      <div id="anime-grid">
        {loadingHistory ? (
          <div className="loading-spinner" style={{ display: "block" }}></div>
        ) : history.length === 0 ? (
          <p style={{ textAlign: "center", width: "100%", gridColumn: "1/-1", opacity: 0.7 }}>
            Нямаш история на гледане 😢
          </p>
        ) : (
          history.map((h) => {
            if (!h) return null;

            return (
              <div key={h.id} className="anime-card">
                <div className="anime-banner">
                  <img src={h.poster} alt={h.title} loading="lazy" />
                </div>
                <div className="anime-content">
                  <h3 className="anime-title">{h.title}</h3>
                  <div className="anime-details">
                    {h.duration && (
                      <span className="anime-detail anime-duration">
                        ⏱️ {h.duration}
                      </span>
                    )}
                    {h.type && (
                      <span className="anime-detail anime-type">{h.type}</span>
                    )}
                  </div>
                  <p style={{ opacity: 0.7, marginBottom: "10px" }}>Епизод {h.episodeNumber}</p>
                  <a
                    href={`/anime-details?animeId=${h.hiAnimeId}`}
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                  >
                    Виж детайли
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
};

export default Profile;
