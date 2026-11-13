import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = path.resolve(__dirname);

describe("Tokens Dark Bento Cockpit y tipografía única Inter", () => {
  it("globals.css define la paleta oficial v2 y superficies del navegador sin Oswald ni #e2f800", () => {
    const css = fs.readFileSync(path.join(APP_DIR, "globals.css"), "utf8");

    expect(css).toContain("--background: #09090B");
    expect(css).toContain("--card: #111214");
    expect(css).toContain("--secondary: #18191C");
    expect(css).toContain("--border: #232428");
    expect(css).toContain("--primary: #C1F429");
    expect(css).toContain("--primary-foreground: #000000");
    expect(css).toContain("--volt-hover: #AEDF1B");
    expect(css).toContain("--color-mint-active: #18FFC8");
    expect(css).toContain("--color-amber-warning: #FBBF24");
    expect(css).toContain("--color-coral-alert: #FF6D6D");
    expect(css).toContain("--radius: 1.5rem");
    expect(css).toContain("::selection");
    expect(css).toContain(".tabular-nums");

    expect(css).not.toMatch(/Oswald/i);
    expect(css).not.toMatch(/#e2f800/i);
  });

  it("layout.tsx carga únicamente Inter (300, 400, 500, 600) mediante next/font/google y elimina Oswald", () => {
    const layout = fs.readFileSync(path.join(APP_DIR, "layout.tsx"), "utf8");

    expect(layout).toContain('from "next/font/google"');
    expect(layout).toContain("Inter(");
    expect(layout).toContain('"300"');
    expect(layout).toContain('"400"');
    expect(layout).toContain('"500"');
    expect(layout).toContain('"600"');
    expect(layout).toContain("--font-inter");
    expect(layout).not.toMatch(/Oswald/i);
  });
});
