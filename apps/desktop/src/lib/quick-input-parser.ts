export interface ParsedInput {
  title: string;
  chain: string[]; // user display names to search
}

/**
 * Parse quick input syntax.
 * Format: "Task title > @User1 > @User2"
 *
 * Examples:
 *   "Review report > @Bob > @Charlie" -> { title: "Review report", chain: ["Bob", "Charlie"] }
 *   "Fix bug > @Alice" -> { title: "Fix bug", chain: ["Alice"] }
 *   "Deploy v2.0" -> { title: "Deploy v2.0", chain: [] }
 */
export function parseQuickInput(input: string): ParsedInput {
  const segments = input.split(' > ');
  const title = segments[0].trim();
  const chain: string[] = [];

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i].trim();
    // Extract name after @
    const match = segment.match(/^@(.+)$/);
    if (match) {
      const name = match[1].trim();
      if (name.length > 0) {
        chain.push(name);
      }
    }
  }

  return { title, chain };
}
