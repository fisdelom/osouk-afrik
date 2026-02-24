import express from "express";
import { createServer as createViteServer } from "vite";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// PostgreSQL connection pool (Railway injects DATABASE_URL automatically)
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

  // Seed products if empty
  const countResult = await pool.query("SELECT COUNT(*) as count FROM products");
  const count = parseInt(countResult.rows[0].count, 10);

  if (count === 0) {
    const seedProducts = [
      ["Attiéké Frais", "Semoule de manioc fermentée, spécialité ivoirienne.", 25, "Féculents", "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"],
      ["Igname", "Igname de qualité supérieure, idéal pour vos plats.", 35, "Légumes", "https://images.unsplash.com/photo-1595856461939-2fe8b6951214?w=500&q=80"],
      ["Banane Plantain", "Bananes plantains mûres ou vertes selon arrivage.", 20, "Légumes", "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=500&q=80"],
      ["Piment Rouge", "Piments forts pour relever vos sauces.", 15, "Condiments", "https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?w=500&q=80"],
      ["Huile de Palme", "Huile de palme rouge naturelle.", 45, "Huilerie", "https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=500&q=80"],
      ["Poisson Salé", "Poisson séché et salé pour vos bouillons.", 60, "Protéines", "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=500&q=80"],
    ];
    for (const p of seedProducts) {
      await pool.query(
        "INSERT INTO products (name, description, price, category, image) VALUES ($1, $2, $3, $4, $5)",
        p
      );
    }
    console.log("✅ Products seeded successfully.");
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // ─── API Routes ────────────────────────────────────────────────────────────

  app.get("/api/products", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
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

  app.post("/api/products", async (req, res) => {
    const { name, description, price, category, image, in_stock, promo_price } = req.body;
    try {
      await pool.query(
        "INSERT INTO products (name, description, price, category, image, in_stock, promo_price) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [name, description, price, category, image, in_stock ? 1 : 0, promo_price || null]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Error adding product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    const { name, description, price, category, image, in_stock, promo_price } = req.body;
    try {
      await pool.query(
        "UPDATE products SET name=$1, description=$2, price=$3, category=$4, image=$5, in_stock=$6, promo_price=$7 WHERE id=$8",
        [name, description, price, category, image, in_stock ? 1 : 0, promo_price || null, req.params.id]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Error updating product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
      res.json({ success: true });
    } catch (e) {
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
initDB()
  .then(startServer)
  .catch((err) => {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  });
