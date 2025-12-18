const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const getToken = () => localStorage.getItem("token");

const request = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = data?.error || "Ошибка запроса";
    throw new Error(error);
  }

  return data;
};

export const api = {
  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  register: (payload) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request("/api/me"),
  chats: () => request("/api/chats"),
  messages: (chatId) => request(`/api/chats/${chatId}/messages`),
  sendMessage: (chatId, content) =>
    request(`/api/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
