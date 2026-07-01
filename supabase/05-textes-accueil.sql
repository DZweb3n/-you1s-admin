-- ============================================================
-- YOU1S — ÉTAPE 5 : Textes de la page d'accueil administrables
-- À exécuter dans Supabase → SQL Editor → New Query → Run
-- Idempotent (ON CONFLICT DO NOTHING).
-- ============================================================
-- Ces clés apparaissent dans l'admin → menu "Contenu".
-- Le site les lit via data-content="<key>".

INSERT INTO site_content (key, label, section, type, value) VALUES
  -- Hero (les 3 slides du haut de l'accueil)
  ('hero_slide_1_title',    'Hero — Slide 1 · Titre',       'Accueil - Hero', 'text', 'Nouveautés'),
  ('hero_slide_1_subtitle', 'Hero — Slide 1 · Sous-titre',  'Accueil - Hero', 'text', 'Découvrez les derniers arrivages.'),
  ('hero_slide_2_title',    'Hero — Slide 2 · Titre',       'Accueil - Hero', 'text', 'Incontournables'),
  ('hero_slide_2_subtitle', 'Hero — Slide 2 · Sous-titre',  'Accueil - Hero', 'text', 'Les pièces qui font l''unanimité.'),
  ('hero_slide_3_title',    'Hero — Slide 3 · Titre',       'Accueil - Hero', 'text', 'Exclusivités'),
  ('hero_slide_3_subtitle', 'Hero — Slide 3 · Sous-titre',  'Accueil - Hero', 'text', 'Des créations pensées pour se distinguer.'),

  -- Section éditoriale
  ('editorial_label', 'Éditorial — Petit label', 'Accueil - Éditorial', 'text',     'You1s Notre ADN'),
  ('editorial_title', 'Éditorial — Titre',       'Accueil - Éditorial', 'text',     'L''Authenticité Avant Tout'),
  ('editorial_desc',  'Éditorial — Texte',       'Accueil - Éditorial', 'textarea', 'Pas de hype vide. Pas de compromis. You1s c''est une vision. Celle d''une mode qui a du sens portée par ceux qui savent reconnaître les belles choses.'),

  -- Newsletter
  ('newsletter_label', 'Newsletter — Petit label', 'Accueil - Newsletter', 'text',     'Newsletter'),
  ('newsletter_title', 'Newsletter — Titre',       'Accueil - Newsletter', 'text',     'Restez dans la boucle'),
  ('newsletter_desc',  'Newsletter — Texte',       'Accueil - Newsletter', 'textarea', 'Drops exclusifs, restocks et actualités You1s en avant-première.')
ON CONFLICT (key) DO NOTHING;

-- Vérification
SELECT section, count(*) FROM site_content WHERE type IN ('text','textarea') GROUP BY section;
