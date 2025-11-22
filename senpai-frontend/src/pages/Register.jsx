import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { redirectToServerDown } from "../utils/serverDownRedirect";

const Register = () => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // Грешки по полета
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({}); // Изчистваме полевите грешки

    try {
      const resp = await fetch("http://localhost:8080/api/v1/member/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (resp.status === 201) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 2000);
      } else {
        const errData = await resp.json().catch(() => ({}));

        // Проверка за валидационни грешки (400 Bad Request)
        if (resp.status === 400 && errData && typeof errData === 'object') {
          // Валидационните грешки са Map<String, String> където ключът е полето
          const validationErrors = {};
          Object.keys(errData).forEach(field => {
            if (errData[field] && typeof errData[field] === 'string') {
              validationErrors[field] = errData[field];
            }
          });
          
          if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors);
            // Показваме и общо съобщение
            const firstError = Object.values(validationErrors)[0];
            setError(`Валидационна грешка: ${firstError}`);
          } else {
            // Ако не са валидационни, показваме обща грешка
            if (errData.message) {
              setError(errData.message);
            } else if (Object.keys(errData).length > 0) {
              const firstError = Object.values(errData)[0];
              setError(firstError);
            } else {
              setError("Регистрацията неуспешна!");
            }
          }
        } else {
          // Други грешки (409 Conflict, 500, etc.)
          if (errData.message) {
            setError(errData.message);
          }
          else if (typeof errData === "object" && Object.keys(errData).length > 0) {
            const firstError = Object.values(errData)[0];
            setError(firstError);
          }
          else {
            setError("Регистрацията неуспешна!");
          }
        }
      }
    } catch (err) {
      console.error("❌ Register error:", err);
      redirectToServerDown();
      setError("Сървърна грешка, опитай по-късно!");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Регистрация</h1>
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
            <label>Имейл</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className={fieldErrors.email ? "error-input" : ""}
            />
            {fieldErrors.email && (
              <span className="field-error">{fieldErrors.email}</span>
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

          {error && <p className="error">{error}</p>}
          {success && <p className="success">✅ Регистрацията успешна!</p>}

          <button type="submit" className="btn btn-primary">
            Създай акаунт
          </button>
        </form>

        <p className="redirect">
          Вече имаш акаунт? <a href="/login">Влез тук</a>
        </p>
      </div>
    </div>
  );
};

export default Register;
