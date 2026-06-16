#!/usr/bin/env node
/**
 * One-time migration: TemplateCategory v1 → v2
 *
 * v1: items carry `category` string; subcategories derived from items at runtime
 * v2: items drop `category`; TemplateCategory gains `subcategories: string[]`
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
 *   node scripts/migrate-template-v2.mjs [--dry-run]
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const dryRun = process.argv.includes("--dry-run");
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credPath) {
  console.error(
    "Error: set GOOGLE_APPLICATION_CREDENTIALS to your service account key path",
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(credPath, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function migrateTemplate(data) {
  if (!data || !Array.isArray(data.categories)) return null;

  let changed = false;
  const categories = data.categories.map((cat) => {
    if (Array.isArray(cat.subcategories)) return cat; // already v2

    const subcategories = [];
    const cleanedItems = [];

    for (const item of cat.items ?? []) {
      if (item.subcategory && !subcategories.includes(item.subcategory)) {
        subcategories.push(item.subcategory);
      }

      // Remove phantom items (text === subcategory name, created by old "add subcategory" flow)
      const isPhantom =
        item.subcategory && item.text === item.subcategory;
      if (isPhantom) {
        changed = true;
        continue;
      }

      // Strip `category` field from item
      const { category, ...rest } = item;
      if (category !== undefined) changed = true;
      cleanedItems.push(rest);
    }

    if (subcategories.length > 0) changed = true;

    return {
      name: cat.name,
      subcategories,
      items: cleanedItems,
    };
  });

  if (!changed) return null;
  return { ...data, categories };
}

async function main() {
  const snapshot = await db.collection("tcTemplates").get();
  console.log(`Found ${snapshot.size} template document(s)`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const result = migrateTemplate(doc.data());
    if (!result) {
      console.log(`  [skip] ${doc.id} — already v2 or no changes needed`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  [dry-run] ${doc.id} — would migrate`);
      const cats = result.categories;
      for (const cat of cats) {
        console.log(
          `    ${cat.name}: ${cat.items.length} items, subcategories: [${cat.subcategories.join(", ")}]`,
        );
      }
    } else {
      await doc.ref.set(result);
      console.log(`  [migrated] ${doc.id}`);
    }
    migrated++;
  }

  console.log(
    `\nDone. ${migrated} migrated, ${skipped} skipped.${dryRun ? " (dry-run)" : ""}`,
  );
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
