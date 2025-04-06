export function getSubdomainName(url: string, domain: string): string | null {
  const parsedUrl = new URL(url);
  const hostname: string = parsedUrl.hostname;
  if (hostname.endsWith(domain)) {
    return hostname.slice(0, -domain.length - 1);
  }
  return null;
}
