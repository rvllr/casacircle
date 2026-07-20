import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Volontairement NON conditionné au mode : mcpPlugin n'injecte rien dans le
    // bundle client. C'est un générateur de code qui compile src/lib/mcp/ vers
    // l'edge function Deno supabase/functions/mcp/ (hook buildStart). Le gater
    // sur `mode === "development"` ferait diverger silencieusement la fonction
    // déployée de ses sources lors d'un build de production.
    mcpPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
