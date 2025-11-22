import { redirectToServerDown } from "./serverDownRedirect";

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem("jwtToken");

  try {
    const resp = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : undefined,
       ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      },
    });

    // 🔥 Token expired / invalid
    if (resp.status === 401) {
      console.warn("❌ Token expired or invalid");

      localStorage.removeItem("jwtToken");
      window.location.href = "/login";

      return resp;
    }

    if (resp.status === 403) {
      console.warn("⛔ USER BANNED");
      localStorage.removeItem("jwtToken");
      window.location.href = "/banned";
      return resp;
    }

    return resp;

  } catch (error) {
    console.error("🌐 Network error:", error);

    redirectToServerDown();

    return {
      ok: false,
      status: 0,
      error: "NETWORK_ERROR"
    };
  }
}
