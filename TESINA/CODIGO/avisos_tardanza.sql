-- ══════════════════════════════════════════════
--  KRONO — Tabla avisos_tardanza
--  Correla en krono1_db
-- ══════════════════════════════════════════════

USE krono1_db;

CREATE TABLE IF NOT EXISTS avisos_tardanza (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    id_alumno   INT NOT NULL,
    fecha       DATE NOT NULL,
    hora        VARCHAR(10) NOT NULL,       -- ej: "08:30"
    motivo      TEXT NOT NULL,
    anotado     BOOLEAN DEFAULT FALSE,      -- el alumno lo tildó como visto
    creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
);
