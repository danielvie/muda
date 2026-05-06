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

const STORAGE_KEY = "muda.dashboard.layouts.v2";
const COLLAPSED_STORAGE_KEY = "muda.dashboard.collapsed.v2";
const HEIGHT_STORAGE_KEY = "muda.dashboard.expandedHeights.v2";

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

function isWidgetId(id: string): id is WidgetId {
  return id === "investment" || id === "sac";
}

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

function readCollapsedPanels(): Record<WidgetId, boolean> {
  try {
    const parsed = JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? "{}") as Partial<Record<WidgetId, boolean>>;
    return {
      investment: parsed.investment ?? false,
      sac: parsed.sac ?? false,
    };
  } catch {
    return { investment: false, sac: false };
  }
}

function saveCollapsedPanels(collapsedPanels: Record<WidgetId, boolean>) {
  localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(collapsedPanels));
}

function readExpandedHeights(): Partial<Record<DashboardBreakpoint, Partial<Record<WidgetId, number>>>> {
  try {
    return JSON.parse(localStorage.getItem(HEIGHT_STORAGE_KEY) ?? "{}") as Partial<
      Record<DashboardBreakpoint, Partial<Record<WidgetId, number>>>
    >;
  } catch {
    return {};
  }
}

function saveExpandedHeights(heights: Partial<Record<DashboardBreakpoint, Partial<Record<WidgetId, number>>>>) {
  localStorage.setItem(HEIGHT_STORAGE_KEY, JSON.stringify(heights));
}

function getDefaultHeight(breakpointName: DashboardBreakpoint, widgetId: WidgetId) {
  return defaultLayouts[breakpointName]?.find((item) => item.i === widgetId)?.h ?? 8;
}

function withCollapsedHeight(
  layouts: ResponsiveLayouts<DashboardBreakpoint>,
  collapsedPanels: Record<WidgetId, boolean>,
  expandedHeights = readExpandedHeights(),
): ResponsiveLayouts<DashboardBreakpoint> {
  return Object.fromEntries(
    Object.entries(layouts).map(([breakpointName, layout]) => [
      breakpointName,
      layout.map((item) => {
        if (!isWidgetId(item.i)) return item;

        const typedBreakpoint = breakpointName as DashboardBreakpoint;
        if (collapsedPanels[item.i]) {
          return { ...item, h: 1, minH: 1, maxH: 1 };
        }

        const restoredHeight = expandedHeights[typedBreakpoint]?.[item.i] ?? getDefaultHeight(typedBreakpoint, item.i);
        const { maxH: _maxH, ...expandedItem } = item;
        return { ...expandedItem, h: Math.max(restoredHeight, item.minH ?? 1) };
      }),
    ]),
  ) as ResponsiveLayouts<DashboardBreakpoint>;
}

function getMobileOrder(layouts: ResponsiveLayouts<DashboardBreakpoint>): WidgetId[] {
  return [...(layouts.xs ?? defaultLayouts.xs ?? [])]
    .sort((a, b) => a.y - b.y)
    .map((item) => item.i)
    .filter((id): id is WidgetId => isWidgetId(id));
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

const SacIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const InvestmentIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const WIDGET_CONFIG: Record<WidgetId, { title: string; icon: React.ReactNode }> = {
  sac: { title: "Financiamento SAC", icon: <SacIcon /> },
  investment: { title: "Investimento", icon: <InvestmentIcon /> },
};

function DashboardPanel({
  tone,
  widgetId,
  collapsed,
  onMobileDragStart,
  onToggleCollapsed,
  children,
}: {
  tone: WidgetId;
  widgetId?: WidgetId;
  collapsed: boolean;
  onMobileDragStart?: (widgetId: WidgetId, event: React.PointerEvent<HTMLDivElement>) => void;
  onToggleCollapsed: () => void;
  children: React.ReactNode;
}) {
  const config = WIDGET_CONFIG[tone];

  return (
    <section
      className={`dashboard-panel dashboard-panel-${tone}`}
      data-dashboard-widget={widgetId}
      aria-label={config.title}
    >
      <div className="dashboard-panel-header">
        <div
          className="dashboard-drag-handle"
          role="button"
          tabIndex={0}
          aria-label={`Mover ${config.title}`}
          title="Mover painel"
          onPointerDown={(event) => widgetId && onMobileDragStart?.(widgetId, event)}
        >
          <span aria-hidden="true">::</span>
        </div>
        <div className="dashboard-panel-title">{config.title}</div>
        <div className="dashboard-panel-icon" aria-hidden="true">{config.icon}</div>
        <button
          className="dashboard-collapse"
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expandir ${config.title}` : `Recolher ${config.title}`}
          title={collapsed ? "Expandir painel" : "Recolher painel"}
        >
          <span aria-hidden="true">{collapsed ? "+" : "−"}</span>
        </button>
      </div>
      {!collapsed && <div className="dashboard-panel-body">{children}</div>}
    </section>
  );
}

export default function DashboardLayout() {
  const { width, containerRef, mounted } = useContainerWidth();
  const [collapsedPanels, setCollapsedPanels] = useState(readCollapsedPanels);
  const [layouts, setLayouts] = useState(() => withCollapsedHeight(readSavedLayouts(), readCollapsedPanels()));
  const [breakpoint, setBreakpoint] = useState<DashboardBreakpoint>("lg");
  const [mobileDragState, setMobileDragState] = useState<{
    activeId: WidgetId;
    targetId: WidgetId;
    position: "before" | "after";
  } | null>(null);
  const draggedMobileWidget = useRef<WidgetId | null>(null);
  const mobileDropTarget = useRef<{ id: WidgetId; position: "before" | "after" } | null>(null);

  const onLayoutChange = useCallback((_layout: Layout, nextLayouts: ResponsiveLayouts<DashboardBreakpoint>) => {
    const adjustedLayouts = withCollapsedHeight(nextLayouts, collapsedPanels);
    setLayouts(adjustedLayouts);
    saveLayouts(adjustedLayouts);
  }, [collapsedPanels]);

  const resetLayout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COLLAPSED_STORAGE_KEY);
    localStorage.removeItem(HEIGHT_STORAGE_KEY);
    setLayouts(defaultLayouts);
    setCollapsedPanels({ investment: false, sac: false });
  }, []);

  const isMobile = mounted && width < breakpoints.sm;
  const mobileOrder = useMemo(() => getMobileOrder(layouts), [layouts]);

  const moveMobileWidget = useCallback((targetId: WidgetId, position: "before" | "after") => {
    const activeId = draggedMobileWidget.current;
    if (!activeId || activeId === targetId) return;

    setLayouts((currentLayouts) => {
      const currentOrder = getMobileOrder(currentLayouts);
      const nextOrder = currentOrder.filter((id) => id !== activeId);
      const targetIndex = nextOrder.indexOf(targetId);
      nextOrder.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, activeId);

      const nextLayouts = withMobileOrder(currentLayouts, nextOrder);
      saveLayouts(nextLayouts);
      return nextLayouts;
    });
  }, []);

  const startMobileDrag = useCallback((widgetId: WidgetId, event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile) return;

    event.preventDefault();
    draggedMobileWidget.current = widgetId;
    mobileDropTarget.current = { id: widgetId, position: "before" };
    setMobileDragState({ activeId: widgetId, targetId: widgetId, position: "before" });
    event.currentTarget.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const widget = element?.closest<HTMLElement>("[data-dashboard-widget]");
      if (!widget) return;

      const targetIdStr = widget?.dataset.dashboardWidget;
      if (targetIdStr && isWidgetId(targetIdStr)) {
        const rect = widget.getBoundingClientRect();
        mobileDropTarget.current = {
          id: targetIdStr,
          position: moveEvent.clientY > rect.top + rect.height / 2 ? "after" : "before",
        };
        setMobileDragState({
          activeId: widgetId,
          targetId: targetIdStr,
          position: mobileDropTarget.current.position,
        });
      }
    };

    const onPointerUp = () => {
      const dropTarget = mobileDropTarget.current;
      if (dropTarget) {
        moveMobileWidget(dropTarget.id, dropTarget.position);
      }

      draggedMobileWidget.current = null;
      mobileDropTarget.current = null;
      setMobileDragState(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }, [isMobile, moveMobileWidget]);

  const toggleCollapsed = useCallback((widgetId: WidgetId) => {
    setCollapsedPanels((currentCollapsed) => {
      const nextCollapsed = {
        ...currentCollapsed,
        [widgetId]: !currentCollapsed[widgetId],
      };

      setLayouts((currentLayouts) => {
        const expandedHeights = readExpandedHeights();

        if (nextCollapsed[widgetId]) {
          for (const [breakpointName, layout] of Object.entries(currentLayouts)) {
            const typedBreakpoint = breakpointName as DashboardBreakpoint;
            const item = layout.find((layoutItem) => layoutItem.i === widgetId);
            if (!item || item.h <= 1) continue;

            expandedHeights[typedBreakpoint] = {
              ...expandedHeights[typedBreakpoint],
              [widgetId]: item.h,
            };
          }
          saveExpandedHeights(expandedHeights);
        }

        const nextLayouts = withCollapsedHeight(currentLayouts, nextCollapsed, expandedHeights);
        saveLayouts(nextLayouts);
        return nextLayouts;
      });

      saveCollapsedPanels(nextCollapsed);
      return nextCollapsed;
    });
  }, []);

  function renderWidget(id: WidgetId, mobile = false) {
    const content = id === "investment"
      ? <InvestmentProjection />
      : <SacFinancing />;

    return (
      <DashboardPanel
        tone={id}
        widgetId={mobile ? id : undefined}
        collapsed={collapsedPanels[id]}
        onMobileDragStart={mobile ? startMobileDrag : undefined}
        onToggleCollapsed={() => toggleCollapsed(id)}
      >
        {content}
      </DashboardPanel>
    );
  }

  return (
    <section className="dashboard-shell" aria-labelledby="dashboard-title">
      <div className="dashboard-toolbar">
        <button className="dashboard-reset" type="button" onClick={resetLayout} title="Resetar layout">
          Resetar layout
        </button>
      </div>

      <div ref={containerRef} className="dashboard-grid-wrap">
        {mounted && isMobile && (
          <div className="dashboard-mobile-list">
            {mobileOrder.map((id) => (
              <div
                key={id}
                className={`dashboard-mobile-item ${
                  mobileDragState?.activeId === id ? "dashboard-mobile-item-dragging" : ""
                } ${
                  mobileDragState?.targetId === id && mobileDragState.activeId !== id
                    ? `dashboard-mobile-drop-${mobileDragState.position}`
                    : ""
                }`}
              >
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
            <div key="sac">
              {renderWidget("sac")}
            </div>
            <div key="investment">
              {renderWidget("investment")}
            </div>
          </Responsive>
        )}
      </div>
    </section>
  );
}
