import { z } from 'zod';

export const createSessionSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500000),
  systemPrompt: z.string().max(10000).optional(),
  providers: z.array(z.string()).min(1, 'At least one provider is required'),
  maxRounds: z.number().int().min(1).max(10).default(3),
  enableConsensusDetection: z.boolean().default(false),
  consensusThreshold: z.number().min(0).max(1).optional(),
  arbiterId: z.string().optional(),
});

export type CreateSessionSchemaInput = z.infer<typeof createSessionSchema>;
