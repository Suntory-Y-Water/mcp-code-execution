import { callMCPTool } from '../../src/client.js';

type ThinkAboutTaskAdherenceInput = Record<string, never>;

/**
 * Think about the task at hand and whether you are still on track.
 * Especially important if the conversation has been going on for a while and there
 * has been a lot of back and forth.
 *
 * This tool should ALWAYS be called before you insert, replace, or delete code.
 */
export async function thinkAboutTaskAdherence(
  input: ThinkAboutTaskAdherenceInput,
): Promise<unknown> {
  return await callMCPTool('think_about_task_adherence', input);
}
