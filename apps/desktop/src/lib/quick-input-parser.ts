export interface ParsedInput {
  title: string;
  chain: string[]; // user display names to search
  blockerNote?: string; // blocker note (segment without @)
  groupName?: string; // group name from #groupName syntax
  tagNames?: string[]; // tag names from $tagName syntax
}

/**
 * Parse quick input syntax.
 * Format: "Task title > @User1 > @User2"       → person chain
 *         "Task title > blocker note"           → blocker
 *         "#GroupName Task title > @User1"      → task in group with chain
 *         "Task title $Bug $Feature"            → task with tags
 *
 * Rules:
 *   - Segments starting with @ are person connections
 *   - Segments WITHOUT @ are blocker notes (last one wins)
 *   - Person connections require @ prefix
 *   - #GroupName in the title segment assigns to a group
 *   - $TagName in the title segment assigns tags
 *
 * Examples:
 *   "Review report > @Bob > @Charlie" -> { title: "Review report", chain: ["Bob", "Charlie"] }
 *   "Fix bug > 메타 개발자 대기"       -> { title: "Fix bug", blockerNote: "메타 개발자 대기" }
 *   "Deploy v2.0"                      -> { title: "Deploy v2.0", chain: [] }
 *   "#Backend Fix API bug"             -> { title: "Fix API bug", chain: [], groupName: "Backend" }
 *   "Fix crash $Bug"                   -> { title: "Fix crash", chain: [], tagNames: ["Bug"] }
 */
export function parseQuickInput(input: string): ParsedInput {
  const segments = input.split(' > ');
  let title = segments[0].trim();
  const chain: string[] = [];
  let blockerNote: string | undefined;
  let groupName: string | undefined;

  // Extract #groupName from title
  const groupMatch = title.match(/#(\S+)/);
  if (groupMatch) {
    groupName = groupMatch[1];
    title = title.replace(/#\S+/, '').trim();
  }

  // Extract $tagName(s) from title
  const tagNames: string[] = [];
  const tagRegex = /\$(\S+)/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(title)) !== null) {
    tagNames.push(tagMatch[1]);
  }
  if (tagNames.length > 0) {
    title = title.replace(/\$\S+/g, '').replace(/\s+/g, ' ').trim();
  }

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i].trim();
    if (!segment) continue;

    // Segments starting with @ are person connections
    const match = segment.match(/^@(.+)$/);
    if (match) {
      const name = match[1].trim();
      if (name.length > 0) {
        chain.push(name);
      }
    } else {
      // Non-@ segment is a blocker note
      blockerNote = segment;
    }
  }

  return { title, chain, blockerNote, groupName, tagNames: tagNames.length > 0 ? tagNames : undefined };
}
