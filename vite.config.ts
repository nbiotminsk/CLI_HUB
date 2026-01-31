import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from "vite-plugin-trae-solo-badge";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  build: {
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          ui: ["lucide-react", "clsx", "tailwind-merge"],
          state: ["zustand"],
          xterm: ["xterm", "xterm-addon-fit"],
        },
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: ["react-dev-locator"],
      },
    }),
    traeBadgePlugin({
      variant: "dark",
      position: "bottom-right",
      prodOnly: true,
      clickable: true,
      clickUrl: "https://www.trae.ai/solo?showJoin=1",
      autoTheme: true,
      autoThemeTarget: "#root",
    }),
    tsconfigPaths(),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    globals: true,
  },
} as UserConfig);
