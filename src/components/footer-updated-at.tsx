import { getDataUpdatedAt } from "@/lib/db";
import { LocalDateTime } from "@/components/local-date-time";

export async function FooterUpdatedAt() {
  const dataUpdatedAt = await getDataUpdatedAt();

  if (!dataUpdatedAt) return null;

  return (
    <LocalDateTime
      iso={dataUpdatedAt.toISOString()}
      prefix="Last updated "
    />
  );
}
