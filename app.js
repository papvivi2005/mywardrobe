const palette = {
  black: { label: "Black", hex: "#242424" },
  white: { label: "White", hex: "#f5f3ed" },
  gray: { label: "Gray", hex: "#92958f" },
  navy: { label: "Navy", hex: "#334d65" },
  blue: { label: "Light blue", hex: "#8eafc3" },
  cyan: { label: "Cyan", hex: "#39a9bd" },
  turquoise: { label: "Turquoise", hex: "#38a99b" },
  teal: { label: "Teal", hex: "#287b78" },
  olive: { label: "Olive", hex: "#838344" },
  beige: { label: "Beige", hex: "#d8c6a9" },
  cream: { label: "Cream", hex: "#eee2c9" },
  brown: { label: "Brown", hex: "#79583e" },
  green: { label: "Green", hex: "#54795b" },
  red: { label: "Red", hex: "#bd514a" },
  burgundy: { label: "Burgundy", hex: "#762c46" },
  pink: { label: "Pink", hex: "#d79eaa" },
  magenta: { label: "Magenta", hex: "#c04d91" },
  orange: { label: "Orange", hex: "#d77b3f" },
  yellow: { label: "Yellow", hex: "#d8b63f" },
  purple: { label: "Purple", hex: "#8661a8" },
  multicolor: { label: "Multicolor", hex: "#82947f" },
};

const COLOR_DETECTION_VERSION = 4;
const styleLabels = { casual: "Casual", work: "Work", evening: "Evening", sport: "Sport" };
const wardrobe = { tops: [], bottoms: [], shoes: [] };
let currentPhotoUrl = null;
let selectedOutfitId = null;
let activeFitTarget = "tops";
let uploadStatusTimer = null;
const fitSettings = {
  tops: { x: 0, y: 0, scale: 1 },
  bottoms: { x: 0, y: 0, scale: 1 },
  shoes: { x: 0, y: 0, scale: 1 },
};

const elements = {
  personUpload: document.querySelector("#personUpload"),
  personImage: document.querySelector("#personImage"),
  photoCanvas: document.querySelector("#photoCanvas"),
  clearPhoto: document.querySelector("#clearPhoto"),
  previewEmpty: document.querySelector("#previewEmpty"),
  topOverlay: document.querySelector("#topOverlay"),
  bottomOverlay: document.querySelector("#bottomOverlay"),
  shoesOverlay: document.querySelector("#shoesOverlay"),
  fitScale: document.querySelector("#fitScale"),
  fitScaleValue: document.querySelector("#fitScaleValue"),
  occasionSelect: document.querySelector("#occasionSelect"),
  outfitList: document.querySelector("#outfitList"),
};

const uploadInputs = {
  tops: document.querySelector("#topsUpload"),
  bottoms: document.querySelector("#bottomsUpload"),
  shoes: document.querySelector("#shoesUpload"),
};

document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("en-GB", {
  weekday: "short", day: "numeric", month: "short",
}).format(new Date());

for (const [category, input] of Object.entries(uploadInputs)) {
  input.addEventListener("change", () => addFiles(category, input.files));
}

elements.personUpload.addEventListener("change", () => {
  const [file] = elements.personUpload.files;
  if (!file) return;
  if (currentPhotoUrl) URL.revokeObjectURL(currentPhotoUrl);
  currentPhotoUrl = URL.createObjectURL(file);
  elements.personImage.src = currentPhotoUrl;
  elements.personImage.style.opacity = "1";
  elements.previewEmpty.classList.remove("show");
  elements.personUpload.value = "";
  void putRecord("profile", { id: "person", blob: file }).then(() => {
    setUploadStatus("Your photo was saved on this device.");
  }).catch(() => {
    setUploadStatus("Your photo is visible, but could not be saved permanently.", "error");
  });
  updateGettingStarted();
});

elements.personImage.addEventListener("error", () => {
  if (!currentPhotoUrl) elements.previewEmpty.classList.add("show");
});
elements.personImage.addEventListener("load", updatePhotoAspect);
if (elements.personImage.complete && elements.personImage.naturalWidth) updatePhotoAspect();

elements.clearPhoto.addEventListener("click", () => {
  if (currentPhotoUrl) URL.revokeObjectURL(currentPhotoUrl);
  currentPhotoUrl = null;
  elements.personImage.removeAttribute("src");
  elements.personImage.style.opacity = "0";
  elements.photoCanvas.style.removeProperty("--photo-ratio");
  elements.previewEmpty.classList.add("show");
  void deleteRecord("profile", "person").catch(() => setUploadStatus("Could not delete the saved photo.", "error"));
  updateGettingStarted();
});

elements.occasionSelect.addEventListener("change", renderOutfits);
document.querySelector("#addItemsButton").addEventListener("click", () => {
  uploadInputs.tops.click();
});
for (const tab of document.querySelectorAll("[data-app-view]")) {
  tab.addEventListener("click", () => switchAppView(tab.dataset.appView));
}
document.querySelector("#photoStep").addEventListener("click", () => {
  switchAppView("wardrobe");
  elements.personUpload.click();
});
document.querySelector("#wardrobeStep").addEventListener("click", () => {
  switchAppView("wardrobe");
  document.querySelector("#wardrobeTitle").scrollIntoView({ behavior: "smooth", block: "center" });
});
document.querySelector("#outfitsStep").addEventListener("click", () => {
  switchAppView("outfits");
  document.querySelector("#recommendationsTitle").scrollIntoView({ behavior: "smooth", block: "center" });
});
document.querySelector("#demoButton").addEventListener("click", loadDemoWardrobe);
document.querySelector("#homeGetStarted").addEventListener("click", () => switchAppView("wardrobe"));
document.querySelector("#stepAddClothes").addEventListener("click", () => {
  switchAppView("wardrobe");
  document.querySelector("#wardrobeTitle").scrollIntoView({ behavior: "smooth", block: "center" });
});
document.querySelector("#stepAddPhoto").addEventListener("click", () => {
  switchAppView("wardrobe");
  elements.personUpload.click();
});
document.querySelector("#stepSeeOutfits").addEventListener("click", () => switchAppView("outfits"));

function switchAppView(view) {
  const views = { home: "homeView", wardrobe: "wardrobeView", outfits: "outfitsView" };
  for (const [name, panelId] of Object.entries(views)) {
    const active = name === view;
    document.getElementById(panelId).hidden = !active;
    const tab = document.querySelector(`[data-app-view="${name}"]`);
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  }
  document.querySelector("#breadcrumbView").textContent = { home: "HOME", wardrobe: "WARDROBE", outfits: "OUTFIT IDEAS" }[view];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const fitOverlays = { tops: elements.topOverlay, bottoms: elements.bottomOverlay, shoes: elements.shoesOverlay };
for (const tab of document.querySelectorAll("[data-fit-target]")) {
  tab.addEventListener("click", () => setActiveFitTarget(tab.dataset.fitTarget));
}
elements.fitScale.addEventListener("input", () => {
  fitSettings[activeFitTarget].scale = Number(elements.fitScale.value) / 100;
  elements.fitScaleValue.value = `${elements.fitScale.value}%`;
  elements.fitScaleValue.textContent = `${elements.fitScale.value}%`;
  applyFitSettings(activeFitTarget);
});
document.querySelector("#resetFit").addEventListener("click", () => {
  fitSettings[activeFitTarget] = { x: 0, y: 0, scale: 1 };
  setActiveFitTarget(activeFitTarget);
  applyFitSettings(activeFitTarget);
});

for (const [category, overlay] of Object.entries(fitOverlays)) {
  overlay.addEventListener("pointerdown", (event) => {
    if (!overlay.classList.contains("visible")) return;
    event.preventDefault();
    setActiveFitTarget(category);
    const settings = fitSettings[category];
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = settings.x;
    const originY = settings.y;
    overlay.classList.add("dragging");
    overlay.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      settings.x = originX + moveEvent.clientX - startX;
      settings.y = originY + moveEvent.clientY - startY;
      applyFitSettings(category);
    };
    const stop = () => {
      overlay.classList.remove("dragging");
      overlay.removeEventListener("pointermove", move);
      overlay.removeEventListener("pointerup", stop);
      overlay.removeEventListener("pointercancel", stop);
    };
    overlay.addEventListener("pointermove", move);
    overlay.addEventListener("pointerup", stop);
    overlay.addEventListener("pointercancel", stop);
  });
}

function setActiveFitTarget(category) {
  activeFitTarget = category;
  for (const tab of document.querySelectorAll("[data-fit-target]")) {
    tab.classList.toggle("active", tab.dataset.fitTarget === category);
  }
  const scale = Math.round(fitSettings[category].scale * 100);
  elements.fitScale.value = scale;
  elements.fitScaleValue.value = `${scale}%`;
  elements.fitScaleValue.textContent = `${scale}%`;
}

function applyFitSettings(category) {
  const settings = fitSettings[category];
  const overlay = fitOverlays[category];
  overlay.style.setProperty("--fit-x", `${settings.x}px`);
  overlay.style.setProperty("--fit-y", `${settings.y}px`);
  overlay.style.setProperty("--fit-scale", settings.scale);
}

async function addFiles(category, files) {
  const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
  const failedCutouts = [];
  let storageFailed = false;
  for (const [index, file] of imageFiles.entries()) {
    setUploadStatus(`Removing background (${index + 1}/${imageFiles.length})…`);
    let displayBlob = file;
    try {
      displayBlob = await removeImageBackground(file);
    } catch (error) {
      console.error("Background removal failed", error);
      failedCutouts.push(file.name);
    }
    const detectedColor = await detectDominantColor(displayBlob);
    const record = {
      id: `${category}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      category,
      name: file.name.replace(/\.[^.]+$/, "") || categoryLabel(category),
      color: detectedColor,
      colorSource: "auto",
      colorVersion: COLOR_DETECTION_VERSION,
      style: elements.occasionSelect.value,
      assetBlob: displayBlob,
      originalBlob: file,
    };
    try {
      await putRecord("items", record);
    } catch (error) {
      console.error("Wardrobe item could not be saved", error);
      storageFailed = true;
    }
    wardrobe[category].push({ ...record, src: URL.createObjectURL(displayBlob) });
  }
  uploadInputs[category].value = "";
  renderWardrobe();
  renderOutfits();
  if (failedCutouts.length) {
    setUploadStatus(`Originals were kept, but background removal failed for ${failedCutouts.length} image(s). Make sure the app is running from the local server.`, "error", true);
  } else if (storageFailed) {
    setUploadStatus("Items were added, but the browser could not save them.", "error", true);
  } else if (imageFiles.length) {
    setUploadStatus(`Background removed, color detected, and ${imageFiles.length} item(s) saved on this device.`, "success", true);
  }
}

async function removeImageBackground(file) {
  const response = await fetch("/api/remove-background", {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!response.ok) throw new Error(`Background removal returned ${response.status}`);
  const cutout = await response.blob();
  if (cutout.type !== "image/png") throw new Error("Background service did not return a transparent PNG");
  return cutout;
}

async function detectDominantColor(blob) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 48;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const counts = Object.create(null);
    const familyCounts = Object.create(null);
    let visiblePixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 128) continue;
      const color = classifyColor(pixels[index], pixels[index + 1], pixels[index + 2]);
      counts[color] = (counts[color] || 0) + 1;
      const family = colorFamily(color);
      familyCounts[family] = (familyCounts[family] || 0) + 1;
      visiblePixels += 1;
    }
    const [dominantFamily, familyCount] = Object.entries(familyCounts).sort((a, b) => b[1] - a[1])[0] || [];
    if (!visiblePixels || familyCount / visiblePixels < 0.34) return "multicolor";
    const [dominantColor] = Object.entries(counts)
      .filter(([color]) => colorFamily(color) === dominantFamily)
      .sort((a, b) => b[1] - a[1])[0] || [];
    return dominantColor || "multicolor";
  } catch (error) {
    console.warn("Garment color detection failed", error);
    return "multicolor";
  } finally {
    bitmap?.close();
  }
}

function classifyColor(red, green, blue) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 510;
  const saturation = maximum === 0 ? 0 : delta / maximum;
  let hue = 0;
  if (delta) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  if (lightness < 0.14) return "black";
  if (hue >= 20 && hue <= 65 && saturation >= 0.08 && saturation < 0.28 && lightness > 0.78) return "cream";
  if (saturation < 0.12) return lightness > 0.9 ? "white" : lightness < 0.22 ? "black" : "gray";
  if (hue >= 18 && hue <= 55 && saturation < 0.34 && lightness > 0.48) return "beige";
  if (hue >= 12 && hue <= 42 && lightness < 0.4) return "brown";
  if (hue >= 12 && hue <= 42) return "orange";
  if (hue >= 42 && hue <= 68) return lightness < 0.42 ? "olive" : "yellow";
  if (hue >= 68 && hue < 155) return "green";
  if (hue >= 155 && hue < 178) return "turquoise";
  if (hue >= 178 && hue < 195) return lightness < 0.4 ? "teal" : "cyan";
  if (hue >= 195 && hue < 260) return lightness < 0.34 ? "navy" : "blue";
  if (hue >= 260 && hue < 290) return "purple";
  if (hue >= 290 && hue < 335) return "magenta";
  if (hue >= 335 && hue < 345) return lightness < 0.4 ? "burgundy" : "pink";
  if (hue >= 345 || hue < 12) return lightness < 0.36 ? "burgundy" : lightness > 0.72 && saturation < 0.65 ? "pink" : "red";
  return "multicolor";
}

function colorFamily(color) {
  if (["red", "burgundy", "pink", "magenta"].includes(color)) return "red";
  if (["orange", "yellow", "beige", "cream", "brown"].includes(color)) return "warm";
  if (["green", "olive"].includes(color)) return "green";
  if (["blue", "navy", "cyan", "teal", "turquoise"].includes(color)) return "blue";
  return color;
}

function setUploadStatus(message, type = "success", persistent = false) {
  const status = document.querySelector("#uploadStatus");
  window.clearTimeout(uploadStatusTimer);
  status.textContent = message;
  status.classList.toggle("error", type === "error");
  status.hidden = false;
  if (!persistent) uploadStatusTimer = window.setTimeout(() => { status.hidden = true; }, 5000);
}

function updatePhotoAspect() {
  const { naturalWidth, naturalHeight } = elements.personImage;
  if (naturalWidth && naturalHeight) {
    elements.photoCanvas.style.setProperty("--photo-ratio", `${naturalWidth} / ${naturalHeight}`);
  }
}

function loadDemoWardrobe() {
  if (Object.values(wardrobe).some((items) => items.length)) return;
  const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=500&q=75`;
  wardrobe.tops.push({ id: "demo-top", name: "White T-shirt", src: image("photo-1521572163474-6864f9cf17ab"), color: "white", style: "casual" });
  wardrobe.bottoms.push({ id: "demo-bottom", name: "Denim trousers", src: image("photo-1542272604-787c3835535d"), color: "blue", style: "casual" });
  wardrobe.shoes.push(
    { id: "demo-shoe-1", name: "Red sneakers", src: image("photo-1542291026-7eec264c27ff"), color: "red", style: "casual" },
    { id: "demo-shoe-2", name: "Black shoes", src: image("photo-1549298916-b41d501d3772"), color: "black", style: "work" },
    { id: "demo-shoe-3", name: "White sneakers", src: image("photo-1600185365483-26d7a4cc7519"), color: "white", style: "sport" },
  );
  renderWardrobe();
  renderOutfits();
  switchAppView("outfits");
  document.querySelector("#recommendationsTitle").scrollIntoView({ behavior: "smooth", block: "start" });
}

function categoryLabel(category) {
  return { tops: "Top", bottoms: "Trousers", shoes: "Shoes" }[category];
}

function makeSelect(options, value, onChange, ariaLabel) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", ariaLabel);
  for (const [key, label] of Object.entries(options)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    option.selected = key === value;
    select.append(option);
  }
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function renderWardrobe() {
  const categoryConfig = [
    ["tops", "topsList", "topsGroupCount", "topCount"],
    ["bottoms", "bottomsList", "bottomsGroupCount", "bottomCount"],
    ["shoes", "shoesList", "shoesGroupCount", "shoeCount"],
  ];
  for (const [category, listId, groupCountId, statCountId] of categoryConfig) {
    const list = document.getElementById(listId);
    list.replaceChildren();
    const items = wardrobe[category];
    document.getElementById(statCountId).textContent = items.length;
    document.getElementById(groupCountId).textContent = category === "shoes" ? `${items.length} / 3` : items.length;
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "category-empty";
      empty.textContent = "Add an item";
      list.append(empty);
    }
    for (const item of items) list.append(makeWardrobeItem(category, item));
  }
  document.querySelector("#wardrobeHint").textContent = getWardrobeStatus();
  updateGettingStarted();
}

function makeWardrobeItem(category, item) {
  const row = document.createElement("div");
  row.className = "wardrobe-item";
  const image = document.createElement("img");
  image.className = "item-thumb";
  image.src = item.src;
  image.alt = "";
  const details = document.createElement("div");
  details.className = "item-details";
  const name = document.createElement("span");
  name.className = "item-name";
  name.textContent = item.name;
  const meta = document.createElement("div");
  meta.className = "item-meta";
  const dot = document.createElement("span");
  dot.className = "color-dot";
  const detectedColor = palette[item.color] || palette.multicolor;
  dot.style.backgroundColor = detectedColor.hex;
  const colorName = document.createElement("span");
  colorName.className = "detected-color";
  colorName.textContent = detectedColor.label;
  colorName.title = `Auto-detected color: ${detectedColor.label}`;
  const styleSelect = makeSelect(styleLabels, item.style, (value) => { item.style = value; renderOutfits(); }, `Style: ${item.name}`);
  meta.append(dot, colorName, styleSelect);
  details.append(name, meta);
  const remove = document.createElement("button");
  remove.className = "remove-item";
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Remove: ${item.name}`);
  remove.addEventListener("click", () => {
    if (item.src.startsWith("blob:")) URL.revokeObjectURL(item.src);
    wardrobe[category] = wardrobe[category].filter((entry) => entry.id !== item.id);
    void deleteRecord("items", item.id).catch(() => setUploadStatus("Item removed, but could not be deleted from saved storage.", "error"));
    renderWardrobe();
    renderOutfits();
  });
  row.append(image, details, remove);
  return row;
}

function getWardrobeStatus() {
  const tops = wardrobe.tops.length;
  const bottoms = wardrobe.bottoms.length;
  const shoes = wardrobe.shoes.length;
  if (!tops && !bottoms && !shoes) return "Add equal numbers of tops and trousers, plus 3 pairs of shoes.";
  if (tops !== bottoms) return `Add equal numbers of tops and trousers (${tops} tops, ${bottoms} trousers).`;
  if (shoes !== 3) return `Add 3 pairs of shoes to complete your wardrobe (${shoes} of 3).`;
  return `Your wardrobe is ready: ${tops} tops, ${bottoms} trousers, and 3 pairs of shoes.`;
}

function scoreOutfit(top, bottom, shoes, occasion) {
  let score = 55;
  score += colorHarmony(top.color, bottom.color);
  score += colorHarmony(top.color, shoes.color);
  score += colorHarmony(bottom.color, shoes.color);
  for (const item of [top, bottom, shoes]) {
    score += item.style === occasion ? 8 : item.style === "casual" ? 3 : -2;
  }
  return Math.max(50, Math.min(99, score));
}

function colorHarmony(first, second) {
  const neutrals = ["black", "white", "gray", "beige", "cream"];
  if (first === second) return 7;
  if (neutrals.includes(first) || neutrals.includes(second)) return 6;
  const pairs = [["navy", "white"], ["blue", "beige"], ["green", "beige"], ["brown", "blue"], ["red", "navy"], ["pink", "gray"], ["burgundy", "cream"], ["olive", "beige"], ["purple", "yellow"], ["teal", "cream"], ["orange", "navy"]];
  return pairs.some(([a, b]) => (a === first && b === second) || (a === second && b === first)) ? 8 : 1;
}

function getOutfits() {
  if (wardrobe.tops.length !== wardrobe.bottoms.length || !wardrobe.tops.length || wardrobe.shoes.length !== 3) return [];
  const occasion = elements.occasionSelect.value;
  const outfits = [];
  for (const top of wardrobe.tops) {
    for (const bottom of wardrobe.bottoms) {
      for (const shoes of wardrobe.shoes) {
        outfits.push({
          id: `${top.id}|${bottom.id}|${shoes.id}`,
          top, bottom, shoes,
          score: scoreOutfit(top, bottom, shoes, occasion),
        });
      }
    }
  }
  return outfits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function renderOutfits() {
  const outfits = getOutfits();
  updateGettingStarted(outfits);
  document.querySelector("#comboCount").textContent = outfits.length;
  document.querySelector("#resultsLabel").textContent = `${outfits.length} ${outfits.length === 1 ? "outfit" : "outfits"}`;
  elements.outfitList.replaceChildren();
  if (!outfits.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const symbol = document.createElement("span");
    symbol.className = "empty-symbol";
    symbol.textContent = "✳";
    const title = document.createElement("strong");
    title.textContent = "Your first outfit is waiting";
    const message = document.createElement("p");
    message.textContent = getWardrobeStatus();
    empty.append(symbol, title, message);
    elements.outfitList.append(empty);
    selectedOutfitId = null;
    clearOutfitPreview();
    return;
  }
  if (!outfits.some((outfit) => outfit.id === selectedOutfitId)) selectedOutfitId = outfits[0].id;
  for (const [index, outfit] of outfits.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `outfit-card${outfit.id === selectedOutfitId ? " selected" : ""}`;
    button.setAttribute("aria-label", `Outfit ${index + 1}, ${outfit.score}% match`);
    button.addEventListener("click", () => selectOutfit(outfit));
    const thumbs = document.createElement("span");
    thumbs.className = "outfit-thumbs";
    for (const item of [outfit.top, outfit.bottom, outfit.shoes]) {
      const image = document.createElement("img");
      image.src = item.src;
      image.alt = "";
      thumbs.append(image);
    }
    const details = document.createElement("span");
    details.className = "outfit-details";
    const title = document.createElement("span");
    title.className = "outfit-title";
    title.textContent = outfitName(outfit, index);
    const subtitle = document.createElement("span");
    subtitle.className = "outfit-subtitle";
    subtitle.textContent = `${outfit.top.name} · ${outfit.bottom.name} · ${outfit.shoes.name}`;
    details.append(title, subtitle);
    const score = document.createElement("span");
    score.className = "score";
    score.textContent = `${outfit.score}%`;
    button.append(thumbs, details, score);
    elements.outfitList.append(button);
  }
  const selected = outfits.find((outfit) => outfit.id === selectedOutfitId);
  if (selected) updateOutfitPreview(selected, outfits.indexOf(selected));
}

function updateGettingStarted(outfits = getOutfits()) {
  const photoDone = Boolean(currentPhotoUrl);
  const wardrobeDone = wardrobe.tops.length > 0 && wardrobe.tops.length === wardrobe.bottoms.length && wardrobe.shoes.length === 3;
  const steps = [
    [document.querySelector("#photoStep"), photoDone],
    [document.querySelector("#wardrobeStep"), wardrobeDone],
    [document.querySelector("#outfitsStep"), outfits.length > 0],
  ];
  let firstPending = true;
  for (const [step, done] of steps) {
    step.classList.toggle("is-done", done);
    step.classList.toggle("is-current", !done && firstPending);
    if (!done) firstPending = false;
  }
  document.querySelector("#demoButton").hidden = Object.values(wardrobe).some((items) => items.length);
}

function outfitName(outfit, index) {
  const names = ["Balanced look", "Everyday edit", "Color story", "Effortless style"];
  return index === 0 ? "Top recommendation" : names[(index - 1) % names.length];
}

function selectOutfit(outfit) {
  selectedOutfitId = outfit.id;
  renderOutfits();
}

function updateOutfitPreview(outfit, index) {
  elements.topOverlay.src = outfit.top.src;
  elements.bottomOverlay.src = outfit.bottom.src;
  elements.shoesOverlay.src = outfit.shoes.src;
  elements.topOverlay.classList.add("visible");
  elements.bottomOverlay.classList.add("visible");
  elements.shoesOverlay.classList.add("visible");
  document.querySelector("#selectedLookName").textContent = outfitName(outfit, index);
  document.querySelector("#selectedLookScore").textContent = `${outfit.score}% match`;
  document.querySelector("#previewLabel").textContent = "OUTFIT PREVIEW";
}

function clearOutfitPreview() {
  for (const overlay of [elements.topOverlay, elements.bottomOverlay, elements.shoesOverlay]) {
    overlay.classList.remove("visible");
    overlay.removeAttribute("src");
  }
  document.querySelector("#selectedLookName").textContent = "Select an outfit";
  document.querySelector("#selectedLookScore").textContent = "—";
}

function openWardrobeDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("closet-wardrobe", 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("items")) database.createObjectStore("items", { keyPath: "id" });
      if (!database.objectStoreNames.contains("profile")) database.createObjectStore("profile", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const databaseReady = openWardrobeDatabase();

async function putRecord(storeName, record) {
  const database = await databaseReady;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(record);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function deleteRecord(storeName, id) {
  const database = await databaseReady;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function getAllRecords(storeName) {
  const database = await databaseReady;
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getRecord(storeName, id) {
  const database = await databaseReady;
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function restoreSavedWardrobe() {
  try {
    const [savedItems, savedProfile] = await Promise.all([
      getAllRecords("items"),
      getRecord("profile", "person"),
    ]);
    for (const record of savedItems) {
      if (!wardrobe[record.category] || !record.assetBlob) continue;
      let restoredRecord = record;
      if (record.colorVersion !== COLOR_DETECTION_VERSION) {
        restoredRecord = {
          ...record,
          color: await detectDominantColor(record.assetBlob),
          colorSource: "auto",
          colorVersion: COLOR_DETECTION_VERSION,
        };
        await putRecord("items", restoredRecord);
      }
      wardrobe[record.category].push({ ...restoredRecord, src: URL.createObjectURL(restoredRecord.assetBlob) });
    }
    if (savedProfile?.blob) {
      currentPhotoUrl = URL.createObjectURL(savedProfile.blob);
      elements.personImage.src = currentPhotoUrl;
      elements.personImage.style.opacity = "1";
      elements.previewEmpty.classList.remove("show");
    }
  } catch (error) {
    console.error("Saved wardrobe could not be restored", error);
    setUploadStatus("Could not restore saved photos.", "error", true);
  }
  renderWardrobe();
  renderOutfits();
}

void restoreSavedWardrobe();