import { callMCPTool } from '../../src/client.js';

type CheckOnboardingPerformedInput = Record<string, never>;

/**
 * Checks whether project onboarding was already performed.
 * You should always call this tool before beginning to actually work on the project/after activating a project,
 * but after calling the initial instructions tool.
 */
export async function checkOnboardingPerformed(
  input: CheckOnboardingPerformedInput,
): Promise<unknown> {
  return await callMCPTool('check_onboarding_performed', input);
}
