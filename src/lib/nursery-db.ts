import type { Nursery } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { NurseryProfile } from "@/lib/nursery-helpers";
import { formatDbTime, parseTimeToDate } from "@/lib/nursery-time";

export const DEFAULT_NURSERY_ID = "nursery-hoshinoko";

export function toNurseryProfile(record: Nursery): NurseryProfile {
  return {
    name: record.name,
    address: record.address ?? "",
    phone_number: record.phone_number ?? "",
    open_time: formatDbTime(record.open_time),
    close_time: formatDbTime(record.close_time),
    extended_close_time: record.extended_close_time
      ? formatDbTime(record.extended_close_time)
      : "",
  };
}

export async function getPrimaryNursery() {
  return prisma.nursery.findFirst({
    orderBy: { created_at: "asc" },
  });
}

export async function getActiveNurseryId(): Promise<string> {
  const nursery = await getPrimaryNursery();
  return nursery?.id ?? DEFAULT_NURSERY_ID;
}

export async function getPrimaryNurseryName(): Promise<string> {
  const nursery = await getPrimaryNursery();
  return nursery?.name ?? "保育園";
}

export async function getPrimaryNurseryProfile() {
  const nursery = await getPrimaryNursery();
  return nursery ? toNurseryProfile(nursery) : null;
}

export async function updatePrimaryNurseryProfile(input: NurseryProfile) {
  const nursery = await getPrimaryNursery();

  if (!nursery) {
    return null;
  }

  const row = await prisma.nursery.update({
    where: { id: nursery.id },
    data: {
      name: input.name.trim(),
      address: input.address.trim() || null,
      phone_number: input.phone_number.trim() || null,
      open_time: parseTimeToDate(input.open_time),
      close_time: parseTimeToDate(input.close_time),
      extended_close_time: input.extended_close_time.trim()
        ? parseTimeToDate(input.extended_close_time)
        : null,
    },
  });

  return toNurseryProfile(row);
}
