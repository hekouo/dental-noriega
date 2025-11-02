import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const legacyDir = path.resolve("ops/sql/legacy");
const out = path.resolve("ops/sql/legacy/LEGACY_SNAPSHOT.md");

const files = (await fs.readdir(legacyDir))
  .filter(f => f.toLowerCase().endsWith(".sql"))
  .sort();

let md = `# LEGACY SQL SNAPSHOT\n\nTotal: ${files.length} archivos\n\n`;

for (const f of files) {
  const p = path.join(legacyDir, f);
  const buf = await fs.readFile(p);
  const sha = crypto.createHash("sha256").update(buf).digest("hex");
  const text = buf.toString("utf8");
  const first = text.split(/\r?\n/).slice(0, 20).join("\n");

  md += `## ${f}\n`;
  md += `**SHA256:** \`${sha}\`\n\n`;
  md += `**Primeras 20 líneas (preview):**\n\n`;
  md += "```sql\n" + first + "\n```\n\n";
  md += `<details><summary>Contenido completo</summary>\n\n`;
  md += "```sql\n" + text + "\n```\n\n";
  md += `</details>\n\n---\n\n`;
}

await fs.writeFile(out, md, "utf8");
console.log("Snapshot creado en:", out);

