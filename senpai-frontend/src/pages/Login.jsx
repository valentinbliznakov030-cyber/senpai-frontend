import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { useAuth } from "../hooks/useAuth";
import { redirectToServerDown } from "../utils/serverDownRedirect";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // Грешки по полета
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({}); // Изчистваме полевите грешки

    try {
      const resp = await fetch("http://localhost:8080/api/v1/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await resp.json().catch(() => null);

      if (resp.ok && data?.token) {
        // 🟢 ТОКЕН + MEMBER ДАННИ
        login(data.token, data.member);

        setSuccess(true);

        setTimeout(() => {
          navigate("/profile");
        }, 600);

      } else {
        // Проверка за валидационни грешки (400 Bad Request)
        if (resp.status === 400 && data && typeof data === 'object') {
          // Валидационните грешки са Map<String, String> където ключът е полето
          const validationErrors = {};
          Object.keys(data).forEach(field => {
            if (data[field] && typeof data[field] === 'string') {
              validationErrors[field] = data[field];
            }
          });
          
          if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors);
            // Показваме и общо съобщение
            const firstError = Object.values(validationErrors)[0];
            setError(`Валидационна грешка: ${firstError}`);
          } else {
            // Ако не са валидационни, показваме обща грешка
            const msg =
              data?.message ||
              data?.error ||
              "Неуспешен вход. Провери данните.";
            setError(msg);
          }
        } else {
          // Други грешки (401, 500, etc.)
          const msg =
            data?.message ||
            data?.error ||
            "Неуспешен вход. Провери данните.";
          setError(msg);
        }
      }

    } catch (err) {
      console.error("❌ Login error:", err);
      redirectToServerDown();
      setError("Сървърна грешка, опитай по-късно!");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Вход</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Потребителско име</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              className={fieldErrors.username ? "error-input" : ""}
            />
            {fieldErrors.username && (
              <span className="field-error">{fieldErrors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label>Парола</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className={fieldErrors.password ? "error-input" : ""}
            />
            {fieldErrors.password && (
              <span className="field-error">{fieldErrors.password}</span>
            )}
          </div>

          <p className="forgot-password">
            <a href="/forgot-password">Забравена парола?</a>
          </p>

          {error && <p className="error">{error}</p>}
          {success && <p className="success">✔ Успешен вход!</p>}

          <button type="submit" className="btn btn-primary">
            Влез
          </button>
        </form>

        <p className="redirect">
          Нямаш акаунт? <a href="/register">Регистрирай се</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
