/**
 * `npx tsx scripts/make-favicon.tsx` — regenerate public/favicon.ico (16, 32,
 * 48 px) from the same brand mark as app/icon.tsx. ICO files may embed PNGs
 * directly, so we render PNGs with next/og and write the ICO container.
 */
import { writeFileSync } from "node:fs";
import * as React from "react";
import { ImageResponse } from "next/og";
import { brandIconElement } from "../src/lib/brand-icon";

// tsx compiles JSX with the classic runtime (tsconfig has jsx: "preserve").
(globalThis as { React?: typeof React }).React = React;

async function png(size: number): Promise<Buffer> {
  const res = new ImageResponse(brandIconElement(size), { width: size, height: size });
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map(png));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map((img, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(sizes[i]!, 0); // width
    e.writeUInt8(sizes[i]!, 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(img.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += img.length;
    return e;
  });
  writeFileSync("public/favicon.ico", Buffer.concat([header, ...entries, ...images]));
  console.log("Wrote public/favicon.ico");
}

main();
