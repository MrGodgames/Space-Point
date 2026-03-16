import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.warn("[auth] missing token", {
      method: req.method,
      path: req.originalUrl || req.url,
    });
    return res.status(401).json({ error: "Нет токена" });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    console.warn("[auth] empty token", {
      method: req.method,
      path: req.originalUrl || req.url,
    });
    return res.status(401).json({ error: "Нет токена" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    console.warn("[auth] invalid token", {
      method: req.method,
      path: req.originalUrl || req.url,
      message: error?.message,
    });
    return res.status(401).json({ error: "Невалидный токен" });
  }
};
