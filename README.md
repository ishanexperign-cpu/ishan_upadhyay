# Ishan Upadhyay / Experign: portfolio site

This is a static site with no build step and no subfolders. Every file sits next to `index.html`, and every link points to the same folder. Upload all the files together to any web host.

## Files

- `index.html` is the site: Work, Instruments, Experiments, Play and About.
- `img*`, `vid*` and `w-*` files are the media.
- The Play pieces open in the drawer: `ravan-dahan.html`, `pinch-archer.html`, `quiet-cairn.html`, `sisto.html`, `stack.html` and `loom.html`.
- Ravan Dahan also uses `board.html`, `game.css`, `config.js`, `main.js` and its helper scripts (`util`, `data`, `art`, `world`, `fx`, `audio`, `hand`, `ledger`, `room` and `board`), plus `supabase.js`, `591.supabase.js`, `rozha-one.woff2` and `anek-latin.woff2`.
- `fonts.css` and the `.woff2` files are the fonts: Sora, Geist Mono, Geist, Bricolage Grotesque, JetBrains Mono, Fraunces and Figtree.
- `matter.min.js`, `three.min.js`, `vision_bundle.mjs` and the `vision_wasm_*` files are the libraries (matter.js, three.js and MediaPipe hand tracking).
- `LICENSE-*` files hold the licences for the fonts and libraries.

## Netlify

1. Open app.netlify.com/drop.
2. Drag `experign-site.zip` (or the unzipped folder) onto the page.
3. The site goes live at `https://<name>.netlify.app`. You can rename it under Project configuration and add your own domain under Domain management.

## GitHub Pages, Vercel or your own server

Put all the files at the root of the repository or web root. On GitHub Pages, choose Settings → Pages → Deploy from a branch → `main` / root. If your server doesn't already serve `.wasm` as `application/wasm`, add that mapping.

## Things to know

- **The camera games need HTTPS.** Netlify, GitHub Pages and Vercel provide it by default.
- **Hand tracking downloads one file from Google.** The hand model (`hand_landmarker.task`, about 8 MB) loads from Google's storage the first time someone picks camera play. Everything else is in this folder.
- **Ravan Dahan Online rooms and the Global ledger use your Supabase project.** The connection is set in `config.js`.

## Testing locally

Run `python3 -m http.server 8000` in this folder, then open http://localhost:8000.
