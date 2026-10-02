// Inventory service: a small TypeScript module for the lab.
import { readFileSync } from 'node:fs';

export interface Item {
  id: number;
  name: string;
  price: number;
  tags: string[];
}

const TAX_RATE = 0.19;

export class Inventory {
  private items = new Map<number, Item>();

  add(item: Item): void {
    if (this.items.has(item.id)) {
      throw new Error(`duplicate id ${item.id}`);
    }
    this.items.set(item.id, item);
  }

  total(withTax = true): number {
    let sum = 0;
    for (const item of this.items.values()) {
      sum += item.price;
    }
    return withTax ? sum * (1 + TAX_RATE) : sum;
  }

  find(query: string): Item[] {
    const q = query.toLowerCase();
    return [...this.items.values()].filter((item) => item.name.toLowerCase().includes(q));
  }
}

export function load(path: string): Inventory {
  const inventory = new Inventory();
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Item[];
  raw.forEach((item) => inventory.add(item));
  return inventory;
}
