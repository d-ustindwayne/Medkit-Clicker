import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from "expo-audio";
import { Platform } from "react-native";

import { PLAYLISTS, SFX, type SfxName } from "@/constants/playlists";
import { useGameActions, useSettings } from "@/hooks/use-game";
import { VOLUME_STEPS } from "@/lib/storage";

type AudioControls = {
  playSfx: (name: SfxName) => void;
  /** Browsers block audio until the first interaction; call this from a press handler. */
  unlock: () => void;
};

export type MusicState = {
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

  // Music: one player that walks through the selected playlist. The track index resets when the
  // playlist changes because it is stored alongside the playlist it belongs to.
  const playlist = PLAYLISTS[settings.playlist % PLAYLISTS.length];
  const trackCount = playlist.tracks.length;
  const [track, setTrack] = useState({ playlist: playlist.id, index: 0 });
  const trackIndex = (((track.playlist === playlist.id ? track.index : 0) % trackCount) + trackCount) % trackCount;
  const music = useAudioPlayer(playlist.tracks[0]);
  const status = useAudioPlayerStatus(music);
  const musicOn = unlocked && settings.musicVolume > 0 && !paused;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
  }, []);

  useEffect(() => {
    const sub = music.addListener("playbackStatusUpdate", (s) => {
      if (s.didJustFinish) setTrack({ playlist: playlist.id, index: trackIndex + 1 });
    });
    return () => sub.remove();
  }, [music, playlist.id, trackIndex]);

  useEffect(() => {
    music.replace(playlist.tracks[trackIndex]);
    // replace() keeps the paused/playing state, so restart explicitly.
    if (musicOn) music.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to track changes
  }, [music, playlist, trackIndex]);

  useEffect(() => {
    setVolume(music, settings.musicVolume / VOLUME_STEPS);
    if (musicOn) {
      music.play();
      dispatch({ type: "heardPlaylist", id: playlist.id });
    } else {
      music.pause();
    }
  }, [music, musicOn, settings.musicVolume, playlist.id, dispatch]);

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

  const musicState = useMemo<MusicState>(
    () => ({
      playlistName: playlist.name,
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
      next: () => setTrack({ playlist: playlist.id, index: trackIndex + 1 }),
      // Like most players: restart the song if it's past the first few seconds, else go back one.
      previous: () => {
        if (status.currentTime > 3) music.seekTo(0).catch(() => {});
        else setTrack({ playlist: playlist.id, index: trackIndex - 1 });
      },
      seek: (seconds) => {
        music.seekTo(seconds).catch(() => {});
      },
    }),
    [playlist, trackIndex, trackCount, musicOn, paused, status.currentTime, status.duration, music],
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
