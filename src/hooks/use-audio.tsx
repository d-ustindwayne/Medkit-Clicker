import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from "expo-audio";
import { Platform } from "react-native";

import { BUNDLED_PLAYLISTS, SFX, SOUNDTRACK, type Playlist, type SfxName } from "@/constants/playlists";
import { useGameActions, useSettings } from "@/hooks/use-game";
import { cloudEnabled, downloadMusic, getToken, loadCachedPlaylists, wakeServer, type CachedPlaylist } from "@/lib/cloud";
import { VOLUME_STEPS } from "@/lib/storage";

type AudioControls = {
  playSfx: (name: SfxName) => void;
  /** Browsers block audio until the first interaction; call this from a press handler. */
  unlock: () => void;
};

export type MusicState = {
  /** Playlists that can play on this phone (downloaded, or bundled for testing). Empty = no music. */
  library: { id: string; name: string }[];
  /** True when a code token is saved and the server is configured, so songs can download. */
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

  // The music library: the game's soundtrack, songs downloaded after a code unlock, and any bundled for testing.
  const [cached, setCached] = useState<CachedPlaylist[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [download, setDownload] = useState<{ done: number; total: number } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  useEffect(() => {
    loadCachedPlaylists().then(setCached);
    getToken().then((saved) => {
      setToken(saved);
      // Code holders use the server (rewards, new songs): wake it early.
      if (saved) wakeServer();
    });
  }, []);
  const library: Playlist[] = useMemo(() => {
    const downloaded = cached.map((p) => ({ id: p.id, name: p.name, tracks: p.tracks.map((uri) => ({ uri })) }));
    return [SOUNDTRACK, ...downloaded, ...BUNDLED_PLAYLISTS.filter((b) => !cached.some((c) => c.id === b.id))];
  }, [cached]);

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
      const player = { click, medkit, buy, invalid }[name];
      setVolume(player, sfxVolume);
      player.seekTo(0).catch(() => {});
      player.play();
    },
    [click, medkit, buy, invalid, sfxVolume],
  );

  const unlock = useCallback(() => setUnlocked(true), []);
  const controls = useMemo(() => ({ playSfx, unlock }), [playSfx, unlock]);

  const fetchMusic = useCallback(async () => {
    const saved = await getToken();
    setToken(saved);
    if (!saved || !cloudEnabled) return;
    setDownloadError(null);
    try {
      setCached(await downloadMusic(saved, (done, total) => setDownload({ done, total })));
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download failed. Check the connection and try again.");
    } finally {
      setDownload(null);
    }
  }, []);

  const musicState = useMemo<MusicState>(
    () => ({
      library: library.map(({ id, name }) => ({ id, name })),
      canDownload: cloudEnabled && !!token,
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
    [library, token, download, downloadError, fetchMusic, playlist, trackIndex, trackCount, musicOn, paused, status.currentTime, status.duration, music],
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
