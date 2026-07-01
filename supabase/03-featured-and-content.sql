-- ============================================================
-- YOU1S — ÉTAPE 3 : "À la une" (slider) + images administrables
-- À exécuter dans Supabase → SQL Editor → New Query → Run
-- Idempotent : relançable sans risque.
-- ============================================================

-- 1) ─── Produits "À la une" (slider Best Sellers de l'accueil) ───
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- (optionnel) mettre quelques produits en avant par défaut
UPDATE products SET featured = true
WHERE slug IN ('gel-cumulus-16-aqua', 'cloudsurf', 'p6000', 't-shirt-menilo')
  AND featured = false;


-- 2) ─── Images administrables (page d'accueil + restocks) ───
-- type = 'image' → la page Contenu de l'admin affiche un bouton d'upload.
-- La valeur (URL) est lue par le site via data-content="<key>".
INSERT INTO site_content (key, label, section, type, value) VALUES
  ('hero_slide_1_image', 'Accueil — Image slide 1', 'Accueil - Hero', 'image', 'img/prooduits/asics-gel1130.webp'),
  ('hero_slide_2_image', 'Accueil — Image slide 2', 'Accueil - Hero', 'image', 'img/prooduits/incontournable.jpg'),
  ('hero_slide_3_image', 'Accueil — Image slide 3', 'Accueil - Hero', 'image', 'img/prooduits/exlusivcite.jpg'),
  ('editorial_image',    'Accueil — Image éditoriale', 'Accueil - Éditorial', 'image', 'img/prooduits/incontournable.jpg'),
  ('restock_1_image', 'Restock — Image carte 1', 'Restocks', 'image', ''),
  ('restock_2_image', 'Restock — Image carte 2', 'Restocks', 'image', ''),
  ('restock_3_image', 'Restock — Image carte 3', 'Restocks', 'image', ''),
  ('restock_4_image', 'Restock — Image carte 4', 'Restocks', 'image', ''),
  ('restock_5_image', 'Restock — Image carte 5', 'Restocks', 'image', '')
ON CONFLICT (key) DO NOTHING;


-- 3) ─── Vérification ───
SELECT 'featured produits' AS info, count(*) FROM products WHERE featured = true
UNION ALL SELECT 'images de contenu', count(*) FROM site_content WHERE type = 'image';

-- ============================================================
-- IMPORTANT — STOCKAGE DES IMAGES
-- Pour uploader des images depuis l'admin (produits ET contenu),
-- crée un bucket public nommé "products" :
--   Supabase -> Storage -> New bucket -> Name: products -> Public -> Create
-- ============================================================
