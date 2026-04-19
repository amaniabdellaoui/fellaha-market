import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App.jsx";

// Polyfill window.storage for the dev environment
window.storage = {
  _store: {},
  get: async (key) => {
    const value = localStorage.getItem(key);
    return value ? { value } : null;
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
  },
  delete: async (key) => {
    localStorage.removeItem(key);
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
