import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Responsive,
  type Breakpoint,
  type Layout,
  type ResponsiveLayouts,
  useContainerWidth,
} from "react-grid-layout";
import InvestmentProjection from "./InvestmentProjection.tsx";
import Financiamento from "./Financiamento.tsx";
import FinanceVsInvest from "./FinanceVsInvest.tsx";

type DashboardBreakpoint = "lg" | "md" | "sm" | "xs";
type WidgetId = "investment" | "sac" | "comparison";

const STORAGE_KEY = "muda.dashboard.layouts.v2";
const COLLAPSED_STORAGE_KEY = "muda.dashboard.collapsed.v2";
const HEIGHT_STORAGE_KEY = "muda.dashboard.expandedHeights.v2";
const CUSTOM_COLORS_STORAGE_KEY = "muda.dashboard.colors.v2";
const COLLAPSED_GRID_HEIGHT = 2;

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
    { i: "comparison", x: 0, y: 11, w: 12, h: 12, minW: 6, minH: 8 },
  ],
  md: [
    { i: "sac", x: 0, y: 0, w: 4, h: 11, minW: 3, minH: 7 },
    { i: "investment", x: 4, y: 0, w: 4, h: 8, minW: 3, minH: 5 },
    { i: "comparison", x: 0, y: 11, w: 8, h: 12, minW: 4, minH: 8 },
  ],
  sm: [
    { i: "sac", x: 0, y: 0, w: 4, h: 11, minW: 4, minH: 7 },
    { i: "investment", x: 0, y: 11, w: 4, h: 8, minW: 4, minH: 5 },
    { i: "comparison", x: 0, y: 19, w: 4, h: 12, minW: 4, minH: 8 },
  ],
  xs: [
    { i: "sac", x: 0, y: 0, w: 1, h: 11, minW: 1, minH: 7, maxW: 1 },
    { i: "investment", x: 0, y: 11, w: 1, h: 8, minW: 1, minH: 5, maxW: 1 },
    { i: "comparison", x: 0, y: 19, w: 1, h: 12, minW: 1, minH: 8, maxW: 1 },
  ],
};

function isWidgetId(id: string): id is WidgetId {
  return id === "investment" || id === "sac" || id === "comparison";
}

function readSavedLayouts(): ResponsiveLayouts<DashboardBreakpoint> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLayouts;

    const parsed = JSON.parse(raw) as Partial<ResponsiveLayouts<DashboardBreakpoint>>;
    return ensureDefaultWidgets({
      ...defaultLayouts,
      ...parsed,
    });
  } catch {
    return defaultLayouts;
  }
}

function ensureDefaultWidgets(layouts: ResponsiveLayouts<DashboardBreakpoint>): ResponsiveLayouts<DashboardBreakpoint> {
  return Object.fromEntries(
    Object.entries(defaultLayouts).map(([breakpointName, defaultLayout]) => {
      const typedBreakpoint = breakpointName as DashboardBreakpoint;
      const savedLayout = layouts[typedBreakpoint] ?? [];
      const missingDefaults = defaultLayout.filter((item) => !savedLayout.some((savedItem) => savedItem.i === item.i));
      return [typedBreakpoint, [...savedLayout, ...missingDefaults]];
    }),
  ) as ResponsiveLayouts<DashboardBreakpoint>;
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
      comparison: parsed.comparison ?? false,
    };
  } catch {
    return { investment: false, sac: false, comparison: false };
  }
}

function readCustomColors(): Partial<Record<WidgetId, string>> {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveCustomColors(colors: Partial<Record<WidgetId, string>>) {
  localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(colors));
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

function rememberExpandedHeights(
  layouts: ResponsiveLayouts<DashboardBreakpoint>,
  collapsedPanels: Record<WidgetId, boolean>,
) {
  const expandedHeights = readExpandedHeights();

  for (const [breakpointName, layout] of Object.entries(layouts)) {
    const typedBreakpoint = breakpointName as DashboardBreakpoint;

    for (const item of layout) {
      if (!isWidgetId(item.i) || collapsedPanels[item.i] || item.h <= COLLAPSED_GRID_HEIGHT) continue;

      expandedHeights[typedBreakpoint] = {
        ...expandedHeights[typedBreakpoint],
        [item.i]: item.h,
      };
    }
  }

  saveExpandedHeights(expandedHeights);
  return expandedHeights;
}

function getDefaultHeight(breakpointName: DashboardBreakpoint, widgetId: WidgetId) {
  return defaultLayouts[breakpointName]?.find((item) => item.i === widgetId)?.h ?? 8;
}

function getDefaultLayoutItem(breakpointName: DashboardBreakpoint, widgetId: WidgetId) {
  return defaultLayouts[breakpointName]?.find((item) => item.i === widgetId);
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
          return { ...item, h: COLLAPSED_GRID_HEIGHT, minH: COLLAPSED_GRID_HEIGHT, maxH: COLLAPSED_GRID_HEIGHT };
        }

        const defaultItem = getDefaultLayoutItem(typedBreakpoint, item.i);
        const rememberedHeight = expandedHeights[typedBreakpoint]?.[item.i] ?? getDefaultHeight(typedBreakpoint, item.i);
        const restoredHeight = item.h > COLLAPSED_GRID_HEIGHT ? item.h : rememberedHeight;
        const { maxH: _maxH, minH: _minH, ...expandedItem } = item;
        return {
          ...expandedItem,
          minH: defaultItem?.minH,
          maxH: defaultItem?.maxH,
          h: Math.max(restoredHeight, defaultItem?.minH ?? 1),
        };
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
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const InvestmentIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ComparisonIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18V7m0 11l-3-3m3 3l3-3m9-9v11m0-11l-3 3m3-3l3 3M9 12h6" />
  </svg>
);

const WIDGET_CONFIG: Record<WidgetId, { title: string; icon: React.ReactNode }> = {
  sac: { title: "Financiamento", icon: <SacIcon /> },
  investment: { title: "Investimento", icon: <InvestmentIcon /> },
  comparison: { title: "Financiar vs Investir", icon: <ComparisonIcon /> },
};

const PALETTE = [
  "#E8F500", "#4DD9A4", "#00E5FF", 
  "#FF007F", "#B388FF", "#FF6D00",
  "#FF3333", "#76FF03", "#FFFFFF"
];

function DashboardPanel({
  tone,
  widgetId,
  collapsed,
  customColor,
  onColorChange,
  onMobileDragStart,
  onToggleCollapsed,
  children,
}: {
  tone: WidgetId;
  widgetId?: WidgetId;
  collapsed: boolean;
  customColor?: string;
  onColorChange?: (color: string) => void;
  onMobileDragStart?: (widgetId: WidgetId, event: React.PointerEvent<HTMLDivElement>) => void;
  onToggleCollapsed: () => void;
  children: React.ReactNode;
}) {
  const config = WIDGET_CONFIG[tone];
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const panelAccent = customColor ?? (
    tone === "sac" ? "#E8F500" : tone === "investment" ? "#4DD9A4" : "#00E5FF"
  );
  const panelAccentSoft = customColor
    ? `${customColor}26`
    : tone === "sac"
      ? "rgba(232, 245, 0, 0.15)"
      : tone === "investment"
        ? "rgba(77, 217, 164, 0.15)"
        : "rgba(0, 229, 255, 0.15)";
  const style = {
    "--panel-accent": panelAccent,
    "--panel-accent-soft": panelAccentSoft,
    "--panel-accent-alt": tone === "comparison" ? "#FF9F1C" : "var(--color-positive)",
    "--panel-handle-color": panelAccent,
    "--panel-handle-bg": customColor ? `${customColor}26` : panelAccent,
  } as React.CSSProperties;

  return (
    <section
      className={[
        "relative flex h-full min-h-0 min-w-0 flex-col rounded-[var(--radius-md)_var(--radius-md)_var(--radius-sm)_var(--radius-sm)] border-[3px] border-[#222] bg-black shadow-[0_20px_60px_rgba(0,0,0,0.4)]",
        collapsed && "min-h-[62px] rounded-[var(--radius-md)]",
        isColorPickerOpen && "z-[60]",
      ].filter(Boolean).join(" ")}
      style={style}
      data-dashboard-widget={widgetId}
      aria-label={config.title}
    >
      <div className={`flex flex-[0_0_56px] items-center gap-2.5 rounded-t-[calc(var(--radius-md)-3px)] border-b border-[#333] bg-[#111] px-4 py-3 ${collapsed ? "rounded-b-[calc(var(--radius-md)-3px)] border-b-0" : ""}`}>
        <div
          className="dashboard-drag-handle grid size-8 shrink-0 cursor-grab select-none place-items-center touch-none rounded-[var(--radius-sm)] border border-[#444] bg-[rgba(255,255,255,0.04)] font-mono text-sm leading-none text-[var(--panel-accent)] transition-[background,border-color] duration-[120ms] ease-in-out active:cursor-grabbing hover:border-[var(--panel-handle-color,var(--color-accent))] hover:bg-[var(--panel-handle-bg,var(--color-accent-soft))] hover:text-[var(--color-text-heading)] focus-visible:border-[var(--panel-handle-color,var(--color-accent))] focus-visible:bg-[var(--panel-handle-bg,var(--color-accent-soft))] focus-visible:text-[var(--color-text-heading)] focus-visible:outline-none max-[559px]:size-9 max-[559px]:text-base"
          role="button"
          tabIndex={0}
          aria-label={`Mover ${config.title}`}
          title="Mover painel"
          onPointerDown={(event) => widgetId && onMobileDragStart?.(widgetId, event)}
        >
          <span aria-hidden="true">::</span>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[17px] font-black uppercase tracking-[0.04em] text-[var(--panel-accent,var(--color-text-heading))]">{config.title}</div>
        {onColorChange && (
          <div className="relative inline-block">
            <button
              type="button"
              className="size-5 cursor-pointer appearance-none overflow-hidden rounded-full border-2 border-[#333] bg-transparent p-0 transition-[transform,border-color] duration-[120ms] ease-in-out hover:scale-110 hover:border-[#555] focus-visible:outline-2 focus-visible:outline-[var(--panel-accent)] focus-visible:outline-offset-2"
              title="Mudar cor do painel"
              style={{ backgroundColor: customColor || (tone === "sac" ? "#E8F500" : "#4DD9A4") }}
              onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
              aria-expanded={isColorPickerOpen}
              aria-label="Mudar cor do painel"
            />
            {isColorPickerOpen && (
              <div className="absolute right-0 top-full z-[50] mt-2 grid w-[116px] grid-cols-3 gap-2 rounded-[var(--radius-sm)] border border-[#333] bg-[#111] p-2 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                {PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="size-6 cursor-pointer rounded-full border-2 border-transparent bg-transparent p-0 transition-[transform,border-color] duration-[120ms] ease-in-out hover:scale-110 hover:border-white"
                    style={{ backgroundColor: color }}
                    aria-label={`Cor ${color}`}
                    onClick={() => {
                      onColorChange(color);
                      setIsColorPickerOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        <div className="grid size-9 shrink-0 place-items-center rounded-full border border-[#333] bg-[var(--panel-accent,var(--color-accent))] text-black leading-none" aria-hidden="true">{config.icon}</div>
        <button
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[var(--radius-sm)] border border-[#444] bg-[rgba(255,255,255,0.04)] font-mono text-lg font-bold leading-none text-[var(--color-text-heading)] transition-[background,border-color] duration-[120ms] ease-in-out hover:border-[var(--panel-handle-color,var(--color-text-heading))] hover:bg-[var(--panel-handle-bg,var(--color-accent-soft))] hover:text-[var(--color-surface)] focus-visible:border-[var(--panel-handle-color,var(--color-text-heading))] focus-visible:bg-[var(--panel-handle-bg,var(--color-accent-soft))] focus-visible:text-[var(--color-surface)] focus-visible:outline-none max-[559px]:size-9"
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expandir ${config.title}` : `Recolher ${config.title}`}
          title={collapsed ? "Expandir painel" : "Recolher painel"}
        >
          <span aria-hidden="true">{collapsed ? "+" : "−"}</span>
        </button>
      </div>
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-auto rounded-b-[calc(var(--radius-sm)-3px)] bg-black [scrollbar-color:#3f3f3f_#050505] max-[559px]:overflow-visible [&>section]:h-full [&>section]:rounded-none [&>section]:border-0 [&>section]:bg-black [&>section]:p-4 [&>section>h2]:hidden [&>section>.mt-3.p-3]:border-[#333] [&>section>.mt-3.p-3]:bg-[#1a1a1a] [&>section>.mt-3.grid]:gap-2.5 max-[559px]:[&>section]:p-3"
        >
          {children}
        </div>
      )}
    </section>
  );
}

export default function DashboardLayout() {
  const { width, containerRef, mounted } = useContainerWidth();
  const [collapsedPanels, setCollapsedPanels] = useState(readCollapsedPanels);
  const [customColors, setCustomColors] = useState(readCustomColors);
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
    const expandedHeights = rememberExpandedHeights(nextLayouts, collapsedPanels);
    const adjustedLayouts = withCollapsedHeight(nextLayouts, collapsedPanels, expandedHeights);
    setLayouts(adjustedLayouts);
    saveLayouts(adjustedLayouts);
  }, [collapsedPanels]);

  const resetLayout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COLLAPSED_STORAGE_KEY);
    localStorage.removeItem(HEIGHT_STORAGE_KEY);
    localStorage.removeItem(CUSTOM_COLORS_STORAGE_KEY);
    setLayouts(defaultLayouts);
    setCollapsedPanels({ investment: false, sac: false, comparison: false });
    setCustomColors({});
  }, []);

  const setCustomColor = useCallback((widgetId: WidgetId, color: string) => {
    setCustomColors((prev) => {
      const next = { ...prev, [widgetId]: color };
      saveCustomColors(next);
      return next;
    });
  }, []);

  const setAllCollapsed = useCallback((collapsed: boolean) => {
    const nextCollapsed: Record<WidgetId, boolean> = {
      investment: collapsed,
      sac: collapsed,
      comparison: collapsed,
    };

    setLayouts((currentLayouts) => {
      const expandedHeights = collapsed
        ? rememberExpandedHeights(currentLayouts, { investment: false, sac: false, comparison: false })
        : readExpandedHeights();
      const nextLayouts = withCollapsedHeight(currentLayouts, nextCollapsed, expandedHeights);
      saveLayouts(nextLayouts);
      return nextLayouts;
    });

    saveCollapsedPanels(nextCollapsed);
    setCollapsedPanels(nextCollapsed);
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
            if (!item || item.h <= COLLAPSED_GRID_HEIGHT) continue;

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
      : id === "comparison"
        ? <FinanceVsInvest />
        : <Financiamento />;

    return (
      <DashboardPanel
        tone={id}
        widgetId={mobile ? id : undefined}
        collapsed={collapsedPanels[id]}
        customColor={customColors[id]}
        onColorChange={(color) => setCustomColor(id, color)}
        onMobileDragStart={mobile ? startMobileDrag : undefined}
        onToggleCollapsed={() => toggleCollapsed(id)}
      >
        {content}
      </DashboardPanel>
    );
  }

  return (
    <section className="grid min-w-0 gap-4" aria-labelledby="dashboard-title">
      <div className="mx-2.5 flex items-center justify-end gap-3">
        <button className="min-h-9 cursor-pointer rounded-[var(--radius-sm)] border-2 border-black bg-transparent px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em] text-black transition-[background,color] duration-[120ms] ease-in-out hover:bg-black hover:text-[var(--color-bg)]" type="button" onClick={() => setAllCollapsed(false)} title="Expandir todos">
          Expandir todos
        </button>
        <button className="min-h-9 cursor-pointer rounded-[var(--radius-sm)] border-2 border-black bg-transparent px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em] text-black transition-[background,color] duration-[120ms] ease-in-out hover:bg-black hover:text-[var(--color-bg)]" type="button" onClick={() => setAllCollapsed(true)} title="Recolher todos">
          Recolher todos
        </button>
        <button className="min-h-9 cursor-pointer rounded-[var(--radius-sm)] border-2 border-black bg-transparent px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em] text-black transition-[background,color] duration-[120ms] ease-in-out hover:bg-black hover:text-[var(--color-bg)]" type="button" onClick={resetLayout} title="Resetar layout">
          Resetar layout
        </button>
      </div>

      <div ref={containerRef} className="min-w-0 max-[559px]:px-1">
        {mounted && isMobile && (
          <div className="grid gap-4">
            {mobileOrder.map((id) => {
              const isDragging = mobileDragState?.activeId === id;
              const isDropTarget = mobileDragState?.targetId === id && mobileDragState.activeId !== id;

              return (
                <div
                  key={id}
                  className={[
                    "relative min-w-0 transition-[transform,opacity] duration-[170ms] ease-in-out before:absolute before:-top-[9px] before:left-3 before:right-3 before:z-[3] before:h-[5px] before:rounded-full before:bg-[var(--color-surface)] before:shadow-[0_0_0_3px_var(--color-accent-soft)] before:opacity-0 before:pointer-events-none before:transition-opacity before:duration-[120ms] before:ease-in-out before:content-[''] after:absolute after:-bottom-[9px] after:left-3 after:right-3 after:z-[3] after:h-[5px] after:rounded-full after:bg-[var(--color-surface)] after:shadow-[0_0_0_3px_var(--color-accent-soft)] after:opacity-0 after:pointer-events-none after:transition-opacity after:duration-[120ms] after:ease-in-out after:content-[''] [&>section]:h-auto",
                    isDragging && "scale-[0.99] opacity-[0.78]",
                    isDropTarget && mobileDragState.position === "before" && "before:opacity-100",
                    isDropTarget && mobileDragState.position === "after" && "after:opacity-100",
                  ].filter(Boolean).join(" ")}
                >
                  {renderWidget(id, true)}
                </div>
              );
            })}
          </div>
        )}

        {mounted && !isMobile && (
          <Responsive<DashboardBreakpoint>
            className="min-h-px [&_.react-grid-item.react-grid-placeholder]:rounded-[var(--radius-lg)] [&_.react-grid-item.react-grid-placeholder]:border-2 [&_.react-grid-item.react-grid-placeholder]:border-black [&_.react-grid-item.react-grid-placeholder]:bg-black [&_.react-grid-item.react-grid-placeholder]:opacity-[0.15] [&_.react-resizable-handle]:rounded-full [&_.react-resizable-handle]:bg-[var(--color-text-muted)] [&_.react-resizable-handle]:opacity-[0.55] [&_.react-resizable-handle]:transition-[opacity,background] [&_.react-resizable-handle]:duration-[120ms] [&_.react-resizable-handle]:ease-in-out [&_.react-resizable-handle:hover]:bg-[var(--color-accent)] [&_.react-resizable-handle:hover]:opacity-100 [&_.react-resizable-handle::after]:hidden [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-e]:top-1/2 [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-e]:right-[6px] [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-e]:bottom-auto [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-e]:left-auto [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-e]:h-12 [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-e]:w-[6px] [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-e]:-mt-6 [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-e]:transform-none [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-s]:top-auto [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-s]:right-auto [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-s]:bottom-[6px] [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-s]:left-1/2 [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-s]:h-[6px] [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-s]:w-12 [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-s]:-ml-6 [&_.react-grid-item>.react-resizable-handle.react-resizable-handle-s]:transform-none"
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
            resizeConfig={{ enabled: true, handles: ["e", "s"] }}
            onBreakpointChange={(nextBreakpoint: Breakpoint) => setBreakpoint(nextBreakpoint as DashboardBreakpoint)}
            onLayoutChange={onLayoutChange}
          >
            <div key="sac">
              {renderWidget("sac")}
            </div>
            <div key="investment">
              {renderWidget("investment")}
            </div>
            <div key="comparison">
              {renderWidget("comparison")}
            </div>
          </Responsive>
        )}
      </div>
    </section>
  );
}
