import React, { useEffect, useState } from "react";
import Fuse from "fuse.js";
import "../styles/anime-details.css";

const AnimeDetails = () => {
  const params = new URLSearchParams(window.location.search);
  const animeId = params.get("animeId"); // това е HiAnime ID

  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ⚡ ID от Consumet AnimePahe
  const [consumetAnimeId, setConsumetAnimeId] = useState(null);

  // ---------------------------------------------------------
  // 1️⃣ Функция за намиране на animepahe ID чрез Fuse.js
  // ---------------------------------------------------------
  const findConsumetAnimeId = async (animeTitle) => {
    try {
      const resp = await fetch(`http://localhost:3000/anime/animepahe/${encodeURIComponent(animeTitle)}`);
      if (!resp.ok) return null;

      const data = await resp.json();
      if (!data.results?.length) return null;

      const fuse = new Fuse(data.results, {
        keys: ["title"],
        threshold: 0.4,
      });

      const [bestMatch] = fuse.search(animeTitle);
      if (!bestMatch) return null;

      return bestMatch.item.id; // consumetAnimeId
    } catch (err) {
      console.error("❌ Fuse/Consumet error:", err);
      return null;
    }
  };

  // ---------------------------------------------------------
  // 2️⃣ Зареждаме HiAnime API детайлите
  // ---------------------------------------------------------
  useEffect(() => {
    if (!animeId) {
      setError(true);
      setLoading(false);
      return;
    }

    const loadAnimeDetails = async () => {
      try {
        const resp = await fetch(`http://localhost:3030/api/v1/anime/${animeId}`);
        const data = await resp.json();

        if (data.success) {
          setAnime(data.data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("❌ Error loading anime details:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadAnimeDetails();
  }, [animeId]);

  // ---------------------------------------------------------
  // 3️⃣ След като имаме anime.title → търсим Consumet ID
  // ---------------------------------------------------------
  useEffect(() => {
    if (!anime?.title) return;

    (async () => {
      const id = await findConsumetAnimeId(anime.title);
      setConsumetAnimeId(id);
    })();
  }, [anime]);

  // ---------------------------------------------------------
  // UI: Loading / Error
  // ---------------------------------------------------------
  if (loading) {
    return (
      <main className="container">
        <div className="loading-spinner"></div>
      </main>
    );
  }

  if (error || !anime) {
    return (
      <main className="container">
        <div className="card" style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px" }}>
          <h3>Грешка при зареждането</h3>
          <p>Опитай пак по-късно.</p>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // 4️⃣ Генерираме линка за гледане
  // ---------------------------------------------------------
  const watchUrl =
       consumetAnimeId
    ? `/watch?animeTitle=${encodeURIComponent(anime.title)}
    &consumetAnimeId=${consumetAnimeId}
    &hianimeId=${animeId}
    &ep=1`
    : "#";


  return (
    <main className="container anime-details-container">
      {/* Hero Section */}
      <section className="anime-hero">
        <div className="anime-poster">
          <img src={anime.poster} alt={anime.title} />
        </div>

        <div className="anime-info">
          <h1 className="anime-title">{anime.title}</h1>
          <p className="anime-jtitle">{anime.japanese || ""}</p>

          <div className="anime-meta">
            <span className="meta-item">⭐ {anime.MAL_score || "N/A"}</span>
            <span className="meta-item">{anime.type}</span>
            <span className="meta-item">⏱️ {anime.duration}</span>
            <span className="meta-item">{anime.status}</span>
          </div>

          <p className="anime-description">{anime.synopsis}</p>

          <div className="anime-actions">
            {consumetAnimeId ? (
              <a href={watchUrl} className="btn btn-primary">
                Гледай Сега
              </a>
            ) : (
              <button className="btn btn-primary" disabled>
                Зареждаме видео източници...
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="anime-stats">
        <div className="stat-card">
          <div className="stat-value">{anime.MAL_score || "?"}</div>
          <div className="stat-label">Рейтинг</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{anime.rating || "?"}</div>
          <div className="stat-label">Класификация</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{anime.type}</div>
          <div className="stat-label">Тип</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{anime.duration}</div>
          <div className="stat-label">Продължителност</div>
        </div>
      </section>

      {/* More Info */}
      <section className="more-info">
        <div className="section-header">
          <h2>Детайлна Информация</h2>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">Излъчване</div>
            <div className="info-value">
              {anime.aired?.from || "Неизвестно"} – {anime.aired?.to || "?"}
            </div>
          </div>

          <div className="info-item">
            <div className="info-label">Студио</div>
            <div className="info-value">{anime.studios || "Неизвестно"}</div>
          </div>

          <div className="info-item">
            <div className="info-label">Статус</div>
            <div className="info-value">{anime.status}</div>
          </div>

          <div className="info-item">
            <div className="info-label">Жанрове</div>
            <div className="info-value">
              {anime.genres?.map((g) => (
                <span key={g} className="genre-badge">{g}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recommended */}
      <section className="related-section">
        <div className="section-header">
          <h2>Препоръчани</h2>
        </div>

        <div className="anime-grid">
          {anime.recommended?.slice(0, 6).map((rec) => (
            <a key={rec.id} href={`/anime-details?animeId=${rec.id}`} className="related-anime-card">
              <div className="related-anime-banner">
                <img src={rec.poster} alt={rec.title} />
              </div>
              <div className="related-anime-content">
                <h3 className="related-anime-title">{rec.title}</h3>
                <div className="related-anime-meta">
                  <span>{rec.type}</span>
                  <span>⏱️ {rec.duration || "N/A"}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="related-section">
        <div className="section-header">
          <h2>Свързани Анимета</h2>
        </div>

        <div className="anime-grid">
          {anime.related?.slice(0, 6).map((rel) => (
            <a key={rel.id} href={`/anime-details?animeId=${rel.id}`} className="related-anime-card">
              <div className="related-anime-banner">
                <img src={rel.poster} alt={rel.title} />
              </div>
              <div className="related-anime-content">
                <h3 className="related-anime-title">{rel.title}</h3>
                <div className="related-anime-meta">
                  <span>{rel.type}</span>
                  <span>⭐ {rel.MAL_score || "N/A"}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
};

export default AnimeDetails;
