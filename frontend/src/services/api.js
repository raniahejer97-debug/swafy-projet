import axios from "axios";

const API = axios.create({
  baseURL: "https://swafy-backend.onrender.com/api",
});
/* =========================
    RESPONSE INTERCEPTOR
========================= */
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token && !config.url.includes("/auth/")) {
      //  نضمنو headers موجود
      config.headers = config.headers || {};

      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;