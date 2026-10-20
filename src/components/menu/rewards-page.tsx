import { useEffect, useState } from "react";
import { Image } from "@/components/ui/image";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Platform, Share, Text, TextInput, View } from "react-native";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { MEDKIT_IMAGE } from "@/constants/items";
import { REWARD_SECTIONS, type Reward, type RewardSection } from "@/constants/rewards";
import { useGameActions, useGameState } from "@/hooks/use-game";
import { usePalette } from "@/hooks/use-palette";
import { cloudEnabled, fetchRewards, getToken, redeemOnline } from "@/lib/cloud";
import { formatCount } from "@/lib/format";
import { cooldownLeft, redeemedThisYear } from "@/lib/game";
import { useNow } from "@/hooks/use-now";

const countLabel = (reward: Reward, index: number) => (reward.limit === null ? `#${index + 1}` : `${index + 1} of ${reward.limit}`);

const shareRedemption = (section: RewardSection, reward: Reward, index: number, at: number, note?: string) =>
  Share.share({
    message:
      `Medkit Clicker reward redeemed!\n` +
      `${reward.name} (${countLabel(reward, index)})\n` +
      (note ? `${reward.input?.label} ${note}\n` : "") +
      `Redeemed on ${new Date(at).toLocaleString()}.\n` +
      `${section.notify}, time to deliver!`,
  }).catch(() => {});

const formatWhen = (d: Date) =>
  d.toLocaleString([], { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** The answer a reward asks for: a line of text, or a date and time. */
function RewardInput({ reward, value, onChange }: { reward: Reward; value: string; onChange: (v: string) => void }) {
  const palette = usePalette();
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const input = reward.input;
  if (!input) return null;
  if (input.kind === "text") {
    return (
      <View className="gap-1">
        <Text className="font-body text-sm text-ink">{input.label}</Text>
        <TextInput
          accessibilityLabel={input.label}
          value={value}
          onChangeText={onChange}
          placeholder={input.placeholder}
          placeholderTextColor={`${palette.ink}80`}
          maxLength={120}
          returnKeyType="done"
          className="min-h-12 border-2 border-outline bg-surface px-3 font-rounded text-base text-ink"
        />
      </View>
    );
  }
  const pick = (d: Date) => {
    setWhen(d);
    onChange(formatWhen(d));
  };
  return (
    <View className="gap-2">
      <Text className="font-body text-sm text-ink">{input.label}</Text>
      {Platform.OS === "android" ? (
        <View className="flex-row gap-2">
          <PixelButton
            label="Pick date"
            className="flex-1"
            onPress={() => DateTimePickerAndroid.open({ value: when, mode: "date", minimumDate: new Date(), onChange: (e, d) => e.type === "set" && d && pick(d) })}
          />
          <PixelButton label="Pick time" className="flex-1" onPress={() => DateTimePickerAndroid.open({ value: when, mode: "time", onChange: (e, d) => e.type === "set" && d && pick(d) })} />
        </View>
      ) : (
        <DateTimePicker value={when} mode="datetime" minimumDate={new Date()} onChange={(_, d) => d && pick(d)} />
      )}
      <Text className="font-number text-base text-ink">{value || "Not picked yet"}</Text>
    </View>
  );
}

/** "2 days 3 h", "5 h 20 min", "12 min". */
const formatWait = (ms: number) => {
  const min = Math.ceil(ms / 60_000), h = Math.floor(min / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d} ${d === 1 ? "day" : "days"}${h % 24 ? ` ${h % 24} h` : ""}`;
  if (h > 0) return `${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
  return `${min} min`;
};

/** A random fun fact for the "Random fun fact" reward. */
async function fetchFunFact() {
  const res = await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en");
  const body = (await res.json()) as { text?: string };
  if (!res.ok || !body.text) throw new Error("No fact");
  return body.text.trim();
}

function RewardCard({ section, reward }: { section: RewardSection; reward: Reward }) {
  const { healed, redemptions, rebirths } = useGameState();
  const { dispatch, pushToast } = useGameActions();
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [fact, setFact] = useState<string | null>(null);
  const history = redemptions[reward.id] ?? [];
  const unlimited = reward.limit === null;
  const yearLeft = reward.perYear !== undefined ? reward.perYear - redeemedThisYear(history) : Infinity;
  const left = Math.min(unlimited ? Infinity : reward.limit! - history.length, yearLeft);
  const lockedUntil = reward.minRebirths && rebirths < reward.minRebirths ? reward.minRebirths : 0;
  const now = useNow(30_000);
  const waitMs = cooldownLeft(reward, history, now);
  const affordable = healed >= reward.cost;
  const answer = note.trim();

  const redeem = async () => {
    setConfirming(false);
    setNote("");
    let extra = answer || undefined;
    // The fun fact is fetched first, so nothing is spent if there's no connection.
    if (reward.fact) {
      try {
        extra = await fetchFunFact();
      } catch {
        pushToast({ kind: "info", title: "No fact right now", body: "Couldn't reach the fun-fact library. Nothing was spent; try again with a connection." });
        return;
      }
      setFact(extra);
    }
    // Online: the server checks the limit, records it and alerts the giver automatically.
    const token = cloudEnabled ? await getToken() : null;
    if (token) {
      try {
        const res = await redeemOnline(token, reward.id, extra);
        dispatch({ type: "redeem", rewardId: reward.id });
        pushToast({ kind: "info", title: "Redeemed", body: res.notified ? `${reward.name}. ${section.notify} has been told!` : `${reward.name}. Let ${section.notify} know!` });
        return;
      } catch (e) {
        if ((e as { status?: number }).status === 409) {
          pushToast({ kind: "info", title: "All redeemed", body: `There are no more "${reward.name}" to redeem.` });
          return;
        }
        // offline: fall back to the share sheet below
      }
    }
    dispatch({ type: "redeem", rewardId: reward.id });
    pushToast({ kind: "info", title: "Redeemed", body: `${reward.name}. Tap "Tell ${section.notify}" to let him know.` });
  };

  return (
    <HardShadow offset={5}>
      <View className="gap-3 border-[3px] border-outline bg-surface p-4">
        <View className="flex-row items-center gap-3">
          <Image source={reward.image} style={{ width: 48, height: 48 }} contentFit="contain" />
          <View className="flex-1">
            <Text className="font-display text-lg text-ink">{reward.name}</Text>
            <Text className="font-body text-xs text-ink opacity-70">{reward.description}</Text>
            <View className="flex-row items-center gap-1">
              <Image source={MEDKIT_IMAGE} style={{ width: 16, height: 16 }} contentFit="contain" />
              <Text className="font-number text-base leading-5 text-ink">{formatCount(reward.cost)} patients</Text>
            </View>
          </View>
        </View>

        {lockedUntil ? (
          <Text className="font-body text-sm text-ink">Unlocks at rebirth {lockedUntil} (you have {rebirths}).</Text>
        ) : reward.perYear !== undefined ? (
          <Text className="font-body text-sm text-ink">{Math.max(0, yearLeft)} of {reward.perYear} left this year</Text>
        ) : unlimited ? (
          <Text className="font-body text-sm text-ink">No limit{history.length > 0 ? ` · redeemed ${history.length} time${history.length === 1 ? "" : "s"}` : ""}</Text>
        ) : (
          <View className="flex-row items-center gap-2" accessibilityLabel={`${left} of ${reward.limit} left`}>
            {Array.from({ length: reward.limit! }, (_, i) => (
              <View key={i} className={`h-4 w-4 border-[1.5px] border-outline ${i < left ? "bg-success" : "bg-ink/20"}`} />
            ))}
            <Text className="ml-1 font-body text-sm text-ink">{left > 0 ? `${left} of ${reward.limit} left` : "All redeemed"}</Text>
          </View>
        )}

        {left > 0 && !lockedUntil && waitMs > 0 && (
          <Text className="font-body text-sm text-ink">Available again in {formatWait(waitMs)}.</Text>
        )}
        {left > 0 && !lockedUntil && waitMs === 0 && <PixelButton tone="success" disabled={!affordable} onPress={() => setConfirming(true)} label="Redeem" />}
        {left > 0 && !lockedUntil && !affordable && <Text className="font-body text-xs text-ink opacity-70">You need {formatCount(reward.cost - healed)} more patients.</Text>}

        {history.length > 0 && (
          <View className="gap-2 border-t-[1.5px] border-dashed border-outline pt-3">
            {/* Unlimited rewards can pile up, so show the latest few. */}
            {history.slice(-3).map((at, k) => {
              const i = history.length - Math.min(3, history.length) + k;
              return (
                <View key={at} className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 font-body text-sm text-ink">
                    #{i + 1} · {new Date(at).toLocaleDateString()}
                  </Text>
                  <PixelButton label={`Tell ${section.notify}`} onPress={() => shareRedemption(section, reward, i, at)} />
                </View>
              );
            })}
          </View>
        )}
      </View>

      <ConfirmDialog
        visible={confirming}
        title={`Redeem ${reward.name.toLowerCase()}?`}
        body={`This spends ${formatCount(reward.cost)} patients.${unlimited ? "" : ` You can redeem it ${left - 1 === 0 ? "no more times" : `${left - 1} more time${left - 1 === 1 ? "" : "s"}`} after this.`}`}
        cancelLabel="Not yet"
        confirmLabel="Redeem"
        confirmTone="success"
        confirmDisabled={!!reward.input && !answer}
        onCancel={() => setConfirming(false)}
        onConfirm={redeem}
      >
        <RewardInput reward={reward} value={note} onChange={setNote} />
      </ConfirmDialog>
      <ConfirmDialog
        visible={fact !== null}
        title="Fun fact!"
        body={fact ?? ""}
        cancelLabel="Close"
        confirmLabel="Share"
        confirmTone="success"
        onCancel={() => setFact(null)}
        onConfirm={() => {
          Share.share({ message: `Fun fact from Medkit Clicker: ${fact}` }).catch(() => {});
          setFact(null);
        }}
      />
    </HardShadow>
  );
}

export function RewardsPage({ sectionId }: { sectionId: string }) {
  const { healed } = useGameState();
  const { dispatch } = useGameActions();
  const section = REWARD_SECTIONS.find((s) => s.id === sectionId);

  // Pull the server's redemption history so a reinstall can't reset the limits.
  useEffect(() => {
    if (!cloudEnabled) return;
    let cancelled = false;
    getToken()
      .then((token) => (token ? fetchRewards(token) : []))
      .then((rewards) => {
        if (!cancelled && rewards.length) dispatch({ type: "syncRedemptions", history: Object.fromEntries(rewards.map((r) => [r.id, r.redeemed])) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dispatch]);
  if (!section) return null;

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between border-2 border-outline bg-accent px-3 py-2">
        <Text className="font-body text-sm text-ink">Your patients</Text>
        <Text className="font-number text-lg text-ink">{formatCount(healed)}</Text>
      </View>
      <Text className="font-body text-sm leading-5 text-ink">
        Spend patients on real rewards. {section.notify} gets told when you redeem one.
      </Text>
      {section.rewards.map((r) => (
        <RewardCard key={r.id} section={section} reward={r} />
      ))}
    </View>
  );
}
