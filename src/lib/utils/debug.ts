export function isDebugEnabled() {
  const flag = process.env.ALLOW_DEBUG_ROUTES ?? "";
  return flag === "1" || flag.toLowerCase() === "true";
}

