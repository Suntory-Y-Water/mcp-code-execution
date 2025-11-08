import { callMCPTool } from '../../src/client.js';

type ThinkAboutWhetherYouAreDoneInput = Record<string, never>;

/**
 * Whenever you feel that you are done with what the user has asked for, it is important to call this tool.
 */
export async function thinkAboutWhetherYouAreDone(
  input: ThinkAboutWhetherYouAreDoneInput,
): Promise<unknown> {
  return await callMCPTool('think_about_whether_you_are_done', input);
}
