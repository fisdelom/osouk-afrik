import express from "express";
import { createServer as createViteServer } from "vite";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_PRODUCTS = [
  { id: 1, name: "Attiéké Frais", description: "Semoule de manioc fermentée, spécialité ivoirienne.", price: 25, category: "Féculents", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80", in_stock: 1, promo_price: null },
  { id: 2, name: "Igname", description: "Igname de qualité supérieure, idéal pour vos plats.", price: 35, category: "Légumes", image: "https://images.unsplash.com/photo-1595856461939-2fe8b6951214?w=500&q=80", in_stock: 1, promo_price: null },
  { id: 3, name: "Banane Plantain", description: "Bananes plantains mûres ou vertes selon arrivage.", price: 20, category: "Légumes", image: "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=500&q=80", in_stock: 1, promo_price: null },
  { id: 4, name: "Piment Rouge", description: "Piments forts pour relever vos sauces.", price: 15, category: "Condiments", image: "https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?w=500&q=80", in_stock: 1, promo_price: null },
  { id: 5, name: "Huile de Palme", description: "Huile de palme rouge naturelle.", price: 45, category: "Huilerie", image: "https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=500&q=80", in_stock: 1, promo_price: null },
  { id: 6, name: "Poisson Salé", description: "Poisson séché et salé pour vos bouillons.", price: 60, category: "Protéines", image: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=500&q=80", in_stock: 1, promo_price: null },
];

let fallbackProducts = [...DEFAULT_PRODUCTS];

// PostgreSQL connection pool (Railway injects DATABASE_URL automatically)

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

function isAdminAuthorized(req: express.Request) {
  if (!ADMIN_TOKEN) return true;
  const provided = req.header("x-admin-token");
  return provided === ADMIN_TOKEN;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function parseRequiredNumber(value: unknown, fieldName: string) {
  const normalized = typeof value === "string" ? value.replace(",", ".").trim() : value;
  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return num;
}

function parseOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = typeof value === "string" ? value.replace(",", ".").trim() : value;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function isDatabaseConnectionError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  return ["28P01", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "57P01"].includes(code);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway") ? { rejectUnauthorized: false } : false,
});

// Initialize Database Tables
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC NOT NULL,
      category TEXT,
      image TEXT,
      in_stock INTEGER DEFAULT 1,
      promo_price NUMERIC
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      total NUMERIC NOT NULL,
      items TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Backward-compatible migrations for existing databases
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock INTEGER DEFAULT 1`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price NUMERIC`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

  // Seed products if empty
  const countResult = await pool.query("SELECT COUNT(*) as count FROM products");
  const count = parseInt(countResult.rows[0].count, 10);

  if (count === 0) {
    for (const p of DEFAULT_PRODUCTS) {
      await pool.query(
        "INSERT INTO products (name, description, price, category, image, in_stock, promo_price) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [p.name, p.description, p.price, p.category, p.image, p.in_stock, p.promo_price]
      );
    }
    console.log("✅ Products seeded successfully.");
  }
}

let dbReady = false;

async function initializeDatabaseWithRetry(maxAttempts = 8, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await initDB();
      dbReady = true;
      console.log("✅ Database initialized.");
      return;
    } catch (error) {
      console.error(`⚠️ DB init attempt ${attempt}/${maxAttempts} failed.`);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  console.error("❌ Database initialization failed after retries. API will stay up but DB endpoints may fail until DB is reachable.");
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // ─── API Routes ────────────────────────────────────────────────────────────

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", dbReady });
  });

  app.get("/api/products", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
      res.json(result.rows);
    } catch (error) {
      console.error("⚠️ /api/products DB error, returning fallback products.", error);
      res.json(fallbackProducts);
    }
  });

  app.get("/api/orders", requireAdmin, async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.json([]);
    }
  });

  app.post("/api/orders", async (req, res) => {
    const { customer_name, email, phone, address, city, total, items, payment_method } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO orders (customer_name, email, phone, address, city, total, items, payment_method)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [customer_name, email, phone, address, city, total, JSON.stringify(items), payment_method]
      );

      console.log(`\n🔔 NOUVELLE COMMANDE REÇUE :`);
      console.log(`Client: ${customer_name} | Tel: ${phone}`);
      console.log(`Total: ${total} DH | Paiement: ${payment_method}\n`);

      res.json({ success: true, orderId: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.post("/api/products", requireAdmin, async (req, res) => {
    const { name, description, price, category, image, in_stock, promo_price } = req.body;
    try {
      const parsedPrice = parseRequiredNumber(price, "price");
      const parsedPromoPrice = parseOptionalNumber(promo_price);
      const result = await pool.query(
        "INSERT INTO products (name, description, price, category, image, in_stock, promo_price) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [name, description, parsedPrice, category, image, in_stock ? 1 : 0, parsedPromoPrice]
      );
      const created = result.rows[0];
      fallbackProducts = [...fallbackProducts, created];
      res.json({ success: true, product: created });
    } catch (e) {
      console.error("Error adding product:", e);
      if (isDatabaseConnectionError(e)) {
        const nextId = fallbackProducts.length > 0 ? Math.max(...fallbackProducts.map((p) => Number(p.id) || 0)) + 1 : 1;
        const fallbackCreated = {
          id: nextId,
          name,
          description,
          price: parseRequiredNumber(price, "price"),
          category,
          image,
          in_stock: in_stock ? 1 : 0,
          promo_price: parseOptionalNumber(promo_price),
        };
        fallbackProducts = [...fallbackProducts, fallbackCreated];
        return res.json({ success: true, product: fallbackCreated, persisted: false });
      }
      const dbMessage = typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : null;
      const message = e instanceof Error && e.message.startsWith("Invalid")
        ? e.message
        : dbMessage || "Error adding product";
      res.status(message.startsWith("Invalid") ? 400 : 500).json({ error: message });
    }
  });

  app.put("/api/products/:id", requireAdmin, async (req, res) => {
    const { name, description, price, category, image, in_stock, promo_price } = req.body;
    try {
      const parsedId = Number(req.params.id);
      if (!Number.isInteger(parsedId)) {
        return res.status(400).json({ error: "Invalid product id" });
      }
      const parsedPrice = parseRequiredNumber(price, "price");
      const parsedPromoPrice = parseOptionalNumber(promo_price);
      const result = await pool.query(
        "UPDATE products SET name=$1, description=$2, price=$3, category=$4, image=$5, in_stock=$6, promo_price=$7 WHERE id=$8 RETURNING *",
        [name, description, parsedPrice, category, image, in_stock ? 1 : 0, parsedPromoPrice, parsedId]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ error: "Product not found" });
      }
      const updated = result.rows[0];
      fallbackProducts = fallbackProducts.map((p) => (p.id === updated.id ? updated : p));
      res.json({ success: true, product: updated });
    } catch (e) {
      console.error("Error updating product:", e);
      if (isDatabaseConnectionError(e)) {
        const parsedId = Number(req.params.id);
        if (!Number.isInteger(parsedId)) {
          return res.status(400).json({ error: "Invalid product id" });
        }
        const existing = fallbackProducts.find((p) => Number(p.id) === parsedId);
        if (!existing) {
          return res.status(404).json({ error: "Product not found" });
        }
        const fallbackUpdated = {
          ...existing,
          name,
          description,
          price: parseRequiredNumber(price, "price"),
          category,
          image,
          in_stock: in_stock ? 1 : 0,
          promo_price: parseOptionalNumber(promo_price),
        };
        fallbackProducts = fallbackProducts.map((p) => (Number(p.id) === parsedId ? fallbackUpdated : p));
        return res.json({ success: true, product: fallbackUpdated, persisted: false });
      }
      const dbMessage = typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : null;
      const message = e instanceof Error && e.message.startsWith("Invalid")
        ? e.message
        : dbMessage || "Error updating product";
      res.status(message.startsWith("Invalid") ? 400 : 500).json({ error: message });
    }
  });

  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const deletedId = Number(req.params.id);
      await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
      fallbackProducts = fallbackProducts.filter((p) => p.id !== deletedId);
      res.json({ success: true });
    } catch (e) {
      console.error("Error deleting product:", e);
      if (isDatabaseConnectionError(e)) {
        const deletedId = Number(req.params.id);
        fallbackProducts = fallbackProducts.filter((p) => Number(p.id) !== deletedId);
        return res.json({ success: true, persisted: false });
      }
      res.status(500).json({ error: "Error deleting product" });
    }
  });

  // ─── Frontend ───────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Init DB then start server
startServer()
  .then(() => initializeDatabaseWithRetry())
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });
