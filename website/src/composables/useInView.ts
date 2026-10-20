import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";

/**
 * Whether an element is on screen. `seen` turns true the first time and stays true (for entrances);
 * `visible` follows the element in and out (for pausing animations nobody can see).
 */
export function useInView(target: Ref<HTMLElement | undefined>, threshold = 0.25) {
  const seen = ref(false);
  const visible = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (!target.value) return;
    observer = new IntersectionObserver(
      ([entry]) => {
        visible.value = entry.isIntersecting;
        if (entry.isIntersecting) seen.value = true;
      },
      { threshold },
    );
    observer.observe(target.value);
  });
  onBeforeUnmount(() => observer?.disconnect());

  return { seen, visible };
}
