-- ============================================================
--  SportZone — Base de datos MySQL
--  Importar en phpMyAdmin: http://localhost/phpmyadmin
--  O ejecutar en la consola MySQL de XAMPP
-- ============================================================

CREATE DATABASE IF NOT EXISTS sportzone
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sportzone;

-- ── Tabla: usuarios ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id         INT          AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  rol        ENUM('admin','user') NOT NULL DEFAULT 'user',
  giros      INT          NOT NULL DEFAULT 3,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Tabla: productos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id          INT            AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(200)   NOT NULL,
  categoria   VARCHAR(50)    NOT NULL,
  precio      DECIMAL(14,2)  NOT NULL,
  stock       INT            NOT NULL DEFAULT 0,
  descripcion TEXT,
  emoji       VARCHAR(10)    DEFAULT '🏅',
  imagen      LONGTEXT,          -- base64 de imagen (opcional)
  created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Tabla: cupones ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cupones (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT          NOT NULL,
  codigo      VARCHAR(100) NOT NULL UNIQUE,
  premio      VARCHAR(100) NOT NULL,
  icono       VARCHAR(10)  DEFAULT '🎁',
  descripcion VARCHAR(255),
  usado       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
--  DATOS INICIALES
-- ============================================================

-- Usuario administrador (contraseña: admin123)
INSERT IGNORE INTO usuarios (nombre, email, password, rol, giros)
VALUES ('Administrador', 'admin@sport.com', 'admin123', 'admin', 0);

-- Productos de ejemplo en pesos colombianos
INSERT IGNORE INTO productos (nombre, categoria, precio, stock, descripcion, emoji) VALUES
  ('Zapatillas Running Pro X',   'running',  549900,  15, 'Suela amortiguada y transpirable para corredores exigentes.',    '👟'),
  ('Camiseta Tecnica AeroFit',   'gym',      149900,  30, 'Tejido tecnico que elimina el sudor, ideal para entrenamientos.', '👕'),
  ('Balon de Futbol Premier',    'futbol',   199900,  20, 'Balon oficial de competicion talla 5. Alta durabilidad.',         '⚽'),
  ('Gafas de Natacion Elite',    'natacion',  99900,  25, 'Antivaho con lentes espejo y correa ajustable.',                  '🥽'),
  ('Casco Ciclismo AeroShield',  'ciclismo', 379900,  10, 'Certificado CE EN1078. Ventilacion optima, ligero y resistente.', '🪖'),
  ('Mancuernas Ajustables 30kg', 'gym',      679900,   8, 'Set de 5 a 30 kg con sistema de ajuste rapido.',                  '🏋'),
  ('Short Compresion Pro',       'running',  189900,  22, 'Bolsillos laterales y secado ultrarapido.',                       '🩳'),
  ('Raqueta Padel Carbon X',     'otros',    849900,   6, 'Fibra de carbono. Maximo control y potencia.',                   '🏓');
