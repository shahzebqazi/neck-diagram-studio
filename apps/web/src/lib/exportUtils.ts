export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const requestExportName = (message: string, suggested: string) => {
  if (typeof window === "undefined" || typeof window.prompt !== "function") {
    return slugify(suggested) || suggested;
  }
  const name = window.prompt(message, suggested);
  if (!name || !name.trim()) return null;
  return slugify(name.trim()) || suggested;
};
