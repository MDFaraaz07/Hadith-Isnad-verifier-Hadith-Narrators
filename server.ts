import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";

import path from "path";

const dbPath = path.resolve(process.cwd(), "hadith.db");
console.log(`Initializing database at: ${dbPath}`);
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS narrators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    status TEXT,
    reliability TEXT,
    biography TEXT,
    era TEXT,
    birth TEXT,
    death TEXT,
    teachers TEXT,
    students TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed Initial Data if empty
const count = db.prepare("SELECT COUNT(*) as count FROM narrators").get() as { count: number };
if (count.count === 0) {
  const seedData = [
    {
      name: "Imam Malik ibn Anas",
      status: "Thiqah (Trustworthy)",
      reliability: "Imam of Dar al-Hijrah, highly reliable and foundational scholar.",
      biography: "Founder of the Maliki school of jurisprudence and author of Al-Muwatta.",
      era: "Tabi' al-Tabi'un",
      birth: "93 AH",
      death: "179 AH",
      teachers: JSON.stringify(["Nafi' Mawla Ibn Umar", "Ibn Shihab al-Zuhri"]),
      students: JSON.stringify(["Imam al-Shafi'i", "Abdullah ibn Mubarak"])
    },
    {
      name: "Nafi' Mawla Ibn Umar",
      status: "Thiqah (Trustworthy)",
      reliability: "One of the most reliable narrators from Ibn Umar.",
      biography: "The freed slave of Abdullah ibn Umar and a key link in the 'Golden Chain'.",
      era: "Tabi'un",
      birth: "Unknown",
      death: "117 AH",
      teachers: JSON.stringify(["Abdullah ibn Umar"]),
      students: JSON.stringify(["Imam Malik", "Ayyub al-Sakhtiyani"])
    }
  ];

  const insert = db.prepare(`
    INSERT INTO narrators (name, status, reliability, biography, era, birth, death, teachers, students)
    VALUES (@name, @status, @reliability, @biography, @era, @birth, @death, @teachers, @students)
  `);

  for (const narrator of seedData) {
    insert.run(narrator);
  }
  console.log("Database seeded with initial narrators.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Search Narrators
  app.get("/api/narrators", (req, res) => {
    const { q, sort, order } = req.query;
    let query = "SELECT * FROM narrators";
    const params: any[] = [];

    if (q) {
      query += " WHERE name LIKE ? OR biography LIKE ?";
      params.push(`%${q}%`, `%${q}%`);
    }

    if (sort) {
      const validCols = ["name", "era", "status", "death"];
      if (validCols.includes(sort as string)) {
        query += ` ORDER BY ${sort} ${order === "desc" ? "DESC" : "ASC"}`;
      }
    }

    const results = db.prepare(query).all(...params);
    res.json(results);
  });

  // API: Database Stats
  app.get("/api/stats", (req, res) => {
    const stats = db.prepare("SELECT COUNT(*) as count FROM narrators").get() as { count: number };
    res.json(stats);
  });

  // API: Save Researched Narrator
  app.post("/api/narrators", (req, res) => {
    const data = req.body;

    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO narrators (name, status, reliability, biography, era, birth, death, teachers, students)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(
        data.name,
        data.status,
        data.reliability,
        data.biography,
        data.era,
        data.birth,
        data.death,
        typeof data.teachers === 'string' ? data.teachers : JSON.stringify(data.teachers),
        typeof data.students === 'string' ? data.students : JSON.stringify(data.students)
      );

      res.json({ success: true, id: info.lastInsertRowid });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save narrator" });
    }
  });

  // API: Update Narrator
  app.put("/api/narrators/:id", (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
      const stmt = db.prepare(`
        UPDATE narrators 
        SET name = ?, status = ?, reliability = ?, biography = ?, era = ?, birth = ?, death = ?, teachers = ?, students = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(
        data.name,
        data.status,
        data.reliability,
        data.biography,
        data.era,
        data.birth,
        data.death,
        typeof data.teachers === 'string' ? data.teachers : JSON.stringify(data.teachers),
        typeof data.students === 'string' ? data.students : JSON.stringify(data.students),
        id
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update narrator" });
    }
  });

  // API: Clear All Narrators
  app.delete("/api/narrators", (req, res) => {
    try {
      console.log("Clearing all narrators from database...");
      db.prepare("DELETE FROM narrators").run();
      res.json({ success: true });
    } catch (err) {
      console.error("Clear failed:", err);
      res.status(500).json({ error: "Failed to clear narrators" });
    }
  });

  // API: Delete Single Narrator
  app.delete("/api/narrators/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM narrators WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete failed:", err);
      res.status(500).json({ error: "Failed to delete narrator" });
    }
  });

  // API: FAQs
  app.get("/api/faqs", (req, res) => {
    res.json([
      {
        question: "How does the Isnad Verifier work?",
        answer: "The verifier uses AI trained on classical Hadith sciences to analyze each narrator in a chain. it checks their reliability (Jarh wa Ta'dil) and the continuity of the chain to provide an authenticity grade (Sahih, Hasan, etc.)."
      },
      {
        question: "What sources are used for narrator biographies?",
        answer: "The system references classical works such as Tahdhib al-Tahdhib by Ibn Hajar al-Asqalani, Al-Jarh wa al-Ta'dil by Ibn Abi Hatim, and Mizan al-I'tidal by al-Dhahabi."
      },
      {
        question: "Can I trust the AI's verdict completely?",
        answer: "While the AI is highly accurate in simulating scholarly reasoning, it should be used as a research aid. Final determinations should be cross-referenced with established scholarly works and living experts."
      },
      {
        question: "What do the status terms mean?",
        answer: "Thiqah means Trustworthy, Saduq means Truthful, Da'if means Weak, Majhul means Unknown, and Kadhhab means Liar. These are standard terms in the science of Hadith."
      }
    ]);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
