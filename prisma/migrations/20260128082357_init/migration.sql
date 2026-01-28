-- AlterTable
ALTER TABLE "api_keys" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "bots" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "conversations_meta" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "files" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "organization_members" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "otps" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "training_sources" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
