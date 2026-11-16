const test = require("node:test");
const assert = require("node:assert");
const { computeLayout, validPlacements, splitTextArea, wrapText, layoutText, textBlockOrigin } = require("../web/layout.js");

// Fake metrics: every glyph is half the font size wide.
const measure = (s, size) => s.length * size * 0.5;

test("16:9 widens a portrait image and leaves the right side empty", () => {
  const l = computeLayout(400, 800, "16:9", "left");
  assert.strictEqual(l.width, Math.round((800 * 16) / 9));
  assert.strictEqual(l.height, 800);
  assert.deepStrictEqual(l.image, { x: 0, y: 0 });
  assert.deepStrictEqual(l.area, { x: 400, y: 0, width: l.width - 400, height: 800 });
});

test("16:9 grows the height of a very wide image", () => {
  const l = computeLayout(2000, 500, "16:9", "top");
  assert.strictEqual(l.width, 2000);
  assert.strictEqual(l.height, 1125);
  assert.deepStrictEqual(l.image, { x: 0, y: 0 });
  assert.deepStrictEqual(l.area, { x: 0, y: 500, width: 2000, height: 625 });
});

test("1:1 pads the shorter side only", () => {
  const l = computeLayout(300, 500, "1:1", "right");
  assert.strictEqual(l.width, 500);
  assert.strictEqual(l.height, 500);
  assert.deepStrictEqual(l.image, { x: 200, y: 0 });
  assert.deepStrictEqual(l.area, { x: 0, y: 0, width: 200, height: 500 });
});

test("2x doubles the width and honours the side", () => {
  const left = computeLayout(600, 400, "2x", "left");
  assert.strictEqual(left.width, 1200);
  assert.deepStrictEqual(left.image, { x: 0, y: 0 });
  assert.deepStrictEqual(left.area, { x: 600, y: 0, width: 600, height: 400 });

  const right = computeLayout(600, 400, "2x", "right");
  assert.deepStrictEqual(right.image, { x: 600, y: 0 });
  assert.deepStrictEqual(right.area, { x: 0, y: 0, width: 600, height: 400 });
});

test("only the sides on the growth axis are offered", () => {
  assert.deepStrictEqual(validPlacements(400, 800, "16:9"), ["left", "right"]);
  assert.deepStrictEqual(validPlacements(2000, 500, "16:9"), ["top", "bottom"]);
  assert.deepStrictEqual(validPlacements(600, 400, "2x"), ["left", "right"]);
});

test("a placement off the growth axis is rejected", () => {
  assert.throws(() => computeLayout(400, 800, "16:9", "top"));
  assert.throws(() => computeLayout(2000, 500, "16:9", "left"));
});

test("no growth means no text area", () => {
  assert.strictEqual(computeLayout(500, 500, "1:1", "top").area, null);
  assert.deepStrictEqual(validPlacements(500, 500, "1:1"), []);
});

test("splitTextArea keeps one field in the whole band", () => {
  const area = { x: 10, y: 20, width: 300, height: 100 };
  assert.deepStrictEqual(splitTextArea(area, "top", false), [area]);
  assert.deepStrictEqual(splitTextArea(null, "left", true), [null]);
});

test("splitTextArea stacks two fields for a band on the left/right", () => {
  const area = { x: 400, y: 0, width: 200, height: 801 };
  assert.deepStrictEqual(splitTextArea(area, "left", true), [
    { x: 400, y: 0, width: 200, height: 400 },
    { x: 400, y: 400, width: 200, height: 401 },
  ]);
  assert.deepStrictEqual(splitTextArea(area, "right", true), [
    { x: 400, y: 0, width: 200, height: 400 },
    { x: 400, y: 400, width: 200, height: 401 },
  ]);
});

test("splitTextArea places two fields side by side for a band on the top/bottom", () => {
  const area = { x: 0, y: 500, width: 2001, height: 100 };
  const parts = splitTextArea(area, "bottom", true);
  assert.deepStrictEqual(parts, [
    { x: 0, y: 500, width: 1000, height: 100 },
    { x: 1000, y: 500, width: 1001, height: 100 },
  ]);
  assert.deepStrictEqual(splitTextArea(area, "top", true), parts);
});

test("splitTextArea halves cover the original band exactly", () => {
  const area = { x: 7, y: 11, width: 403, height: 257 };
  [splitTextArea(area, "left", true), splitTextArea(area, "top", true)].forEach((parts) => {
    assert.strictEqual(parts.length, 2);
    assert.strictEqual(parts[0].x + parts[0].width <= parts[1].x || parts[0].y + parts[0].height <= parts[1].y, true);
    const left = Math.min(parts[0].x, parts[1].x);
    const top = Math.min(parts[0].y, parts[1].y);
    const right = Math.max(parts[0].x + parts[0].width, parts[1].x + parts[1].width);
    const bottom = Math.max(parts[0].y + parts[0].height, parts[1].y + parts[1].height);
    assert.strictEqual(left, area.x);
    assert.strictEqual(top, area.y);
    assert.strictEqual(right, area.x + area.width);
    assert.strictEqual(bottom, area.y + area.height);
  });
});

test("wrapText breaks on words and on over-long words", () => {
  const charWidth = (s) => s.length * 4;
  assert.deepStrictEqual(wrapText("one two three", 32, charWidth), ["one two", "three"]);
  assert.deepStrictEqual(wrapText("abcdefghij", 16, charWidth), ["abcd", "efgh", "ij"]);
  assert.deepStrictEqual(wrapText("a\n\nb", 40, charWidth), ["a", "", "b"]);
});

test("layoutText fills the box: bigger box, bigger font", () => {
  const small = layoutText("Hello world", { maxWidth: 100, maxHeight: 50, maxSize: 400, measure });
  const big = layoutText("Hello world", { maxWidth: 400, maxHeight: 200, maxSize: 400, measure });
  assert.ok(small.fits && big.fits);
  assert.ok(big.size > small.size);
  assert.ok(big.lines.length * big.size * 1.2 <= 200);
});

test("layoutText respects an explicit maximum size", () => {
  const r = layoutText("Hello", { maxWidth: 1000, maxHeight: 1000, maxSize: 24, measure });
  assert.strictEqual(r.size, 24);
});

test("layoutText reports failure when even size 1 does not fit", () => {
  const r = layoutText("Hello", { maxWidth: 2, maxHeight: 1, maxSize: 40, measure });
  assert.strictEqual(r.fits, false);
});

test("textBlockOrigin aligns the block to the padded area", () => {
  const area = { x: 10, y: 20, width: 200, height: 100 };
  const pad = 5;
  assert.deepStrictEqual(textBlockOrigin(area, pad, 40, "left", "top"), { x: 15, top: 25 });
  assert.deepStrictEqual(textBlockOrigin(area, pad, 40, "center", "middle"), { x: 110, top: 50 });
  assert.deepStrictEqual(textBlockOrigin(area, pad, 40, "right", "bottom"), { x: 205, top: 75 });
});

test("textBlockOrigin rejects unknown alignments", () => {
  const area = { x: 0, y: 0, width: 10, height: 10 };
  assert.throws(() => textBlockOrigin(area, 0, 5, "justify", "top"));
  assert.throws(() => textBlockOrigin(area, 0, 5, "left", "baseline"));
});
