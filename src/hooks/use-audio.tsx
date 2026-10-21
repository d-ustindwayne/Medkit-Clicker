import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from "expo-audio";
import { AppState, Platform } from "react-native";

import { SFX, SOUNDTRACK, type Playlist, type SfxName } from "@/constants/playlists";
import { sectionOpen } from "@/constants/rewards";
import { useGameActions, useSettings } from "@/hooks/use-game";
import { useNow } from "@/hooks/use-now";
import { OFFLINE_MESSAGE, cloudEnabled, downloadMusic, ensureToken, hasPendingCode, isOffline, loadCachedPlaylists, wakeServer, type CachedPlaylist } from "@/lib/cloud";
import { VOLUME_STEPS } from "@/lib/storage";

type AudioControls = {
  playSfx: (name: SfxName) => void;
  /** Browsers block audio until the first interaction; call this from a press handler. */
  unlock: () => void;
};

export type MusicState = {
  /** Playlists that can play on this phone (downloaded, or bundled for testing). Empty = no music. */
  library: { id: string; name: string }[];
  /** True when the code was entered (online or not) and the server is configured, so songs can download. */
  canDownload: boolean;
  /** Songs downloaded so far, while a download runs. */
  download: { done: number; total: number } | null;
  downloadError: string | null;
  /** Downloads (or updates) the code-locked music. Call after a code unlock. */
  fetchMusic: () => Promise<void>;
  playlistName: string;
  trackIndex: number;
  trackCount: number;
  /** True while music is audible (not paused, not muted, audio unlocked). */
  playing: boolean;
  paused: boolean;
  /** Seconds. */
  currentTime: number;
  duration: number;
  togglePause: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
};

const AudioContext = createContext<AudioControls>({ playSfx: () => {}, unlock: () => {} });
// Separate context: it updates a couple of times a second while music plays, and only the
// music player UI should re-render for that.
const MusicContext = createContext<MusicState | null>(null);

// Players are native objects; setting volume through a helper keeps the React Compiler from
// treating it as a mutation of hook state.
const setVolume = (player: AudioPlayer, volume: number) => {
  player.volume = volume;
};

export function AudioProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const { dispatch } = useGameActions();
  const [unlocked, setUnlocked] = useState(Platform.OS !== "web");
  const [paused, setPaused] = useState(false);

  const click = useAudioPlayer(SFX.click);
  const medkit = useAudioPlayer(SFX.medkit);
  const buy = useAudioPlayer(SFX.buy);
  const invalid = useAudioPlayer(SFX.invalid);
  const tapHearts = useAudioPlayer(SFX.tap_hearts);
  const tapSparkles = useAudioPlayer(SFX.tap_sparkles);
  const tapBubbles = useAudioPlayer(SFX.tap_bubbles);

  // The music library: the game's soundtrack, then the playlists downloaded after Jasmine's code.
  const [cached, setCached] = useState<CachedPlaylist[]>([]);
  const [token, setToken] = useState<string | null>(null);
  /** The code was entered offline and still waits for the server. */
  const [pending, setPending] = useState(false);
  const [download, setDownload] = useState<{ done: number; total: number } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  useEffect(() => {
    loadCachedPlaylists().then(setCached);
    // Fetches the token now if the code was entered offline; tried again whenever the app comes back.
    const check = () =>
      ensureToken().then(async (saved) => {
        setToken(saved);
        setPending(!saved && (await hasPendingCode()));
        // Code holders use the server (rewards, new songs): wake it early.
        if (saved) wakeServer();
      });
    check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });
    return () => sub.remove();
  }, []);
  // A token is "<section>.<signature>": its music goes when that section ends.
  const now = useNow(60_000);
  const musicOpen = !token || sectionOpen(token.split(".")[0], now);
  const library: Playlist[] = useMemo(() => {
    const downloaded = musicOpen ? cached.map((p) => ({ id: p.id, name: p.name, tracks: p.tracks.map((uri) => ({ uri })) })) : [];
    return [SOUNDTRACK, ...downloaded];
  }, [cached, musicOpen]);

  // Music: one player that walks through the selected playlist. The track index resets when the
  // playlist changes because it is stored alongside the playlist it belongs to.
  const playlist = library.length > 0 ? library[settings.playlist % library.length] : null;
  const trackCount = playlist?.tracks.length ?? 0;
  const [track, setTrack] = useState({ playlist: playlist?.id ?? "", index: 0 });
  const trackIndex = trackCount === 0 ? 0 : ((((track.playlist === playlist?.id ? track.index : 0) % trackCount) + trackCount) % trackCount);
  const music = useAudioPlayer(playlist?.tracks[0] ?? null);
  const status = useAudioPlayerStatus(music);
  const musicOn = unlocked && settings.musicVolume > 0 && !paused && !!playlist;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
  }, []);

  useEffect(() => {
    const sub = music.addListener("playbackStatusUpdate", (s) => {
      if (s.didJustFinish && playlist) setTrack({ playlist: playlist.id, index: trackIndex + 1 });
    });
    return () => sub.remove();
  }, [music, playlist, trackIndex]);

  useEffect(() => {
    if (!playlist) return;
    music.replace(playlist.tracks[trackIndex]);
    // replace() keeps the paused/playing state, so restart explicitly.
    if (musicOn) music.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to track changes
  }, [music, playlist, trackIndex]);

  useEffect(() => {
    setVolume(music, settings.musicVolume / VOLUME_STEPS);
    if (musicOn && playlist) {
      music.play();
      dispatch({ type: "heardPlaylist", id: playlist.id });
    } else {
      music.pause();
    }
  }, [music, musicOn, settings.musicVolume, playlist, dispatch]);

  const sfxVolume = settings.sfxVolume / VOLUME_STEPS;
  const playSfx = useCallback(
    (name: SfxName) => {
      if (sfxVolume <= 0) return;
      const player = { click, medkit, buy, invalid, tap_hearts: tapHearts, tap_sparkles: tapSparkles, tap_bubbles: tapBubbles }[name];
      setVolume(player, sfxVolume);
      player.seekTo(0).catch(() => {});
      player.play();
    },
    [click, medkit, buy, invalid, tapHearts, tapSparkles, tapBubbles, sfxVolume],
  );

  const unlock = useCallback(() => setUnlocked(true), []);
  const controls = useMemo(() => ({ playSfx, unlock }), [playSfx, unlock]);

  const fetchMusic = useCallback(async () => {
    if (!cloudEnabled) return;
    setDownloadError(null);
    const saved = await ensureToken();
    setToken(saved);
    if (!saved) {
      const waiting = await hasPendingCode();
      setPending(waiting);
      if (waiting) setDownloadError(OFFLINE_MESSAGE);
      return;
    }
    setPending(false);
    try {
      setCached(await downloadMusic(saved, (done, total) => setDownload({ done, total })));
    } catch (e) {
      setDownloadError(isOffline(e) ? OFFLINE_MESSAGE : "The download stopped. Check the connection and tap the button again; songs already saved are kept.");
      loadCachedPlaylists().then(setCached);
    } finally {
      setDownload(null);
    }
  }, []);

  const musicState = useMemo<MusicState>(
    () => ({
      library: library.map(({ id, name }) => ({ id, name })),
      canDownload: cloudEnabled && musicOpen && (!!token || pending),
      download,
      downloadError,
      fetchMusic,
      playlistName: playlist?.name ?? "",
      trackIndex,
      trackCount,
      playing: musicOn,
      paused,
      currentTime: status.currentTime,
      duration: status.duration,
      togglePause: () => {
        setUnlocked(true);
        setPaused((p) => !p);
      },
      next: () => playlist && setTrack({ playlist: playlist.id, index: trackIndex + 1 }),
      // Like most players: restart the song if it's past the first few seconds, else go back one.
      previous: () => {
        if (status.currentTime > 3) music.seekTo(0).catch(() => {});
        else if (playlist) setTrack({ playlist: playlist.id, index: trackIndex - 1 });
      },
      seek: (seconds) => {
        music.seekTo(seconds).catch(() => {});
      },
    }),
    [library, token, pending, musicOpen, download, downloadError, fetchMusic, playlist, trackIndex, trackCount, musicOn, paused, status.currentTime, status.duration, music],
  );

  return (
    <AudioContext value={controls}>
      <MusicContext value={musicState}>{children}</MusicContext>
    </AudioContext>
  );
}

export const useAudio = () => use(AudioContext);

export function useMusic() {
  const music = use(MusicContext);
  if (!music) throw new Error("useMusic must be used inside AudioProvider");
  return music;
}
