const PREFIX_RE = /^\s*(?:re|fwd?|forward)\s*:\s*/i;

export function normalizeSubject(subject: string): string {
  let current = subject;
  let previous;
  do {
    previous = current;
    current = current.replace(PREFIX_RE, "");
  } while (current !== previous);
  return current.trim();
}
