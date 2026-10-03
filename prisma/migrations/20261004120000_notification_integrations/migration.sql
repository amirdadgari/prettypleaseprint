-- External notification destinations. Provider secrets are encrypted by the
-- application before storage and are never returned to the browser.
CREATE TABLE "notificationIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastDeliveredAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificationIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notificationIntegration_userId_provider_key"
    ON "notificationIntegration"("userId", "provider");

CREATE INDEX "notificationIntegration_userId_active_idx"
    ON "notificationIntegration"("userId", "active");

ALTER TABLE "notificationIntegration"
    ADD CONSTRAINT "notificationIntegration_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
