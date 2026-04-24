import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite
const db = new Database('datamind.db');
db.pragma('journal_mode = WAL');

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    displayName TEXT,
    role TEXT DEFAULT 'user',
    subscription TEXT DEFAULT 'free',
    expiresAt TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    datasetName TEXT,
    rowCount INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastModifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(email)
  );

  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT,
    content TEXT,
    sessionId TEXT,
    userId TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(email)
  );

  CREATE TABLE IF NOT EXISTS usageLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    action TEXT,
    dataset TEXT,
    amount INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(email)
  );
`);

const JWT_SECRET = 'standard_321eb37c6c458ecd0f211ab96ea0276e92571b174a2d685ce26a57c02021d920a44693648e0c7c0483193496b43fef8f59d93600aba498c83fe33e50f6899850d28729a844a4b0470a2705a6cdc0705f893195594bb3974777fac474c6b782b8a47794325d75659312287a21f62c979e26687652f480d76d2126afdaf08f359b';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // --- Auth Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- AUTH ROUTES ---
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || typeof email !== 'string') return res.status(400).json({ error: "Email is required" });
      
      const emailLower = email.toLowerCase();
      const existingUser = db.prepare('SELECT email FROM users WHERE email = ?').get(emailLower);

      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const role = (emailLower === 'munna93s@gmail.com') ? 'admin' : 'user';

      db.prepare('INSERT INTO users (email, password, displayName, role) VALUES (?, ?, ?, ?)').run(
        emailLower, hashedPassword, name, role
      );

      const token = jwt.sign({ email: emailLower, role: role }, JWT_SECRET);
      res.status(201).json({ token, user: { email: emailLower, name, role: role } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || typeof email !== 'string') return res.status(400).json({ error: "Email is required" });

      const emailLower = email.toLowerCase();
      const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(emailLower);

      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: "Invalid password" });
      }

      const token = jwt.sign({ email: emailLower, role: user.role }, JWT_SECRET);
      res.json({ token, user: { email: emailLower, name: user.displayName, role: user.role } });
    } catch (err: any) {
      console.error(`Login error for ${req.body.email}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    try {
      const userData: any = db.prepare('SELECT email, displayName, role, subscription, expiresAt FROM users WHERE email = ?').get(req.user.email);
      if (!userData) return res.status(404).json({ error: "User not found" });
      
      res.json({ 
        email: userData.email, 
        name: userData.displayName, 
        role: userData.role,
        subscription: userData.subscription || 'free',
        expiresAt: userData.expiresAt || null
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/user/subscribe", authenticateToken, (req: any, res) => {
    try {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      const expiresAtStr = expiresAt.toISOString();
      
      db.prepare('UPDATE users SET subscription = ?, expiresAt = ? WHERE email = ?').run(
        'pro', expiresAtStr, req.user.email
      );
      
      db.prepare('INSERT INTO usageLogs (userId, action, amount) VALUES (?, ?, ?)').run(
        req.user.email, 'subscription_upgrade', 499
      );

      res.json({ success: true, tier: 'pro', expiresAt: expiresAtStr });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sessions", authenticateToken, (req: any, res) => {
    try {
      const { datasetName, rowCount } = req.body;
      
      const info = db.prepare('INSERT INTO sessions (userId, datasetName, rowCount) VALUES (?, ?, ?)').run(
        req.user.email, datasetName, rowCount
      );
      
      db.prepare('INSERT INTO usageLogs (userId, action, dataset) VALUES (?, ?, ?)').run(
        req.user.email, 'upload', datasetName
      );

      res.json({ id: info.lastInsertRowid, userId: req.user.email, datasetName, rowCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/sessions", authenticateToken, (req: any, res) => {
    try {
      const sessions = db.prepare('SELECT * FROM sessions WHERE userId = ? ORDER BY createdAt DESC LIMIT 10').all(req.user.email);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- AI ANALYSIS ROUTE ---
  app.post("/api/analyze", authenticateToken, async (req: any, res) => {
    try {
      const { messages, context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const genAI = new GoogleGenAI({ apiKey });

      const systemInstruction = `
        You are DataMind AI, a world-class senior data scientist and business intelligence consultant.
        Context: ${JSON.stringify(context)}
        
        GOAL: Provide high-value insights, not just summaries.
        INSTRUCTIONS:
        1. Identify key trends and patterns.
        2. Detect anomalies or outliers in the data.
        3. Suggest actionable business steps based on findings.
        4. Use statistical terms (correlation, mean, variance) where appropriate.
        5. Respond in the user's language (Hindi/English/Hinglish).
        6. Format using professional Markdown.
        
        If the user is a PRO member, provide deeper statistical analysis including potential forecasts.
      `;

      const response = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent({
        contents: messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        generationConfig: {
          // No direct systemInstruction parameter here in some SDK versions, check if we should use specialized constructor
        },
        // Note: Using simpler call as fallback or standard model usage
      });
      
      // Re-initialize with system instruction if possible
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemInstruction,
      });

      const result = await model.generateContent({
        contents: messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
      });

      const text = result.response.text() || "I couldn't generate a response.";

      // Persist Chat History
      db.prepare('INSERT INTO chats (role, content, sessionId, userId) VALUES (?, ?, ?, ?)').run(
        'user', messages[messages.length - 1].content, context.datasetName, req.user.email
      );
      db.prepare('INSERT INTO chats (role, content, sessionId, userId) VALUES (?, ?, ?, ?)').run(
        'model', text, context.datasetName, req.user.email
      );

      // Log usage
      db.prepare('INSERT INTO usageLogs (userId, action) VALUES (?, ?)').run(
        req.user.email, 'ai_analysis'
      );

      res.json({ content: text });
    } catch (err: any) {
      console.error('AI Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chats", authenticateToken, (req: any, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) return res.status(400).json({ error: "sessionId required" });

      const chats = db.prepare('SELECT * FROM chats WHERE userId = ? AND sessionId = ? ORDER BY timestamp ASC').all(req.user.email, sessionId);
      res.json(chats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ADMIN ROUTES ---
  app.get("/api/admin/users", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      const users = db.prepare('SELECT email, displayName, role, subscription, expiresAt, createdAt FROM users').all();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      db.prepare('DELETE FROM users WHERE email = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/stats", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      const usersCount: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
      const logsCount: any = db.prepare('SELECT COUNT(*) as count FROM usageLogs').get();
      res.json({ usersCount: usersCount.count, logsCount: logsCount.count, uptime: process.uptime() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- HEALTH CHECK ---
  app.get("/api/health", (req, res) => {
    let dbStatus = "connected";
    try {
      db.prepare('SELECT 1').get();
    } catch (err: any) {
      dbStatus = `error: ${err.message}`;
    }
    res.json({ 
      status: "ok", 
      engine: "DataMind Express Core (SQLite)",
      database: dbStatus
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

