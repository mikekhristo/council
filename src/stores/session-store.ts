import { create } from 'zustand';
import type { Session, Response, SynthesisResult, ProviderId } from '@/lib/types';

interface SessionStore {
  session: Session | null;
  currentRound: number;
  streamingResponses: Record<string, string>;
  completedResponses: Record<string, Record<number, Response>>;
  isDeliberating: boolean;
  isSynthesizing: boolean;
  synthesis: SynthesisResult | null;
  synthesisStreamText: string;
  error: string | null;

  setSession: (session: Session) => void;
  startDeliberation: () => void;
  setCurrentRound: (round: number) => void;
  appendChunk: (providerId: string, chunk: string) => void;
  completeResponse: (providerId: string, roundNumber: number, response: Response) => void;
  completeRound: () => void;
  startSynthesis: () => void;
  appendSynthesisChunk: (chunk: string) => void;
  setSynthesis: (synthesis: SynthesisResult) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  currentRound: 1,
  streamingResponses: {},
  completedResponses: {},
  isDeliberating: false,
  isSynthesizing: false,
  synthesis: null,
  synthesisStreamText: '',
  error: null,

  setSession: (session) => set({ session }),

  startDeliberation: () =>
    set({
      isDeliberating: true,
      streamingResponses: {},
      completedResponses: {},
      currentRound: 1,
      synthesis: null,
      synthesisStreamText: '',
      error: null,
    }),

  setCurrentRound: (round) => set({ currentRound: round, streamingResponses: {} }),

  appendChunk: (providerId, chunk) =>
    set((state) => ({
      streamingResponses: {
        ...state.streamingResponses,
        [providerId]: (state.streamingResponses[providerId] ?? '') + chunk,
      },
    })),

  completeResponse: (providerId, roundNumber, response) =>
    set((state) => ({
      completedResponses: {
        ...state.completedResponses,
        [providerId]: {
          ...(state.completedResponses[providerId] ?? {}),
          [roundNumber]: response,
        },
      },
      streamingResponses: {
        ...state.streamingResponses,
        [providerId]: '',
      },
    })),

  completeRound: () => set({ streamingResponses: {} }),

  startSynthesis: () =>
    set({
      isSynthesizing: true,
      isDeliberating: false,
      synthesisStreamText: '',
    }),

  appendSynthesisChunk: (chunk) =>
    set((state) => ({
      synthesisStreamText: state.synthesisStreamText + chunk,
    })),

  setSynthesis: (synthesis) =>
    set({
      synthesis,
      isSynthesizing: false,
      isDeliberating: false,
    }),

  setError: (error) =>
    set({
      error,
      isDeliberating: false,
      isSynthesizing: false,
    }),

  reset: () =>
    set({
      session: null,
      currentRound: 1,
      streamingResponses: {},
      completedResponses: {},
      isDeliberating: false,
      isSynthesizing: false,
      synthesis: null,
      synthesisStreamText: '',
      error: null,
    }),
}));
