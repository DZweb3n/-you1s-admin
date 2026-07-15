-- ============================================================
-- 12 — SLIDER D'ACCUEIL ÉDITABLE (5 slides)
-- Chaque slide a : photo de fond, titre, sous-titre, couleur du texte.
-- Particularité : si le TITRE de la slide 2 est vide, le site affiche
-- automatiquement « Dès X€ » (prix le plus bas de la marque Asics).
-- À exécuter dans Supabase -> SQL Editor -> Run.
-- ============================================================

-- On repart proprement : suppression des anciens champs hero (3 slides)
DELETE FROM site_content WHERE key LIKE 'hero_slide_%';

INSERT INTO site_content (key, label, section, type, value) VALUES
  -- ── Slide 1 · Nouveautés (texte en bas à gauche) ──
  ('hero_slide_1_image',    'Photo de fond',                                   'Slider accueil · Slide 1', 'image',  'img/prooduits/incontournable.jpg'),
  ('hero_slide_1_title',    'Titre',                                           'Slider accueil · Slide 1', 'text',   'Nouveautés'),
  ('hero_slide_1_subtitle', 'Sous-titre',                                      'Slider accueil · Slide 1', 'text',   'New in'),
  ('hero_slide_1_theme',    'Couleur du texte (selon la photo)',               'Slider accueil · Slide 1', 'text',   'blanc'),

  -- ── Slide 2 · Prix (texte au centre) ──
  ('hero_slide_2_image',    'Photo de fond',                                   'Slider accueil · Slide 2', 'image',  'img/prooduits/asics-16.webp'),
  ('hero_slide_2_title',    'Titre — laisser VIDE pour le prix auto « Dès X€ »', 'Slider accueil · Slide 2', 'text',  ''),
  ('hero_slide_2_subtitle', 'Sous-titre',                                      'Slider accueil · Slide 2', 'text',   'Asics — Gel-Cumulus 16'),
  ('hero_slide_2_theme',    'Couleur du texte (selon la photo)',               'Slider accueil · Slide 2', 'text',   'noir'),

  -- ── Slide 3 · Nike (texte en bas à droite) ──
  ('hero_slide_3_image',    'Photo de fond',                                   'Slider accueil · Slide 3', 'image',  'img/prooduits/nike-P6000.webp'),
  ('hero_slide_3_title',    'Titre',                                           'Slider accueil · Slide 3', 'text',   'Nike'),
  ('hero_slide_3_subtitle', 'Sous-titre',                                      'Slider accueil · Slide 3', 'text',   'P-6000'),
  ('hero_slide_3_theme',    'Couleur du texte (selon la photo)',               'Slider accueil · Slide 3', 'text',   'noir'),

  -- ── Slide 4 · Saucony (texte au milieu à gauche) ──
  ('hero_slide_4_image',    'Photo de fond',                                   'Slider accueil · Slide 4', 'image',  'img/prooduits/saucony-progrid-silver-pink.webp'),
  ('hero_slide_4_title',    'Titre',                                           'Slider accueil · Slide 4', 'text',   'Saucony'),
  ('hero_slide_4_subtitle', 'Sous-titre',                                      'Slider accueil · Slide 4', 'text',   'ProGrid Omni'),
  ('hero_slide_4_theme',    'Couleur du texte (selon la photo)',               'Slider accueil · Slide 4', 'text',   'noir'),

  -- ── Slide 5 · Exclusivités (texte en bas au centre) ──
  ('hero_slide_5_image',    'Photo de fond',                                   'Slider accueil · Slide 5', 'image',  'img/prooduits/exlusivcite.jpg'),
  ('hero_slide_5_title',    'Titre',                                           'Slider accueil · Slide 5', 'text',   'Exclusivités'),
  ('hero_slide_5_subtitle', 'Sous-titre',                                      'Slider accueil · Slide 5', 'text',   'You1s only'),
  ('hero_slide_5_theme',    'Couleur du texte (selon la photo)',               'Slider accueil · Slide 5', 'text',   'blanc')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  section = EXCLUDED.section,
  type = EXCLUDED.type;

-- Vérification
SELECT key, label, section, type, value
FROM site_content
WHERE key LIKE 'hero_slide_%'
ORDER BY key;
