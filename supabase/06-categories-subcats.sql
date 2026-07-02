-- ============================================================
-- YOU1S — ÉTAPE 6 : Sous-catégories + images de catégories
-- À exécuter dans Supabase → SQL Editor → New Query → Run
-- Idempotent : relançable sans risque.
-- ============================================================

-- 1) Colonne subcats : liste JSON de sous-catégories [{name, image}]
ALTER TABLE categories ADD COLUMN IF NOT EXISTS subcats JSONB DEFAULT '[]';

-- 2) Seed des sous-catégories (reprend l'existant du site, ne touche pas
--    aux catégories déjà munies de sous-catégories)
UPDATE categories SET subcats = '[
  {"name":"Sneakers","image":"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=750&fit=crop&q=80"},
  {"name":"Running","image":"https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&h=750&fit=crop&q=80"},
  {"name":"Boots","image":"https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=750&fit=crop&q=80"},
  {"name":"Slides","image":"https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&h=750&fit=crop&q=80"}
]'::jsonb WHERE slug = 'sneakers' AND (subcats IS NULL OR subcats = '[]'::jsonb);

UPDATE categories SET subcats = '[
  {"name":"T-shirts","image":"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=750&fit=crop&q=80"}
]'::jsonb WHERE slug = 'tshirts' AND (subcats IS NULL OR subcats = '[]'::jsonb);

UPDATE categories SET subcats = '[
  {"name":"Hoodies","image":"https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&h=750&fit=crop&q=80"},
  {"name":"Sweatshirts","image":"https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=600&h=750&fit=crop&q=80"}
]'::jsonb WHERE slug = 'hoodies' AND (subcats IS NULL OR subcats = '[]'::jsonb);

UPDATE categories SET subcats = '[
  {"name":"Vestes","image":"https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=600&h=750&fit=crop&q=80"}
]'::jsonb WHERE slug = 'jackets' AND (subcats IS NULL OR subcats = '[]'::jsonb);

UPDATE categories SET subcats = '[
  {"name":"Pantalons","image":"https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&h=750&fit=crop&q=80"},
  {"name":"Cargos","image":"https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&h=750&fit=crop&q=80"},
  {"name":"Shorts","image":"https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=600&h=750&fit=crop&q=80"},
  {"name":"Joggings","image":"https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=600&h=750&fit=crop&q=80"}
]'::jsonb WHERE slug = 'pants' AND (subcats IS NULL OR subcats = '[]'::jsonb);

UPDATE categories SET subcats = '[
  {"name":"Casquettes","image":"https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=750&fit=crop&q=80"},
  {"name":"Bonnets","image":"https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&h=750&fit=crop&q=80"},
  {"name":"Sacs","image":"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=750&fit=crop&q=80"},
  {"name":"Chaussettes","image":"https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&h=750&fit=crop&q=80"}
]'::jsonb WHERE slug = 'accessories' AND (subcats IS NULL OR subcats = '[]'::jsonb);

-- 3) Vérification
SELECT slug, name, jsonb_array_length(COALESCE(subcats,'[]'::jsonb)) AS nb_subcats,
       (image IS NOT NULL) AS has_image
FROM categories ORDER BY sort_order;
