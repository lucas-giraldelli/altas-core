import { describe, it, expect } from 'vitest';
import { llmConfig } from '../../scripts/llm.mjs';

describe('llmConfig (LLM_KEY + LLM_MODEL, provedor inferido)', () => {
  it('infere pelo modelo', () => {
    expect(llmConfig({ LLM_KEY: 'x', LLM_MODEL: 'claude-haiku-4-5-20251001' }).provider).toBe('anthropic');
    expect(llmConfig({ LLM_KEY: 'x', LLM_MODEL: 'gemini-3.5-flash-lite' }).provider).toBe('gemini');
    expect(llmConfig({ LLM_KEY: 'x', LLM_MODEL: 'gpt-5-mini' }).provider).toBe('openai');
  });
  it('infere pela chave quando não há modelo, com modelo padrão do provedor', () => {
    expect(llmConfig({ LLM_KEY: 'sk-ant-abc' })).toMatchObject({ provider: 'anthropic', model: 'claude-haiku-4-5-20251001' });
    expect(llmConfig({ LLM_KEY: 'AIzaSy-abc' }).provider).toBe('gemini');
    expect(llmConfig({ LLM_KEY: 'AQ.abc' }).provider).toBe('gemini');
    expect(llmConfig({ LLM_KEY: 'sk-abc' }).provider).toBe('openai');
  });
  it('ollama: base URL sem chave; LLM_PROVIDER explícito vence', () => {
    expect(llmConfig({ LLM_BASE_URL: 'http://localhost:11434/v1' })).toMatchObject({ provider: 'ollama', model: 'llama3.1' });
    expect(llmConfig({ LLM_KEY: 'sk-ant-x', LLM_PROVIDER: 'openai' }).provider).toBe('openai');
  });
  it('compat: GEMINI_API_KEY / GEMINI_MODEL ainda funcionam', () => {
    expect(llmConfig({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-2' })).toMatchObject({ provider: 'gemini', key: 'k', model: 'gemini-2' });
  });
});
