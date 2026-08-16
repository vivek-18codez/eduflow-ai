import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (password === "admin123") {
      navigate("/dashboard");
    } else {
      setError("Incorrect Password");
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <h1>🎓 EduFlow AI</h1>

        <h2>Welcome Administrator</h2>

        <p>
          Smart School Management System
        </p>

        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          className="login-input"
        />

        <button
          className="login-btn"
          onClick={handleLogin}
        >
          🔐 Login
        </button>

        {error && (
          <p className="error-text">
            {error}
          </p>
        )}

      </div>

    </div>
  );
}

export default Login;