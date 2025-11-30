import React, { useState } from "react";
import { API_ENDPOINTS } from "../config/api";

interface AuthProps {
    onAuthSuccess: (balance: number) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState<boolean>(true); // true for login, false for signup

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const endpoint = isLogin ? API_ENDPOINTS.SIGNIN : API_ENDPOINTS.SIGNUP;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        setMessage(
          isLogin ? "Logged in successfully!" : "Signed up successfully!"
        );
                        onAuthSuccess(data.balance); // Pass balance from backend to the callback
      } else {
        setMessage(data.message || "An error occurred");
      }
    } catch (error) {
      console.error("Auth error:", error);
      setMessage("Network error or server is unreachable.");
    }
  };

  return (
    <div
      style={{
        margin: "20px",
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h2>{isLogin ? "Login" : "Sign Up"}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div style={{ marginTop: "10px" }}>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          style={{ marginTop: "15px", padding: "8px 15px" }}
        >
          {isLogin ? "Login" : "Sign Up"}
        </button>
      </form>
      <p style={{ marginTop: "15px" }}>
        {isLogin ? "Don't have an account?" : "Already have an account?"}
        <button
          onClick={() => setIsLogin(!isLogin)}
          style={{
            background: "none",
            border: "none",
            color: "blue",
            cursor: "pointer",
            textDecoration: "underline",
            marginLeft: "5px",
          }}
        >
          {isLogin ? "Sign Up" : "Login"}
        </button>
      </p>

      {message && (
        <p
          style={{
            marginTop: "10px",
            color: message.includes("successfully") ? "green" : "red",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default Auth;
