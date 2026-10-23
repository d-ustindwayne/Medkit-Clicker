import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Platform, Pressable, ScrollView, Text, View, type GestureResponderEvent, type ViewStyle } from "react-native";

import { useAudio } from "@/hooks/use-audio";

type Props = {
  width: number;
  /** One entry per page; `label` names the page for screen readers and the dots. */
  pages: { key: string; label: string; content: ReactNode; badge?: boolean }[];
  /** Where the page dots go: above or below the pages, or floating over their bottom edge. */
  dots?: "top" | "bottom" | "overlay";
  onPageChange?: (index: number) => void;
  /** Turn swiping off, e.g. while dragging things around on a page. */
  scrollEnabled?: boolean;
  /** Let page content draw past the pager's edges (the area around it must clip instead). */
  overflowVisible?: boolean;
  className?: string;
  /** A title above the pages (and the top dots) for the page shown; swiping it turns the pages too. */
  title?: (index: number) => ReactNode;
};

/** How long after start-up the second page is built, once the first screen has settled. */
const PREWARM_MS = 1500;
const WEB = Platform.OS === "web";
/**
 * Web: each page takes the full height, or its own lists grow instead of scrolling. It's also a snap
 * point the browser may not fling past, so a short, fast swipe turns one page, not all of them.
 */
const WEB_PAGE = { height: "100%", scrollSnapAlign: "start", scrollSnapStop: "always" } as unknown as ViewStyle;

/** Which page a finished drag lands on: a quick flick turns the page even when it's short. */
const stepFor = (dx: number, ms: number, width: number) => {
  const flick = Math.abs(dx) / Math.max(1, ms) > 0.4;
  return dx < 0 && (flick || -dx > width / 5) ? 1 : dx > 0 && (flick || dx > width / 5) ? -1 : 0;
};

/**
 * Web only: browsers don't scroll when the mouse drags, so dragging the pages with the mouse moves
 * them like a finger would. The click at the end of a drag is swallowed, so it doesn't buy or tap.
 */
function useMouseDrag(scroller: RefObject<ScrollView | null>, width: number, count: number, enabled: boolean, onStart: () => void) {
  const latest = useRef({ width, count, enabled, onStart });
  useEffect(() => {
    latest.current = { width, count, enabled, onStart };
  });
  useEffect(() => {
    if (!WEB) return;
    const node = (scroller.current as unknown as { getScrollableNode?: () => HTMLElement } | null)?.getScrollableNode?.();
    if (!node) return;
    let drag: { x: number; left: number; t: number; moved: boolean } | null = null;
    let swallowClick = false;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || !latest.current.enabled) return;
      drag = { x: e.clientX, left: node.scrollLeft, t: e.timeStamp, moved: false };
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 8) return;
        drag.moved = true;
        // Snapping would pull the pages back while they're dragged.
        node.style.scrollSnapType = "none";
        node.style.cursor = "grabbing";
        // A mouse drag would otherwise select the text it passes over.
        document.body.style.userSelect = "none";
        window.getSelection()?.removeAllRanges();
        latest.current.onStart();
      }
      node.scrollLeft = drag.left - dx;
    };
    const up = (e: PointerEvent) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.moved) return;
      swallowClick = true;
      setTimeout(() => (swallowClick = false), 0);
      const { width: w, count: n } = latest.current;
      const from = Math.round(d.left / w);
      const next = Math.min(Math.max(from + stepFor(e.clientX - d.x, e.timeStamp - d.t, w), 0), n - 1);
      node.style.cursor = "";
      document.body.style.userSelect = "";
      scroller.current?.scrollTo({ x: next * w, animated: true });
      // Snapping comes back once the pages have arrived.
      setTimeout(() => (node.style.scrollSnapType = ""), 400);
    };
    // Pressing the mouse to drag shouldn't start selecting text either.
    const select = (e: Event) => {
      if (drag) e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      if (!swallowClick) return;
      e.stopPropagation();
      e.preventDefault();
    };
    node.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    node.addEventListener("click", click, true);
    node.addEventListener("selectstart", select);
    return () => {
      node.removeEventListener("selectstart", select);
      node.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      node.removeEventListener("click", click, true);
    };
  }, [scroller]);
}

/** Horizontal swipe pages with tappable pixel dots. */
export function Pager({ width, pages, dots = "bottom", onPageChange, scrollEnabled = true, overflowVisible = false, className = "", title }: Props) {
  const { playSfx } = useAudio();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  // Pages are built the first time they're needed (a swipe starts toward them or their dot is
  // tapped) and then kept, so hidden pages cost nothing at start-up.
  const [mounted, setMounted] = useState<number[]>([0]);
  const mount = (...ids: number[]) => setMounted((m) => (ids.every((i) => i < 0 || i >= pages.length || m.includes(i)) ? m : [...new Set([...m, ...ids])]));
  // A moment after start-up the next page is built too, so the first swipe never reaches a page
  // that is still loading its art.
  useEffect(() => {
    const t = setTimeout(() => setMounted((m) => (m.includes(1) || pages.length < 2 ? m : [...m, 1])), PREWARM_MS);
    return () => clearTimeout(t);
  }, [pages.length]);

  const settle = (next: number) => {
    mount(next);
    if (next === page) return;
    playSfx("click");
    setPage(next);
    onPageChange?.(next);
  };

  // Dragging the title scrolls the pages with the finger, then snaps to the nearest one.
  const drag = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragDx = (pageX: number) => pageX - (drag.current?.x ?? pageX);
  const titleDrag = {
    onTouchStart: (e: GestureResponderEvent) => {
      drag.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, t: e.nativeEvent.timestamp };
    },
    onMoveShouldSetResponder: (e: GestureResponderEvent) => {
      const dx = Math.abs(dragDx(e.nativeEvent.pageX));
      return scrollEnabled && pages.length > 1 && dx > 8 && dx > Math.abs(e.nativeEvent.pageY - (drag.current?.y ?? 0));
    },
    onResponderGrant: () => mount(page - 1, page + 1),
    onResponderMove: (e: GestureResponderEvent) => {
      const x = Math.min(Math.max(page * width - dragDx(e.nativeEvent.pageX), 0), (pages.length - 1) * width);
      scroller.current?.scrollTo({ x, animated: false });
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      const dx = dragDx(e.nativeEvent.pageX);
      const step = stepFor(dx, e.nativeEvent.timestamp - (drag.current?.t ?? 0), width);
      const next = Math.min(Math.max(page + step, 0), pages.length - 1);
      scroller.current?.scrollTo({ x: next * width, animated: true });
      settle(next);
    },
    onResponderTerminate: () => scroller.current?.scrollTo({ x: page * width, animated: true }),
  };

  useMouseDrag(scroller, width, pages.length, scrollEnabled && pages.length > 1, () => mount(page - 1, page + 1));
  // Browsers never report the end of a scroll's momentum, so on the web the page is settled once
  // scrolling has stopped for a moment.
  const scrollIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(scrollIdle.current ?? undefined), []);
  const webScroll = WEB
    ? {
        scrollEventThrottle: 32,
        onScroll: (e: { nativeEvent: { contentOffset: { x: number } } }) => {
          const x = e.nativeEvent.contentOffset.x;
          // Build the page coming into view as soon as it starts to show.
          mount(Math.floor(x / width), Math.ceil(x / width));
          if (scrollIdle.current) clearTimeout(scrollIdle.current);
          scrollIdle.current = setTimeout(() => settle(Math.round(x / width)), 120);
        },
      }
    : {};

  const dotsRow = pages.length > 1 && scrollEnabled && (
    <View
      className={`flex-row items-center justify-center gap-2 ${dots === "overlay" ? "rounded-full border-[1.5px] border-outline bg-surface/85 px-2.5 py-1" : "py-1.5"}`}
      accessibilityRole="tablist"
    >
      {pages.map((p, i) => (
        <Pressable
          key={p.key}
          accessibilityRole="tab"
          accessibilityLabel={p.label}
          accessibilityState={{ selected: i === page }}
          hitSlop={8}
          onPress={() => {
            mount(i);
            scroller.current?.scrollTo({ x: i * width, animated: true });
          }}
          className={`h-2.5 border-[1.5px] border-outline ${i === page ? "w-7 bg-ink" : "w-2.5 bg-surface"}`}
        >
          {p.badge && i !== page && (
            <View className="absolute -right-2 -top-3 h-3.5 w-3.5 items-center justify-center rounded-full border border-outline bg-primary">
              <Text className="font-pixel text-[8px] leading-[10px] text-ink">!</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );

  return (
    <View className={`relative ${className}`}>
      {title && <View {...titleDrag}>{title(page)}</View>}
      {dots === "top" && dotsRow}
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        scrollEnabled={scrollEnabled}
        showsHorizontalScrollIndicator={false}
        // On the web, visible overflow would stop the pages scrolling at all, so they clip there.
        style={{ width, flexGrow: 1, overflow: overflowVisible && !WEB ? "visible" : undefined }}
        onScrollBeginDrag={() => mount(page - 1, page + 1)}
        onMomentumScrollEnd={(e) => {
          settle(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        {...webScroll}
      >
        {pages.map((p, i) => (
          <View key={p.key} style={WEB ? [WEB_PAGE, { width }] : { width }}>
            {mounted.includes(i) ? p.content : null}
          </View>
        ))}
      </ScrollView>
      {dots === "bottom" && dotsRow}
      {dots === "overlay" && (
        <View pointerEvents="box-none" className="absolute inset-x-0 bottom-2 items-center">
          {dotsRow}
        </View>
      )}
    </View>
  );
}
