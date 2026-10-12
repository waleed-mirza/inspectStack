export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let i = 0; i < 5 && current; i += 1) {
    if (typeof current === "object" && current && "code" in current) {
      if ((current as { code: unknown }).code === "23505") return true;
    }
    current =
      typeof current === "object" && current && "cause" in current
        ? (current as { cause: unknown }).cause
        : null;
  }
  return false;
}
