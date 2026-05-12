import type {
  SynthesisResult,
  ProviderConfig,
  ProviderId,
} from '@/lib/types';
import { DEFAULT_PROVIDERS } from '@/lib/providers/config';

function providerLabel(id: ProviderId): string {
  return DEFAULT_PROVIDERS[id]?.short ?? id;
}

function providerList(ids: ProviderId[]): string {
  return ids.map(providerLabel).join(', ');
}

export function synthesisToMarkdown(
  synthesis: SynthesisResult,
  arbiter: ProviderConfig,
  topic?: string,
): string {
  const parts: string[] = [];

  parts.push('# Proceedings of the Council');
  parts.push('');

  if (topic) {
    parts.push(`> ${topic.trim().replace(/\n/g, '\n> ')}`);
    parts.push('');
  }

  parts.push(
    `*Drafted by ${arbiter.short}, arbiter · ${synthesis.metadata.totalRounds} round${synthesis.metadata.totalRounds === 1 ? '' : 's'} · ${synthesis.metadata.participatingProviders.length} member${synthesis.metadata.participatingProviders.length === 1 ? '' : 's'}*`,
  );
  parts.push('');

  // ── Summary ──────────────────────────────────────────────────────
  parts.push('## Summary');
  parts.push('');
  parts.push(synthesis.summary.trim());
  parts.push('');

  // ── Consensus ────────────────────────────────────────────────────
  if (synthesis.consensusPoints.length > 0) {
    parts.push(`## Consensus (${synthesis.consensusPoints.length})`);
    parts.push('');
    synthesis.consensusPoints.forEach((c, i) => {
      parts.push(`${i + 1}. **${c.point.trim()}**`);
      if (c.evidence) {
        parts.push(`   ${c.evidence.trim()}`);
      }
      if (c.supportedBy.length > 0) {
        parts.push(`   *Agreed by ${providerList(c.supportedBy)}.*`);
      }
      parts.push('');
    });
  }

  // ── Dissent ──────────────────────────────────────────────────────
  if (synthesis.dissentPoints.length > 0) {
    parts.push(`## Dissent (${synthesis.dissentPoints.length})`);
    parts.push('');
    synthesis.dissentPoints.forEach((d, i) => {
      parts.push(`${i + 1}. **${d.point.trim()}**`);
      if (d.evidence) {
        parts.push(`   ${d.evidence.trim()}`);
      }
      const sides: string[] = [];
      if (d.supportedBy.length > 0) {
        sides.push(`For: ${providerList(d.supportedBy)}`);
      }
      if (d.opposedBy && d.opposedBy.length > 0) {
        sides.push(`Against: ${providerList(d.opposedBy)}`);
      }
      if (sides.length > 0) {
        parts.push(`   *${sides.join(' · ')}.*`);
      }
      parts.push('');
    });
  }

  // ── Key insights ─────────────────────────────────────────────────
  if (synthesis.keyInsights.length > 0) {
    parts.push(`## Key insights (${synthesis.keyInsights.length})`);
    parts.push('');
    synthesis.keyInsights.forEach((it, i) => {
      parts.push(`${i + 1}. ${it.trim()}`);
    });
    parts.push('');
  }

  // ── Metadata footer ──────────────────────────────────────────────
  parts.push('---');
  parts.push('');
  parts.push(
    `*${synthesis.metadata.totalRounds} rounds · ${synthesis.metadata.participatingProviders.length} members · ${synthesis.metadata.totalTokensUsed.toLocaleString()} tokens · ${(synthesis.metadata.totalLatencyMs / 1000).toFixed(1)}s elapsed.*`,
  );

  return parts.join('\n').replace(/\n{3,}/g, '\n\n');
}
