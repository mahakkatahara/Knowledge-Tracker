/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from "react";
import { setCachedGeminiKey } from "../utils/quizEngine";
import { API_BASE } from "../api/client";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [geminiKey, setGeminiKey] = useState("");

  useEffect(() => {
    if (user && user.token) {
      // Fetch key from backend
      fetch(`${API_BASE}/topics/gemini-key`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch key");
          return res.json();
        })
        .then((data) => {
          if (data && data.key) {
            setCachedGeminiKey(data.key);
            Promise.resolve().then(() => setGeminiKey(data.key));
          }
        })
        .catch((err) => console.error("Error fetching Gemini key:", err));
    } else {
      setCachedGeminiKey("");
      Promise.resolve().then(() => setGeminiKey(""));
    }
  }, [user]);

  const login = (userData, token) => {
    const data = { ...userData, token };
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };


  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading: false, geminiKey }}>
      {children}
    </AuthContext.Provider>
  );
};


