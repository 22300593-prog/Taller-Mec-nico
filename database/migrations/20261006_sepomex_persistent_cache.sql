-- Conserva únicamente consultas SEPOMEX utilizadas por el sistema para operar sin Internet.
CREATE TABLE IF NOT EXISTS sepomex_cache (
  cache_key VARCHAR(255) PRIMARY KEY,
  cache_kind VARCHAR(40) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sepomex_cache_kind (cache_kind)
);
