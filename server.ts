import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Database from 'better-sqlite3';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client, Account } from 'node-appwrite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite for data persistence
const db = new Database('datamind.db');
db.pragma('journal_mode = WAL');

// Create Tables (simplified users table as auth is now via Appwrite)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Appwrite Config for Server
  const appwriteClient = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '');

  // --- Auth Middleware ---
  const authenticateToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // This is the Appwrite JWT
    if (!token) return res.sendStatus(401);

    try {
      const clientWithJwt = new Client()
        .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
        .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '')
        .setJWT(token);

      const account = new Account(clientWithJwt);
      const user = await account.get();
      
      // Ensure user exists in our local DB metadata
      let localUser: any = db.prepare('SELECT * FROM users WHERE email = ?').get(user.email);
      const ADMIN_EMAILS = ['munna93s@gmail.com', 'kolly93m@gmail.com'];
      const correctRole = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'user';

      if (!localUser) {
        db.prepare('INSERT INTO users (email, displayName, role) VALUES (?, ?, ?)').run(
          user.email, user.name, correctRole
        );
        localUser = { email: user.email, role: correctRole, subscription: 'free' };
      } else if (localUser.role !== correctRole) {
        // Force update role if they are in the admin list
        db.prepare('UPDATE users SET role = ? WHERE email = ?').run(correctRole, user.email);
        localUser.role = correctRole;
      }

      req.user = { email: user.email, role: localUser.role, subscription: localUser.subscription };
      next();
    } catch (err) {
      console.error('Appwrite Verification Error details:', err);
      return res.status(403).json({ error: "Authentication failed", details: String(err) });
    }
  };

  const FREE_LIMIT = 2;

  // --- AUTH ROUTES (Cleaned up as Appwrite handles primary auth) ---
  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    try {
      const userData: any = db.prepare('SELECT email, displayName, role, subscription, expiresAt FROM users WHERE email = ?').get(req.user.email);
      if (!userData) return res.status(404).json({ error: "User not found" });
      
      const usage: any = db.prepare('SELECT COUNT(*) as count FROM usageLogs WHERE userId = ? AND action IN ("ai_analysis", "upload")').get(req.user.email);

      res.json({ 
        email: userData.email, 
        name: userData.displayName, 
        role: userData.role,
        subscription: userData.subscription || 'free',
        expiresAt: userData.expiresAt || null,
        usageCount: usage.count,
        usageLimit: FREE_LIMIT
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
      
      // Check limits for free users
      if (req.user.subscription === 'free' && req.user.role !== 'admin') {
        const usage: any = db.prepare('SELECT COUNT(*) as count FROM usageLogs WHERE userId = ? AND action IN ("ai_analysis", "upload")').get(req.user.email);
        if (usage.count >= FREE_LIMIT) {
          return res.status(403).json({ error: "Free trial limit reached. Please upgrade to Pro to continue uploading datasets.", limitReached: true });
        }
      }

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

      // Check limits for free users
      if (req.user.subscription === 'free' && req.user.role !== 'admin') {
        const usage: any = db.prepare('SELECT COUNT(*) as count FROM usageLogs WHERE userId = ? AND action IN ("ai_analysis", "upload")').get(req.user.email);
        if (usage.count >= FREE_LIMIT) {
          return res.status(403).json({ error: "Free trial limit reached. Please upgrade to Pro for unlimited AI analysis.", limitReached: true });
        }
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const genAI = new GoogleGenerativeAI(apiKey);

      const systemInstruction = `
        You are DataMind AI, a world-class senior Data Scientist, SQL Expert, and Business Intelligence consultant.
        Context: ${JSON.stringify(context)}
        
        GOAL: Provide high-value, pro-level data science insights. Act as if you are running Python, SQL, or Excel for the user.
        
        DATA SCIENCE ACTIONS:
        If you want to suggest or change a visualization, or perform a data miracle (like filtering, grouping, or complex SQL-style queries), ALWAYS include a JSON block in your response.
        
        \`\`\`json
        {
          "action": "UPDATE_VISUALIZATION",
          "chartType": "bar" | "line" | "pie" | "scatter" | "area",
          "xAxis": "column_name",
          "yAxis": "column_name",
          "title": "Clear description of the data science insight"
        }
        \`\`\`
        OR
        \`\`\`json
        {
          "action": "UPDATE_SQL",
          "query": "SELECT ... FROM data ...",
          "explanation": "What this SQL transformation achieves"
        }
        \`\`\`
        
        INSTRUCTIONS:
        1. Think like a Data Scientist: Clean, analyze, visualize, and conclude.
        2. Always summarize trends, outliers, and statistical distributions.
        3. Respond in professional Markdown including charts/tables when relevant.
        4. When the user gives a prompt, handle the "No Coding" part by providing the underlying SQL logic or visualization settings via the JSON actions.
        5. Use a mix of Hindi/English (Hinglish) if the user's tone is informal, otherwise maintain professional English.
      `;

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

