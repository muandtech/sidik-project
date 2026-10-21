export function isActive(pathname: string, href: string | null) {
  if (!href) return false;
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
