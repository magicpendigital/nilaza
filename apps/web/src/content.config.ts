import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const help = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/help",
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/i, "")
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    locale: z.enum(["vi", "en"]),
    slug: z.string(),
    category: z.string(),
    order: z.number(),
    updatedAt: z.coerce.date(),
    status: z.enum(["available", "beta", "planned"]).default("available")
  })
});

const legal = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/legal",
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/i, "")
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    locale: z.enum(["vi", "en"]),
    slug: z.enum(["privacy", "terms", "safety"]),
    updatedAt: z.coerce.date()
  })
});

export const collections = { help, legal };
