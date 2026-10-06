/* ==========================================================================
   equipArmament.js — equipment editor: armament editor modal and inscription picker.
   Load it before equipment.js (see equipment.html). Declarations only:
   everything here is called later from equipment.js handlers.
   ========================================================================== */

const ARM_SET_BONUSES = {
  Pincer: {
    name: "Pincer Formation",
    bonus: "The user's troop deals 10% more smite damage.",
  },
  Wedge: {
    name: "Wedge Formation",
    bonus: "The user's troop deals 5% more skill damage.",
  },
  Delta: {
    name: "Delta Formation",
    bonus: "The user's troop deals 10% more combo attack damage.",
  },
  Tercio: {
    name: "Tercio Formation",
    bonus:
      "When the user is garrisoned in your city, all unit-specific attribute bonuses (Attack/Defense/Health) from the user's armaments will apply to all unit types.",
  },
  "Double Line": {
    name: "Double Line Formation",
    bonus:
      "If the user's troop is marching towards barbarians, it gains 10% March Speed.",
  },
  Staggered: {
    name: "Staggered Formation",
    bonus:
      "The user's troop gains 15% March Speed when marching to join a rallied army or garrison.",
  },
  Circle: {
    name: "Circle Formation",
    bonus: "All healing the user's troop receives is increased by 5%.",
  },
  Tetsudo: {
    name: "Tetsudo Formation",
    bonus:
      "The user's troop takes 5% less damage while it has a shield. All healing their troop receives is increased by 2.5%.",
  },
  "Triple Line": {
    name: "Triple Line Formation",
    bonus: "Increases the March Speed of the user's troop by 5%.",
  },
  Line: {
    name: "Line Formation",
    bonus:
      "Increases the Food, Wood, Stone, and Gold Gathering Speed of the user's troop by 10%.",
  },
  "Hollow Square": {
    name: "Hollow Square Formation",
    bonus: "The user's troop takes 2% less damage.",
  },
  Echelon: {
    name: "Echelon Formation",
    bonus:
      "When the user's troop grants percentage-based buffs to other troops, their effects are multiplied by 1.2, with a maximum increase of up to 5% of their original value.",
  },
  V: {
    name: "V Formation",
    bonus:
      "The user's troop can switch to ranged mode, allowing it to launch 1 ranged basic attack per second. If your city is in a War Frenzy, your troops in ranged mode will automatically launch ranged attacks against enemies within their attack range that are attacking a friendly or allied troop. Only commanders with the Engineering talent tag can use their active skills while in V formation.",
  },
  Arch: {
    name: "Arch Formation",
    bonus: "The user's troop deals 5% more normal damage.",
  },
};

function renderArmSetBonus() {
  const preview = document.getElementById("armSetBonusPreview");
  if (!preview) return;

  const counts = {};
  for (const arm of ARM_SLOTS) {
    const v =
      armEditorPrefix === arm.prefix
        ? document.getElementById("armModalName")?.value.trim()
        : armamentsRow
          ? armamentsRow[arm.prefix]
          : null;
    if (!isArmEmpty(v)) {
      const key = String(v).trim();
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  let html = "";
  for (const [type, count] of Object.entries(counts)) {
    const bonus = ARM_SET_BONUSES[type];
    const active = count >= 3;
    html += `<div class="eq-arm-set-row${active ? " active" : ""}">
      <span class="eq-arm-set-name">${escapeHtml(type)}</span>
      <span class="eq-arm-set-count">×${count}</span>
      ${bonus ? `<span class="eq-arm-set-bonus">${active ? "✓ " : ""}${escapeHtml(bonus.bonus)}</span>` : ""}
    </div>`;
  }
  preview.innerHTML =
    html || `<span class="eq-arm-set-none">No active set bonuses</span>`;
}

let armEditorPrefix = null;

function openArmamentEditor(prefix, label) {
  armEditorPrefix = prefix;

  if (!armamentsRow) armamentsRow = { player_id: null };

  const row = armamentsRow;

  document.getElementById("armModalTitle").textContent = `Edit ${label}`;

  document.getElementById("armModalName").value = isArmEmpty(row[prefix])
    ? ""
    : String(row[prefix]);

  ARM_STAT_DEFS.forEach((s, i) => {
    const nk = `${prefix}${s.nameKey}`;
    const vk = `${prefix}${s.valKey}`;
    document.getElementById(`armStatName${i}`).value = isArmEmpty(row[nk])
      ? ""
      : String(row[nk]);
    document.getElementById(`armStatVal${i}`).value = isArmEmpty(row[vk])
      ? ""
      : String(row[vk]);
  });

  ARM_INS_KEYS.forEach((k, i) => {
    const v = row[`${prefix}${k}`];
    document.getElementById(`armIns${i}`).value = isArmEmpty(v)
      ? ""
      : String(v);
  });
  renderInsChosenList();

  renderArmSetBonus();

  document.getElementById("armModalOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  document.getElementById("armModalName").focus();
}

function closeArmamentEditor() {
  document.getElementById("armModalOverlay").classList.remove("open");
  document.body.style.overflow = "";
  armEditorPrefix = null;
}

function saveArmamentEditor() {
  if (!armEditorPrefix) return;
  if (!armamentsRow) armamentsRow = {};

  const prefix = armEditorPrefix;

  const nameVal = document.getElementById("armModalName").value.trim();
  armamentsRow[prefix] = nameVal || "none";

  ARM_STAT_DEFS.forEach((s, i) => {
    const nv = document.getElementById(`armStatName${i}`).value.trim();
    const vv = document.getElementById(`armStatVal${i}`).value.trim();
    armamentsRow[`${prefix}${s.nameKey}`] = nv || "none";
    armamentsRow[`${prefix}${s.valKey}`] = vv ? parseFloat(vv) : null;
  });

  ARM_INS_KEYS.forEach((k, i) => {
    const v = document.getElementById(`armIns${i}`).value.trim();
    armamentsRow[`${prefix}${k}`] = v || "none";
  });

  closeArmamentEditor();
  renderArmamentsGrid();
}

let insPickerSelected = [];

function renderInsChosenList() {
  const list = document.getElementById("insChosenList");
  if (!list) return;
  const vals = ARM_INS_KEYS.map(
    (_, i) => document.getElementById(`armIns${i}`).value,
  ).filter(Boolean);
  if (!vals.length) {
    list.innerHTML = `<span class="eq-ins-none">None selected</span>`;
    return;
  }
  list.innerHTML = vals
    .map((v) => {
      const tier = getArmTier(v);
      return `<span class="arm-ins tier-${tier}" data-tip-code="${escapeHtml(String(v).trim())}" data-tip-kind="inscription">${escapeHtml(v)}</span>`;
    })
    .join("");
}

function openInsPicker() {
  insPickerSelected = ARM_INS_KEYS.map(
    (_, i) => document.getElementById(`armIns${i}`).value,
  ).filter(Boolean);

  renderInsPickerList("");
  renderInsPickerFooter();
  document.getElementById("insPickerSearch").value = "";
  document.getElementById("insPickerOverlay").classList.add("open");
}

function closeInsPicker() {
  document.getElementById("insPickerOverlay").classList.remove("open");
}

function renderInsPickerList(filter) {
  const q = filter.toLowerCase();
  const body = document.getElementById("insPickerBody");
  let list = getAllInscriptionNames();
  if (q) list = list.filter((n) => n.toLowerCase().includes(q));

  body.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "arm-ins-group eq-ins-pill-grid";
  for (const name of list) {
    const tier = getArmTier(name);
    const checked = insPickerSelected.includes(name);
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `arm-ins tier-${tier}${checked ? " selected" : ""}`;
    pill.textContent = name;
    pill.dataset.tipCode = name;
    pill.dataset.tipKind = "inscription";
    pill.addEventListener("click", () => toggleInsPick(name, pill));
    wrap.appendChild(pill);
  }
  body.appendChild(wrap);
}

function toggleInsPick(name, el) {
  const idx = insPickerSelected.indexOf(name);
  if (idx !== -1) {
    insPickerSelected.splice(idx, 1);
    el.classList.remove("selected");
  } else {
    if (insPickerSelected.length >= 8) return;
    insPickerSelected.push(name);
    el.classList.add("selected");
  }
  renderInsPickerFooter();
}

function renderInsPickerFooter() {
  document.getElementById("insPickerCount").textContent =
    `(${insPickerSelected.length}/8)`;
  const wrap = document.getElementById("insPickerSelectedWrap");
  wrap.innerHTML = insPickerSelected
    .map((v) => {
      const tier = getArmTier(v);
      return `<span class="arm-ins tier-${tier}" data-tip-code="${escapeHtml(String(v).trim())}" data-tip-kind="inscription">${escapeHtml(v)}</span>`;
    })
    .join("");
}

function confirmInsPicker() {
  ARM_INS_KEYS.forEach((_, i) => {
    document.getElementById(`armIns${i}`).value = insPickerSelected[i] ?? "";
  });
  renderInsChosenList();
  closeInsPicker();
}

function clearInsPickerSelection() {
  insPickerSelected = [];
  renderInsPickerList(document.getElementById("insPickerSearch").value.trim());
  renderInsPickerFooter();
}
