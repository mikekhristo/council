export type ProviderId = 'anthropic' | 'openai' | 'google' | 'xai' | (string & {});

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  short: string;
  house: string;
  seat: 1 | 2 | 3 | 4;
  modelId: string;
  enabled: boolean;
  maxTokens?: number;
  temperature?: number;
  iconUrl: string;
}

export interface FileAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  extractedText?: string;
  createdAt: Date;
}

export interface Session {
  id: string;
  topic: string;
  systemPrompt?: string;
  providers: ProviderId[];
  providerConfigs: Record<ProviderId, ProviderConfig>;
  maxRounds: number;
  enableConsensusDetection: boolean;
  consensusThreshold?: number;
  arbiterId?: ProviderId; // Which model runs synthesis. If undefined, randomly chosen.
  attachments: FileAttachment[];
  status: SessionStatus;
  rounds: Round[];
  synthesis?: SynthesisResult;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionStatus =
  | 'configuring'
  | 'deliberating'
  | 'synthesizing'
  | 'completed'
  | 'error';

export interface Round {
  id: string;
  sessionId: string;
  roundNumber: number;
  responses: Response[];
  consensusReached: boolean;
  consensusScore?: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface Response {
  id: string;
  roundId: string;
  providerId: ProviderId;
  modelId: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status: 'pending' | 'streaming' | 'completed' | 'error';
  error?: string;
  createdAt: Date;
}

export interface SynthesisResult {
  id: string;
  sessionId: string;
  synthesizerId: ProviderId;
  summary: string;
  consensusPoints: SynthesisPoint[];
  dissentPoints: SynthesisPoint[];
  keyInsights: string[];
  metadata: {
    totalRounds: number;
    participatingProviders: ProviderId[];
    totalTokensUsed: number;
    totalLatencyMs: number;
  };
  createdAt: Date;
}

export interface SynthesisPoint {
  point: string;
  supportedBy: ProviderId[];
  opposedBy?: ProviderId[];
  evidence: string;
}

export interface CreateSessionInput {
  topic: string;
  systemPrompt?: string;
  providers: ProviderId[];
  maxRounds: number;
  enableConsensusDetection: boolean;
  consensusThreshold?: number;
  arbiterId?: ProviderId; // Which model runs synthesis. If undefined, randomly chosen.
}

export interface DeliberationEvent {
  type: 'round-start' | 'response-chunk' | 'response-complete' | 'round-complete' | 'synthesis-start' | 'synthesis-chunk' | 'synthesis-complete' | 'deliberation-complete' | 'error';
  data: unknown;
}
