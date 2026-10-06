/* ==========================================================================
   gameData.js — Rise of Kingdoms reference data shared by the dashboard modal,
   the player card and the equipment editor: data/*.json loading, lookups,
   icon paths, small equipment helpers and hover tooltips.
   Depends on: common.js (escapeHtml).
   Everything lives behind `refData` so pages can keep their own variables
   called skinsData / itemsData etc. without clashing.
   ========================================================================== */

/* ---------- reference data (data/*.json) ---------- */

const refData = {
  items: {},
  commanders: {},
  inscriptions: {},
  inscriptionsByName: {},
  skins: {},
  armaments: {},
  armamentsByKey: {},
};

const REF_FILES = {
  items: "data/items.json",
  commanders: "data/commanders.json",
  inscriptions: "data/inscriptions.json",
  skins: "data/skins.json",
  armaments: "data/armaments.json",
};
const refLoads = {};

function normalizeArmamentKey(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/formation/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Each file loads once; a broken or missing file only affects its own lookups. */
function loadRefFile(kind) {
  refLoads[kind] ??= (async () => {
    try {
      const res = await fetch(REF_FILES[kind]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      refData[kind] = json[kind] || {};
    } catch (e) {
      console.error(`${REF_FILES[kind]} failed to load or parse:`, e);
    }
  })();
  return refLoads[kind];
}

/** loadEquipRefData() loads everything; pass names to load only some. */
async function loadEquipRefData(kinds = Object.keys(REF_FILES)) {
  await Promise.all(kinds.map(loadRefFile));

  refData.inscriptionsByName = {};
  for (const [key, info] of Object.entries(refData.inscriptions)) {
    const nameKey = String(info.name || key).trim().toLowerCase();
    refData.inscriptionsByName[nameKey] = { key, ...info };
  }
  refData.armamentsByKey = {};
  for (const [key, info] of Object.entries(refData.armaments)) {
    const entry = { key, ...info };
    refData.armamentsByKey[normalizeArmamentKey(key)] = entry;
    if (info.name) refData.armamentsByKey[normalizeArmamentKey(info.name)] = entry;
  }
}

const lookup = (table, code) => table[String(code ?? "").trim()] || null;

function getItemInfo(code) {
  return lookup(refData.items, code);
}
function getCommanderInfo(code) {
  return lookup(refData.commanders, code);
}
function getSkinInfo(code) {
  return lookup(refData.skins, code);
}
function getInscriptionInfo(name) {
  return refData.inscriptionsByName[String(name ?? "").trim().toLowerCase()] || null;
}
function getArmamentInfo(name) {
  return refData.armamentsByKey[normalizeArmamentKey(name)] || null;
}
function getAllInscriptionNames() {
  return Object.values(refData.inscriptionsByName)
    .map((i) => i.name)
    .sort((a, b) => a.localeCompare(b));
}

/* ---------- icons & small equipment helpers ---------- */

function isEmptyVal(v) {
  if (v === null || v === undefined || v === "") return true;
  const s = String(v).trim().toLowerCase();
  return s === "none" || s === "0";
}

const ROMAN_NUMERALS = [
  "",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
];

function toRoman(v) {
  const n = parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return "";
  return ROMAN_NUMERALS[n] || String(n);
}

function hasTalent(v) {
  if (isEmptyVal(v)) return false;
  const s = String(v).trim().toLowerCase();
  return !["no", "n", "false", "-", "—"].includes(s);
}

function getAbilityTier(name) {
  if (!name) return "gray";
  const info = getInscriptionInfo(name);
  return info ? info.rarity : "gray";
}

function iconPath(name, kind) {
  const folder =
    kind === "commander"
      ? "commanders"
      : kind === "skin"
        ? "skins"
        : kind === "armament"
          ? "armaments"
          : "equipment";
  return `icons/${folder}/${encodeURIComponent(String(name).trim().toLowerCase())}.webp`;
}

/* ---------- tooltips ---------- */

const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function ttName(name, rarity) {
  const cls = rarity ? ` tt-rarity-${escapeHtml(String(rarity).toLowerCase())}` : "";
  return `<div class="tt-name${cls}">${escapeHtml(name)}</div>`;
}

function ttSlot(text) {
  return text ? `<div class="tt-slot">${escapeHtml(text)}</div>` : "";
}

function ttStats(list) {
  const stats = toArray(list);
  return stats.length
    ? `<ul class="tt-stats">${stats.map((s) => `<li>${escapeHtml(String(s))}</li>`).join("")}</ul>`
    : "";
}

function ttDesc(desc) {
  const lines = toArray(desc);
  return lines.length
    ? `<div class="tt-desc">${lines.map((d) => escapeHtml(String(d))).join("<br>")}</div>`
    : "";
}

/** kind: "item" | "skin" | "commander" | "armament" | "inscription" */
function buildTooltipHtml(code, kind) {
  if (isEmptyVal(code)) return "";
  const key = String(code).trim();

  if (kind === "commander") {
    const info = getCommanderInfo(key);
    return ttName(info?.name || key);
  }

  if (kind === "armament") {
    const info = getArmamentInfo(key);
    return ttName(info?.name || key) + ttDesc(info?.description);
  }

  if (kind === "inscription") {
    const info = getInscriptionInfo(key);
    if (!info) return ttName(key);
    return (
      ttName(info.name || key, info.rarity || "gold") +
      ttSlot(info.type) +
      (info.description
        ? `<div class="tt-desc">${escapeHtml(String(info.description))}</div>`
        : "")
    );
  }

  const info = kind === "skin" ? getSkinInfo(key) : getItemInfo(key);
  if (!info) return ttName(key);
  return (
    ttName(info.name || key, info.rarity || "gold") +
    (kind === "skin" ? "" : ttSlot(info.slot)) +
    ttStats(info.stats) +
    ttDesc(info.description)
  );
}

function initEquipTooltip() {
  const tip = document.getElementById("equipTooltip");
  if (!tip) return;

  let activeEl = null;

  function positionTip(x, y) {
    const margin = 14;
    const rect = tip.getBoundingClientRect();
    let left = x + margin;
    let top = y + margin;

    if (left + rect.width > window.innerWidth - 8) {
      left = x - rect.width - margin;
    }
    if (top + rect.height > window.innerHeight - 8) {
      top = y - rect.height - margin;
    }
    left = Math.max(8, left);
    top = Math.max(8, top);

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-tip-code]");
    if (!el) return;
    activeEl = el;

    const html = buildTooltipHtml(el.dataset.tipCode, el.dataset.tipKind);
    if (!html) return;

    tip.innerHTML = html;
    tip.style.display = "block";
    positionTip(e.clientX, e.clientY);
  });

  document.addEventListener("mousemove", (e) => {
    if (!activeEl || tip.style.display === "none") return;
    positionTip(e.clientX, e.clientY);
  });

  document.addEventListener("mouseout", (e) => {
    const el = e.target.closest("[data-tip-code]");
    if (!el || el !== activeEl) return;
    if (el.contains(e.relatedTarget)) return;
    activeEl = null;
    tip.style.display = "none";
  });

  document.addEventListener(
    "scroll",
    () => {
      tip.style.display = "none";
      activeEl = null;
    },
    true,
  );
}

document.addEventListener("DOMContentLoaded", initEquipTooltip);
