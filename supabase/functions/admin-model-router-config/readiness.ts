const secretNames = {
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  // Admin A7: DeepSeek direct (public data only).
  deepseek: "DEEPSEEK_API_KEY"
};

export function providerReadiness(get: (name: string) => string | undefined) {
  return Object.entries(secretNames).map(([provider, secretName]) => ({
    provider, secretName, configured: Boolean(get(secretName)?.trim()),
    verification: "not_tested"
  }));
}
