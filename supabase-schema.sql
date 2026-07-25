-- ============================================================
-- EFFET MER — Schéma base de données Supabase
-- Copiez-collez ce code dans l'éditeur SQL de Supabase
-- ============================================================

-- Table principale des locations
CREATE TABLE IF NOT EXISTS rentals (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Client
  client_name       TEXT        NOT NULL,
  client_firstname  TEXT        NOT NULL,
  client_phone      TEXT        NOT NULL,
  client_id_number  TEXT        NOT NULL,

  -- Activité
  activity_id       TEXT        NOT NULL,
  activity_name     TEXT        NOT NULL,
  activity_subtype  TEXT,
  duration          TEXT        NOT NULL,
  duration_minutes  INTEGER     NOT NULL,
  price             NUMERIC     NOT NULL,

  -- Matériel
  jet_ski_id        TEXT,

  -- Paiement & Contrat
  payment_method    TEXT        NOT NULL,
  signature         TEXT        NOT NULL,
  contract_number   TEXT        NOT NULL UNIQUE,

  -- Horaires
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,

  -- Statut
  status            TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),

  -- Optionnel
  notes             TEXT
);

-- ============================================================
-- Sécurité : seuls les utilisateurs connectés ont accès
-- ============================================================
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acces authentifie uniquement"
  ON rentals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Index pour améliorer les performances
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_rentals_status      ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_created_at  ON rentals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rentals_client_name ON rentals(client_name);
CREATE INDEX IF NOT EXISTS idx_rentals_jet_ski_id  ON rentals(jet_ski_id);
CREATE INDEX IF NOT EXISTS idx_rentals_start_time  ON rentals(start_time);

-- ============================================================
-- Table file d'attente
-- ============================================================
CREATE TABLE IF NOT EXISTS waiting_list (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Client
  client_name      TEXT        NOT NULL,
  client_firstname TEXT        NOT NULL,
  client_phone     TEXT        NOT NULL,
  client_id_number TEXT        NOT NULL,

  -- Activité demandée
  activity_id      TEXT        NOT NULL,
  activity_name    TEXT        NOT NULL,
  activity_subtype TEXT,

  -- Jet ski attendu
  jet_ski_id       TEXT        NOT NULL,

  -- Statut : waiting / converted / cancelled
  status           TEXT        NOT NULL DEFAULT 'waiting'
                   CHECK (status IN ('waiting', 'converted', 'cancelled'))
);

ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acces authentifie file attente"
  ON waiting_list FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_waiting_status     ON waiting_list(status);
CREATE INDEX IF NOT EXISTS idx_waiting_jet_ski_id ON waiting_list(jet_ski_id);
CREATE INDEX IF NOT EXISTS idx_waiting_created_at ON waiting_list(created_at);
