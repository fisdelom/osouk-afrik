import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("osouk.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT,
    image TEXT,
    in_stock INTEGER DEFAULT 1,
    promo_price REAL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    total REAL NOT NULL,
    items TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed products if empty
const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
if (productCount.count === 0) {
  const insert = db.prepare("INSERT INTO products (name, description, price, category, image) VALUES (?, ?, ?, ?, ?)");
  const products = [
    ["Attiéké Frais", "Semoule de manioc fermentée, spécialité ivoirienne.", 25, "Féculents", "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"],
    ["Igname", "Igname de qualité supérieure, idéal pour vos plats.", 35, "Légumes", "https://images.unsplash.com/photo-1595856461939-2fe8b6951214?w=500&q=80"],
    ["Banane Plantain", "Bananes plantains mûres ou vertes selon arrivage.", 20, "Légumes", "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=500&q=80"],
    ["Piment Rouge", "Piments forts pour relever vos sauces.", 15, "Condiments", "https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?w=500&q=80"],
    ["Huile de Palme", "Huile de palme rouge naturelle.", 45, "Huilerie", "https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=500&q=80"],
    ["Poisson Salé", "Poisson séché et salé pour vos bouillons.", 60, "Protéines", "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=500&q=80"],
  ];
  products.forEach(p => insert.run(...p));
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // API Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.get("/api/orders", (req, res) => {
    try {
      const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", (req, res) => {
    const { customer_name, email, phone, address, city, total, items, payment_method } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO orders (customer_name, email, phone, address, city, total, items, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(customer_name, email, phone, address, city, total, JSON.stringify(items), payment_method);

      // Simulation: Envoi d'Alerte Email / WhatsApp
      console.log(`\n🔔 NOUVELLE COMMANDE REÇUE (Alerte WhatsApp simulée) :`);
      console.log(`Client: ${customer_name} | Tel: ${phone}`);
      console.log(`Total: ${total} DH | Paiement: ${payment_method}`);
      console.log(`Lien d'administration rapide: http://localhost:3000/#admin\n`);

      res.json({ success: true, orderId: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.post("/api/products", (req, res) => {
    const { name, description, price, category, image, in_stock, promo_price } = req.body;
    try {
      db.prepare(`INSERT INTO products (name, description, price, category, image, in_stock, promo_price) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(name, description, price, category, image, in_stock ? 1 : 0, promo_price || null);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error adding product" }); }
  });

  app.put("/api/products/:id", (req, res) => {
    const { name, description, price, category, image, in_stock, promo_price } = req.body;
    try {
      db.prepare(`UPDATE products SET name=?, description=?, price=?, category=?, image=?, in_stock=?, promo_price=? WHERE id=?`).run(name, description, price, category, image, in_stock ? 1 : 0, promo_price || null, req.params.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error updating product" }); }
  });

  app.delete("/api/products/:id", (req, res) => {
    try {
      db.prepare(`DELETE FROM products WHERE id=?`).run(req.params.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error deleting product" }); }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
