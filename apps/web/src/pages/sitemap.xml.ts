import type { APIRoute } from "astro";
import { featureCopy, intentions, locales } from "../lib/site";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error("Configure Astro.site before building the sitemap");
  const base = site;
  const help = await getCollection("help");
  const paths = [
    ...locales.flatMap(locale => [
      `/${locale}`,
      `/${locale}/help`,
      `/${locale}/privacy`,
      `/${locale}/terms`,
      `/${locale}/safety`,
      ...featureCopy[locale].map(item => `/${locale}/features/${item.slug}`),
      ...intentions[locale].map(item => `/${locale}/for/${item.slug}`)
    ]),
    ...help.map(item => `/${item.data.locale}/help/${item.data.slug}`)
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${new URL(path, base)}</loc></url>`).join("")}</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
