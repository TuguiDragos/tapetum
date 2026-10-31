const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("shown");
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  reveals.forEach((element) => observer.observe(element));
} else {
  reveals.forEach((element) => element.classList.add("shown"));
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = "Copied";
      button.classList.add("done");
    } catch {
      button.textContent = "Press ⌘C";
      const range = document.createRange();
      range.selectNodeContents(button.previousElementSibling);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    }
    setTimeout(() => {
      button.textContent = "Copy";
      button.classList.remove("done");
    }, 2000);
  });
});

const calm = matchMedia("(prefers-reduced-motion: reduce)");

// On a phone a row of chips scrolls sideways; keep the chosen one in view without moving the page.
const centerIn = (list, button, behavior) => {
  const item = button.parentElement;
  list.scrollTo({ left: item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2, behavior });
};

const browser = document.getElementById("families");
const chips = browser.querySelectorAll("[data-family]");
const cards = browser.querySelectorAll(".family");
const variantButtons = browser.querySelectorAll("[data-variant]");
const editor = browser.querySelector(".editor");
const code = editor.querySelector(".editor-code");
const status = editor.querySelector("[data-theme-label]");
const picker = browser.querySelector(".picker");
let themes = null;
let state = { family: chips[0].dataset.family, variant: "dark" };

const UI_VARIABLES = {
  bg: "--e-bg", fg: "--e-fg", line: "--e-line", lineActive: "--e-line-active", lineHighlight: "--e-line-highlight",
  title: "--e-title", titleFg: "--e-title-fg", activity: "--e-activity", activityFg: "--e-activity-fg",
  activityIdle: "--e-activity-idle", activityBorder: "--e-activity-border", tabs: "--e-tabs", tab: "--e-tab", tabFg: "--e-tab-fg",
  tabIdle: "--e-tab-idle", tabIdleFg: "--e-tab-idle-fg", tabBorderTop: "--e-tab-top", status: "--e-status",
  statusFg: "--e-status-fg", border: "--e-border",
};
const CURRENT_LINE = 13;

const escape = (text) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

// a line of the sample in a theme's own colours, numbered as in the file
const row = (theme, index, current) => {
  const tokens = theme.lines[index].map(([text, color, style = 0]) => {
    const classes = [style & 1 && "i", style & 2 && "b", style & 4 && "u"].filter(Boolean).join(" ");
    return `<span${classes ? ` class="${classes}"` : ""} style="color:${theme.palette[color]}">${escape(text)}</span>`;
  }).join("");
  return `<div class="row${current ? " current" : ""}"><span class="n">${index + 1}</span>${tokens}</div>`;
};

const paint = () => {
  if (!themes) return;
  const theme = themes.get(`${state.family}-${state.variant}`);
  for (const [key, variable] of Object.entries(UI_VARIABLES)) {
    if (theme.ui[key]) editor.style.setProperty(variable, theme.ui[key]);
    else editor.style.removeProperty(variable);
  }
  code.innerHTML = theme.lines.map((_, index) => row(theme, index, index + 1 === CURRENT_LINE)).join("");
  status.textContent = theme.label;
  editor.setAttribute("aria-label", `A code sample in ${theme.label}`);
};

// One family of each scheme with the same function, so the 6 questions can be told apart side by side.
const compare = document.querySelector("[data-compare]");
const COMPARED = [["Grammar", "selenium"], ["Provenance", "provenance"], ["Borrow", "borrow"], ["Effect", "effect"], ["Signal", "palimpsest"], ["Tone", "stratum"]];
const COMPARED_LINES = [12, 16];
let compareVariant = "dark";
const paintCompare = () => {
  if (!themes || !compare) return;
  compare.querySelector(".compare-grid").innerHTML = COMPARED.map(([scheme, family]) => {
    const theme = themes.get(`${family}-${compareVariant}`);
    const vars = `--e-bg: ${theme.ui.bg}; --e-fg: ${theme.ui.fg}; --e-line: ${theme.ui.line}; --e-title: ${theme.ui.title}; --e-title-fg: ${theme.ui.titleFg}`;
    const lines = [];
    for (let index = COMPARED_LINES[0] - 1; index < COMPARED_LINES[1]; index++) lines.push(row(theme, index, false));
    return `<div class="compare-item" style="${vars}"><p class="compare-name">${scheme} <span>${theme.label.replace(/^Tapetum /, "")}</span></p><div class="editor-code">${lines.join("")}</div></div>`;
  }).join("");
  compare.hidden = false;
};
compare?.querySelectorAll("[data-compare-variant]").forEach((button, _, all) => button.addEventListener("click", () => {
  compareVariant = button.dataset.compareVariant;
  all.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
  paintCompare();
}));

const show = (family, variant, center) => {
  const card = browser.querySelector(`.family[id="${family}"]`);
  const available = card.dataset.variants.split(" ");
  state = { family, variant: available.includes(variant) ? variant : "dark" };
  chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.family === family)));
  cards.forEach((other) => other.classList.toggle("active", other === card));
  card.querySelectorAll(".palette").forEach((list) => list.classList.toggle("shown", list.dataset.for === state.variant));
  variantButtons.forEach((button) => {
    button.hidden = !available.includes(button.dataset.variant);
    button.setAttribute("aria-pressed", String(button.dataset.variant === state.variant));
  });
  if (center) centerIn(picker, browser.querySelector(`[data-family="${family}"]`), center);
  paint();
};

chips.forEach((chip) => chip.addEventListener("click", () => {
  show(chip.dataset.family, state.variant, calm.matches ? "instant" : "smooth");
  history.replaceState(null, "", `#${chip.dataset.family}`);
}));
variantButtons.forEach((button) => button.addEventListener("click", () => show(state.family, button.dataset.variant)));

const fromHash = location.hash.slice(1);
const start = [...chips].some((chip) => chip.dataset.family === fromHash) ? fromHash : state.family;
show(start, "dark", start === fromHash && "instant");
if (start === fromHash) document.getElementById(start).scrollIntoView({ block: "start" });
// a link to a family from elsewhere on the page, such as a scheme, shows it in the preview
addEventListener("hashchange", () => {
  const family = location.hash.slice(1);
  if (![...chips].some((chip) => chip.dataset.family === family)) return;
  show(family, state.variant, calm.matches ? "instant" : "smooth");
  // only the chosen family's card is shown, so the browser could not scroll to it before
  document.getElementById(family).scrollIntoView({ block: "start", behavior: calm.matches ? "instant" : "smooth" });
});

fetch("data/themes.json")
  .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
  .then((data) => {
    themes = new Map(data.themes.map((theme) => [theme.id, theme]));
    editor.classList.add("ready");
    paint();
    paintCompare();
  })
  .catch(() => {
    editor.querySelector(".editor-code").textContent = "The preview couldn’t load. The screenshots below show the themes in VS Code.";
  });

const gallery = document.getElementById("vscode");
if (gallery) {
  const picture = gallery.querySelector("picture");
  const source = picture.querySelector("source");
  const image = picture.querySelector("img");
  const caption = gallery.querySelector(".gallery-caption");
  const shotChips = gallery.querySelectorAll("[data-shot]");
  const shotVariants = gallery.querySelectorAll("[data-shot-variant]");
  let shot = { family: gallery.querySelector('[data-shot][aria-pressed="true"]').dataset.shot, variant: "dark" };
  const update = () => {
    const chip = gallery.querySelector(`[data-shot="${shot.family}"]`);
    const name = `${chip.textContent.trim()}${shot.variant === "light" ? " Light" : ""}`;
    const base = `images/${shot.family}-${shot.variant}`;
    image.classList.add("loading");
    image.onload = image.onerror = () => image.classList.remove("loading");
    source.srcset = `${base}-800.avif 800w, ${base}-1200.avif 1200w, ${base}-1920.avif 1920w`;
    image.srcset = `${base}-800.webp 800w, ${base}-1200.webp 1200w, ${base}-1920.webp 1920w`;
    image.src = `${base}-1200.webp`;
    image.alt = `Tapetum ${name} in VS Code, with two editors side by side, the source control view, and the chat`;
    caption.textContent = `Tapetum ${name}`;
    shotChips.forEach((other) => other.setAttribute("aria-pressed", String(other === chip)));
    shotVariants.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.shotVariant === shot.variant)));
  };
  shotChips.forEach((chip) => chip.addEventListener("click", () => {
    shot.family = chip.dataset.shot;
    update();
  }));
  shotVariants.forEach((button) => button.addEventListener("click", () => {
    shot.variant = button.dataset.shotVariant;
    update();
  }));
}
