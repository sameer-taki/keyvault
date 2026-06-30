/**
 * Client-side vault-health analysis. Runs entirely in the browser over already
 * decrypted items — no plaintext is sent anywhere. Flags weak, reused, and stale
 * credentials.
 */
import { estimateStrength } from "./password";
import { displayTitle, type DecryptedItem } from "./items";

export type IssueKind = "weak" | "reused" | "old";

export interface HealthIssue {
  itemId: string;
  title: string;
  kind: IssueKind;
  detail: string;
}

export interface HealthReport {
  /** Items that carry a checkable credential (logins + secrets). */
  checked: number;
  weak: HealthIssue[];
  reused: HealthIssue[];
  old: HealthIssue[];
  /** 0–100; 100 means no issues. */
  score: number;
}

const DAY_MS = 86_400_000;
export const DEFAULT_OLD_DAYS = 365;

/** The credential value to assess for an item, or null if it has none. */
function credential(item: DecryptedItem): string | null {
  if (item.type === "login") return item.content.password || null;
  if (item.type === "secret") return item.content.value || null;
  return null;
}

export function computeHealth(
  items: DecryptedItem[],
  now: number = Date.now(),
  oldDays: number = DEFAULT_OLD_DAYS,
): HealthReport {
  const withCred = items.filter((it) => credential(it) !== null);

  const weak: HealthIssue[] = [];
  const old: HealthIssue[] = [];
  const byValue = new Map<string, DecryptedItem[]>();

  for (const it of withCred) {
    const value = credential(it)!;
    const { score, label } = estimateStrength(value);
    if (score <= 1) {
      weak.push({ itemId: it.id, title: displayTitle(it), kind: "weak", detail: `${label} password` });
    }

    const group = byValue.get(value) ?? [];
    group.push(it);
    byValue.set(value, group);

    const ageDays = Math.floor((now - new Date(it.updatedAt).getTime()) / DAY_MS);
    if (ageDays >= oldDays) {
      old.push({
        itemId: it.id,
        title: displayTitle(it),
        kind: "old",
        detail: `Unchanged for ${ageDays} days`,
      });
    }
  }

  const reused: HealthIssue[] = [];
  for (const group of byValue.values()) {
    if (group.length >= 2) {
      for (const it of group) {
        reused.push({
          itemId: it.id,
          title: displayTitle(it),
          kind: "reused",
          detail: `Reused across ${group.length} items`,
        });
      }
    }
  }

  // Score: fraction of credentialed items with no issue of any kind.
  const flagged = new Set<string>([...weak, ...reused, ...old].map((i) => i.itemId));
  const checked = withCred.length;
  const score = checked === 0 ? 100 : Math.round(((checked - flagged.size) / checked) * 100);

  return { checked, weak, reused, old, score };
}
