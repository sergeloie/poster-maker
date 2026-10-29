// Poster-maker UI. Depends on computeLayout, validPlacements, layoutText from layout.js.
(function () {
  "use strict";

  // Canvas font stacks with Linux (Liberation/DejaVu) fallbacks so the list works offline on
  // Windows and Ubuntu alike.
  var FONTS = [
    { label: "Georgia", stack: "Georgia, 'Liberation Serif', serif" },
    { label: "Arial", stack: "Arial, 'Liberation Sans', sans-serif" },
    { label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
    { label: "Tahoma", stack: "Tahoma, 'DejaVu Sans', sans-serif" },
    { label: "Times New Roman", stack: "'Times New Roman', 'Liberation Serif', serif" },
    { label: "Courier New", stack: "'Courier New', 'Liberation Mono', monospace" },
    { label: "Trebuchet MS", stack: "'Trebuchet MS', 'DejaVu Sans', sans-serif" },
    { label: "Impact", stack: "Impact, 'DejaVu Sans', sans-serif" },
  ];

  var DEFAULT_COLORS = { white: "#000000", black: "#ffffff", transparent: "#222222" };
  var PLACEMENT_ORDER = ["left", "right", "top", "bottom"];

  var state = {
    img: null,
    url: null,
    fileName: "",
    srcW: 0,
    srcH: 0,
    mode: "16:9",
    placement: null,
    bg: "white",
    text: "",
    font: 0,
    bold: false,
    autoSize: true,
    maxSize: 64,
    color: DEFAULT_COLORS.white,
    colorTouched: false, // once the user picks a color, background changes stop overwriting it
  };

  function $(id) {
    return document.getElementById(id);
  }

  function fontCss(size) {
    return (state.bold ? "bold " : "") + size + "px " + FONTS[state.font].stack;
  }

  function loadFile(file) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      showError("That file is not an image.");
      return;
    }
    showError("");
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      if (state.url) URL.revokeObjectURL(state.url);
      state.img = img;
      state.url = url;
      state.fileName = file.name;
      state.srcW = img.naturalWidth;
      state.srcH = img.naturalHeight;
      $("file-info").textContent =
        file.name + " \u2014 " + state.srcW + " \u00D7 " + state.srcH + " px";
      $("file-info").hidden = false;
      render();
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      showError("The file could not be loaded as an image.");
    };
    img.src = url;
  }

  function showError(message) {
    var el = $("load-error");
    el.textContent = message;
    el.hidden = !message;
  }

  // Draws the current poster onto the full-size preview canvas and returns the layout, or null
  // when no image is loaded.
  function draw() {
    $("text-hint").hidden = true;
    var frame = $("canvas-frame");
    var canvas = $("poster");
    var ctx = canvas.getContext("2d");

    if (!state.img) {
      frame.hidden = true;
      $("preview-empty").hidden = false;
      $("dims").textContent = "";
      return null;
    }

    var valid = validPlacements(state.srcW, state.srcH, state.mode);
    // No new area for this format: the output is the image as-is, without computeLayout.
    var layout = valid.length
      ? computeLayout(state.srcW, state.srcH, state.mode, state.placement)
      : { width: state.srcW, height: state.srcH, image: { x: 0, y: 0 }, area: null };

    frame.hidden = false;
    $("preview-empty").hidden = true;
    canvas.width = layout.width;
    canvas.height = layout.height;
    $("dims").textContent = layout.width + " \u00D7 " + layout.height + " px";
    frame.className = state.bg === "transparent" ? "alpha" : "";

    if (state.bg !== "transparent") {
      ctx.fillStyle = state.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(state.img, layout.image.x, layout.image.y);

    if (layout.area && state.text.trim()) drawText(ctx, layout.area);
    return layout;
  }

  function drawText(ctx, area) {
    var pad = Math.max(8, Math.round(Math.min(area.width, area.height) * 0.05));
    var result = layoutText(state.text, {
      maxWidth: area.width - pad * 2,
      maxHeight: area.height - pad * 2,
      maxSize: state.autoSize ? Math.max(area.width, area.height) : state.maxSize,
      measure: function (str, size) {
        ctx.font = fontCss(size);
        return ctx.measureText(str).width;
      },
      lineHeightRatio: 1.2,
    });

    if (!result.fits) {
      $("text-hint").hidden = false;
      $("text-hint").textContent = "The text does not fit in the new area. Try shorter text or turn auto size on.";
      return;
    }

    ctx.font = fontCss(result.size);
    ctx.fillStyle = state.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var lineHeight = result.size * 1.2;
    var blockHeight = result.lines.length * lineHeight;
    var centerX = area.x + area.width / 2;
    // Center of the first line, so the whole block is vertically centered in the area.
    var y = area.y + (area.height - blockHeight) / 2 + lineHeight / 2;
    for (var i = 0; i < result.lines.length; i++) {
      ctx.fillText(result.lines[i], centerX, y);
      y += lineHeight;
    }
  }

  function render() {
    var hasImg = !!state.img;
    var valid = hasImg ? validPlacements(state.srcW, state.srcH, state.mode) : [];
    var hasArea = valid.length > 0;

    // Keep the selection valid whenever the image or format changes.
    state.placement = hasArea
      ? (valid.indexOf(state.placement) !== -1 ? state.placement : valid[0])
      : null;

    PLACEMENT_ORDER.forEach(function (p) {
      var radio = $("pl-" + p);
      radio.disabled = !hasImg || valid.indexOf(p) === -1;
      radio.checked = state.placement === p;
    });

    Array.prototype.forEach.call(document.querySelectorAll('input[name="format"]'), function (r) {
      r.checked = r.value === state.mode;
    });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="bg"]'), function (r) {
      r.checked = r.value === state.bg;
    });

    var controlsActive = hasImg && hasArea;
    $("fs-bg").disabled = !controlsActive;
    $("fs-text").disabled = !controlsActive;
    $("fs-placement").disabled = !hasImg;
    $("download").disabled = !hasImg;
    $("max-size").disabled = state.autoSize;
    $("no-area-hint").hidden = !(hasImg && !hasArea);

    draw();
  }

  function download() {
    if (!state.img) return;
    $("poster").toBlob(function (blob) {
      if (!blob) {
        showError("Export failed.");
        return;
      }
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "poster.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }, "image/png");
  }

  function init() {
    var fontSelect = $("font-select");
    FONTS.forEach(function (font, i) {
      var option = document.createElement("option");
      option.value = String(i);
      option.textContent = font.label;
      fontSelect.appendChild(option);
    });

    $("file-input").addEventListener("change", function () {
      if (this.files && this.files[0]) loadFile(this.files[0]);
      this.value = ""; // allow picking the same file again
    });

    var dropzone = $("dropzone");
    dropzone.addEventListener("dragover", function (e) {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", function () {
      dropzone.classList.remove("dragover");
    });
    dropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });
    // Dropping outside the zone should not make the browser navigate to the file.
    window.addEventListener("dragover", function (e) { e.preventDefault(); });
    window.addEventListener("drop", function (e) { e.preventDefault(); });

    Array.prototype.forEach.call(document.querySelectorAll('input[name="format"]'), function (r) {
      r.addEventListener("change", function () {
        state.mode = this.value;
        render();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('input[name="placement"]'), function (r) {
      r.addEventListener("change", function () {
        state.placement = this.value;
        render();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('input[name="bg"]'), function (r) {
      r.addEventListener("change", function () {
        state.bg = this.value;
        if (!state.colorTouched) {
          state.color = DEFAULT_COLORS[state.bg];
          $("text-color").value = state.color;
        }
        render();
      });
    });

    $("text-input").addEventListener("input", function () {
      state.text = this.value;
      render();
    });
    fontSelect.addEventListener("change", function () {
      state.font = Number(this.value);
      render();
    });
    $("bold").addEventListener("change", function () {
      state.bold = this.checked;
      render();
    });
    $("auto-size").addEventListener("change", function () {
      state.autoSize = this.checked;
      render();
    });
    $("max-size").addEventListener("input", function () {
      var value = Number(this.value);
      if (value >= 4) state.maxSize = value; // ignore partial typing; min is 4
      render();
    });
    $("text-color").addEventListener("input", function () {
      state.color = this.value;
      state.colorTouched = true;
      render();
    });
    $("download").addEventListener("click", download);

    render();
  }

  init();
})();
