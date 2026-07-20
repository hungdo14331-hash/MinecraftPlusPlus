import { WeaponRegistry, AbilityRegistry, EnchantRegistry } from "../core/registry/registries";
import { log } from "../core/utils/logger";

export function validateContent(): boolean {
  const errors: string[] = [];

  for (const e of EnchantRegistry.all()) {
    for (const c of e.conflicts ?? []) {
      if (!EnchantRegistry.has(c)) errors.push(`enchant ${e.id} conflict toi id khong ton tai: ${c}`);
    }
    if (e.maxLevel < 1) errors.push(`enchant ${e.id} co maxLevel < 1`);
  }

  for (const w of WeaponRegistry.all()) {
    for (const a of w.abilities ?? []) {
      if (!AbilityRegistry.has(a)) errors.push(`weapon ${w.id} tham chieu ability khong ton tai: ${a}`);
    }
  }

  for (const err of errors) log.error("[validate]", err);
  if (errors.length === 0) log.info("content validation: OK");
  return errors.length === 0;
}
