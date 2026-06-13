/*
  Warnings:

  - A unique constraint covering the columns `[userId,startLat,startLng,endLat,endLng]` on the table `Segment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Segment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Segment" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Segment_userId_startLat_startLng_endLat_endLng_key" ON "Segment"("userId", "startLat", "startLng", "endLat", "endLng");

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
