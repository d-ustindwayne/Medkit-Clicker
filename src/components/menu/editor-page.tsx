import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

import { SettingsGroup } from "@/components/ui/controls";
import { PixelButton } from "@/components/ui/pixel-button";
import { usePalette } from "@/hooks/use-palette";
import { API_URL } from "@/lib/cloud";
import type { GameEvent } from "@/lib/event-store";
import { GOOGLE_CLIENT_ID, renderGoogleButton, savedToken, signOut } from "@/lib/google-signin";
import type { PromoItem } from "@/lib/game";
import { formatRewards, parseRewards } from "@/lib/rewards-text";

// The editor (web version, behind the dev code): timed events and promo codes, saved in the
// database. Signing in with Google proves it's the owner; the server only lets ADMIN_EMAIL in.

type Promo = { hash: string; label: string | null; maxClaims: number | null; claims: number; message: string | null; expiresAt: string | null; rewards: PromoItem[] };

/** "2026-11-01 18:00" (local time) to ms, or NaN. */
const readDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/.exec(s.trim());
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : NaN;
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
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [tapMult, setTapMult] = useState("");
  const [rateMult, setRateMult] = useState("");
  const [gift, setGift] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const saveEvent = async () => {
    const s = readDate(starts), e = readDate(ends);
    const parsed = parseRewards(gift);
    if (!title.trim()) return setError("Give the event a title.");
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return setError("Start and end as YYYY-MM-DD HH:MM, the end after the start.");
    if ("error" in parsed) return setError(parsed.error);
    try {
      await call("/admin/events", { method: "POST", body: JSON.stringify({ title, description, startsAt: s, endsAt: e, tapMult: Number(tapMult) || null, rateMult: Number(rateMult) || null, rewards: parsed.rewards, icon }) });
      setTitle("");
      setDescription("");
      setGift("");
      setIcon(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  };

  // New code
  const [code, setCode] = useState("");
  const [codeRewards, setCodeRewards] = useState("");
  const [maxClaims, setMaxClaims] = useState("");
  const [codeEnds, setCodeEnds] = useState("");
  const [message, setMessage] = useState("");
  const saveCode = async () => {
    const parsed = parseRewards(codeRewards);
    if ("error" in parsed) return setError(parsed.error);
    if (parsed.rewards.length === 0) return setError("Add at least one reward, e.g. coins:20.");
    const until = codeEnds.trim() ? readDate(codeEnds) : null;
    if (until !== null && Number.isNaN(until)) return setError("Ends as YYYY-MM-DD HH:MM, or leave it empty.");
    try {
      await call("/admin/promos", { method: "POST", body: JSON.stringify({ code, rewards: parsed.rewards, maxClaims: Number(maxClaims) || null, expiresAt: until, message }) });
      setCode("");
      setCodeRewards("");
      setMaxClaims("");
      setCodeEnds("");
      setMessage("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  };

  if (Platform.OS !== "web") return <Text className="font-body text-base text-ink">The editor is on the web version of the game.</Text>;
  if (!API_URL || !GOOGLE_CLIENT_ID) return <Text className="font-body text-base text-ink">The editor needs EXPO_PUBLIC_API_URL and EXPO_PUBLIC_GOOGLE_CLIENT_ID set when the web game is built.</Text>;
  if (!token) {
    return (
      <View className="gap-3">
        <Text className="font-body text-base text-ink">Sign in with the editor&apos;s Google account to set up events and codes.</Text>
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
        <Field label="Starts (your time)" value={starts} onChange={setStarts} placeholder="2026-11-01 18:00" />
        <Field label="Ends" value={ends} onChange={setEnds} placeholder="2026-11-03 23:59" />
        <Field label="Per tap × (empty for none)" value={tapMult} onChange={setTapMult} placeholder="2" />
        <Field label="Per second × (empty for none)" value={rateMult} onChange={setRateMult} placeholder="2" />
        <Field label="Gift, once per player (optional)" value={gift} onChange={setGift} placeholder="coins:20, gems:1, seconds:600" />
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
                {e.rewards.length ? ` · gift ${formatRewards(e.rewards)}` : ""}
              </Text>
            </View>
            <PixelButton label="Delete" tone="danger" onPress={() => call(`/admin/events/${e.id}`, { method: "DELETE" }).then(refresh, (x) => setError(x.message))} />
          </View>
        ))}
      </SettingsGroup>
      <SettingsGroup title="NEW CODE" icon="gift">
        <Field label="Code" value={code} onChange={setCode} placeholder="HAPPY2026" />
        <Field label="Rewards" value={codeRewards} onChange={setCodeRewards} placeholder="coins:20, background:purple_rain" />
        <Field label="How many players can use it (empty: no limit)" value={maxClaims} onChange={setMaxClaims} placeholder="10" />
        <Field label="Ends (empty: never)" value={codeEnds} onChange={setCodeEnds} placeholder="2026-12-31 23:59" />
        <Field label="Message shown when used (optional)" value={message} onChange={setMessage} placeholder="Happy holidays!" />
        <PixelButton label="Save code" tone="success" onPress={saveCode} />
      </SettingsGroup>
      <SettingsGroup title="CODES" icon="lock">
        {promos.length === 0 && <Text className="font-body text-sm text-ink opacity-70">No codes yet.</Text>}
        {promos.map((p) => (
          <View key={p.hash} className="flex-row items-center gap-2 border-b border-outline/30 pb-2">
            <View className="flex-1">
              <Text className="font-display text-base text-ink">{p.label ?? `(made with add-promo) ${p.hash.slice(0, 8)}…`}</Text>
              <Text className="font-body text-xs text-ink opacity-70">
                {formatRewards(p.rewards)} · used {p.claims}
                {p.maxClaims ? `/${p.maxClaims}` : ""}
                {p.expiresAt ? ` · ends ${showDate(p.expiresAt)}` : ""}
              </Text>
            </View>
            <PixelButton label="Delete" tone="danger" onPress={() => call(`/admin/promos/${p.hash}`, { method: "DELETE" }).then(refresh, (x) => setError(x.message))} />
          </View>
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
