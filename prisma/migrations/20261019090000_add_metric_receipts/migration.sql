CREATE TABLE "ToolMetricReceipt" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolMetricReceipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ToolMetricReceipt_metric_check" CHECK ("metric" IN ('view', 'click'))
);

CREATE INDEX "ToolMetricReceipt_appliedAt_idx" ON "ToolMetricReceipt"("appliedAt");
