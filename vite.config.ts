// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * Dev-only: the devtools "go to source" transform adds a `data-tsd-source` prop to every JSX
 * element. React Three Fiber treats dashed props as nested paths and throws when it updates
 * a <mesh>/<group> with it, which freezes the 3D scene. Strip it from the game's 3D files.
 */
function stripSourceAttrFromR3F(): Plugin {
  return {
    name: "counterfix:strip-tsd-source-r3f",
    enforce: "post",
    apply: "serve",
    transform(code, id) {
      if (!/\/src\/game\//.test(id) || !code.includes("data-tsd-source")) return;
      return { code: code.replace(/"data-tsd-source":\s*"[^"]*"\s*,?/g, ""), map: null };
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [stripSourceAttrFromR3F()],
  },
});
