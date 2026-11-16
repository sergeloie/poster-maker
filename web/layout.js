// Pure geometry and text-fitting helpers. Shared by the browser UI and the Node tests.

// The image keeps its native pixel size; only the empty band grows. A single band means the
// growth axis is fixed by the target shape, so only two of the four sides are ever valid.
function growthAxis(imageWidth, imageHeight, mode) {
  if (mode === "2x") return "horizontal";
  if (mode === "16:9") return imageWidth / imageHeight >= 16 / 9 ? "vertical" : "horizontal";
  if (mode === "1:1") return imageWidth >= imageHeight ? "vertical" : "horizontal";
  throw new Error("unknown mode: " + mode);
}

function computeLayout(imageWidth, imageHeight, mode, placement) {
  var axis = growthAxis(imageWidth, imageHeight, mode);
  var width = imageWidth;
  var height = imageHeight;

  if (axis === "horizontal") {
    if (placement !== "left" && placement !== "right") {
      throw new Error("placement " + placement + " is not valid for " + mode + " on this image");
    }
    width = mode === "2x" ? imageWidth * 2 : Math.round(imageHeight * (mode === "16:9" ? 16 / 9 : 1));
  } else {
    if (placement !== "top" && placement !== "bottom") {
      throw new Error("placement " + placement + " is not valid for " + mode + " on this image");
    }
    height = Math.round(imageWidth * (mode === "16:9" ? 9 / 16 : 1));
  }

  var imageX = placement === "right" ? width - imageWidth : 0;
  var imageY = placement === "bottom" ? height - imageHeight : 0;

  var area = null;
  if (width > imageWidth) {
    area = { x: placement === "right" ? 0 : imageWidth, y: 0, width: width - imageWidth, height: height };
  } else if (height > imageHeight) {
    area = { x: 0, y: placement === "bottom" ? 0 : imageHeight, width: width, height: height - imageHeight };
  }

  return { width: width, height: height, image: { x: imageX, y: imageY }, area: area };
}

function validPlacements(imageWidth, imageHeight, mode) {
  var layout = computeLayout(
    imageWidth,
    imageHeight,
    mode,
    growthAxis(imageWidth, imageHeight, mode) === "horizontal" ? "left" : "top"
  );
  if (!layout.area) return [];
  return growthAxis(imageWidth, imageHeight, mode) === "horizontal" ? ["left", "right"] : ["top", "bottom"];
}

// Splits the text band between one or two text fields. A band on the left/right is tall, so two
// fields are stacked vertically; a band on top/bottom is wide, so they sit side by side. The
// halves are rounded so that they always cover the original area exactly, with no gap or overlap.
function splitTextArea(area, placement, twoFields) {
  if (!area || !twoFields) return [area];

  var halfW = Math.floor(area.width / 2);
  var halfH = Math.floor(area.height / 2);

  if (placement === "left" || placement === "right") {
    return [
      { x: area.x, y: area.y, width: area.width, height: halfH },
      { x: area.x, y: area.y + halfH, width: area.width, height: area.height - halfH },
    ];
  }
  return [
    { x: area.x, y: area.y, width: halfW, height: area.height },
    { x: area.x + halfW, y: area.y, width: area.width - halfW, height: area.height },
  ];
}

// Greedy word wrap. Words wider than maxWidth are broken by character.
function wrapText(text, maxWidth, measure) {
  var lines = [];
  var paragraphs = String(text).split(/\r?\n/);

  for (var p = 0; p < paragraphs.length; p++) {
    var words = paragraphs[p].split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    var line = "";
    for (var i = 0; i < words.length; i++) {
      var candidate = line ? line + " " + words[i] : words[i];
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      var word = words[i];
      while (measure(word) > maxWidth && word.length > 1) {
        var cut = word.length - 1;
        while (cut > 1 && measure(word.slice(0, cut)) > maxWidth) cut--;
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      line = word;
    }
    if (line) lines.push(line);
  }
  return lines;
}

// Largest integer font size at which the wrapped text still fits the box.
// measure(str, size) must return the rendered width of str at that size.
function layoutText(text, opts) {
  var maxWidth = opts.maxWidth;
  var maxHeight = opts.maxHeight;
  var maxSize = Math.max(1, Math.floor(opts.maxSize));
  var lineHeightRatio = opts.lineHeightRatio || 1.2;
  var measure = opts.measure;

  function attempt(size) {
    var lines = wrapText(text, maxWidth, function (s) {
      return measure(s, size);
    });
    var tooWide = lines.some(function (l) {
      return measure(l, size) > maxWidth;
    });
    var fits = !tooWide && lines.length * size * lineHeightRatio <= maxHeight;
    return { size: size, lines: lines, fits: fits };
  }

  var best = attempt(1);
  if (!best.fits) return { size: 0, lines: [], fits: false };

  var low = 1;
  var high = maxSize;
  while (low <= high) {
    var mid = (low + high) >> 1;
    var candidate = attempt(mid);
    if (candidate.fits) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return { size: best.size, lines: best.lines, fits: true };
}

var H_ALIGNMENTS = ["left", "center", "right"];
var V_ALIGNMENTS = ["top", "middle", "bottom"];

// Anchor of a text block inside the padded text area. x is the line anchor for
// ctx.textAlign = hAlign; top is the top edge of the block.
function textBlockOrigin(area, padding, blockHeight, hAlign, vAlign) {
  if (H_ALIGNMENTS.indexOf(hAlign) === -1) throw new Error("unknown horizontal alignment: " + hAlign);
  if (V_ALIGNMENTS.indexOf(vAlign) === -1) throw new Error("unknown vertical alignment: " + vAlign);

  var innerX = area.x + padding;
  var innerY = area.y + padding;
  var innerWidth = Math.max(0, area.width - padding * 2);
  var innerHeight = Math.max(0, area.height - padding * 2);

  var x = hAlign === "left" ? innerX : hAlign === "right" ? innerX + innerWidth : innerX + innerWidth / 2;
  var top = vAlign === "top"
    ? innerY
    : vAlign === "bottom"
      ? innerY + innerHeight - blockHeight
      : innerY + (innerHeight - blockHeight) / 2;
  return { x: x, top: top };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    computeLayout: computeLayout,
    validPlacements: validPlacements,
    splitTextArea: splitTextArea,
    wrapText: wrapText,
    layoutText: layoutText,
    textBlockOrigin: textBlockOrigin,
  };
}
