import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({mode}) => {
  const site = loadEnv(mode,process.cwd(),"CORRAL_SITE_URL").CORRAL_SITE_URL;
  const image = site ? new URL("og.png",site.endsWith("/")?site:`${site}/`).href : undefined;
  return {
  plugins: [react(),{name:"corral-social-image",transformIndexHtml:{order:"pre",handler(html:string){return image?html.replaceAll('content="/og.png"',`content="${image}"`):html;}}}],
  base: "./",
  server: { host: "0.0.0.0" },
  };
});
