-- ============================================================
-- Migração: Role enum → PersonRole model
-- Execute ANTES de rodar: npx prisma generate
-- ============================================================

-- 1. Criar tabela PersonRole
CREATE TABLE IF NOT EXISTS "PersonRole" (
    "id"        TEXT NOT NULL,
    "key"       TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "color"     TEXT NOT NULL DEFAULT '#6366f1',
    "bgColor"   TEXT NOT NULL DEFAULT '#eef2ff',
    "level"     INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PersonRole_key_key" ON "PersonRole"("key");

-- 2. Inserir cargos padrão (idempotente)
INSERT INTO "PersonRole" ("id", "key", "label", "color", "bgColor", "level", "createdAt", "updatedAt")
VALUES
    ('role-coordenador-grupo', 'COORDENADOR_GRUPO', 'Coordenador de Grupo', '#7c3aed', '#ede9fe', 0, NOW(), NOW()),
    ('role-coordenador',       'COORDENADOR',       'Coordenador',          '#1d4ed8', '#dbeafe', 1, NOW(), NOW()),
    ('role-lider',             'LIDER',             'Líder',                '#b45309', '#fef3c7', 2, NOW(), NOW()),
    ('role-apoiador',          'APOIADOR',          'Apoiador',             '#15803d', '#dcfce7', 3, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- 3. Adicionar coluna roleId em Contact (nullable primeiro)
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "roleId" TEXT;

-- 4. Migrar dados: popular roleId a partir do enum antigo
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Contact' AND column_name = 'role'
    ) THEN
        UPDATE "Contact" SET "roleId" = 'role-coordenador-grupo' WHERE "role"::text = 'COORDENADOR_GRUPO' AND "roleId" IS NULL;
        UPDATE "Contact" SET "roleId" = 'role-coordenador'       WHERE "role"::text = 'COORDENADOR'       AND "roleId" IS NULL;
        UPDATE "Contact" SET "roleId" = 'role-lider'             WHERE "role"::text = 'LIDER'             AND "roleId" IS NULL;
        UPDATE "Contact" SET "roleId" = 'role-apoiador'          WHERE "role"::text = 'APOIADOR'          AND "roleId" IS NULL;
    END IF;
END $$;

-- 5. Default para qualquer contato sem roleId
UPDATE "Contact" SET "roleId" = 'role-apoiador' WHERE "roleId" IS NULL;

-- 6. Tornar NOT NULL
ALTER TABLE "Contact" ALTER COLUMN "roleId" SET NOT NULL;

-- 7. Adicionar FK (ignora se já existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Contact_roleId_fkey'
    ) THEN
        ALTER TABLE "Contact"
        ADD CONSTRAINT "Contact_roleId_fkey"
        FOREIGN KEY ("roleId") REFERENCES "PersonRole"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Contact_roleId_idx" ON "Contact"("roleId");

-- 8. Remover coluna antiga e enum (somente se existirem)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Contact' AND column_name = 'role'
    ) THEN
        ALTER TABLE "Contact" DROP COLUMN "role";
    END IF;
END $$;

DROP TYPE IF EXISTS "Role";

-- ============================================================
-- Após executar este arquivo, rode:
--   npx prisma generate
-- ============================================================
