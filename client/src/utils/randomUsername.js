// The name list is large and only needed when a new chat partner appears,
// so it loads on first use instead of with the site.
export const randomUsername = async () => (await import("unique-username-generator")).generateUsername();
