// Prints a progress summary of docs/TASKS.md. Usage: bun run tasks
const text = await Bun.file(new URL("../docs/TASKS.md", import.meta.url)).text();

/** First sentence (or bold lead-in) of a task, without markdown, capped for one terminal line. */
const summarize = (task: string) => {
  const bold = task.match(/^\*\*(.+?)\*\*/);
  const text = (bold ? bold[1] : task).replace(/[*`]/g, "").replace(/\s*\(.*$/, "").split(/(?<=\.)\s/)[0];
  return text.length > 72 ? `${text.slice(0, 71)}…` : text;
};

type Section = { title: string; done: number; total: number; open: string[] };
const sections: Section[] = [];

for (const line of text.split(/\r?\n/)) {
  const heading = line.match(/^## (.+)/);
  if (heading) {
    sections.push({ title: heading[1], done: 0, total: 0, open: [] });
    continue;
  }
  const box = line.match(/^\s*- \[( |x)\] (.+)/i);
  const current = sections.at(-1);
  if (!box || !current) continue;
  current.total++;
  if (box[1].toLowerCase() === "x") current.done++;
  else current.open.push(summarize(box[2]));
}

const bar = (done: number, total: number, width = 20) => {
  const filled = total ? Math.round((done / total) * width) : 0;
  return "█".repeat(filled) + "░".repeat(width - filled);
};

let done = 0;
let total = 0;
for (const s of sections) {
  if (!s.total) continue;
  done += s.done;
  total += s.total;
  console.log(`\n${s.title}\n  ${bar(s.done, s.total)} ${s.done}/${s.total}`);
  for (const item of s.open.slice(0, 5)) console.log(`  - ${item}`);
  if (s.open.length > 5) console.log(`  ...and ${s.open.length - 5} more`);
}
console.log(`\nOverall ${bar(done, total)} ${done}/${total}\n`);
