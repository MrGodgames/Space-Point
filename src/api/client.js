const API_URL =
  import.meta.env.VITE_API_URL || "http://46.138.243.148:4000";

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
  createChat: (title) =>
    request("/api/chats", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  createDirectChat: (login) =>
    request("/api/chats/direct", {
      method: "POST",
      body: JSON.stringify({ login }),
    }),
  addMember: (chatId, login) =>
    request(`/api/chats/${chatId}/members`, {
      method: "POST",
      body: JSON.stringify({ login }),
    }),
  searchUsers: (query) =>
    request(`/api/users?query=${encodeURIComponent(query)}`),
  messages: (chatId) => request(`/api/chats/${chatId}/messages`),
  sendMessage: (chatId, content) =>
    request(`/api/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  speedTest: async (bytes = 200000) => {
    const response = await fetch(`${API_URL}/api/speedtest?bytes=${bytes}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Ошибка запроса");
    }

    const buffer = await response.arrayBuffer();
    return { sizeBytes: buffer.byteLength };
  },
};
