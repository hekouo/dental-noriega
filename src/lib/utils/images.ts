export function driveToLh3(url: string): string {
  try {
    const u = new URL(url);
    // Casos típicos de Drive:
    // 1) https://drive.google.com/uc?id=FILEID&export=view
    // 2) https://drive.google.com/open?id=FILEID
    // 3) https://drive.google.com/file/d/FILEID/view
    let id = "";
    if (u.hostname === "drive.google.com") {
      if (u.pathname.startsWith("/file/d/")) {
        const parts = u.pathname.split("/");
        const idx = parts.indexOf("d");
        id = parts[idx + 1] || "";
      }
      if (!id) id = u.searchParams.get("id") || "";
      if (id) return `https://lh3.googleusercontent.com/d/${id}=s1200`;
    }
  } catch {}
  return url;
}
