import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/watch.css";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../hooks/useAuth";
import { redirectToServerDown } from "../utils/serverDownRedirect";

async function safeFetch(url, options = {}) {
    try {
        const token = localStorage.getItem("jwtToken");
        
        // Don't add Authorization header for external APIs (HiAnime, Consumet)
        // as they don't expect/accept JWT tokens
        // Only add Authorization header for our backend API (localhost:8080)
        const isExternalApi = url.includes('localhost:3030') || url.includes('localhost:3000');
        
        const headers = {
            ...(options.headers || {}),
            // Only add Authorization header for our backend API
            ...(token && !isExternalApi ? { Authorization: `Bearer ${token}` } : {}),
        };

        const res = await fetch(url, {
            ...options,
            headers,
        });
        
        // Check for 500 status - server error
        if (res.status === 500) {
            redirectToServerDown();
            return {
                ok: false,
                data: null,
                status: 500,
                networkError: false,
            };
        }
        
        const data = res.ok ? await res.json() : null;

        return {
            ok: res.ok,
            data,
            status: res.status,
            networkError: false,
        };
    } catch (err) {
        redirectToServerDown();
        return {
            ok: false,
            error: err,
            networkError: true,
        };
    }
}

export default function Watch() {
    const params = new URLSearchParams(window.location.search);
    const navigate = useNavigate();
    const { isLoggedIn, user: authUser } = useAuth();

    const animeTitle = params.get("animeTitle");
    const consumetAnimeId = params.get("consumetAnimeId");
    const hiAnimeId = params.get("hianimeId");
    const episodeNumberFromUrl = parseInt(params.get("ep") || "1");

    if (!consumetAnimeId) {
        return <div className="error">❌ Това аниме не е налично.</div>;
    }

    const [episodes, setEpisodes] = useState([]);
    const [episodeNumber, setEpisodeNumber] = useState(episodeNumberFromUrl);
    const [episodeBackendId, setEpisodeBackendId] = useState(null);


    const [sessionId, setSessionId] = useState(
        sessionStorage.getItem("watch_sessionId") || null
    );
    const [m3u8Link, setM3u8Link] = useState(null);

    const [videoSrc, setVideoSrc] = useState(null);
    const [videoLoading, setVideoLoading] = useState(false);

    const [tracksSrc, setTracksSrc] = useState(null);
    const [subsReady, setSubsReady] = useState(false);
    const [subsLoading, setSubsLoading] = useState(false);
    const [subsVisible, setSubsVisible] = useState(false);
    const [subsError, setSubsError] = useState(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [subsLoginPrompt, setSubsLoginPrompt] = useState(false);

    const [commentsData, setCommentsData] = useState(null);
    const [comments, setComments] = useState([]);
    const [myComments, setMyComments] = useState([]);
    const [otherComments, setOtherComments] = useState([]);
    const [page, setPage] = useState(0);
    const [newComment, setNewComment] = useState("");
    const [isWriting, setIsWriting] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // from the backend DTO


    const [openMenuId, setOpenMenuId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState("");
    
    // COMMENT ERRORS
    const [commentError, setCommentError] = useState(null);
    const [commentLoading, setCommentLoading] = useState(false);
    
    // ANIME/EPISODE LOADING ERRORS
    const [animeEpisodeError, setAnimeEpisodeError] = useState(null);
    const [animeEpisodeLoading, setAnimeEpisodeLoading] = useState(true);



    // GENERAL error
    const [error, setError] = useState(null);

    // VIDEO ERROR overlay
    const [videoError, setVideoError] = useState(null);

    // NEW → Video loads ONLY after Play
    const [isPlaying, setIsPlaying] = useState(false);

    // FAVORITES
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteId, setFavoriteId] = useState(null);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [favoriteError, setFavoriteError] = useState(null);
    const [favoriteLoginPrompt, setFavoriteLoginPrompt] = useState(false);
    const [animeBackendId, setAnimeBackendId] = useState(null);

    /* ============================
       Kill Session
    ============================ */
    const killSession = useCallback(async (id) => {
        if (!id) return;
        await safeFetch(`http://localhost:8081/api/v1/session/${id}`, {
            method: "DELETE",
        });
    }, []);

    /* ============================
       Cleanup on leave
    ============================ */
    useEffect(() => {
        const handleUnload = () => {
            const cached = sessionStorage.getItem("watch_sessionId");
            if (cached) {
                navigator.sendBeacon(
                    `http://localhost:8081/api/v1/session/${cached}`,
                    ""
                );
                sessionStorage.removeItem("watch_sessionId");
            }
        };

        window.addEventListener("beforeunload", handleUnload);
        return () => {
            handleUnload();
            window.removeEventListener("beforeunload", handleUnload);
        };
    }, []);


    useEffect(() => {
    function handleClickOutside(e) {
        // Ако няма меню → игнорирай
        if (!openMenuId) return;

        // Затваряне на менюто, ако щракнем навсякъде по страницата
        setOpenMenuId(null);
    }

    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
}, [openMenuId]);

    /* ============================
       Load Episodes (STATIC) - ПЪРВО!
       ============================ */
    function triggerVideoError(message) {
        setVideoError(message);
        setIsPlaying(false);
        setVideoSrc(null);
        setVideoLoading(false);
        setSubsError(null);
    }

    useEffect(() => {
        async function loadEpisodes() {
            const cacheKey = `watch_episodes_cache_${consumetAnimeId}`;
            const cached = sessionStorage.getItem(cacheKey);

            if (cached) {
                setEpisodes(JSON.parse(cached).episodes);
                return;
            }

            const result = await safeFetch(
                `http://localhost:3000/anime/animepahe/info/${consumetAnimeId}`
            );

            if (result.networkError) {
                triggerVideoError("🔌 Няма връзка със сървъра (episodes).");
                return;
            }

            if (!result.ok || !result.data?.episodes) {
                triggerVideoError("❌ Грешка при зареждане на епизодите.");
                return;
            }

            setEpisodes(result.data.episodes);
            sessionStorage.setItem(cacheKey, JSON.stringify(result.data));
        }

        loadEpisodes().catch((error) => {
            console.error("Error loading episodes:", error);
            triggerVideoError("❌ Грешка при зареждане на епизодите.");
        });
    }, [consumetAnimeId]);

    /* ============================
       FAST: Create/Get Anime & Episode immediately (before video loads)
       This allows comments and favorites to load instantly
       ВАЖНО: Трябва да е СЛЕД Load Episodes, защото зависи от episodes!
       ============================ */
    useEffect(() => {
        async function createOrGetAnimeAndEpisode() {
            // Need: animeTitle, hiAnimeId, episodeNumber, and episodes loaded
            if (!animeTitle || !episodeNumber || episodes.length === 0) {
                setAnimeBackendId(null);
                setEpisodeBackendId(null);
                setAnimeEpisodeLoading(true);
                return;
            }
            
            setAnimeEpisodeLoading(true);
            setAnimeEpisodeError(null);

            const selected = episodes[episodeNumber - 1];
            if (!selected || !selected.url) {
                setAnimeBackendId(null);
                setEpisodeBackendId(null);
                return;
            }

            try {
                // 1) Create/get anime
                const animeRequestBody = { animeTitle };
                if (hiAnimeId) {
                    animeRequestBody.hiAnimeId = hiAnimeId;
                }
                const resA = await safeFetch("http://localhost:8080/api/v1/anime", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(animeRequestBody),
                });

                if (resA.networkError) {
                    setAnimeEpisodeError("🔌 Няма връзка със сървъра. Моля, опитайте отново по-късно.");
                    setAnimeEpisodeLoading(false);
                    return;
                }

                if (resA.status === 500) {
                    // Will redirect to /500 via safeFetch
                    setAnimeEpisodeLoading(false);
                    return;
                }

                if (!resA.ok) {
                    const errorMsg = resA.data?.message || `Грешка при зареждане на анимето (${resA.status})`;
                    setAnimeEpisodeError(`❌ ${errorMsg}. Моля, опитайте отново по-късно.`);
                    setAnimeEpisodeLoading(false);
                    return;
                }

                const animeBackend = resA.data;
                setAnimeBackendId(animeBackend.animeId);

                // 2) Create/get episode
                const resB = await safeFetch("http://localhost:8080/api/v1/episode", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        episodeUrl: selected.url,
                        episodeNumber,
                        animeId: animeBackend.animeId,
                    }),
                });

                if (resB.networkError) {
                    setAnimeEpisodeError("🔌 Няма връзка със сървъра. Моля, опитайте отново по-късно.");
                    setAnimeEpisodeLoading(false);
                    return;
                }

                if (resB.status === 500) {
                    // Will redirect to /500 via safeFetch
                    setAnimeEpisodeLoading(false);
                    return;
                }

                if (!resB.ok) {
                    const errorMsg = resB.data?.message || `Грешка при зареждане на епизода (${resB.status})`;
                    setAnimeEpisodeError(`❌ ${errorMsg}. Моля, опитайте отново по-късно.`);
                    setAnimeEpisodeLoading(false);
                    return;
                }

                const episodeBackend = resB.data;
                setEpisodeBackendId(episodeBackend.episodeId);
                // Save sessionId and m3u8Link for video loading
                if (episodeBackend.sessionId) {
                    setSessionId(episodeBackend.sessionId);
                    sessionStorage.setItem("watch_sessionId", episodeBackend.sessionId);
                }
                if (episodeBackend.m3u8Link) {
                    setM3u8Link(episodeBackend.m3u8Link);
                }
                
                // Clear error on success
                setAnimeEpisodeError(null);
                setAnimeEpisodeLoading(false);
            } catch (err) {
                console.error("Failed to create/get anime/episode early:", err);
                setAnimeEpisodeError("❌ Неочаквана грешка при зареждане на данните. Моля, опитайте отново по-късно.");
                setAnimeEpisodeLoading(false);
            }
        }

        createOrGetAnimeAndEpisode().catch((error) => {
            console.error("Error creating/getting anime and episode:", error);
            setAnimeEpisodeLoading(false);
        });
    }, [animeTitle, hiAnimeId, episodeNumber, episodes]);

    /* ============================
       Load Video ONLY after Play
    ============================ */
    useEffect(() => {
        if (!isPlaying) return; // <-- STOP until user presses Play
        if (episodes.length === 0) return;

        async function loadVideo() {
            setVideoLoading(true);
            setVideoSrc(null);
            setVideoError(null);
            setSubsReady(false);
            setSubsVisible(false);
            setSubsError(null);
            setTracksSrc(null);

            const selected = episodes[episodeNumber - 1];
            if (!selected) {
                setVideoError("❌ Невалиден епизод.");
                setVideoLoading(false);
                return;
            }

            // Check if we have animeBackendId, episodeBackendId, sessionId and m3u8Link (should be set by early useEffect)
            // If not, wait a bit or show error
            if (!animeBackendId || !episodeBackendId || !sessionId || !m3u8Link) {
                setVideoError("❌ Все още зареждаме данните за анимето...");
                setVideoLoading(false);
                return;
            }

            const newSessionId = sessionId;

            const oldSessionId = sessionStorage.getItem("watch_sessionId");
            if (oldSessionId && oldSessionId !== newSessionId) {
                killSession(oldSessionId);
            }

            const convRes = await safeFetch(
                "http://localhost:8080/api/v1/episode/video",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        m3u8Link: m3u8Link,
                        vidName: newSessionId,
                    }),
                }
            );

            if (convRes.networkError) {
                setVideoError("🔌 Няма връзка със стрийминг сървъра.");
                return;
            }

            if (!convRes.ok) {
                setVideoError(
                    convRes.data?.message || "❌ Грешка при конвертиране на видеото."
                );
                return;
            }

            setVideoSrc(
                `http://localhost:8081/api/v1/streaming?vidName=${newSessionId}`
            );

            setVideoLoading(false);

            // Add to watch history if user is logged in
            if (isLoggedIn && episodeBackendId) {
                try {
                    await authFetch(
                        `http://localhost:8080/api/v1/history?episodeId=${episodeBackendId}`,
                        {
                            method: "POST",
                        }
                    );
                    // No need to handle response - it's a fire-and-forget operation
                } catch (error) {
                    // Silently fail - watch history is not critical
                    console.error("Failed to add to watch history:", error);
                }
            }
        }

        loadVideo().catch((error) => {
            console.error("Error loading video:", error);
            setVideoError("❌ Грешка при зареждане на видеото.");
            setVideoLoading(false);
        });
    }, [isPlaying, episodes, episodeNumber, animeBackendId, episodeBackendId, killSession, isLoggedIn]);

    useEffect(() => {
    // Reset comments when episode changes
    setComments([]);
    setMyComments([]);
    setOtherComments([]);
    setCommentsData(null);
    setPage(0);
    setCurrentUser(null);
}, [episodeNumber]);

    async function loadComments() {
        if (!episodeBackendId) return;

        setCommentError(null);
        const result = await safeFetch(
            `http://localhost:8080/api/v1/comments?episodeId=${episodeBackendId}&page=${page}&size=15`
        );

        if (result.networkError) {
            setCommentError("🔌 Няма връзка със сървъра. Моля, опитайте отново.");
            return;
        }

        if (!result.ok) {
            const errorMsg = result.data?.message || `Грешка при зареждане на коментарите (${result.status})`;
            setCommentError(`❌ ${errorMsg}`);
            return;
        }

        const data = result.data;
        setCommentsData(data);

        // Determine current user for splitting comments
        let me = null;
        
        if (data.userLogged) {
            // Strategy 1: Use authUser first (most reliable - comes from AuthContext)
            // Strategy 2: Use currentUser if authUser not available yet
            // Strategy 3: Find user from comments that matches authUser (fallback)
            const userToUse = authUser || currentUser;
            
            if (userToUse) {
                me = userToUse.username;
            } else {
                // Last resort: find user from comments, but only if we can match it with authUser later
                const myUserFromComments = data.comments.find(c => c.commentCreator)?.commentCreator;
                if (myUserFromComments) {
                    me = myUserFromComments.username;
                    setCurrentUser(myUserFromComments);
                }
            }
            
            // Update currentUser if we have authUser but not currentUser
            if (page === 0 && authUser && !currentUser) {
                setCurrentUser(authUser);
            }
            
            // Debug logging
            console.log("🔍 Comment splitting debug:", {
                userLogged: data.userLogged,
                authUser: authUser?.username,
                currentUser: currentUser?.username,
                me: me,
                comments: data.comments.map(c => ({
                    id: c.id,
                    creator: c.commentCreator?.username,
                    isMine: c.commentCreator?.username?.toLowerCase() === me?.toLowerCase()
                }))
            });
        }

        // Case-insensitive comparison for username matching
        const my = data.comments.filter(c => {
            const commentUsername = c.commentCreator?.username?.toLowerCase();
            const myUsername = me?.toLowerCase();
            return commentUsername === myUsername;
        });
        const others = data.comments.filter(c => {
            const commentUsername = c.commentCreator?.username?.toLowerCase();
            const myUsername = me?.toLowerCase();
            return commentUsername !== myUsername;
        });

        if (page === 0) {
            // First page - replace all
            setMyComments(my);
            setOtherComments(others);
            setComments(data.comments);
        } else {
            // Subsequent pages - append
            setMyComments((prev) => [...prev, ...my]);
            setOtherComments((prev) => [...prev, ...others]);
            setComments((prev) => [...prev, ...data.comments]);
        }
    }

    useEffect(() => {
        loadComments().catch((error) => {
            console.error("Error loading comments:", error);
            setCommentError("❌ Неочаквана грешка при зареждане на коментарите.");
        });
    }, [episodeBackendId, page, authUser, isLoggedIn]);

function loadMoreComments() {
    setPage((p) => p + 1);
}

    /* ============================
       Load Favorite Status
    ============================ */
    useEffect(() => {
        async function loadFavoriteStatus() {
            if (!isLoggedIn || !animeBackendId || !animeTitle) {
                setIsFavorite(false);
                setFavoriteId(null);
                return;
            }

            try {
                // Fetch all favorites and check if current anime is in the list
                const resp = await authFetch(
                    "http://localhost:8080/api/v1/favourite?page=1&size=1000"
                );

                if (resp.ok) {
                    const data = await resp.json();
                    const favorites = data.animes || [];
                    
                    // Find favorite that matches current animeTitle
                    // Note: We compare by title since we don't have animeId in the response
                    const matchingFavorite = favorites.find(
                        fav => fav.animeTitle && fav.animeTitle.trim().toLowerCase() === animeTitle.trim().toLowerCase()
                    );
                    
                    if (matchingFavorite) {
                        setIsFavorite(true);
                        setFavoriteId(matchingFavorite.id);
                    } else {
                        setIsFavorite(false);
                        setFavoriteId(null);
                    }
                } else {
                    setIsFavorite(false);
                    setFavoriteId(null);
                }
            } catch (err) {
                console.error("Failed to load favorite status:", err);
                setIsFavorite(false);
                setFavoriteId(null);
            }
        }

        loadFavoriteStatus().catch((error) => {
            console.error("Error loading favorite status:", error);
            setIsFavorite(false);
            setFavoriteId(null);
        });
    }, [isLoggedIn, animeBackendId, animeTitle]);

async function handleAddComment() {
    if (!newComment.trim()) return;
    
    if (!episodeBackendId) {
        setCommentError("⚠️ Моля, заредете епизод първо, за да добавите коментар.");
        return;
    }

    setCommentError(null);
    setCommentLoading(true);

    try {
        const body = {
            episodeId: episodeBackendId,
            content: newComment.trim()
        };

        const res = await authFetch("http://localhost:8080/api/v1/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.message || `Грешка при добавяне на коментар (${res.status})`;
            setCommentError(`❌ ${errorMsg}`);
            setCommentLoading(false);
            return;
        }

        const data = await res.json();

        // Clear comment input
        setNewComment("");
        setIsWriting(false);
        
        // Reload comments to get fresh data from server (including user info)
        await loadComments();
    } catch (error) {
        console.error("Error adding comment:", error);
        setCommentError("❌ Неочаквана грешка при добавяне на коментар.");
    } finally {
        setCommentLoading(false);
    }
}

function toggleMenu(id) {
    setOpenMenuId(prev => prev === id ? null : id);
}

function startEditing(comment) {
    setOpenMenuId(null);
    setEditingId(comment.id);
    setEditContent(comment.content);
}

function cancelEditing() {
    setEditingId(null);
    setEditContent("");
}
async function handleUpdateComment() {
    if (!editingId || !editContent.trim()) return;

    setCommentError(null);
    setCommentLoading(true);

    try {
        const body = {
            commentId: editingId,
            newContent: editContent.trim()
        };

        const res = await authFetch("http://localhost:8080/api/v1/comments", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.message || `Грешка при обновяване на коментар (${res.status})`;
            setCommentError(`❌ ${errorMsg}`);
            setCommentLoading(false);
            return;
        }

        // Update locally
        setMyComments(prev =>
            prev.map(c =>
                c.id === editingId ? { ...c, content: editContent.trim() } : c
            )
        );

        cancelEditing();
    } catch (error) {
        console.error("Error updating comment:", error);
        setCommentError("❌ Неочаквана грешка при обновяване на коментар.");
    } finally {
        setCommentLoading(false);
    }
}

async function handleDeleteComment(commentId) {
    if (!commentId) return;

    setCommentError(null);
    setCommentLoading(true);

    try {
        const res = await authFetch(`http://localhost:8080/api/v1/comments/${commentId}`, {
            method: "DELETE"
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.message || `Грешка при изтриване на коментар (${res.status})`;
            setCommentError(`❌ ${errorMsg}`);
            setCommentLoading(false);
            return;
        }

        // Remove from local state
        setMyComments(prev => prev.filter(c => c.id !== commentId));
        setComments(prev => prev.filter(c => c.id !== commentId));
        setOpenMenuId(null);
    } catch (error) {
        console.error("Error deleting comment:", error);
        setCommentError("❌ Неочаквана грешка при изтриване на коментар.");
    } finally {
        setCommentLoading(false);
    }
}
async function handleDeleteComment(id) {
    const res = await authFetch(`http://localhost:8080/api/v1/comments/${id}`, {
        method: "DELETE"
    });

    if (!res.ok) return;

    setMyComments(prev => prev.filter(c => c.id !== id));
    setOpenMenuId(null);
}



    async function handleToggleFavorite() {
        if (!isLoggedIn) {
            setFavoriteLoginPrompt(true);
            return;
        }

        if (!animeBackendId) {
            setFavoriteError("❌ Анимето все още се зарежда...");
            return;
        }

        setFavoriteLoading(true);
        setFavoriteError(null);

        try {
            if (isFavorite) {
                // Remove from favorites
                // If we have favoriteId, use it; otherwise, we need to find it first
                if (favoriteId) {
                    const resp = await authFetch(
                        `http://localhost:8080/api/v1/favourite/${favoriteId}`,
                        {
                            method: "DELETE",
                        }
                    );

                    if (resp.status === 404) {
                        // Favorite not found - from MemberExceptionHandlers (IllegalArgumentException)
                        const data = await resp.json().catch(() => null);
                        setFavoriteError(data?.message || "❌ Фаворитът не е намерен.");
                        // Still set as not favorite since it doesn't exist
                        setIsFavorite(false);
                        setFavoriteId(null);
                    } else if (resp.ok || resp.status === 204) {
                        setIsFavorite(false);
                        setFavoriteId(null);
                        setFavoriteError(null);
                    } else {
                        const data = await resp.json().catch(() => null);
                        setFavoriteError(data?.message || "❌ Грешка при премахване на фаворита.");
                    }
                } else {
                    // No favoriteId - need to find it first by fetching all favorites
                    const listResp = await authFetch(
                        "http://localhost:8080/api/v1/favourite?page=1&size=1000"
                    );
                    
                    if (listResp.ok) {
                        const listData = await listResp.json().catch(() => null);
                        const favorites = listData?.animes || [];
                        
                        // Find favorite that matches current animeTitle
                        const matchingFavorite = favorites.find(
                            fav => fav.animeTitle && fav.animeTitle.trim().toLowerCase() === animeTitle.trim().toLowerCase()
                        );
                        
                        if (matchingFavorite && matchingFavorite.id) {
                            // Found it - delete it
                            const deleteResp = await authFetch(
                                `http://localhost:8080/api/v1/favourite/${matchingFavorite.id}`,
                                {
                                    method: "DELETE",
                                }
                            );
                            
                            if (deleteResp.ok || deleteResp.status === 204) {
                                setIsFavorite(false);
                                setFavoriteId(null);
                                setFavoriteError(null);
                            } else if (deleteResp.status === 404) {
                                const data = await deleteResp.json().catch(() => null);
                                setFavoriteError(data?.message || "❌ Фаворитът не е намерен.");
                                setIsFavorite(false);
                                setFavoriteId(null);
                            } else {
                                const data = await deleteResp.json().catch(() => null);
                                setFavoriteError(data?.message || "❌ Грешка при премахване на фаворита.");
                            }
                        } else {
                            // Not found in favorites - already removed
                            setIsFavorite(false);
                            setFavoriteId(null);
                            setFavoriteError(null);
                        }
                    } else {
                        setFavoriteError("❌ Грешка при зареждане на фаворитите.");
                    }
                }
            } else {
                // Add to favorites
                const resp = await authFetch(
                    "http://localhost:8080/api/v1/favourite",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            animeId: animeBackendId,
                        }),
                    }
                );

                if (resp.status === 201) {
                    const data = await resp.json().catch(() => null);
                    setIsFavorite(true);
                    if (data?.id) {
                        setFavoriteId(data.id);
                    }
                    // Clear any previous errors on success
                    setFavoriteError(null);
                } else if (resp.status === 409) {
                    // Already exists (EntityAlreadyExistException)
                    const data = await resp.json().catch(() => null);
                    setFavoriteError(data?.message || "❌ Това аниме вече е във фаворитите.");
                    // Still set as favorite
                    setIsFavorite(true);
                } else if (resp.status === 404) {
                    // EntityNotFoundException
                    const data = await resp.json().catch(() => null);
                    setFavoriteError(data?.message || "❌ Анимето не е намерено.");
                } else if (resp.status === 400) {
                    // Validation error
                    const data = await resp.json().catch(() => null);
                    if (data && typeof data === 'object') {
                        const firstError = Object.values(data)[0];
                        setFavoriteError(firstError || "❌ Невалидни данни.");
                    } else {
                        setFavoriteError("❌ Невалидни данни.");
                    }
                } else {
                    const data = await resp.json().catch(() => null);
                    setFavoriteError(data?.message || "❌ Грешка при добавяне на фаворита.");
                }
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
            setFavoriteError("❌ Грешка при обработка на заявката.");
        } finally {
            setFavoriteLoading(false);
        }
    }

    async function handleSubtitles() {
        if (!videoSrc) return;

        if (subsReady) {
            setSubsVisible(!subsVisible);
            return;
        }

            if (!isLoggedIn) {
            setSubsLoginPrompt(true);
            return;
        }

        setSubsLoading(true);
        setSubsError(null);
        setSubsLoginPrompt(false);

        // HiAnime info
        const epRes = await safeFetch(
            `http://localhost:3030/api/v1/episodes/${encodeURIComponent(
                hiAnimeId
            )}`
        );

        if (epRes.networkError) {
            setSubsLoading(false);
            setSubsError("🔌 Не можем да заредим субтитрите.");
            return;
        }

        if (!epRes.ok) {
            setSubsLoading(false);
            setSubsError("❌ Грешка при зареждане на необходимите данни.");
            return;
        }

        const episode = epRes.data.data[episodeNumber - 1];
        if (!episode?.id) {
            setSubsLoading(false);
            setSubsError("❌ Няма наличен ID за субтитрите.");
            return;
        }

        // English subs
        const subRes = await safeFetch(
            `http://localhost:3030/api/v1/stream?id=${encodeURIComponent(
                episode.id
            )}&type=sub&server=hd-2`
        );

        if (subRes.networkError) {
            setSubsLoading(false);
            setSubsError("🔌 Проблем при извличането на субтитри.");
            return;
        }

        if (!subRes.ok) {
            setSubsLoading(false);
            setSubsError("❌ Грешка при извличане на субтитри.");
            return;
        }

        const engTrack = subRes.data.data.tracks.find(
            (tr) => tr.label === "English"
        );

        if (!engTrack) {
            setSubsLoading(false);
            setSubsError("❌ Няма английски субтитри.");
            return;
        }

        // Translate via backend
        const trRes = await authFetch(
            "http://localhost:8080/api/v1/subtitles",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subtitleUrl: engTrack.file,
                    subtitleName: sessionId,
                }),
            }
        );

        // Check for 403 (limit reached)
        if (trRes.status === 403) {
            setSubsLoading(false);
            setSubsError(null);
            setShowUpgradeModal(true);
            return;
        }

        if (!trRes.ok) {
            setSubsLoading(false);
            setSubsError("❌ Неуспешна обработка на субтитрите.");
            return;
        }

        const trData = await trRes.json();

        setTracksSrc(`/subs/${trData.subtitleName}`);
        setSubsReady(true);
        setSubsVisible(true);
        setSubsLoading(false);
        setSubsError(null);
    }

    return (
    <div className="watch-page">
        {/* Anime/Episode Loading Error */}
        {animeEpisodeError && (
            <div className="anime-episode-error-box">
                <span className="anime-episode-error-close" onClick={() => setAnimeEpisodeError(null)}>×</span>
                <div className="anime-episode-error-content">
                    <h4>⚠️ Проблем при зареждане на данните</h4>
                    <p>{animeEpisodeError}</p>
                    <p className="anime-episode-error-note">
                        Без тези данни няма да можете да коментирате или да използвате други функции.
                    </p>
                </div>
            </div>
        )}

        <div className="top-row">
            <div className="video-container">
                <div className="video-wrapper-container">
                <div className="video-wrapper">

                    {!videoError && !isPlaying && (
                        <div className="big-play-overlay">
                            <button
                                className="hsr-btn play-btn"
                                onClick={() => setIsPlaying(true)}
                                disabled={animeEpisodeLoading}
                            >
                                <span className="play-icon">▶</span>
                            </button>
                        </div>
                    )}
                    
                    {/* Loading overlay while anime/episode data is loading */}
                    {animeEpisodeLoading && (
                        <div className="data-loading-overlay">
                            <div className="data-loading-content">
                                <div className="data-loading-spinner"></div>
                                <h3>Зареждане на данни...</h3>
                                <p>Моля, изчакайте докато се заредят данните за анимето и епизода.</p>
                                <p className="data-loading-note">Това е необходимо, за да можете да коментирате и да използвате други функции.</p>
                            </div>
                        </div>
                    )}

                    {videoError && (
                        <div className="video-error-overlay">
                            <div className="video-error-box">
                                <h2>⚠️ Грешка при зареждането</h2>
                                <p>{videoError}</p>
                                <button onClick={() => window.location.reload()}>
                                    Рестартирай страницата
                                </button>
                            </div>
                        </div>
                    )}

                    {videoLoading && (
                        <div className="video-loading-overlay">
                            <div className="spinner"></div>
                        </div>
                    )}

                    <video controls src={videoSrc || null}>
                        {subsVisible && tracksSrc && (
                            <track
                                src={tracksSrc}
                                kind="subtitles"
                                label="Bulgarian"
                                srcLang="bg"
                                default
                            />
                        )}
                    </video>

                </div>
                </div>

                {isPlaying && (
                    <div className="video-controls-bottom">
                        <div className="subs-control">
                            {subsLoginPrompt ? (
                                <div className="subs-login-prompt">
                                    <p>Влезте, за да гледате със субтитри</p>
                                    <button onClick={() => navigate("/login")}>
                                        Вход
                                    </button>
                                    <button onClick={() => setSubsLoginPrompt(false)}>
                                        ×
                                    </button>
                                </div>
                            ) : subsError ? (
                                <div className="subs-error-inline">
                                    {subsError}
                                    <button onClick={() => setSubsError(null)}>×</button>
                                </div>
                            ) : (
                                <button
                                    className={`subs-btn ${
                                        subsLoading || !videoSrc
                                            ? "disabled"
                                            : subsVisible
                                            ? "active"
                                            : ""
                                    }`}
                                    disabled={subsLoading || !videoSrc}
                                    onClick={handleSubtitles}
                                >
                                    <span className="sub-icon">
                                        {subsLoading ? "..." : subsVisible ? "BG−" : "BG+"}
                                    </span>
                                </button>
                            )}
                        </div>

                        <div className="favorite-control">
                            {favoriteLoginPrompt ? (
                                <div className="favorite-login-prompt">
                                    <p>Влезте, за да добавите в любими</p>
                                    <button onClick={() => navigate("/login")}>
                                        Вход
                                    </button>
                                    <button onClick={() => setFavoriteLoginPrompt(false)}>
                                        ×
                                    </button>
                                </div>
                            ) : favoriteError ? (
                                <div className="favorite-error-inline">
                                    {favoriteError}
                                    <button onClick={() => setFavoriteError(null)}>×</button>
                                </div>
                            ) : (
                                <button
                                    className={`favorite-btn ${isFavorite ? "active" : ""}`}
                                    disabled={favoriteLoading || !animeBackendId || animeEpisodeLoading}
                                    onClick={handleToggleFavorite}
                                >
                                    <span className="favorite-icon">
                                        {favoriteLoading ? "..." : isFavorite ? "❤️" : "🤍"}
                                    </span>
                                    <span className="favorite-text">
                                        {favoriteLoading ? "Зареждане..." : isFavorite ? "Премахни" : "Добави"}
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="episodes-panel">
                <h3>List of Episodes</h3>

                {episodes.length === 0 ? (
                    <div className="info">Loading episodes...</div>
                ) : (
                    <div className="episodes-list">
                        {episodes.map((ep, i) => {
                            const epNum = i + 1;
                            return (
                                <div
                                    key={ep.id}
                                    className={`episode-item ${
                                        epNum === episodeNumber ? "active" : ""
                                    }`}
                                    onClick={() => {
                                        const newUrl = `/watch?animeTitle=${encodeURIComponent(
                                            animeTitle
                                        )}&consumetAnimeId=${consumetAnimeId}&hianimeId=${hiAnimeId}&ep=${epNum}`;

                                        window.history.pushState({}, "", newUrl);
                                        setEpisodeNumber(epNum);
                                        setIsPlaying(false);
                                        setVideoSrc(null);
                                    }}
                                >
                                    Episode {epNum}
                                </div>
                            );
                        })}
                        </div>
                )}
            </div>
        </div>

        <div className="comments-wrapper">
            <h3 className="comments-title">Коментари</h3>

            {/* Comment Error Display */}
            {commentError && (
                <div className="comment-error-box">
                    <span className="comment-error-close" onClick={() => setCommentError(null)}>×</span>
                    <p>{commentError}</p>
                </div>
            )}

            {/* Add comment box - Only for logged in users */}
            {isLoggedIn ? (
                <div className="comment-add-box">
                    <div className="comment-user-avatar">
                        {(currentUser?.username || authUser?.username || "?")?.charAt(0).toUpperCase()}
                    </div>

                    <div className="comment-input-wrapper">
                        <input
                            className="comment-input"
                            placeholder={animeEpisodeLoading ? "Зареждане на данни..." : (episodeBackendId ? "Добавете коментар…" : "Заредете епизод, за да коментирате…")}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onFocus={() => {
                                if (animeEpisodeLoading) {
                                    return;
                                }
                                if (episodeBackendId) {
                                    setIsWriting(true);
                                } else {
                                    alert("Моля, заредете епизод първо, за да коментирате.");
                                }
                            }}
                            disabled={!episodeBackendId || animeEpisodeLoading}
                            style={{
                                opacity: (episodeBackendId && !animeEpisodeLoading) ? 1 : 0.6,
                                cursor: (episodeBackendId && !animeEpisodeLoading) ? "text" : "not-allowed"
                            }}
                        />

                        {isWriting && episodeBackendId && (
                            <div className="comment-controls">
                                <button
                                    onClick={() => {
                                        setNewComment("");
                                        setIsWriting(false);
                                    }}
                                    disabled={commentLoading}
                                >
                                    Отказ
                                </button>

                                <button
                                    disabled={newComment.trim().length === 0 || commentLoading}
                                    onClick={handleAddComment}
                                >
                                    {commentLoading ? "Зареждане..." : "Коментар"}
                                </button>
                            </div>
                        )}
                        
                    </div>
                </div>
            ) : (
                <div className="comment-login-prompt">
                    <p>Влезте, за да коментирате</p>
                    <button 
                        className="comment-login-btn"
                        onClick={() => navigate("/login")}
                    >
                        Вход
                    </button>
                </div>
            )}

            {/* MY COMMENTS */}
            {myComments.length > 0 && (
                <div className="comments-section-block">
                    {myComments.map((c) => (
                        <div key={c.id} className="comment-item my-comment">
                            <div className="comment-avatar">
                                {(c.commentCreator?.username || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>

                            <div className="comment-body">
                                <div className="comment-header">
                                    <span className="comment-author">
                                        {c.commentCreator?.username || "Неизвестен"}
                                    </span>
                                    <span className="comment-you-tag">(Вие)</span>

                                    <span
                                        className="comment-menu-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleMenu(c.id);
                                        }}
                                    >
                                        ⋮
                                    </span>

                                    {openMenuId === c.id && (
                                        <div
                                            className="comment-menu"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div onClick={() => startEditing(c)}>
                                                Редактиране
                                            </div>
                                            <div onClick={() => handleDeleteComment(c.id)}>
                                                Изтриване
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {editingId === c.id ? (
                                    <div className="edit-section">
                                        <input
                                            className="edit-input"
                                            value={editContent}
                                            onChange={(e) =>
                                                setEditContent(e.target.value)
                                            }
                                        />

                                        <div className="edit-controls">
                                            <button 
                                                onClick={cancelEditing}
                                                disabled={commentLoading}
                                            >
                                                Отказ
                                            </button>
                                            <button
                                                disabled={
                                                    editContent.trim().length === 0 || commentLoading
                                                }
                                                onClick={handleUpdateComment}
                                            >
                                                {commentLoading ? "Зареждане..." : "Ъпдейт"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="comment-content">
                                        {c.content}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* OTHER COMMENTS */}
            {otherComments.length > 0 && (
                <div className="comments-section-block">
                    {otherComments.map((c) => (
                        <div key={c.id} className="comment-item">
                            <div className="comment-avatar">
                                {(c.commentCreator?.username || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>

                            <div className="comment-body">
                                <div className="comment-header">
                                    <span className="comment-author">
                                        {c.commentCreator?.username || "Неизвестен"}
                                    </span>
                                </div>

                                <div className="comment-content">{c.content}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* EMPTY STATE - No comments */}
            {commentsData && myComments.length === 0 && otherComments.length === 0 && (
                <div className="comments-empty">
                    <p>Все още няма коментари. {isLoggedIn ? "Бъдете първият, който коментира!" : "Влезте, за да коментирате."}</p>
                </div>
            )}

            {/* Loading state - comments not loaded yet */}
            {!commentsData && episodeBackendId && !animeEpisodeLoading && (
                <div className="comments-loading">
                    <p>Зареждане на коментари...</p>
                </div>
            )}

            {/* Loading state - anime/episode data loading */}
            {animeEpisodeLoading && (
                <div className="comments-data-loading">
                    <div className="comments-data-loading-spinner"></div>
                    <h4>Зареждане на данни...</h4>
                    <p>Моля, изчакайте докато се заредят данните за анимето и епизода.</p>
                    <p className="comments-data-loading-note">Това е необходимо, за да можете да коментирате и да използвате други функции.</p>
                </div>
            )}

            {/* No episode loaded state - only show if not loading */}
            {!episodeBackendId && !animeEpisodeLoading && (
                <div className="comments-empty">
                    <p>Заредете епизод, за да видите коментари.</p>
                </div>
            )}

            {/* LOAD MORE BUTTON */}
            {commentsData && !commentsData.last && (myComments.length > 0 || otherComments.length > 0) && (
                <button className="load-more-btn" onClick={loadMoreComments}>
                    Зареди още
                </button>
            )}
        </div>

        {error && <div className="error-box">{error}</div>}

        {/* Upgrade Modal */}
        {showUpgradeModal && (
            <div className="upgrade-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
                <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
                    <button 
                        className="upgrade-modal-close"
                        onClick={() => setShowUpgradeModal(false)}
                    >
                        ×
                    </button>
                    <div className="upgrade-modal-content">
                        <h2>⭐ Премиум План Необходим</h2>
                        <p>
                            Достигнахте лимита за безплатния план. За да продължите да гледате със субтитри, 
                            моля надградете към Премиум план.
                        </p>
                        <button 
                            className="upgrade-modal-btn"
                            onClick={() => {
                                // TODO: Navigate to plans page when it's ready
                                navigate("/plans");
                            }}
                        >
                            Виж Планове
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);
}
