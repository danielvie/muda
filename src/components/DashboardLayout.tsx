import React, { useCallback, useMemo, useRef, useState } from "react";
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
type WidgetId = "investment" | "sac";

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
    { i: "sac", x: 0, y: 0, w: 6, h: 11, minW: 4, minH: 7 },
    { i: "investment", x: 6, y: 0, w: 6, h: 8, minW: 4, minH: 5 },
  ],
  md: [
    { i: "sac", x: 0, y: 0, w: 4, h: 11, minW: 3, minH: 7 },
    { i: "investment", x: 4, y: 0, w: 4, h: 8, minW: 3, minH: 5 },
  ],
  sm: [
    { i: "sac", x: 0, y: 0, w: 4, h: 11, minW: 4, minH: 7 },
    { i: "investment", x: 0, y: 11, w: 4, h: 8, minW: 4, minH: 5 },
  ],
  xs: [
    { i: "sac", x: 0, y: 0, w: 1, h: 11, minW: 1, minH: 7, maxW: 1 },
    { i: "investment", x: 0, y: 11, w: 1, h: 8, minW: 1, minH: 5, maxW: 1 },
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

function getMobileOrder(layouts: ResponsiveLayouts<DashboardBreakpoint>): WidgetId[] {
  return [...(layouts.xs ?? defaultLayouts.xs ?? [])]
    .sort((a, b) => a.y - b.y)
    .map((item) => item.i)
    .filter((id): id is WidgetId => id === "investment" || id === "sac");
}

function withMobileOrder(
  layouts: ResponsiveLayouts<DashboardBreakpoint>,
  order: WidgetId[],
): ResponsiveLayouts<DashboardBreakpoint> {
  let y = 0;
  const nextXs = order.map((id) => {
    const current = (layouts.xs ?? defaultLayouts.xs ?? []).find((item) => item.i === id);
    const fallback = defaultLayouts.xs?.find((item) => item.i === id);
    if (!fallback) throw new Error(`Missing default dashboard layout for ${id}`);
    const item = { ...fallback, ...current, x: 0, y, w: 1, minW: 1, maxW: 1 };
    y += item.h;
    return item;
  });

  return {
    ...layouts,
    xs: nextXs,
  };
}

function DashboardPanel({
  title,
  tone,
  widgetId,
  onMobileDragStart,
  children,
}: {
  title: string;
  tone: WidgetId;
  widgetId?: WidgetId;
  onMobileDragStart?: (widgetId: WidgetId, event: React.PointerEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`dashboard-panel dashboard-panel-${tone} bg-surface border border-border rounded-lg`}
      data-dashboard-widget={widgetId}
      aria-label={title}
    >
      <div className="dashboard-panel-header">
        <div
          className="dashboard-drag-handle"
          role="button"
          tabIndex={0}
          aria-label={`Mover ${title}`}
          title="Mover painel"
          onPointerDown={(event) => widgetId && onMobileDragStart?.(widgetId, event)}
        >
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
  const draggedMobileWidget = useRef<WidgetId | null>(null);

  const onLayoutChange = useCallback((_layout: Layout, nextLayouts: ResponsiveLayouts<DashboardBreakpoint>) => {
    setLayouts(nextLayouts);
    saveLayouts(nextLayouts);
  }, []);

  const resetLayout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLayouts(defaultLayouts);
  }, []);

  const isMobile = mounted && width < breakpoints.sm;
  const mobileOrder = useMemo(() => getMobileOrder(layouts), [layouts]);

  const moveMobileWidget = useCallback((targetId: WidgetId) => {
    const activeId = draggedMobileWidget.current;
    if (!activeId || activeId === targetId) return;

    setLayouts((currentLayouts) => {
      const currentOrder = getMobileOrder(currentLayouts);
      const nextOrder = currentOrder.filter((id) => id !== activeId);
      const targetIndex = nextOrder.indexOf(targetId);
      nextOrder.splice(targetIndex, 0, activeId);

      const nextLayouts = withMobileOrder(currentLayouts, nextOrder);
      saveLayouts(nextLayouts);
      return nextLayouts;
    });
  }, []);

  const startMobileDrag = useCallback((widgetId: WidgetId, event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile) return;

    event.preventDefault();
    draggedMobileWidget.current = widgetId;
    event.currentTarget.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const widget = element?.closest<HTMLElement>("[data-dashboard-widget]");
      const targetId = widget?.dataset.dashboardWidget;
      if (targetId === "investment" || targetId === "sac") {
        moveMobileWidget(targetId);
      }
    };

    const onPointerUp = () => {
      draggedMobileWidget.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }, [isMobile, moveMobileWidget]);

  function renderWidget(id: WidgetId, mobile = false) {
    if (id === "investment") {
      return (
        <DashboardPanel
          title="Investimento"
          tone="investment"
          widgetId={mobile ? "investment" : undefined}
          onMobileDragStart={mobile ? startMobileDrag : undefined}
        >
          <InvestmentProjection />
        </DashboardPanel>
      );
    }

    return (
      <DashboardPanel
        title="Financiamento SAC"
        tone="sac"
        widgetId={mobile ? "sac" : undefined}
        onMobileDragStart={mobile ? startMobileDrag : undefined}
      >
        <SacFinancing />
      </DashboardPanel>
    );
  }

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
        {mounted && isMobile && (
          <div className="dashboard-mobile-list">
            {mobileOrder.map((id) => (
              <div key={id} className="dashboard-mobile-item">
                {renderWidget(id, true)}
              </div>
            ))}
          </div>
        )}

        {mounted && !isMobile && (
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
            resizeConfig={{ enabled: true, handles: ["se"] }}
            onBreakpointChange={(nextBreakpoint: Breakpoint) => setBreakpoint(nextBreakpoint as DashboardBreakpoint)}
            onLayoutChange={onLayoutChange}
          >
            <div key="investment">
              {renderWidget("investment")}
            </div>
            <div key="sac">
              {renderWidget("sac")}
            </div>
          </Responsive>
        )}
      </div>
    </section>
  );
}
