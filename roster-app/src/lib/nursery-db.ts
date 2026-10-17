import { prisma } from "@/lib/prisma";

export const DEFAULT_NURSERY_ID = "nursery-hoshinoko";

export async function getPrimaryNursery() {
  return prisma.nursery.findFirst({
    orderBy: { created_at: "asc" },
  });
}

export async function getActiveNurseryId(): Promise<string> {
  const nursery = await getPrimaryNursery();
  return nursery?.id ?? DEFAULT_NURSERY_ID;
}

export async function resolveNurseryId(nurseryId?: string): Promise<string> {
  return nurseryId ?? getActiveNurseryId();
}

export async function getPrimaryNurseryName(): Promise<string> {
  const nursery = await getPrimaryNursery();
  return nursery?.name ?? "保育園";
}
