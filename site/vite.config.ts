import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootPackageJsonPath = resolve(__dirname, "../package.json");
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf8")) as {
  version: string;
};

export default defineConfig({
  plugins: [react()],
  base: process.env.SITE_BASE_PATH ?? "/",
  define: {
    __FEATHERDOWN_VERSION__: JSON.stringify(rootPackageJson.version),
  },
});
