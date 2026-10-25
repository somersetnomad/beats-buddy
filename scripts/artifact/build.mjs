import path from 'path'
import fs from 'fs'
import { createRequire } from 'module'
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const NM = path.join(REPO, 'node_modules')
const require = createRequire(NM + '/')
const esbuild = require('esbuild')
const postcss = require('postcss')
const tw = require('@tailwindcss/postcss')

// 1) JS
const js = await esbuild.build({
  entryPoints: [path.join(REPO, 'scripts/artifact/entry.tsx')], bundle: true, minify: true, write: false, format: 'iife', target: 'es2020',
  jsx: 'automatic', nodePaths: [NM], alias: { '@': REPO + '/src' }, logLevel: 'error',
  define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_BB_PREVIEW': '"1"' },
})
const code = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')

// 2) Tailwind + app CSS
const cssIn = fs.readFileSync(REPO + '/src/app/globals.css', 'utf8')
const out = await postcss([tw({ base: REPO })]).process(cssIn, { from: REPO + '/src/app/globals.css' })

// 3) fonts: latin subsets only, embedded
function fontCss(pkg) {
  const dir = path.join(NM, pkg)
  const src = fs.readFileSync(path.join(dir, 'index.css'), 'utf8')
  const blocks = src.split('/*').slice(1).map((b) => '/*' + b)
  return blocks.filter((b) => /-latin-wght-normal \*\//.test(b)).map((b) =>
    b.replace(/url\(\.\/files\/([^)]+)\)/g, (_, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(dir, 'files', f)).toString('base64')})`)
  ).join('\n')
}
const fonts = fontCss('@fontsource-variable/unbounded') + fontCss('@fontsource-variable/onest')

const html = `<title>BeatBuddy</title>
<meta name="description" content="Tap the lights. Make a beat.">
<style>${fonts}\n${out.css}</style>
<div id="root"></div>
<script>${code}</script>
`
fs.mkdirSync(path.join(REPO, 'dist'), { recursive: true }); fs.writeFileSync(path.join(REPO, 'dist/beatbuddy.html'), html)
console.log('bytes', html.length, 'css', out.css.length, 'js', code.length, 'fonts', fonts.length)
