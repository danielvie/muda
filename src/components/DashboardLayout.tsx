import React, { useCallback, useState } from "react";
import {
  Responsive,
  type Breakpoint,
  type Layout,
  type ResponsiveLayouts,
  useContainerWidth,
} from "react-grid-layout";
import InvestmentProjection from "./InvestmentProjection.tsx";
import SacFinancing from "./SacFinancing.tsx";

type DashboardBreakpoint = "lg" | "md" | "sm" | "xs";

const STORAGE_KEY = "muda.dashboard.layouts.v1";

const breakpoints: Record<DashboardBreakpoint, number> = {
  lg: 1000,
  md: 760,
  sm: 560,
  xs: 0,
};

const cols: Record<DashboardBreakpoint, number> = {
  lg: 12,
  md: 8,
  sm: 4,
  xs: 1,
};

const defaultLayouts: ResponsiveLayouts<DashboardBreakpoint> = {
  lg: [
    { i: "investment", x: 0, y: 0, w: 6, h: 8, minW: 4, minH: 5 },
    { i: "sac", x: 6, y: 0, w: 6, h: 11, minW: 4, minH: 7 },
  ],
  md: [
    { i: "investment", x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 5 },
    { i: "sac", x: 4, y: 0, w: 4, h: 11, minW: 3, minH: 7 },
  ],
  sm: [
    { i: "investment", x: 0, y: 0, w: 4, h: 8, minW: 4, minH: 5 },
    { i: "sac", x: 0, y: 8, w: 4, h: 11, minW: 4, minH: 7 },
  ],
  xs: [
    { i: "investment", x: 0, y: 0, w: 1, h: 8, minW: 1, minH: 5, maxW: 1 },
    { i: "sac", x: 0, y: 8, w: 1, h: 11, minW: 1, minH: 7, maxW: 1 },
  ],
};

function readSavedLayouts(): ResponsiveLayouts<DashboardBreakpoint> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLayouts;

    const parsed = JSON.parse(raw) as Partial<ResponsiveLayouts<DashboardBreakpoint>>;
    return {
      ...defaultLayouts,
      ...parsed,
    };
  } catch {
    return defaultLayouts;
  }
}

function saveLayouts(layouts: ResponsiveLayouts<DashboardBreakpoint>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
}

function DashboardPanel({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "investment" | "sac";
  children: React.ReactNode;
}) {
  return (
    <section className={`dashboard-panel dashboard-panel-${tone} bg-surface border border-border rounded-lg`} aria-label={title}>
      <div className="dashboard-panel-header">
        <div className="dashboard-drag-handle" role="button" tabIndex={0} aria-label={`Mover ${title}`} title="Mover painel">
          <span aria-hidden="true">::</span>
        </div>
        <div className="dashboard-panel-title">{title}</div>
      </div>
      <div className="dashboard-panel-body">{children}</div>
    </section>
  );
}

export default function DashboardLayout() {
  const { width, containerRef, mounted } = useContainerWidth();
  const [layouts, setLayouts] = useState(readSavedLayouts);
  const [breakpoint, setBreakpoint] = useState<DashboardBreakpoint>("lg");

  const onLayoutChange = useCallback((_layout: Layout, nextLayouts: ResponsiveLayouts<DashboardBreakpoint>) => {
    setLayouts(nextLayouts);
    saveLayouts(nextLayouts);
  }, []);

  const resetLayout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLayouts(defaultLayouts);
  }, []);

  const isMobile = breakpoint === "xs";

  return (
    <section className="dashboard-shell" aria-labelledby="dashboard-title">
      <div className="dashboard-toolbar">
        <h2 id="dashboard-title" className="dashboard-title">
          Painéis
        </h2>
        <button className="dashboard-reset" type="button" onClick={resetLayout} title="Resetar layout">
          Resetar layout
        </button>
      </div>

      <div ref={containerRef} className="dashboard-grid-wrap">
        {mounted && (
          <Responsive<DashboardBreakpoint>
            className="dashboard-grid"
            width={width}
            breakpoints={breakpoints}
            cols={cols}
            layouts={layouts}
            rowHeight={44}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            dragConfig={{
              handle: ".dashboard-drag-handle",
              cancel: "input,textarea,button,select,a,[contenteditable=true]",
              threshold: 6,
            }}
            resizeConfig={{ enabled: !isMobile, handles: ["se"] }}
            onBreakpointChange={(nextBreakpoint: Breakpoint) => setBreakpoint(nextBreakpoint as DashboardBreakpoint)}
            onLayoutChange={onLayoutChange}
          >
            <div key="investment">
              <DashboardPanel title="Investimento" tone="investment">
                <InvestmentProjection />
              </DashboardPanel>
            </div>
            <div key="sac">
              <DashboardPanel title="Financiamento SAC" tone="sac">
                <SacFinancing />
              </DashboardPanel>
            </div>
          </Responsive>
        )}
      </div>
    </section>
  );
}
