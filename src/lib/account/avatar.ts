export type MinimalUser = {
  fullName?: string | null;
  email?: string | null;
};

export function getUserInitial(user: MinimalUser | null | undefined): string {
  const nameSource = (user?.fullName ?? user?.email ?? "").trim();

  if (!nameSource) return "?";

  const firstChar = nameSource[0] ?? "?";
  return firstChar.toUpperCase();
}

