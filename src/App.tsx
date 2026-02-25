import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ShoppingBag, X, Plus, Minus, MapPin, Phone, Instagram, CheckCircle2, ChevronRight, Menu } from 'lucide-react';
import { Product, CartItem, OrderData } from './types';

function AdminPanel() {
  const [adminToken, setAdminToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [productActionError, setProductActionError] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [view, setView] = useState<'orders' | 'products'>('orders');
  const [editProduct, setEditProduct] = useState<any>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token') || "";
    if (savedToken) {
      setAdminToken(savedToken);
      setTokenInput(savedToken);
      setIsAuthenticated(true);
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/orders', { headers: { 'x-admin-token': adminToken } })
      .then(async r => {
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      })
      .then(d => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]));
  }, [isAuthenticated, adminToken]);

  const fetchProducts = () => fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => setProducts([]));

  const handleProductSubmit = async (e: any) => {
    e.preventDefault();
    setProductActionError("");
    const fd = new FormData(e.target);
    const in_stock = fd.get('in_stock') === 'on';
    const promo_price_raw = fd.get('promo_price');
    const payload = {
      name: fd.get('name'), description: fd.get('description'),
      price: Number(fd.get('price')), category: fd.get('category'),
      image: fd.get('image'), in_stock: in_stock,
      promo_price: promo_price_raw ? Number(promo_price_raw) : null
    };

    const res = editProduct && editProduct.id
      ? await fetch(`/api/products/${editProduct.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken }, body: JSON.stringify(payload) })
      : await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken }, body: JSON.stringify(payload) });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setProductActionError(err.error || "Échec de l'enregistrement du produit.");
      return;
    }

    setEditProduct(null);
    await fetchProducts();
    e.target.reset();
  };

  const deleteProduct = async (id: number) => {
    if (window.confirm('Supprimer ce produit (CETTE ACTION EST DÉFINITIVE) ?')) {
      setProductActionError("");
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: { 'x-admin-token': adminToken } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setProductActionError(err.error || "Échec de la suppression du produit.");
        return;
      }
      await fetchProducts();
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) {
      setAuthError("Veuillez entrer le code admin.");
      return;
    }
    localStorage.setItem('admin_token', token);
    setAdminToken(token);
    setIsAuthenticated(true);
    setAuthError("");
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAdminToken("");
    setTokenInput("");
    setIsAuthenticated(false);
    setOrders([]);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <form onSubmit={handleAdminLogin} className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 border border-gray-100">
          <h1 className="text-2xl font-serif text-brand-green mb-2">Connexion Admin</h1>
          <p className="text-sm text-gray-500 mb-6">Entrez le code admin pour gérer les produits.</p>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Code admin"
            className="w-full border rounded-xl p-3 mb-3"
          />
          {authError && <p className="text-red-600 text-sm mb-3">{authError}</p>}
          <button type="submit" className="w-full bg-brand-green text-white rounded-xl py-3 font-bold">Se connecter</button>
          <a href="#" className="block text-center text-sm text-gray-500 mt-4 hover:text-brand-green">Retour Boutique</a>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif text-brand-green mb-1">Console d'Administration</h1>
            <div className="flex gap-4 mt-2">
              <button onClick={() => setView('orders')} className={`font-bold px-4 py-1 rounded-full ${view === 'orders' ? 'bg-brand-orange text-white' : 'bg-gray-200 text-gray-500'}`}>Commandes ({orders.length})</button>
              <button onClick={() => setView('products')} className={`font-bold px-4 py-1 rounded-full ${view === 'products' ? 'bg-brand-orange text-white' : 'bg-gray-200 text-gray-500'}`}>Produits ({products.length})</button>
            </div>
          </div>
          <div className="flex items-center gap-2"><button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold hover:bg-red-100 transition-colors border border-red-100">Déconnexion</button><a href="#" className="bg-white text-brand-green px-6 py-2 rounded-full font-bold shadow hover:bg-gray-50 transition-colors border">Retour Boutique</a></div>
        </div>

        {view === 'orders' ? (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-brand-green/5 text-brand-green border-b border-brand-green/10">
                    <th className="p-5 font-bold">Réf</th><th className="p-5 font-bold">Date</th><th className="p-5 font-bold">Client & Contact</th><th className="p-5 font-bold">Livraison</th><th className="p-5 font-bold">Articles</th><th className="p-5 font-bold">Total</th><th className="p-5 font-bold">Paiement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-brand-green/5 transition-colors">
                      <td className="p-5 font-bold text-gray-700">#{o.id}</td>
                      <td className="p-5 text-gray-600 font-medium">{new Date(o.created_at).toLocaleDateString()}<br /><span className="text-sm text-gray-400">{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                      <td className="p-5 font-bold text-gray-800">{o.customer_name}<div className="text-sm font-normal text-gray-500">{o.phone}</div><div className="text-sm font-normal text-gray-400">{o.email || '-'}</div></td>
                      <td className="p-5 font-semibold text-gray-700">{o.city}<div className="text-sm font-normal text-gray-500 max-w-[200px] truncate" title={o.address}>{o.address}</div></td>
                      <td className="p-5"><details className="text-sm group relative"><summary className="text-brand-orange font-bold cursor-pointer list-none select-none">Voir {JSON.parse(o.items || '[]').length} articles</summary><div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">{JSON.parse(o.items || '[]').map((item: any, i: number) => (<div key={i}>• {item.quantity}x {item.name}</div>))}</div></details></td>
                      <td className="p-5 font-black text-brand-green">{o.total} DH</td>
                      <td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${o.payment_method === 'delivery_cash' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{o.payment_method.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orders.length === 0 && <div className="p-12 text-center text-gray-400">Aucune commande n'a encore été passée.</div>}
          </div>
        ) : (
          <div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mb-8">
              <h2 className="text-2xl font-serif text-brand-green mb-6">{editProduct ? 'Modifier le Produit' : 'Ajouter un Nouveau Produit'}</h2>
              {productActionError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">{productActionError}</div>}
              <form onSubmit={handleProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4" key={editProduct ? editProduct.id : 'new'}>
                <input name="name" defaultValue={editProduct?.name || ''} placeholder="Nom du produit" required className="p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none" />
                <input name="category" defaultValue={editProduct?.category || 'Alimentation'} placeholder="Catégorie" required className="p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none" />
                <input name="price" type="number" step="0.01" defaultValue={editProduct?.price || ''} placeholder="Prix initial (DH)" required className="p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none" />
                <input name="promo_price" type="number" step="0.01" defaultValue={editProduct?.promo_price || ''} placeholder="Prix promotionnel (optionnel)" className="p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none" />
                <input name="image" defaultValue={editProduct?.image || ''} placeholder="URL de l'image (https://...)" required className="p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none md:col-span-2" />
                <textarea name="description" defaultValue={editProduct?.description || ''} placeholder="Description complète" required rows={3} className="p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none md:col-span-2" />
                <div className="md:col-span-2 flex items-center justify-between mt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input name="in_stock" type="checkbox" defaultChecked={editProduct ? editProduct.in_stock : true} className="w-6 h-6 rounded text-brand-green focus:ring-brand-green accent-brand-green" />
                    <span className="font-bold text-gray-700">Produit en Stock</span>
                  </label>
                  <div className="flex gap-3">
                    {editProduct && <button type="button" onClick={() => setEditProduct(null)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Annuler</button>}
                    <button type="submit" className="bg-brand-green text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">{editProduct ? 'Enregistrer les modifications' : 'Créer le Produit'}</button>
                  </div>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(p => (
                <div key={p.id} className={`bg-white rounded-2xl shadow border p-4 flex flex-col gap-3 transition-colors ${p.in_stock === 0 ? 'border-red-200 opacity-60 grayscale-[30%]' : 'border-gray-100'}`}>
                  <div className="relative h-40 rounded-xl overflow-hidden bg-gray-100">
                    <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                    {p.in_stock === 0 && <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center"><span className="bg-red-600 text-white px-3 py-1 font-bold text-xs rounded uppercase tracking-widest shadow-lg">Rupture</span></div>}
                    {p.promo_price && <div className="absolute top-2 left-2 bg-brand-orange text-white px-2 py-1 font-bold text-xs rounded uppercase tracking-widest shadow-lg">Promo</div>}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 leading-tight">{p.name}</h3>
                    <div className="text-xs text-brand-green font-bold uppercase tracking-wider mb-1 mt-1">{p.category}</div>
                    <div className="flex items-end gap-2 text-sm text-gray-500">
                      <span className={`font-bold ${p.promo_price ? 'line-through text-gray-400' : 'text-brand-green text-lg'}`}>{p.price} DH</span>
                      {p.promo_price && <span className="font-bold text-brand-orange text-lg leading-none">{p.promo_price} DH</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                    <button onClick={() => setEditProduct(p)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-bold transition-colors">Modifier</button>
                    <button onClick={() => deleteProduct(p.id)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg text-sm font-bold transition-colors">Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Casablanca',
    paymentMethod: 'delivery_cash' as 'delivery_cash' | 'credit_card' | 'paypal'
  });

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const handleHash = () => setIsAdmin(window.location.hash === '#admin');
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, [isAdmin]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const generateWhatsAppLink = () => {
    const baseUrl = "https://wa.me/212604285812";
    if (cart.length === 0) return `${baseUrl}?text=${encodeURIComponent("Bonjour Osouk d'Afrik, je souhaite passer une commande.")}`;
    let text = "Bonjour Osouk d'Afrik, je souhaite passer cette commande :\n\n";
    cart.forEach(item => {
      text += `- ${item.quantity}x ${item.name} (${item.price * item.quantity} DH)\n`;
    });
    text += `\nTotal : ${cartTotal} DH\n\nMerci !`;
    return `${baseUrl}?text=${encodeURIComponent(text)}`;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderStatus('loading');

    const order: OrderData = {
      customer_name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      total: cartTotal,
      items: cart,
      payment_method: formData.paymentMethod
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      if (res.ok) {
        setOrderStatus('success');
        setCart([]);
        setTimeout(() => {
          setIsCheckoutOpen(false);
          setOrderStatus('idle');
        }, 3000);
      } else {
        setOrderStatus('error');
      }
    } catch (err) {
      setOrderStatus('error');
    }
  };

  if (isAdmin) return <AdminPanel />;

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="glass-nav sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-brand-green w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight text-brand-green">Osouk d'Afrik</h1>
          </div>

          <div className="hidden md:flex gap-8 text-sm font-medium uppercase tracking-widest">
            <a href="#produits" className="hover:text-brand-orange transition-colors">Produits</a>
            <a href="#livraison" className="hover:text-brand-orange transition-colors">Livraison</a>
            <a href="#contact" className="hover:text-brand-orange transition-colors">À Propos</a>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 hover:bg-brand-green/5 rounded-full transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-orange text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://picsum.photos/seed/african-food/1920/1080?blur=2"
            className="w-full h-full object-cover opacity-40"
            alt="Hero Background"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-cream/20 to-brand-cream"></div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-brand-orange font-semibold tracking-[0.2em] uppercase text-sm mb-4 block"
          >
            Saveurs Authentiques à Casablanca
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-serif text-brand-green leading-tight mb-8"
          >
            Le Marché Africain <br /> Chez Vous
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-brand-earth/80 mb-10 max-w-2xl mx-auto"
          >
            Attiéké frais, Igname, Plantains et piments. Livraison rapide à Casablanca et partout au Maroc.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a href="#produits" className="btn-primary flex items-center justify-center gap-2">
              Découvrir nos produits <ChevronRight className="w-4 h-4" />
            </a>
            <a href="#contact" className="btn-secondary flex items-center justify-center">
              Nous contacter
            </a>
          </motion.div>
        </div>
      </header>

      {/* Products Grid */}
      <main id="produits" className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h3 className="text-4xl font-serif text-brand-green mb-2">Nos Incontournables</h3>
            <p className="text-brand-earth/60">Sélectionnés avec soin pour leur fraîcheur et leur goût.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="product-card group"
            >
              <div className="aspect-square overflow-hidden relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 shadow-inner transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  {product.in_stock === 0 && (
                    <span className="bg-red-600 shadow-xl px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                      Rupture
                    </span>
                  )}
                  {product.promo_price && (
                    <span className="bg-brand-orange shadow-xl px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                      Promo
                    </span>
                  )}
                  <span className="bg-white/90 backdrop-blur shadow-md px-3 py-1 rounded-full text-xs font-bold text-brand-green uppercase tracking-wider">
                    {product.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h4 className="text-2xl mb-2">{product.name}</h4>
                <p className="text-sm text-brand-earth/70 mb-6 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${product.promo_price ? 'text-gray-400 line-through text-sm' : 'text-brand-orange'}`}>{product.price} DH</span>
                    {product.promo_price && <span className="text-xl font-bold text-brand-orange">{product.promo_price} DH</span>}
                  </div>
                  <button
                    onClick={() => product.in_stock !== 0 && addToCart(product)}
                    disabled={product.in_stock === 0}
                    className="disabled:opacity-50 disabled:cursor-not-allowed bg-brand-green/10 text-brand-green p-3 rounded-xl hover:bg-brand-green hover:text-white transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Features */}
      <section id="livraison" className="bg-brand-green text-white py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <MapPin className="w-8 h-8 text-brand-orange" />
            </div>
            <h4 className="text-xl mb-2">Livraison Partout</h4>
            <p className="text-white/70">À Casablanca et dans toutes les villes du Maroc.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-brand-orange" />
            </div>
            <h4 className="text-xl mb-2">Qualité Premium</h4>
            <p className="text-white/70">Produits frais et authentiques importés directement.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <Phone className="w-8 h-8 text-brand-orange" />
            </div>
            <h4 className="text-xl mb-2">Support 24/7</h4>
            <p className="text-white/70">Une question ? <a href="https://wa.me/212604285812" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-orange">Contactez-nous sur WhatsApp au +212 604-285812</a> ou sur Instagram.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-brand-cream border-t border-brand-green/10 py-12 relative overflow-hidden">
        <a href="#admin" className="absolute bottom-4 right-4 text-xs text-brand-green/30 hover:text-brand-green transition-colors">Console Administrateur</a>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-brand-green w-6 h-6" />
            <span className="text-xl font-bold text-brand-green">Osouk d'Afrik</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://wa.me/212604285812" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-green hover:text-brand-orange transition-colors font-semibold">
              <Phone className="w-5 h-5" />
              +212 604-285812
            </a>
            <a href="https://www.instagram.com/osoukdafrik/" target="_blank" className="hover:text-brand-orange transition-colors">
              <Instagram className="w-6 h-6" />
            </a>
          </div>
          <p className="text-sm text-brand-earth/60">© 2024 Osouk d'Afrik. Tous droits réservés. Casablanca, Maroc.</p>
        </div>
      </footer>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-2xl font-serif">Votre Panier</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
                    <p className="text-gray-500">Votre panier est vide</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4">
                      <img src={item.image} className="w-20 h-20 object-cover rounded-xl" alt={item.name} />
                      <div className="flex-1">
                        <h5 className="font-medium">{item.name}</h5>
                        <p className="text-brand-orange font-bold">{item.price} DH</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1 border rounded-md"><Minus className="w-3 h-3" /></button>
                          <span className="text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1 border rounded-md"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t bg-gray-50">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-600">Total</span>
                    <span className="text-2xl font-bold text-brand-green">{cartTotal} DH</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <a
                      href={generateWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                      Commander via WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl"
            >
              {orderStatus === 'success' ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-serif mb-4">Commande Reçue !</h3>
                  <p className="text-gray-600">Merci pour votre confiance. Nous vous contacterons sous peu pour confirmer la livraison.</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row">
                  <div className="flex-1 p-8">
                    <h3 className="text-2xl font-serif mb-6">Finaliser la commande</h3>
                    <form onSubmit={handleCheckout} className="space-y-4">
                      <input
                        required
                        type="text"
                        placeholder="Nom complet"
                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-green outline-none"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          required
                          type="tel"
                          placeholder="Téléphone"
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-green outline-none"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <select
                          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-green outline-none"
                          value={formData.city}
                          onChange={e => setFormData({ ...formData, city: e.target.value })}
                        >
                          <option value="Casablanca">Casablanca</option>
                          <option value="Rabat">Rabat</option>
                          <option value="Marrakech">Marrakech</option>
                          <option value="Tanger">Tanger</option>
                          <option value="Autre">Autre ville</option>
                        </select>
                      </div>
                      <textarea
                        required
                        placeholder="Adresse de livraison"
                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-green outline-none h-24"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                      ></textarea>

                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">Mode de paiement</p>
                        <div className="flex flex-col gap-3">
                          <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === 'delivery_cash' ? 'bg-brand-green/10 border-brand-green' : 'hover:bg-gray-50'}`}>
                            <input type="radio" className="mr-3 w-4 h-4 accent-brand-green" name="payment" value="delivery_cash" checked={formData.paymentMethod === 'delivery_cash'} onChange={() => setFormData({ ...formData, paymentMethod: 'delivery_cash' })} />
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800">Paiement à la livraison</span>
                              <span className="text-xs text-gray-500">Payer en espèces auprès du livreur</span>
                            </div>
                          </label>

                          <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === 'credit_card' ? 'bg-brand-green/10 border-brand-green' : 'hover:bg-gray-50'}`}>
                            <input type="radio" className="mr-3 w-4 h-4 accent-brand-green" name="payment" value="credit_card" checked={formData.paymentMethod === 'credit_card'} onChange={() => setFormData({ ...formData, paymentMethod: 'credit_card' })} />
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800">Carte de Crédit</span>
                              <span className="text-xs text-gray-500">Paiement sécurisé en ligne</span>
                            </div>
                          </label>

                          <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === 'paypal' ? 'bg-brand-green/10 border-brand-green' : 'hover:bg-gray-50'}`}>
                            <input type="radio" className="mr-3 w-4 h-4 accent-brand-green" name="payment" value="paypal" checked={formData.paymentMethod === 'paypal'} onChange={() => setFormData({ ...formData, paymentMethod: 'paypal' })} />
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800">PayPal</span>
                              <span className="text-xs text-gray-500">Être redirigé vers PayPal</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={orderStatus === 'loading'}
                        className="w-full btn-primary mt-4 disabled:opacity-50"
                      >
                        {orderStatus === 'loading' ? 'Traitement...' : `Confirmer (${cartTotal} DH)`}
                      </button>
                    </form>
                  </div>
                  <div className="w-full md:w-64 bg-gray-50 p-8 border-l">
                    <h4 className="font-medium mb-4">Résumé</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.quantity}x {item.name}</span>
                          <span className="font-medium">{item.price * item.quantity} DH</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-6 border-t flex justify-between font-bold text-brand-green">
                      <span>Total</span>
                      <span>{cartTotal} DH</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating WhatsApp Button */}
      <a
        href={generateWhatsAppLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] text-white pl-4 pr-6 py-3 rounded-full shadow-2xl hover:bg-[#128C7E] hover:scale-105 transition-all duration-300 z-40 flex items-center gap-3 group"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        <span className="font-semibold text-sm whitespace-nowrap">Commander sur WhatsApp</span>
      </a>
    </div>
  );
}
