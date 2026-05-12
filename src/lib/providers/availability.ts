import 'server-only';
import { effectiveKey } from './key-store';
import { PROVIDER_ENV_VARS } from './availability-vars';

export { PROVIDER_ENV_VARS };

export type ProviderAvailability = Record<string, boolean>;

/** True for providers that have a key set in either the config file or env. */
export function getProviderAvailability(): ProviderAvailability {
  const out: ProviderAvailability = {};
  for (const id of Object.keys(PROVIDER_ENV_VARS)) {
    out[id] = Boolean(effectiveKey(id));
  }
  return out;
}
