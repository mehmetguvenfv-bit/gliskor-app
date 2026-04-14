import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Gemini Setup
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

  // API Routes
  app.post("/api/analyze-food", async (req, res) => {
    try {
      // const { foodName, highGYCount, profileContext, staticData } = req.body;
      // const model = genAI.getGenerativeModel({ 
      //   model: "gemini-3.1-flash-lite-preview",
      //   systemInstruction: "Sen GliSkor uygulamasının uzman beslenme analiz sistemisin..." 
      // });

      res.json({ success: true, message: "API is ready but logic is pending" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
