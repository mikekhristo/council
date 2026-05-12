import { z } from 'zod';

export const createSessionSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500000),
  systemPrompt: z.string().max(10000).optional(),
  providers: z.array(z.string()).min(1, 'At least one provider is required'),
  // Upper bound is a guard against typos / paste accidents, not a
  // hard limit on serious use. Each round multiplies token cost, so
  // 50 is generous and still bounded.
  maxRounds: z.number().int().min(1).max(50).default(3),
  enableConsensusDetection: z.boolean().default(false),
  consensusThreshold: z.number().min(0).max(1).optional(),
  arbiterId: z.string().optional(),
});

export type CreateSessionSchemaInput = z.infer<typeof createSessionSchema>;
