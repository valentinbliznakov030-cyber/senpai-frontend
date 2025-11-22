import React, { useEffect, useRef, useState } from "react";
import "../styles/forgot.css";
import { redirectToServerDown } from "../utils/serverDownRedirect";

const HUMAN_DELAY_MS = 1000;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("email"); // email | code | password | success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [emailLocked, setEmailLocked] = useState(false);

  const formLoadedAt = useRef(Date.now());

  useEffect(() => {
    formLoadedAt.current = Date.now();
  }, [step]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = expiresAt - Date.now();
      setRemaining(Math.max(diff, 0));
      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatRemaining = () => {
    if (!expiresAt) return "";
    const totalSeconds = Math.max(Math.floor(remaining / 1000), 0);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const isBotSpeed = () => Date.now() - formLoadedAt.current < HUMAN_DELAY_MS;

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (honeypot.trim().length > 0) return;
    if (isBotSpeed()) {
      setError("⛔ Моля, попълнете формата нормално.");
      return;
    }
    if (!email.trim()) {
      setError("Моля, въведете email.");
      return;
    }
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("http://localhost:8080/api/v1/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || "❌ Не успяхме да изпратим кода.");
        return;
      }
      const data = await res.json().catch(() => null);
      const exp = data?.timeExp ? new Date(data.timeExp).getTime() : null;
      setExpiresAt(exp);
      setRemaining(exp ? exp - Date.now() : 0);
      setEmailLocked(true);
      setStatus("✅ Кодът е изпратен! Провери пощата си.");
      setStep("code");
    } catch (err) {
      console.error("Forgot password send error:", err);
      redirectToServerDown();
      setError("Сървърна грешка. Опитай по-късно.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (honeypot.trim().length > 0) return;
    if (isBotSpeed()) {
      setError("⛔ Моля, попълнете формата нормално.");
      return;
    }
    if (!code.trim()) {
      setError("Въведи 6-цифрения код.");
      return;
    }
    if (expiresAt && remaining <= 0) {
      setError("Кодът е изтекъл. Изпрати нов.");
      return;
    }
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("http://localhost:8080/api/v1/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || "❌ Неуспешна верификация на кода.");
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.verified) {
        setStatus("🎉 Кодът е валидиран! Въведи новата си парола.");
        setStep("password");
      } else {
        setError("❌ Кодът не съвпада.");
      }
    } catch (err) {
      console.error("Forgot password verify error:", err);
      redirectToServerDown();
      setError("Сървърна грешка. Опитай по-късно.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (honeypot.trim().length > 0) return;
    if (isBotSpeed()) {
      setError("⛔ Моля, попълнете формата нормално.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Паролата трябва да е поне 6 символа.");
      return;
    }
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("http://localhost:8080/api/v1/forgot-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.changed) {
        setError(data?.message || "❌ Не успяхме да сменим паролата.");
        return;
      }
      localStorage.removeItem("jwtToken");
      window.dispatchEvent(new Event("senpai-force-logout"));
      setStatus("✅ Паролата е обновена успешно! Пренасочваме към вход...");
      setStep("success");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1800);
    } catch (err) {
      console.error("Forgot password confirm error:", err);
      redirectToServerDown();
      setError("Сървърна грешка. Опитай по-късно.");
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <form className="forgot-form" onSubmit={handleSendCode}>
      <div className="step-badge">Стъпка 1 от 3</div>
      <h1>Нулирай паролата си</h1>
      <p className="step-info">Въведи email адреса си и ще ти изпратим 6-цифрен код.</p>

      <div className="input-group">
        <label>Email адрес</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading || emailLocked}
          placeholder="you@example.com"
        />
      </div>

      <div className="honeypot">
        <label>Не попълвай това поле</label>
        <input
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <button className="forgot-btn" type="submit" disabled={loading}>
        {loading ? "Изпращане..." : "Изпрати код"}
      </button>
    </form>
  );

  const renderCodeStep = () => (
    <form className="forgot-form" onSubmit={handleVerifyCode}>
      <div className="step-badge">Стъпка 2 от 3</div>
      <h1>Въведи кода</h1>
      <p className="step-info">
        Изпратихме код на <strong>{email}</strong>. Имаш 10 минути да го въведеш.
      </p>

      <div className="input-group">
        <label>Email адрес</label>
        <input type="email" value={email} disabled />
      </div>

      <div className="input-group">
        <label>6-цифрен код</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          disabled={loading || (expiresAt && remaining <= 0)}
          placeholder="000000"
        />
      </div>

      {expiresAt && (
        <p className={`timer ${remaining <= 0 ? "expired" : ""}`}>
          Оставащо време: {formatRemaining()}
        </p>
      )}

      <button
        className="forgot-btn"
        type="submit"
        disabled={loading || (expiresAt && remaining <= 0)}
      >
        {loading ? "Проверка..." : "Верифицирай кода"}
      </button>
    </form>
  );

  const renderPasswordStep = () => (
    <form className="forgot-form" onSubmit={handleChangePassword}>
      <div className="step-badge">Стъпка 3 от 3</div>
      <h1>Въведи нова парола</h1>
      <p className="step-info">Само ти ще знаеш тази парола. Съхраняваме я криптирано.</p>

      <div className="input-group">
        <label>Email адрес</label>
        <input type="email" value={email} disabled />
      </div>

      <div className="input-group">
        <label>Нова парола</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="********"
        />
      </div>

      <button className="forgot-btn" type="submit" disabled={loading}>
        {loading ? "Записване..." : "Запази новата парола"}
      </button>
    </form>
  );

  const renderSuccess = () => (
    <div className="forgot-form success-state">
      <div className="success-icon">✨</div>
      <h1>Паролата е променена!</h1>
      <p>Ще те пренасочим към страницата за вход до секунда.</p>
    </div>
  );

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        {error && <div className="forgot-error">{error}</div>}
        {status && <div className="forgot-status">{status}</div>}

        {step === "email" && renderEmailStep()}
        {step === "code" && renderCodeStep()}
        {step === "password" && renderPasswordStep()}
        {step === "success" && renderSuccess()}
      </div>
    </div>
  );
}

