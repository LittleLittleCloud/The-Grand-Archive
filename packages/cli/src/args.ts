/** Parse CLI flags from args array. Returns { flags, positional }. */
export function parseArgs(args: string[]): {
  flags: Record<string, string>;
  positional: string[];
} {
  const flags: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (key === "json") {
        flags.json = "true";
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith("--")) {
          flags[key] = next;
          i++;
        }
      }
    } else {
      positional.push(arg!);
    }
  }

  return { flags, positional };
}
