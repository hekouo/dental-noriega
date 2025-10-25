export const HONORIFICS = ["Dr.", "Dra."] as const;
export type THonorific = typeof HONORIFICS[number];

export const normalizeHonorific = (v?: string): THonorific => {
  if (!v) return "Dr.";
  const lower = v.toLowerCase().trim();
  return lower.startsWith("dra") ? "Dra." : "Dr.";
};

export const getFullName = (honorific: THonorific, firstName: string, lastName?: string): string => {
  const parts = [honorific, firstName];
  if (lastName) parts.push(lastName);
  return parts.join(" ");
};

export const getGreeting = (honorific: THonorific, firstName: string): string => {
  return `¡Hola, ${honorific} ${firstName}!`;
};
