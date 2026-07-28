import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// base is set for GitHub Pages deploys: https://<user>.github.io/typeyourmusic/
// It must match the repository name or every asset URL 404s.
export default defineConfig({
	plugins: [react(), tailwindcss()],
	base: process.env.GITHUB_PAGES ? "/typeyourmusic/" : "/",
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
})
