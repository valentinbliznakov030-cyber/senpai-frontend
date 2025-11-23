import React, { useEffect, useState } from "react";
import "../styles/more.css";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

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
    return {
      ok: false,
      error: err,
      networkError: true,
    };
  }
}

const WatchHistory = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Menu state
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const fetchAnimeByHiAnimeId = async (hiAnimeId) => {
    if (!hiAnimeId) return null;
    
    const result = await safeFetch(`http://localhost:3030/api/v1/anime/${hiAnimeId}`);
    if (result.networkError || !result.ok) return null;
    if (!result.data?.success || !result.data?.data) return null;

    return result.data.data;
  };

  const loadHistory = async (page = 1) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await authFetch(
        `http://localhost:8080/api/v1/history?page=${page}&size=20`
      );

      if (resp.ok) {
        const data = await resp.json();
        const list = data.watchHistoryResponseInfoDtoList || [];
        const total = data.totalPages || 1;
        setTotalPages(total);
        setHasNextPage(page < total);

        const mapped = await Promise.all(
          list.map(async (h) => {
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
      } else {
        const errorData = await resp.json().catch(() => ({}));
        const errorMsg = errorData.message || `Грешка при зареждане на историята (${resp.status})`;
        setError(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error loading history:", error);
      setError("❌ Неочаквана грешка при зареждане на историята.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(currentPage);
  }, [currentPage, isLoggedIn]);

  const toggleMenu = (id) => {
    setOpenMenuId(prev => prev === id ? null : id);
  };

  const handleDeleteHistory = async (historyId) => {
    if (!historyId) return;

    setDeleteError(null);
    setDeleteLoading(true);
    setOpenMenuId(null);

    try {
      const resp = await authFetch(
        `http://localhost:8080/api/v1/history/${historyId}`,
        {
          method: "DELETE"
        }
      );

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        const errorMsg = errorData.message || `Грешка при изтриване на запис (${resp.status})`;
        setDeleteError(`❌ ${errorMsg}`);
        setDeleteLoading(false);
        return;
      }

      // Remove from local state
      setHistory(prev => prev.filter(h => h.id !== historyId));
      
      // Reload if current page becomes empty
      if (history.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        loadHistory(currentPage);
      }
    } catch (error) {
      console.error("Error deleting history entry:", error);
      setDeleteError("❌ Неочаквана грешка при изтриване на запис.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };

  return (
    <main className="container">
      <div className="page-header">
        <h1>История на гледане</h1>
        <p>Всички анимета, които сте гледали</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="history-error-box">
          <span className="history-error-close" onClick={() => setError(null)}>×</span>
          <p>{error}</p>
        </div>
      )}

      {deleteError && (
        <div className="history-error-box">
          <span className="history-error-close" onClick={() => setDeleteError(null)}>×</span>
          <p>{deleteError}</p>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner"></div>
      ) : (
        <div id="anime-grid">
          {history.length > 0 ? (
            history.map((h) => (
              <div key={h.id} className="anime-card">
                <div className="anime-banner">
                  <img src={h.poster} alt={h.title} loading="lazy" />
                </div>
                <div className="anime-content">
                  <div className="anime-card-header">
                    <h3 className="anime-title">{h.title}</h3>
                    <span
                      className="history-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(h.id);
                      }}
                    >
                      ⋮
                    </span>
                    {openMenuId === h.id && (
                      <div
                        className="history-menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div onClick={() => handleDeleteHistory(h.id)}>
                          Изтриване
                        </div>
                      </div>
                    )}
                  </div>
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
            ))
          ) : (
            <p style={{ textAlign: "center", width: "100%", gridColumn: "1/-1", opacity: 0.7 }}>
              Нямаш история на гледане 😢
            </p>
          )}
        </div>
      )}

      <div className="pagination">
        {[1, 2, 3, 4, 5].map((page) => (
          <button
            key={page}
            className={`page-btn ${currentPage === page ? "active" : ""}`}
            onClick={() => handlePageClick(page)}
          >
            {page}
          </button>
        ))}
        {hasNextPage && (
          <button
            className="page-btn"
            onClick={() => handlePageClick(currentPage + 1)}
          >
            ›
          </button>
        )}
      </div>
    </main>
  );
};

export default WatchHistory;

