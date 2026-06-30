-- YOU1S — Schema Supabase
-- Exécuter dans SQL Editor > New Query sur supabase.com

-- Catégories
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image TEXT,
  banner TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produits
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  brand TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  sku TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  images JSONB DEFAULT '[]',
  sizes JSONB DEFAULT '[]',
  colors JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  shipping_address JSONB,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commandes
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled','refunded')),
  tracking_number TEXT,
  notes TEXT,
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mouvements de stock
CREATE TABLE stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale','restock','adjustment','return')),
  reason TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contenu du site
CREATE TABLE site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text','textarea','image','json')),
  label TEXT,
  section TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marques logo carousel
CREATE TABLE brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

-- Triggers updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Décrémenter stock automatiquement à la commande
CREATE OR REPLACE FUNCTION handle_order_stock()
RETURNS TRIGGER AS $$
DECLARE item JSONB;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      UPDATE products SET stock = stock - (item->>'qty')::int
      WHERE id = (item->>'product_id')::uuid;
      INSERT INTO stock_movements (product_id, quantity, type, reason, order_id)
      VALUES ((item->>'product_id')::uuid, -((item->>'qty')::int), 'sale', 'Vente ' || NEW.order_number, NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_stock_trigger AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION handle_order_stock();

-- RLS (Row Level Security) - Admin uniquement
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Politique : l'admin connecté peut tout lire/écrire
CREATE POLICY "Admin full access" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON site_content FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON brands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lecture publique produits/catégories/contenu pour le front
CREATE POLICY "Public read products" ON products FOR SELECT TO anon USING (active = true);
CREATE POLICY "Public read categories" ON categories FOR SELECT TO anon USING (active = true);
CREATE POLICY "Public read content" ON site_content FOR SELECT TO anon USING (true);
CREATE POLICY "Public read brands" ON brands FOR SELECT TO anon USING (active = true);

-- Contenu initial
INSERT INTO site_content (key, label, section, type, value) VALUES
  ('hero_slide_1_title', 'Slide 1 - Titre', 'Hero Slider', 'text', 'Nouveautés'),
  ('hero_slide_1_subtitle', 'Slide 1 - Sous-titre', 'Hero Slider', 'text', 'Découvrez les dernières pièces'),
  ('editorial_title', 'Titre éditorial', 'Section Éditoriale', 'text', 'L''Authenticité Avant Tout'),
  ('editorial_desc', 'Description', 'Section Éditoriale', 'textarea', 'Pas de hype vide. Pas de compromis.'),
  ('newsletter_title', 'Titre newsletter', 'Newsletter', 'text', 'Rejoignez la communauté');
