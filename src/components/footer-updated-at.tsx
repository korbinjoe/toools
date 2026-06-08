import { formatDataUpdatedAt } from "@/lib/utils";
import { getDataUpdatedAt } from "@/lib/db";

export async function FooterUpdatedAt() {
  const dataUpdatedAt = await getDataUpdatedAt();

  if (!dataUpdatedAt) return null;

  return (
    <time dateTime={dataUpdatedAt.toISOString()}>
      Last updated {formatDataUpdatedAt(dataUpdatedAt)}
    </time>
  );
}
