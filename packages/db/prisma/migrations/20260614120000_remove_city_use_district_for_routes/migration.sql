-- Dev-only: clear all Route-dependent data before restructuring
TRUNCATE TABLE "PriceSurvey", "Offer", "Order", "DriverOnRoad", "DriverRoute", "Route";

-- Drop old City foreign keys and unique index from Route
ALTER TABLE "Route" DROP CONSTRAINT "Route_fromCityId_fkey";
ALTER TABLE "Route" DROP CONSTRAINT "Route_toCityId_fkey";
DROP INDEX "Route_fromCityId_toCityId_key";

-- Drop old columns
ALTER TABLE "Route" DROP COLUMN "fromCityId";
ALTER TABLE "Route" DROP COLUMN "toCityId";

-- Drop City table (no longer needed)
DROP TABLE "City";

-- CreateTable Region
CREATE TABLE "Region" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable District
CREATE TABLE "District" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" INTEGER NOT NULL,
    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- Add new columns to Route (safe: table is now empty)
ALTER TABLE "Route" ADD COLUMN "fromDistrictId" INTEGER NOT NULL;
ALTER TABLE "Route" ADD COLUMN "toDistrictId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Route_fromDistrictId_toDistrictId_key" ON "Route"("fromDistrictId", "toDistrictId");

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_fromDistrictId_fkey"
    FOREIGN KEY ("fromDistrictId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_toDistrictId_fkey"
    FOREIGN KEY ("toDistrictId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
