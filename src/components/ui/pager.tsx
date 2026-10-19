import { useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

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
  className?: string;
};

/** Horizontal swipe pages with tappable pixel dots. */
export function Pager({ width, pages, dots = "bottom", onPageChange, scrollEnabled = true, className = "" }: Props) {
  const { playSfx } = useAudio();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

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
          onPress={() => scroller.current?.scrollTo({ x: i * width, animated: true })}
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
      {dots === "top" && dotsRow}
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        scrollEnabled={scrollEnabled}
        showsHorizontalScrollIndicator={false}
        style={{ width, flexGrow: 1 }}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          if (next === page) return;
          playSfx("click");
          setPage(next);
          onPageChange?.(next);
        }}
      >
        {pages.map((p) => (
          <View key={p.key} style={{ width }}>
            {p.content}
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
