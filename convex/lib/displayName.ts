const PLACEHOLDER_NAMES = new Set(["anonymous"]);

export function isUsableDisplayName(name: string | undefined): name is string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return false;
  }
  return !PLACEHOLDER_NAMES.has(trimmed.toLowerCase());
}

export function normalizeDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) {
    return "";
  }
  return trimmed;
}
