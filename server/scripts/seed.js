import "dotenv/config";
import bcrypt from "bcrypt";
import { pool } from "../src/db.js";

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE messages, chat_members, chats, users RESTART IDENTITY CASCADE");

    const passwordHash = await bcrypt.hash("1", 10);
    const userResult = await client.query(
      `INSERT INTO users (email, login, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ["1@example.com", "1", passwordHash, "Александр", ""]
    );
    const userId = userResult.rows[0].id;

    const chatResult = await client.query(
      `INSERT INTO chats (title, status, location, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ["Команда Нова", "Стыковка", "Точка Лагранжа E", userId]
    );
    const chatId = chatResult.rows[0].id;

    await client.query(
      `INSERT INTO chat_members (chat_id, user_id)
       VALUES ($1, $2)`,
      [chatId, userId]
    );

    await client.query(
      `INSERT INTO messages (chat_id, user_id, content)
       VALUES ($1, $2, $3), ($1, $2, $4)`,
      [
        chatId,
        userId,
        "Привет, связь проверена.",
        "Готов к старту."
      ]
    );

    await client.query("COMMIT");
    console.log("Seed complete");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
