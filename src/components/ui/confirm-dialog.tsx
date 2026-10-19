import { Modal, Pressable, Text, View } from "react-native";

import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { themeVars } from "@/constants/theme";
import { useSettings } from "@/hooks/use-game";

type Props = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  confirmTone?: "danger" | "success";
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ visible, title, body, confirmLabel, confirmTone = "danger", cancelLabel, onConfirm, onCancel }: Props) {
  const { theme } = useSettings();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      {/* Modals render outside the themed root, so re-apply the theme variables. */}
      <View style={themeVars[theme]} className="flex-1 items-center justify-center p-6">
        <Pressable accessibilityLabel={cancelLabel} onPress={onCancel} className="absolute inset-0 bg-black/60" />
        <HardShadow offset={6} className="w-full max-w-sm">
        <View accessibilityViewIsModal className="gap-4 border-2 border-outline bg-surface p-5">
          <Text accessibilityRole="header" className="font-display text-xl text-ink">
            {title}
          </Text>
          <Text className="font-body text-base leading-6 text-ink">{body}</Text>
          <View className="flex-row gap-3">
            <PixelButton label={cancelLabel} onPress={onCancel} className="flex-1" />
            <PixelButton label={confirmLabel} tone={confirmTone} onPress={onConfirm} className="flex-1" />
          </View>
        </View>
        </HardShadow>
      </View>
    </Modal>
  );
}
