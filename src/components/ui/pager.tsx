import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View, type GestureResponderEvent } from "react-native";

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
      // A quick flick turns the page even when it's short.
      const flick = Math.abs(dx) / Math.max(1, e.nativeEvent.timestamp - (drag.current?.t ?? 0)) > 0.4;
      const step = dx < 0 && (flick || -dx > width / 5) ? 1 : dx > 0 && (flick || dx > width / 5) ? -1 : 0;
      const next = Math.min(Math.max(page + step, 0), pages.length - 1);
      scroller.current?.scrollTo({ x: next * width, animated: true });
      settle(next);
    },
    onResponderTerminate: () => scroller.current?.scrollTo({ x: page * width, animated: true }),
  };

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
        style={{ width, flexGrow: 1, overflow: overflowVisible ? "visible" : undefined }}
        onScrollBeginDrag={() => mount(page - 1, page + 1)}
        onMomentumScrollEnd={(e) => {
          settle(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      >
        {pages.map((p, i) => (
          <View key={p.key} style={{ width }}>
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
