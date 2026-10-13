import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({mode}) => {
  const site = loadEnv(mode,process.cwd(),"CORRAL_SITE_URL").CORRAL_SITE_URL;
  const canonical = site ? new URL(site.endsWith("/")?site:`${site}/`).href : "https://corral.fedeya.sh/";
  return {
  plugins: [react(),{name:"corral-social-image",transformIndexHtml:{order:"pre",handler(html:string){return html.replaceAll('content="https://corral.fedeya.sh/og.png"',`content="${new URL("og.png",canonical).href}"`).replaceAll('content="https://corral.fedeya.sh/"',`content="${canonical}"`);}}}],
  base: "./",
  server: { host: "0.0.0.0" },
  };
});
