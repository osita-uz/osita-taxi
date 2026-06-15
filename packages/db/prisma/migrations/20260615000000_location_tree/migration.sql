-- Mavjud ma'lumotlarni tozalash (dev muhit)
TRUNCATE TABLE "PriceSurvey", "Offer", "Order", "DriverOnRoad", "DriverRoute", "Route" CASCADE;

-- Region va District bog'liqliklarini Route dan olib tashlash
ALTER TABLE "Route" DROP CONSTRAINT IF EXISTS "Route_fromRegionId_fkey";
ALTER TABLE "Route" DROP CONSTRAINT IF EXISTS "Route_fromDistrictId_fkey";
ALTER TABLE "Route" DROP CONSTRAINT IF EXISTS "Route_toRegionId_fkey";
ALTER TABLE "Route" DROP CONSTRAINT IF EXISTS "Route_toDistrictId_fkey";

-- Eski unique constraint
DROP INDEX IF EXISTS "Route_fromRegionId_fromDistrictId_toRegionId_toDistrictId_key";

-- Eski ustunlarni olib tashlash
ALTER TABLE "Route" DROP COLUMN IF EXISTS "fromRegionId";
ALTER TABLE "Route" DROP COLUMN IF EXISTS "fromDistrictId";
ALTER TABLE "Route" DROP COLUMN IF EXISTS "toRegionId";
ALTER TABLE "Route" DROP COLUMN IF EXISTS "toDistrictId";

-- Region va District jadvallarini o'chirish
DROP TABLE IF EXISTS "District";
DROP TABLE IF EXISTS "Region";

-- Location jadvalini yaratish
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- Location self-referential foreign key
ALTER TABLE "Location" ADD CONSTRAINT "Location_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Location"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Route ga yangi ustunlar qo'shish
ALTER TABLE "Route" ADD COLUMN "fromLocationId" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Route" ADD COLUMN "toLocationId" INTEGER NOT NULL DEFAULT 0;

-- Default ni olib tashlash (ma'lumotlar to'ldirilgandan keyin kerak emas)
ALTER TABLE "Route" ALTER COLUMN "fromLocationId" DROP DEFAULT;
ALTER TABLE "Route" ALTER COLUMN "toLocationId" DROP DEFAULT;

-- Route → Location foreign keylar
ALTER TABLE "Route" ADD CONSTRAINT "Route_fromLocationId_fkey"
    FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Route" ADD CONSTRAINT "Route_toLocationId_fkey"
    FOREIGN KEY ("toLocationId") REFERENCES "Location"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Yangi unique constraint
CREATE UNIQUE INDEX "Route_fromLocationId_toLocationId_key"
    ON "Route"("fromLocationId", "toLocationId");
