/**
 * Manager ↔ agent chat: same persona and tools, on the same Vultr model.
 * Corrections become learned rules; the response carries ruleLearned so the
 * UI can show the green banner and refresh totals.
 */
import type OpenAI from 'openai';
import { vultrChat, hasVultrKey, REASONING_MODEL } from '../agent/vultr.ts';
import { CHAT_SYSTEM_PROMPT } from '../agent/prompts.ts';
import { toolDefinitions, handleTool } from '../agent/tools.ts';
import { extractCitations } from '../agent/loop.ts';

export type ChatTurn = { reply: string; citations: string[]; ruleLearned?: string };

export async function runChatTurn(message: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<ChatTurn> {
  if (!hasVultrKey()) {
    if (/don'?t dispute|special agreement|no disput/i.test(message)) {
      const rule_text = `Manager correction: ${message}`;
      await handleTool('save_learned_rule', { rule_text, scope: 'dispute' });
      return { reply: `Understood — saved as a rule for all future audits: "${rule_text}"`, citations: [], ruleLearned: rule_text };
    }
    return {
      reply: '(offline fallback — set VULTR_INFERENCE_API_KEY) Res #1284 was flagged because PMS-1284 shows 5 nights stayed with 2 refunded under FLEX, and BKG-§4.2 limits commission to the amount retained.',
      citations: ['PMS-1284', 'BKG-§4.2'],
    };
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message },
  ];
  let ruleLearned: string | undefined;

  for (let turn = 0; turn < 12; turn++) {
    const res = await vultrChat().chat.completions.create({
      model: REASONING_MODEL, temperature: 0, max_tokens: 2000, tools: toolDefinitions, messages,
    });
    const msg = res.choices[0].message;
    if (!msg.tool_calls?.length) {
      const reply = msg.content ?? '';
      return { reply, citations: extractCitations(reply), ruleLearned };
    }
    messages.push(msg);
    for (const call of msg.tool_calls) {
      const args = JSON.parse(call.function.arguments || '{}');
      if (call.function.name === 'save_learned_rule') ruleLearned = args.rule_text;
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(await handleTool(call.function.name, args)) });
    }
  }
  return { reply: 'Tool budget exceeded — try rephrasing.', citations: [], ruleLearned };
}
