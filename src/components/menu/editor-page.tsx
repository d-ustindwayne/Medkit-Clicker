import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

import { RewardsPicker, newRow, rowsToRewards, type RewardRow } from "@/components/menu/rewards-picker";
import { SettingsGroup } from "@/components/ui/controls";
import { PixelButton } from "@/components/ui/pixel-button";
import { usePalette } from "@/hooks/use-palette";
import { API_URL } from "@/lib/cloud";
import type { GameEvent } from "@/lib/event-store";
import { GOOGLE_CLIENT_ID, renderGoogleButton, savedToken, signOut } from "@/lib/google-signin";
import type { PromoItem } from "@/lib/game";
import { describeRewards } from "@/lib/rewards-text";

// The Console (web version, behind the dev code): timed events and promo codes, saved in the
// database. Signing in with Google proves it's the owner; the server only lets ADMIN_EMAIL in.

type Promo = { hash: string; label: string | null; maxClaims: number | null; claims: number; message: string | null; expiresAt: string | null; rewards: PromoItem[] };

/** A date ("2026-11-01") and time ("18:00"), local time, as the pickers give them. */
type When = { date: string; time: string };
const NO_WHEN: When = { date: "", time: "" };
/** A picked date and time to ms, or NaN. No time picked means `fallback`. */
const readDate = ({ date, time }: When, fallback = "00:00") => {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{1,2}):(\d{2})/.exec(time || fallback);
  return d && t ? new Date(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]).getTime() : NaN;
};
const showDate = (t: number | string) => new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Shrinks a picked or dropped picture to a 64x64 PNG data URL (kept crisp: no smoothing). */
async function iconFrom(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const k = Math.min(64 / bitmap.width, 64 / bitmap.height);
  const w = bitmap.width * k, h = bitmap.height * k;
  ctx.drawImage(bitmap, (64 - w) / 2, (64 - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const palette = usePalette();
  return (
    <View className="gap-1">
      <Text className="font-body text-sm text-ink">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={`${palette.ink}80`}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        className="min-h-11 border-2 border-outline bg-surface px-3 py-2 font-body text-base text-ink"
      />
    </View>
  );
}

/** The browser's own date and time pickers, side by side (this page is web only). */
function WhenField({ label, value, onChange }: { label: string; value: When; onChange: (v: When) => void }) {
  const box = "min-h-11 flex-1 border-2 border-outline bg-surface px-3 py-2 font-body text-base text-ink";
  return (
    <View className="gap-1">
      <Text className="font-body text-sm text-ink">{label}</Text>
      <View className="flex-row gap-2">
        <input type="date" aria-label={`${label}: date`} value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} className={box} />
        <input type="time" aria-label={`${label}: time`} value={value.time} onChange={(e) => onChange({ ...value, time: e.target.value })} className={box} />
      </View>
    </View>
  );
}

/** A box you can drop a picture on (or click to choose one); web only. */
function IconDrop({ icon, onIcon }: { icon: string | null; onIcon: (url: string | null) => void }) {
  const ref = useRef<View>(null);
  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const over = (e: DragEvent) => e.preventDefault();
    const drop = async (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file?.type.startsWith("image/")) onIcon(await iconFrom(file));
    };
    el.addEventListener("dragover", over);
    el.addEventListener("drop", drop);
    return () => {
      el.removeEventListener("dragover", over);
      el.removeEventListener("drop", drop);
    };
  }, [onIcon]);
  const choose = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => input.files?.[0] && onIcon(await iconFrom(input.files[0]));
    input.click();
  };
  return (
    <Pressable ref={ref} accessibilityRole="button" accessibilityLabel="Event icon: drop a picture here or click to choose" onPress={choose} className="h-20 flex-row items-center gap-3 border-2 border-dashed border-outline px-3">
      {icon ? <Image source={{ uri: icon }} style={{ width: 48, height: 48 }} contentFit="contain" /> : null}
      <Text className="flex-1 font-body text-sm text-ink">{icon ? "Drop another picture to change it." : "Drop the event's icon here, or click to choose one."}</Text>
      {icon && <PixelButton label="Clear" onPress={() => onIcon(null)} />}
    </Pressable>
  );
}

/** One code in the list: its name (click Rename to change it), rewards and use, and Delete. */
function CodeRow({ promo: p, onRename, onDelete }: { promo: Promo; onRename: (name: string) => Promise<void>; onDelete: () => void }) {
  const [name, setName] = useState<string | null>(null);
  return (
    <View className="gap-2 border-b border-outline/30 pb-2">
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Text className="font-display text-base text-ink">{p.label ?? `No name yet (${p.hash.slice(0, 8)}…)`}</Text>
          <Text className="font-body text-xs text-ink opacity-70">
            {describeRewards(p.rewards)} · used {p.claims}
            {p.maxClaims ? `/${p.maxClaims}` : ""}
            {p.expiresAt ? ` · ends ${showDate(p.expiresAt)}` : ""}
          </Text>
        </View>
        {name === null && <PixelButton label="Rename" onPress={() => setName(p.label ?? "")} />}
        <PixelButton label="Delete" tone="danger" onPress={onDelete} />
      </View>
      {name !== null && (
        <View className="flex-row items-end gap-2">
          <View className="flex-1">
            <Field label="Name (only you see it)" value={name} onChange={setName} placeholder="Christmas giveaway" />
          </View>
          <PixelButton label="Save" tone="success" onPress={() => onRename(name).then(() => setName(null))} />
          <PixelButton label="Cancel" onPress={() => setName(null)} />
        </View>
      )}
    </View>
  );
}

export function EditorPage() {
  const [token, setToken] = useState<string | null>(() => savedToken());
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const buttonRef = useRef<View>(null);

  const call = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const res = await fetch(`${API_URL}${path}`, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(body.error ?? `Server error ${res.status}`), { status: res.status });
      return body as T;
    },
    [token],
  );
  // Bumped after a save or delete, to load the lists again.
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  useEffect(() => {
    if (!token) return;
    let off = false;
    Promise.all([call<GameEvent[]>("/admin/events"), call<Promo[]>("/admin/promos")]).then(
      ([e, p]) => {
        if (off) return;
        setEvents(e);
        setPromos(p);
        setError(null);
      },
      (e: Error & { status?: number }) => {
        if (off) return;
        // Not signed in (or the hour-long sign-in ran out): back to the button.
        if (e.status === 401) {
          signOut();
          setToken(null);
        }
        setError(e.message || "Couldn't reach the server.");
      },
    );
    return () => {
      off = true;
    };
  }, [token, call, version]);
  useEffect(() => {
    if (token || Platform.OS !== "web" || !GOOGLE_CLIENT_ID) return;
    const el = buttonRef.current as unknown as HTMLElement | null;
    if (el) renderGoogleButton(el, setToken).catch((e) => setError(e.message));
  }, [token]);

  // New event
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starts, setStarts] = useState<When>(NO_WHEN);
  const [ends, setEnds] = useState<When>(NO_WHEN);
  const [tapMult, setTapMult] = useState("");
  const [rateMult, setRateMult] = useState("");
  const [gift, setGift] = useState<RewardRow[]>([]);
  const [icon, setIcon] = useState<string | null>(null);
  const saveEvent = async () => {
    const s = readDate(starts), e = readDate(ends, "23:59");
    const parsed = rowsToRewards(gift);
    if (!title.trim()) return setError("Give the event a title.");
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return setError("Pick a start and an end date, the end after the start.");
    if ("error" in parsed) return setError(parsed.error);
    try {
      await call("/admin/events", { method: "POST", body: JSON.stringify({ title, description, startsAt: s, endsAt: e, tapMult: Number(tapMult) || null, rateMult: Number(rateMult) || null, rewards: parsed.rewards, icon }) });
      setTitle("");
      setDescription("");
      setGift([]);
      setIcon(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  };

  // New code
  const [code, setCode] = useState("");
  const [codeName, setCodeName] = useState("");
  const [codeRewards, setCodeRewards] = useState<RewardRow[]>(() => [newRow()]);
  const [maxClaims, setMaxClaims] = useState("");
  const [codeEnds, setCodeEnds] = useState<When>(NO_WHEN);
  const [message, setMessage] = useState("");
  const saveCode = async () => {
    const parsed = rowsToRewards(codeRewards);
    if ("error" in parsed) return setError(parsed.error);
    if (parsed.rewards.length === 0) return setError("Add at least one reward.");
    const until = codeEnds.date ? readDate(codeEnds, "23:59") : null;
    if (until !== null && Number.isNaN(until)) return setError("Pick an end date, or leave it empty.");
    try {
      await call("/admin/promos", { method: "POST", body: JSON.stringify({ code, name: codeName, rewards: parsed.rewards, maxClaims: Number(maxClaims) || null, expiresAt: until, message }) });
      setCode("");
      setCodeName("");
      setCodeRewards([newRow()]);
      setMaxClaims("");
      setCodeEnds(NO_WHEN);
      setMessage("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  };

  if (Platform.OS !== "web") return <Text className="font-body text-base text-ink">The Console is on the web version of the game.</Text>;
  if (!API_URL || !GOOGLE_CLIENT_ID) return <Text className="font-body text-base text-ink">The Console needs EXPO_PUBLIC_API_URL and EXPO_PUBLIC_GOOGLE_CLIENT_ID set when the web game is built.</Text>;
  if (!token) {
    return (
      <View className="gap-3">
        <Text className="font-body text-base text-ink">Sign in with the Console&apos;s Google account to set up events and codes.</Text>
        <View ref={buttonRef} />
        {error && <Text className="font-body text-sm text-danger">{error}</Text>}
      </View>
    );
  }
  return (
    <View className="gap-4">
      {error && <Text className="font-body text-sm text-danger">{error}</Text>}
      <SettingsGroup title="NEW EVENT" icon="gift">
        <Field label="Title" value={title} onChange={setTitle} placeholder="Double Medkit Weekend" />
        <Field label="Description (optional)" value={description} onChange={setDescription} multiline />
        <WhenField label="Starts (your time)" value={starts} onChange={setStarts} />
        <WhenField label="Ends (no time: 23:59)" value={ends} onChange={setEnds} />
        <Field label="Per tap × (empty for none)" value={tapMult} onChange={setTapMult} placeholder="2" />
        <Field label="Per second × (empty for none)" value={rateMult} onChange={setRateMult} placeholder="2" />
        <RewardsPicker label="Gift, once per player (optional)" rows={gift} onChange={setGift} />
        <IconDrop icon={icon} onIcon={setIcon} />
        <PixelButton label="Save event" tone="success" onPress={saveEvent} />
      </SettingsGroup>
      <SettingsGroup title="EVENTS" icon="note">
        {events.length === 0 && <Text className="font-body text-sm text-ink opacity-70">No events yet.</Text>}
        {events.map((e) => (
          <View key={e.id} className="flex-row items-center gap-2 border-b border-outline/30 pb-2">
            {e.icon && <Image source={{ uri: e.icon }} style={{ width: 28, height: 28 }} contentFit="contain" />}
            <View className="flex-1">
              <Text className="font-display text-base text-ink">{e.title}</Text>
              <Text className="font-body text-xs text-ink opacity-70">
                {showDate(e.startsAt)} – {showDate(e.endsAt)}
                {e.tapMult ? ` · x${e.tapMult} tap` : ""}
                {e.rateMult ? ` · x${e.rateMult}/s` : ""}
                {e.rewards.length ? ` · gift ${describeRewards(e.rewards)}` : ""}
              </Text>
            </View>
            <PixelButton label="Delete" tone="danger" onPress={() => call(`/admin/events/${e.id}`, { method: "DELETE" }).then(refresh, (x) => setError(x.message))} />
          </View>
        ))}
      </SettingsGroup>
      <SettingsGroup title="NEW CODE" icon="gift">
        <Field label="Code" value={code} onChange={setCode} placeholder="HAPPY2026" />
        <Field label="Name, only you see it (empty: the code)" value={codeName} onChange={setCodeName} placeholder="Christmas giveaway" />
        <RewardsPicker label="Rewards" rows={codeRewards} onChange={setCodeRewards} />
        <Field label="How many players can use it (empty: no limit)" value={maxClaims} onChange={setMaxClaims} placeholder="10" />
        <WhenField label="Ends (no date: never; no time: 23:59)" value={codeEnds} onChange={setCodeEnds} />
        {codeEnds.date !== "" && <PixelButton label="Never ends" onPress={() => setCodeEnds(NO_WHEN)} />}
        <Field label="Message shown when used (optional)" value={message} onChange={setMessage} placeholder="Happy holidays!" />
        <PixelButton label="Save code" tone="success" onPress={saveCode} />
      </SettingsGroup>
      <SettingsGroup title="CODES" icon="lock">
        {promos.length === 0 && <Text className="font-body text-sm text-ink opacity-70">No codes yet.</Text>}
        {promos.map((p) => (
          <CodeRow
            key={p.hash}
            promo={p}
            onRename={(name) => call(`/admin/promos/${p.hash}`, { method: "PATCH", body: JSON.stringify({ name }) }).then(refresh, (x) => setError(x.message))}
            onDelete={() => call(`/admin/promos/${p.hash}`, { method: "DELETE" }).then(refresh, (x) => setError(x.message))}
          />
        ))}
      </SettingsGroup>
      <PixelButton
        label="Sign out"
        onPress={() => {
          signOut();
          setToken(null);
        }}
      />
    </View>
  );
}
