import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Contract for the touch-device row-action fix (fix/mobile-tool-approval):
// buttons that reveal on row hover must use the `hover-reveal` utility from
// web/src/index.css — visible by default, hidden only on devices that can
// actually hover. Reintroducing `opacity-0 group-hover:opacity-100` hides
// actions from touch users with no hover to reveal them, so any occurrence
// must fail the suite.

const webRoot = process.cwd(); // vitest runs from the package root, web/
const srcRoot = join(webRoot, "src");

// Components whose row action buttons depend on `hover-reveal`.
const HOVER_REVEAL_FILES = [
  "components/mcp/MCPView.tsx",
  "components/mcp/MCPServerDetail.tsx",
  "components/memory/MemoryView.tsx",
  "components/schedules/SchedulesView.tsx",
  "components/secrets/SecretsView.tsx",
  "components/sessions/SessionList.tsx",
  "components/tools/ToolsView.tsx",
  "components/workspace/WorkspaceView.tsx",
];

const OLD_HOVER_PATTERN = /group-hover:opacity-/;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    return /\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.[jt]sx?$/.test(entry)
      ? [full]
      : [];
  });
}

describe("hover-reveal contract", () => {
  it("no component hides row actions behind hover-only opacity", () => {
    const offenders = listSourceFiles(srcRoot)
      .filter((file) => OLD_HOVER_PATTERN.test(readFileSync(file, "utf8")))
      .map((file) => file.slice(srcRoot.length + 1));
    expect(offenders).toEqual([]);
  });

  it.each(HOVER_REVEAL_FILES)("reveals row actions via hover-reveal in %s", (rel) => {
    expect(readFileSync(join(srcRoot, rel), "utf8")).toContain("hover-reveal");
  });

  it("compiled CSS keeps the hover-reveal utility and its hover-capable guard", () => {
    const assetsDir = join(webRoot, "..", "src", "web", "static", "assets");
    const cssFiles = readdirSync(assetsDir).filter((f) => /^index-.*\.css$/.test(f));
    expect(cssFiles, "run `npm run build` to produce src/web/static assets").not.toHaveLength(0);
    const css = cssFiles.map((f) => readFileSync(join(assetsDir, f), "utf8")).join("\n");
    expect(css).toContain(".hover-reveal");
    expect(css).toContain("(hover: hover) and (pointer: fine)");
  });
});
