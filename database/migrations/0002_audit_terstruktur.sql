-- =====================================================================
-- Migrasi 0002 — Audit log terstruktur & append-only (audit 2026-11-10: S5, S6, R6)
-- Untuk database yang sudah berjalan. Aman dijalankan ulang (idempoten), tidak menghapus data.
--   node --env-file-if-exists=.env.local scripts/db.mjs migrations/0002_audit_terstruktur
-- Instalasi baru tidak perlu menjalankan ini: isinya sudah ada di schema.sql.
-- Butuh hak CREATE TRIGGER (jalankan dengan akun admin DB, bukan akun aplikasi).
-- =====================================================================

SET time_zone = '+07:00';

-- Trigger dilepas sementara agar baris lama bisa diisi kolom barunya (backfill), lalu dipasang lagi di akhir.
DROP TRIGGER IF EXISTS audit_log_tolak_ubah;
DROP TRIGGER IF EXISTS audit_log_tolak_hapus;

-- Kolom baru (MySQL 8 tidak punya ADD COLUMN IF NOT EXISTS, jadi dicek lewat information_schema).
SET @perlu = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log' AND COLUMN_NAME = 'entitas');
SET @sql = IF(@perlu,
  'ALTER TABLE audit_log
     ADD COLUMN entitas    VARCHAR(30)  NULL COMMENT ''Jenis objek yang diubah, mis. tagihan'' AFTER keterangan,
     ADD COLUMN entitas_id INT UNSIGNED NULL AFTER entitas,
     ADD COLUMN data_lama  JSON         NULL AFTER entitas_id,
     ADD COLUMN data_baru  JSON         NULL AFTER data_lama,
     ADD COLUMN alasan     VARCHAR(255) NULL AFTER data_baru',
  'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

SET @perlu = (SELECT COUNT(*) = 0 FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log' AND INDEX_NAME = 'idx_audit_entitas');
SET @sql = IF(@perlu, 'ALTER TABLE audit_log ADD INDEX idx_audit_entitas (entitas, entitas_id, created_at)', 'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

SET @perlu = (SELECT COUNT(*) = 0 FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log' AND INDEX_NAME = 'idx_audit_aksi');
SET @sql = IF(@perlu, 'ALTER TABLE audit_log ADD INDEX idx_audit_aksi (aksi, created_at)', 'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

SET @perlu = (SELECT COUNT(*) = 0 FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tagihan' AND INDEX_NAME = 'idx_tagihan_periode');
SET @sql = IF(@perlu, 'ALTER TABLE tagihan ADD INDEX idx_tagihan_periode (tahun_akademik, periode)', 'DO 0');
PREPARE langkah FROM @sql; EXECUTE langkah; DEALLOCATE PREPARE langkah;

-- Backfill: audit tagihan lama hanya menyimpan nomor tagihan di keterangan ("<no_tagihan> | <uraian>").
UPDATE audit_log a
  JOIN tagihan t ON a.keterangan LIKE CONCAT(t.no_tagihan, ' |%')
   SET a.entitas = 'tagihan', a.entitas_id = t.id
 WHERE a.aksi LIKE 'tagihan\_%' AND a.entitas IS NULL;

-- Audit log append-only (NFR-07).
CREATE TRIGGER audit_log_tolak_ubah BEFORE UPDATE ON audit_log FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log tidak boleh diubah';
CREATE TRIGGER audit_log_tolak_hapus BEFORE DELETE ON audit_log FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log tidak boleh dihapus';
