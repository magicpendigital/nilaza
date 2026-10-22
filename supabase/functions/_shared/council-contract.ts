// Generated from packages/agent-config/council-contract.json.
// Verify with: npm run council:contract:check
export const councilContract = {
  "id": "ai_council_contract",
  "version": "2026-09-20-council-rounds-v2",
  "endpoint": "/ai/ai-council",
  "responseSchema": "ai_council_rounds_v2",
  "promptVersionId": "ai_council_system",
  "optionalResponseFields": {
    "synthesis": [
      "consensus",
      "tensions",
      "assumptions",
      "nextStep",
      "reflectionQuestion"
    ]
  }
} as const;
