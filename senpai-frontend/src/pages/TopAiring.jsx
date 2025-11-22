import React, { useEffect, useState } from "react";
import "../styles/more.css";
import { redirectToServerDown } from "../utils/serverDownRedirect";

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
    console.error("Network error (TopAiring):", err);
    redirectToServerDown();
    return {
      ok: false,
      error: err,
      networkError: true,
    };
  }
}

const TopAiring = () => {
  const [animes, setAnimes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

  const loadTopAiringAnimes = async (page = 1) => {
    if (loading) return;
    setLoading(true);

    const result = await safeFetch(`http://localhost:3030/api/v1/animes/top-airing?page=${page}`);

    if (result.ok && result.data?.success) {
      setAnimes(result.data.data?.response || []);
      setHasNextPage(!!result.data.data?.pageInfo?.hasNextPage);
    } else if (!result.networkError) {
      console.error("❌ Error loading top airing animes:", result);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTopAiringAnimes(currentPage);
  }, [currentPage]);

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };

  return (
    <main className="container">
      <div className="page-header">
        <h1>Top Airing Animes</h1>
        <p>Top Airing Animes</p>
      </div>

      {loading ? (
        <div className="loading-spinner"></div>
      ) : (
        <div id="anime-grid">
          {animes.length > 0 ? (
            animes.map((anime, index) => (
              <div key={anime.id} className="anime-card">
                <div className="anime-banner">
                  <img src={anime.poster} alt={anime.title} loading="lazy" />
                  <div className="anime-badge">
                    Top {index + 1 + (currentPage - 1) * 20}
                  </div>
                </div>
                <div className="anime-content">
                  <h3 className="anime-title">{anime.title}</h3>
                  <div className="anime-details">
                    {anime.duration && (
                      <span className="anime-detail anime-duration">
                        ⏱️ {anime.duration}
                      </span>
                    )}
                    {anime.type && (
                      <span className="anime-detail anime-type">{anime.type}</span>
                    )}
                  </div>
                  <a
                      href={`/anime-details?animeId=${anime.id}`}
                      className="btn btn-primary"
                      style={{ width: "100%" }}
                    >
                    Виж детайли
                 </a>
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: "center", width: "100%" }}>
              Няма налични анимета 😢
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

export default TopAiring;
