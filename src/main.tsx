import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import App from "./App.tsx";
import { MemoryProvider } from "./memory.tsx";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <MemoryProvider>
      <App />
    </MemoryProvider>
  </StrictMode>
);
