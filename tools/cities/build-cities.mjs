#!/usr/bin/env node
// Rebuilds the city directory the API ships (docs/adr/0006) from the GeoNames dumps:
//   node tools/cities/build-cities.mjs <folder holding cities15000.txt and admin1CodesASCII.txt>
// Download both from https://download.geonames.org/export/dump/ (cities15000.zip unzipped).
// Writes backend/src/Mondino.Infrastructure/Cities/cities.tsv.gz: one city a line, tab-separated:
// GeoNames id, name, region, country code, latitude, longitude, IANA time zone, population.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

// Sections of a city (PPLX: Brera in Milan), and historical or abandoned places, are not cities.
const notCities = new Set(["PPLX", "PPLH", "PPLQ"]);
const countries = new Set([
  "AU",
  "BR",
  "CA",
  "DE",
  "GH",
  "IN",
  "IE",
  "IT",
  "JP",
  "MX",
  "SE",
  "AE",
  "US",
]);
const dumps = process.argv[2];
if (!dumps) {
  console.error(
    "Usage: node tools/cities/build-cities.mjs <folder with the GeoNames dumps>",
  );
  process.exit(1);
}

const regions = new Map(
  readFileSync(resolve(dumps, "admin1CodesASCII.txt"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"))
    .map(([code, name]) => [code, name]),
);

const rows = [];
for (const line of readFileSync(
  resolve(dumps, "cities15000.txt"),
  "utf8",
).split("\n")) {
  const f = line.split("\t");
  if (f.length < 19 || !countries.has(f[8]) || notCities.has(f[7])) continue;
  const [
    id,
    name,
    ,
    ,
    latitude,
    longitude,
    ,
    ,
    country,
    ,
    admin1,
    ,
    ,
    ,
    population,
    ,
    ,
    timeZone,
  ] = f;
  const region = regions.get(`${country}.${admin1}`) ?? "";
  const clean = (value) => value.replace(/[\t\n]/g, " ");
  rows.push(
    [
      id,
      clean(name),
      clean(region),
      country,
      latitude,
      longitude,
      timeZone,
      population,
    ].join("\t"),
  );
}
rows.sort();

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const out = resolve(
  root,
  "backend/src/Mondino.Infrastructure/Cities/cities.tsv.gz",
);
writeFileSync(out, gzipSync(rows.join("\n") + "\n", { level: 9 }));
console.log(`${rows.length} cities written to ${out}`);
