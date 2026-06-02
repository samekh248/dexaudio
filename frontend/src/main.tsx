import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/themes.css";
import { hydrateThemeFromStorage } from "@/lib/theme-hydration";
import { runThemeMigration } from "@/lib/theme-migration";
import { initThemeStoreFromHydration } from "@/lib/theme-store";

const migration = runThemeMigration();
const reconciled = hydrateThemeFromStorage();
initThemeStoreFromHydration(reconciled, migration.notice);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
