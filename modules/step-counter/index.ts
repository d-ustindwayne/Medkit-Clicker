// Android's step counter, for the walking rewards. Missing on iOS and the web (null there).
import { requireOptionalNativeModule } from "expo-modules-core";

/** Steps since the phone was switched on, and when that was (ms since epoch). */
export type StepReading = { steps: number; bootTime: number };

type StepCounterModule = {
  isAvailable(): boolean;
  read(): Promise<StepReading | null>;
};

export const StepCounter = requireOptionalNativeModule<StepCounterModule>("StepCounter");
