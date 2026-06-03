import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/themes.css";
import { bootstrapThemeFromStorage } from "@/lib/theme-bootstrap";
import { initThemeStoreFromBootstrap } from "@/lib/theme-store";

initThemeStoreFromBootstrap(bootstrapThemeFromStorage());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
