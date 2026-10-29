# poster-maker

Local, offline web app that turns a picture into a poster: the image keeps its native pixel
size and the canvas grows to the requested shape, leaving an empty band for text.

## Requirements

- Python 3.7+ (`python3` on Ubuntu 20.04, `python` on Windows). No third-party packages.
- A modern browser (Chrome, Edge, Firefox, Safari).

## Run

Windows:

```
run.bat
```

Linux:

```
./run.sh
```

Both start a local server and open `http://127.0.0.1:8765/`. Or run it directly:

```
python3 server.py --port 8765 --no-browser
```

## Use

1. Drop an image or pick one.
2. Choose the output shape: `16:9`, `1:1`, or `2x` (double width).
3. Choose the side the original image sits on. Only the sides on the growth axis are enabled —
   the free area must stay a single rectangle.
4. Choose the background of the new area: white, black, or transparent (PNG keeps alpha).
5. Type text. It is wrapped and sized to fill the new area, minus a small padding. Font family
   and a maximum size can be set; "auto" uses the whole area.
6. Download the result as PNG.

## Notes and limits

- The image is never scaled or cropped; only the empty band is added. A very tall 16:9 result
  can therefore be large.
- `2x` with the image on the left/right only. `16:9` and `1:1` offer the sides the shape needs.
- When the chosen format adds no area (for example a square image in `1:1`), text is disabled.
- Everything runs in the browser; the server only serves four static files.

## Layout

```
server.py            static server (Python stdlib)
run.bat / run.sh     launchers
web/index.html       UI
web/style.css        styles
web/app.js           canvas rendering and controls
web/layout.js        pure geometry and text fitting (shared with the tests)
test/layout.test.js  node --test
```

## Tests

```
node --test test/layout.test.js
```
