import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import { authMiddleware } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

app.use(cors());
app.use(express.json());

const createToken = (user) =>
  jwt.sign({ id: user.id, login: user.login }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

app.post("/api/auth/register", async (req, res) => {
  const { email, login, password, firstName, lastName } = req.body;

  if (!email || !login || !password || !firstName) {
    return res.status(400).json({ error: "Заполните обязательные поля" });
  }

  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR login = $2",
      [email, login]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "Пользователь уже существует" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      `INSERT INTO users (email, login, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, login, first_name, last_name, status`,
      [email, login, passwordHash, firstName, lastName || null]
    );

    const user = userResult.rows[0];

    const chatResult = await pool.query(
      `INSERT INTO chats (title, status, location, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ["Личный канал", "Активен", "Локальный сектор", user.id]
    );

    await pool.query(
      `INSERT INTO chat_members (chat_id, user_id)
       VALUES ($1, $2)`,
      [chatResult.rows[0].id, user.id]
    );

    await pool.query(
      `INSERT INTO messages (chat_id, user_id, content)
       VALUES ($1, $2, $3)`,
      [chatResult.rows[0].id, user.id, "Добро пожаловать!"]
    );

    const token = createToken({ id: user.id, login: user.login });
    return res.json({ token, user });
  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: "Введите логин и пароль" });
  }

  try {
    const userResult = await pool.query(
      `SELECT id, email, login, password_hash, first_name, last_name, status
       FROM users
       WHERE login = $1`,
      [login]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    const token = createToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        login: user.login,
        first_name: user.first_name,
        last_name: user.last_name,
        status: user.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.get("/api/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, login, first_name, last_name, status
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.get("/api/chats", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        chats.id,
        chats.title,
        chats.status,
        chats.location,
        chats.is_direct,
        COUNT(chat_members.user_id)::int AS members,
        MAX(messages.created_at) AS last_message_at,
        (ARRAY_REMOVE(ARRAY_AGG(messages.content ORDER BY messages.created_at DESC), NULL))[1] AS last_message,
        MAX(
          CASE
            WHEN chats.is_direct AND users.id <> $1 THEN
              COALESCE(NULLIF(TRIM(COALESCE(users.first_name, '') || ' ' || COALESCE(users.last_name, '')), ''), users.login)
          END
        ) AS direct_title
      FROM chats
      JOIN chat_members ON chat_members.chat_id = chats.id
      JOIN users ON users.id = chat_members.user_id
      LEFT JOIN messages ON messages.chat_id = chats.id
      WHERE chat_members.user_id = $1
      GROUP BY chats.id
      ORDER BY last_message_at DESC NULLS LAST`,
      [req.user.id]
    );

    const chats = result.rows.map((chat) => ({
      id: chat.id,
      title: chat.is_direct ? chat.direct_title || chat.title : chat.title,
      status: chat.status,
      location: chat.is_direct ? "Личный чат" : chat.location,
      members: `${chat.members} участников`,
      preview: chat.last_message || "Нет сообщений",
      time: chat.last_message_at
        ? new Date(chat.last_message_at).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      unread: 0,
      is_direct: chat.is_direct,
    }));

    return res.json({ chats });
  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.get("/api/chats/:id/messages", authMiddleware, async (req, res) => {
  const chatId = Number(req.params.id);

  if (!chatId) {
    return res.status(400).json({ error: "Некорректный чат" });
  }

  try {
    const memberCheck = await pool.query(
      `SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2`,
      [chatId, req.user.id]
    );

    if (memberCheck.rowCount === 0) {
      return res.status(403).json({ error: "Нет доступа к чату" });
    }

    const result = await pool.query(
      `SELECT messages.id, messages.content, messages.created_at,
              users.first_name, users.last_name, users.login
       FROM messages
       LEFT JOIN users ON users.id = messages.user_id
       WHERE messages.chat_id = $1
       ORDER BY messages.created_at ASC`,
      [chatId]
    );

    const messages = result.rows.map((message) => ({
      id: message.id,
      author: message.first_name
        ? `${message.first_name}${message.last_name ? ` ${message.last_name}` : ""}`
        : message.login,
      role: "",
      content: message.content,
      time: new Date(message.created_at).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isSelf: message.login === req.user.login,
    }));

    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.post("/api/chats", authMiddleware, async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Название обязательно" });
  }

  try {
    const chatResult = await pool.query(
      `INSERT INTO chats (title, created_by)
       VALUES ($1, $2)
       RETURNING id, title, status, location`,
      [title, req.user.id]
    );

    await pool.query(
      `INSERT INTO chat_members (chat_id, user_id)
       VALUES ($1, $2)`,
      [chatResult.rows[0].id, req.user.id]
    );

    return res.status(201).json({ chat: chatResult.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.post("/api/chats/direct", authMiddleware, async (req, res) => {
  const { login } = req.body;
  if (!login) {
    return res.status(400).json({ error: "Логин обязателен" });
  }

  try {
    const targetResult = await pool.query(
      `SELECT id, login, first_name, last_name
       FROM users
       WHERE login = $1`,
      [login]
    );

    if (targetResult.rowCount === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const target = targetResult.rows[0];
    if (target.id === req.user.id) {
      return res.status(400).json({ error: "Нельзя создать чат с собой" });
    }

    const directKey = [req.user.id, target.id].sort((a, b) => a - b).join(":");

    const existing = await pool.query(
      `SELECT id, title, status, location, is_direct
       FROM chats
       WHERE direct_key = $1`,
      [directKey]
    );

    if (existing.rowCount > 0) {
      return res.json({ chat: existing.rows[0] });
    }

    const title = target.first_name
      ? `${target.first_name}${target.last_name ? ` ${target.last_name}` : ""}`
      : target.login;

    const chatResult = await pool.query(
      `INSERT INTO chats (title, status, location, is_direct, direct_key, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, status, location, is_direct`,
      [title, "Личный", "Личный чат", true, directKey, req.user.id]
    );

    await pool.query(
      `INSERT INTO chat_members (chat_id, user_id)
       VALUES ($1, $2), ($1, $3)`,
      [chatResult.rows[0].id, req.user.id, target.id]
    );

    return res.status(201).json({ chat: chatResult.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.post("/api/chats/:id/members", authMiddleware, async (req, res) => {
  const chatId = Number(req.params.id);
  const { login } = req.body;

  if (!chatId || !login) {
    return res.status(400).json({ error: "Некорректные данные" });
  }

  try {
    const memberCheck = await pool.query(
      `SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2`,
      [chatId, req.user.id]
    );

    if (memberCheck.rowCount === 0) {
      return res.status(403).json({ error: "Нет доступа к чату" });
    }

    const userResult = await pool.query(
      `SELECT id FROM users WHERE login = $1`,
      [login]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    await pool.query(
      `INSERT INTO chat_members (chat_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [chatId, userResult.rows[0].id]
    );

    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.get("/api/users", authMiddleware, async (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.json({ users: [] });
  }

  try {
    const result = await pool.query(
      `SELECT id, login, first_name, last_name
       FROM users
       WHERE login ILIKE $1
          OR email ILIKE $1
          OR first_name ILIKE $1
          OR last_name ILIKE $1
       LIMIT 10`,
      [`%${query}%`]
    );

    return res.json({ users: result.rows });
  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.post("/api/chats/:id/messages", authMiddleware, async (req, res) => {
  const chatId = Number(req.params.id);
  const { content } = req.body;

  if (!chatId || !content) {
    return res.status(400).json({ error: "Сообщение пустое" });
  }

  try {
    const memberCheck = await pool.query(
      `SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2`,
      [chatId, req.user.id]
    );

    if (memberCheck.rowCount === 0) {
      return res.status(403).json({ error: "Нет доступа к чату" });
    }

    const result = await pool.query(
      `INSERT INTO messages (chat_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [chatId, req.user.id, content]
    );

    return res.status(201).json({ message: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on ${PORT}`);
});
