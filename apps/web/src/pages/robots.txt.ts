import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("Configure Astro.site before building robots.txt");
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${new URL("/sitemap.xml", site)}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
};
