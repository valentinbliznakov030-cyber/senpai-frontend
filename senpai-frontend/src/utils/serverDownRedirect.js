let redirecting = false;

export function redirectToServerDown() {
  if (typeof window === "undefined") {
    return;
  }

  if (redirecting) {
    return;
  }

  redirecting = true;

  try {
    // Force logout so the next login flow starts clean
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("senpai-force-logout"));
    window.dispatchEvent(new Event("senpai-server-down"));
  } catch (err) {
    console.warn("Could not clear auth storage:", err);
  }

  if (window.location.pathname !== "/500") {
    window.location.href = "/500";
  } else {
    window.location.reload();
  }
}

