-- Make district IDs nullable (null = butun viloyat)
ALTER TABLE "Route" ALTER COLUMN "fromDistrictId" DROP NOT NULL;
ALTER TABLE "Route" ALTER COLUMN "toDistrictId" DROP NOT NULL;

-- Add region ID columns (nullable for backfill)
ALTER TABLE "Route" ADD COLUMN "fromRegionId" INTEGER;
ALTER TABLE "Route" ADD COLUMN "toRegionId" INTEGER;

-- Backfill from existing district relations
UPDATE "Route" r SET "fromRegionId" = d."regionId" FROM "District" d WHERE r."fromDistrictId" = d.id;
UPDATE "Route" r SET "toRegionId"   = d."regionId" FROM "District" d WHERE r."toDistrictId"   = d.id;

-- Make NOT NULL after backfill
ALTER TABLE "Route" ALTER COLUMN "fromRegionId" SET NOT NULL;
ALTER TABLE "Route" ALTER COLUMN "toRegionId"   SET NOT NULL;

-- Drop old unique index
DROP INDEX "Route_fromDistrictId_toDistrictId_key";

-- New unique index: NULLS NOT DISTINCT makes (1,NULL,2,NULL) conflict with itself
CREATE UNIQUE INDEX "Route_fromRegionId_fromDistrictId_toRegionId_toDistrictId_key"
  ON "Route" ("fromRegionId", "fromDistrictId", "toRegionId", "toDistrictId")
  NULLS NOT DISTINCT;

-- Foreign keys for region relations
ALTER TABLE "Route" ADD CONSTRAINT "Route_fromRegionId_fkey"
  FOREIGN KEY ("fromRegionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Route" ADD CONSTRAINT "Route_toRegionId_fkey"
  FOREIGN KEY ("toRegionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
