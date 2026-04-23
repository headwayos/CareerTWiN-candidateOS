import { z } from 'zod';

export const LocalConfigSchema = z.object({
  workspaceRoot: z.string(),
  version: z.string(),
  assistant: z.object({
    default: z.string().default('antigravity'),
    adapterPath: z.string().optional(),
  }).default({}),
  llm: z.object({
    provider: z.string().default('openai'),
    model: z.string().default('gpt-4-turbo-preview'),
    apiKey: z.string().optional(),
  }).default({}),
  rendering: z.object({
    latex: z.enum(['tectonic', 'pdflatex', 'none']).default('tectonic'),
  }).default({}),
});

export const ModePackSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  scoringRubric: z.record(z.number()),
  keywords: z.array(z.string()),
  prompts: z.record(z.string()),
});

export type LocalConfig = z.infer<typeof LocalConfigSchema>;
export type ModePack = z.infer<typeof ModePackSchema>;
