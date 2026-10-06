/* ==========================================================================
   gridTheme.js — AG Grid creation that follows the site theme.
   Depends on: common.js (getCurrentTheme, "themechange" event), AG Grid.
   Use createThemedGrid() instead of agGrid.createGrid(): the grid gets the
   right theme now and is re-themed automatically when the toggle changes.
   ========================================================================== */

const trackedGrids = new Set();

function getAgTheme(theme = getCurrentTheme()) {
  return (
    theme === "dark"
      ? agGrid.themeQuartz.withPart(agGrid.colorSchemeDark)
      : agGrid.themeQuartz.withPart(agGrid.colorSchemeLight)
  ).withPart(agGrid.buttonStyleQuartz);
}

function createThemedGrid(element, options) {
  const api = agGrid.createGrid(element, { theme: getAgTheme(), ...options });
  trackedGrids.add(api);
  return api;
}

window.addEventListener("themechange", (e) => {
  const theme = getAgTheme(e.detail.theme);
  for (const api of trackedGrids) {
    if (api.isDestroyed()) trackedGrids.delete(api);
    else api.setGridOption("theme", theme);
  }
});
