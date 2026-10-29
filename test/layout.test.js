const test = require("node:test");
const assert = require("node:assert");
const { computeLayout, validPlacements, wrapText, layoutText } = require("../web/layout.js");

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
