import { assertValidId } from "../utils/validation";
import { log } from "../utils/logger";

export class Registry<T extends { id: string }> {
  private items = new Map<string, T>();
  private frozen = false;

  constructor(private kind: string) {}

  register(def: T): void {
    if (this.frozen) throw new Error(`${this.kind} registry da freeze — khong duoc register muon`);
    assertValidId(def.id, `${this.kind} registry`);
    if (this.items.has(def.id)) throw new Error(`${this.kind} trung id: ${def.id}`);
    this.items.set(def.id, def);
  }

  get(id: string | undefined): T | undefined {
    if (!id) return undefined;
    return this.items.get(id);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  all(): T[] {
    return [...this.items.values()];
  }

  get size(): number {
    return this.items.size;
  }

  freeze(): void {
    this.frozen = true;
    log.debug(`${this.kind} registry: ${this.items.size} muc, frozen`);
  }
}
