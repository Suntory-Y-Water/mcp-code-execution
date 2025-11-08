import { callMCPTool } from '../../src/client.js';

type OnboardingInput = Record<string, never>;

/**
 * Call this tool if onboarding was not performed yet.
 * You will call this tool at most once per conversation. Returns instructions on how to create the onboarding information.
 */
export async function onboarding(input: OnboardingInput): Promise<unknown> {
  return await callMCPTool('onboarding', input);
}
