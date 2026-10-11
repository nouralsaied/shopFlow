const key="shopflow-theme";

export function initTheme(){
    const saved = localStorage.getItem(key);
    const systemDark=window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(saved || (systemDark ? "dark" : "light"));
}
export function setTheme(theme){
    document.documentElement.dataset.theme=theme;
    localStorage.setItem(key,theme);
}
export function toggleTheme(){
    const current = document.documentElement.dataset.theme;
    setTheme(current === "dark" ? "light" : "dark");
}