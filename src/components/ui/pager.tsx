import { useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useAudio } from "@/hooks/use-audio";

type Props = {
  width: number;
  /** One entry per page; `label` names the page for screen readers and the dots. */
  pages: { key: string; label: string; content: ReactNode }[];
  /** Where the page dots go relative to the pages. */
  dots?: "top" | "bottom";
  onPageChange?: (index: number) => void;
  className?: string;
};

/** Horizontal swipe pages with tappable pixel dots. */
export function Pager({ width, pages, dots = "bottom", onPageChange, className = "" }: Props) {
  const { playSfx } = useAudio();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const dotsRow = pages.length > 1 && (
    <View className="flex-row items-center justify-center gap-2 py-1.5" accessibilityRole="tablist">
      {pages.map((p, i) => (
        <Pressable
          key={p.key}
          accessibilityRole="tab"
          accessibilityLabel={p.label}
          accessibilityState={{ selected: i === page }}
          hitSlop={8}
          onPress={() => scroller.current?.scrollTo({ x: i * width, animated: true })}
          className={`h-2.5 border-[1.5px] border-outline ${i === page ? "w-7 bg-ink" : "w-2.5 bg-surface"}`}
        />
      ))}
    </View>
  );

  return (
    <View className={className}>
      {dots === "top" && dotsRow}
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
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
    </View>
  );
}
