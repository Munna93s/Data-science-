import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
}

const db = getFirestore(admin.apps[0], firebaseConfig.firestoreDatabaseId);
const JWT_SECRET = process.env.JWT_SECRET || 'datamind-secret-key-2024';

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
      
      const userRef = db.collection('users').doc(email.toLowerCase());
      const doc = await userRef.get();

      if (doc.exists) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const role = (email.toLowerCase() === 'munna93s@gmail.com') ? 'admin' : 'user'; // Dev override
      const userData = {
        email,
        password: hashedPassword,
        displayName: name,
        role: role,
        createdAt: FieldValue.serverTimestamp()
      };

      await userRef.set(userData);
      const token = jwt.sign({ email, role: role }, JWT_SECRET);
      res.status(201).json({ token, user: { email, name, role: role } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || typeof email !== 'string') return res.status(400).json({ error: "Email is required" });

      const userRef = db.collection('users').doc(email.toLowerCase());
      const doc = await userRef.get();

      if (!doc.exists) {
        return res.status(400).json({ error: "User not found" });
      }

      const user = doc.data()!;
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: "Invalid password" });
      }

      const token = jwt.sign({ email, role: user.role }, JWT_SECRET);
      res.json({ token, user: { email, name: user.displayName, role: user.role } });
    } catch (err: any) {
      console.error(`Login error for ${req.body.email}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const userDoc = await db.collection('users').doc(req.user.email.toLowerCase()).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      const userData = userDoc.data()!;
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

  app.post("/api/user/subscribe", authenticateToken, async (req: any, res) => {
    try {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      
      await db.collection('users').doc(req.user.email).update({
        subscription: 'pro',
        expiresAt: Timestamp.fromDate(expiresAt)
      });
      
      await db.collection('usageLogs').add({
        userId: req.user.email,
        action: 'subscription_upgrade',
        amount: 499,
        timestamp: FieldValue.serverTimestamp()
      });

      res.json({ success: true, tier: 'pro', expiresAt });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sessions", authenticateToken, async (req: any, res) => {
    try {
      const { datasetName, rowCount } = req.body;
      const sessionData = {
        userId: req.user.email,
        datasetName,
        rowCount,
        createdAt: FieldValue.serverTimestamp(),
        lastModifiedAt: FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('sessions').add(sessionData);
      
      await db.collection('usageLogs').add({
        userId: req.user.email,
        action: 'upload',
        dataset: datasetName,
        timestamp: FieldValue.serverTimestamp()
      });

      res.json({ id: docRef.id, ...sessionData });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/sessions", authenticateToken, async (req: any, res) => {
    try {
      const snap = await db.collection('sessions')
        .where('userId', '==', req.user.email)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      const sessions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

      const response = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        }
      });
      
      const text = response.text || "I couldn't generate a response.";

      // Persist Chat History
      const chatRef = db.collection('chats');
      await chatRef.add({
        role: 'user',
        content: messages[messages.length - 1].content,
        sessionId: context.datasetName,
        userId: req.user.email,
        timestamp: FieldValue.serverTimestamp()
      });
      await chatRef.add({
        role: 'model',
        content: text,
        sessionId: context.datasetName,
        userId: req.user.email,
        timestamp: FieldValue.serverTimestamp()
      });

      // Log usage
      await db.collection('usageLogs').add({
        userId: req.user.email,
        action: 'ai_analysis',
        timestamp: FieldValue.serverTimestamp()
      });

      res.json({ content: text });
    } catch (err: any) {
      console.error('AI Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chats", authenticateToken, async (req: any, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) return res.status(400).json({ error: "sessionId required" });

      const snap = await db.collection('chats')
        .where('userId', '==', req.user.email)
        .where('sessionId', '==', sessionId)
        .orderBy('timestamp', 'asc')
        .get();

      const chats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(chats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ADMIN ROUTES ---
  app.get("/api/admin/users", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      const usersSnap = await db.collection('users').get();
      const users = usersSnap.docs.map(d => {
        const data = d.data();
        delete data.password;
        return { id: d.id, ...data };
      });
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      await db.collection('users').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/stats", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      const usersCount = (await db.collection('users').count().get()).data().count;
      const logsCount = (await db.collection('usageLogs').count().get()).data().count;
      res.json({ usersCount, logsCount, uptime: process.uptime() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- HEALTH CHECK ---
  app.get("/api/health", async (req, res) => {
    let dbStatus = "unknown";
    try {
      await db.collection('users').limit(1).get();
      dbStatus = "connected";
    } catch (err: any) {
      dbStatus = `error: ${err.message}`;
    }
    res.json({ 
      status: "ok", 
      engine: "DataMind Express Core",
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

