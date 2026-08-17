import "dotenv/config";
import { db, upsertJson, getUser } from "./db.js";
import { MATERIALS } from "./data/materials.js";
import { CLASSICS } from "./data/classics.js";
import { SOLAR_TERMS } from "./data/solarTerms.js";

export function seed() {
  const insertMat = db.transaction(() => {
    for (const m of MATERIALS) upsertJson("materials", m.name, m);
    for (const c of CLASSICS) upsertJson("classics", c.name, c);
    for (const s of SOLAR_TERMS) upsertJson("solar_terms", s.name, s);
  });
  insertMat();
  getUser("demo-user");
  return {
    materials: MATERIALS.length,
    classics: CLASSICS.length,
    solarTerms: SOLAR_TERMS.length,
  };
}

if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  const r = seed();
  console.log("seeded", r);
}
