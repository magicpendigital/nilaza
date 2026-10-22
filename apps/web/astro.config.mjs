import { defineConfig } from "astro/config";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://nilaza.magicpendigital.com",
  output: "static",
  trailingSlash: "never",
  // Loopback IPv4 also supports USB adb reverse for physical Android QA.
  server: { host: "127.0.0.1" },
  build: { format: "directory" },
  // iPhone 7 Plus runs iOS 15. Keep the optimizer from replacing classic
  // breakpoints with media-query range syntax (supported only in Safari 16.4+).
  vite: {
    build: {
      target: ["safari15", "ios15"],
      cssTarget: ["safari15", "ios15"]
    }
  }
});
