const THEME_KEY = "student-archive-theme";
const root = document.documentElement;

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY);
}

function getPreferredTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const button = document.querySelector(".theme-toggle-btn");

  if (button) {
    if (theme === "dark") {
      button.textContent = "☀";
      button.title = "Switch to light mode";
      button.setAttribute("aria-label", "Switch to light mode");
    } else {
      button.textContent = "🌙";
      button.title = "Switch to dark mode";
      button.setAttribute("aria-label", "Switch to dark mode");
    }
  }
}

function toggleTheme() {
  const current = root.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

function createThemeToggle() {
  const button = document.createElement("button");
  button.className = "theme-toggle-btn";
  button.type = "button";
  button.addEventListener("click", toggleTheme);
  document.body.appendChild(button);
  applyTheme(root.dataset.theme || getStoredTheme() || getPreferredTheme());
}

window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = getStoredTheme();
  const initialTheme = savedTheme || getPreferredTheme();
  root.dataset.theme = initialTheme;
  createThemeToggle();
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  if (!getStoredTheme()) {
    applyTheme(event.matches ? "dark" : "light");
  }
});
