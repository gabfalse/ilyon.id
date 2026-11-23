export function getProgramSlug(program) {
  const value =
    program?.programCode || program?.programName || program?.id || "";

  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
