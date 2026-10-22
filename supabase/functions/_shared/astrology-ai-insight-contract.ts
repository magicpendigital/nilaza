// Generated from packages/agent-config/astrology-ai-insight/contract.json and its schemas.
// Recreate with: npm run astrology:ai-contract:generate
export const ASTROLOGY_AI_CONTRACT = {
  "id": "nilaza.astrology.ai-insight",
  "version": "1.0.0",
  "status": "runtime_deployed_staging_configuration_pending",
  "endpoint": "/ai/astrology-insight",
  "requestSchema": {
    "id": "https://nilaza.local/contracts/astrology-ai-insight/request/1.0.0",
    "path": "packages/agent-config/astrology-ai-insight/request.schema.json"
  },
  "invocationSchema": {
    "id": "https://nilaza.local/contracts/astrology-ai-insight/invocation/1.0.0",
    "path": "packages/agent-config/astrology-ai-insight/invocation.schema.json"
  },
  "responseSchema": {
    "id": "https://nilaza.local/contracts/astrology-ai-insight/response/1.0.0",
    "name": "astrology_ai_insight_v1",
    "path": "packages/agent-config/astrology-ai-insight/response.schema.json"
  },
  "promptVersionId": "astrology_interpretation_system",
  "promptVersion": "2026-09-25-ai-insight-v1",
  "chartContract": {
    "id": "nilaza.astrology.canonical-chart",
    "supportedVersions": [
      "0.2.0"
    ],
    "supportedCalculationVersions": [
      "nilaza-a3-utc-tt-2"
    ]
  },
  "entitlement": {
    "requiredEntitlement": "premium_astrology_ai",
    "enforcementBoundary": "server",
    "freeFallback": "deterministic_chart_story"
  },
  "privacyBoundary": {
    "mode": "allowlist_only",
    "allowedDataClasses": [
      "opaque_request_id",
      "opaque_report_id",
      "chart_and_calculation_versions",
      "selected_calculated_fact_ids",
      "sanitized_placements_aspects_and_houses",
      "calculation_caveat_codes",
      "sanitized_current_user_focus"
    ],
    "forbiddenDataClasses": [
      "raw_birth_date",
      "raw_birth_time",
      "raw_birth_place",
      "latitude_or_longitude",
      "timezone_or_utc_offset",
      "raw_birth_profile",
      "journal_content_or_history",
      "private_chat_history",
      "account_or_device_identifier"
    ],
    "forbiddenFieldNames": [
      "birthDate",
      "dateOfBirth",
      "birthTime",
      "timeOfBirth",
      "birthPlace",
      "placeOfBirth",
      "location",
      "coordinates",
      "latitude",
      "longitude",
      "timezone",
      "timeZone",
      "utcOffset",
      "birthProfile",
      "journal",
      "journalEntry",
      "journalEntries",
      "chatHistory",
      "userId",
      "deviceId"
    ],
    "textRule": "The authenticated invocation is validated and stored as an owned report before model context is built. userFocus.sanitizedQuestion is current-turn context only; do not store it in the report, usage event, or trace. The model sees only selected calculated facts and this question."
  },
  "evidencePolicy": {
    "mode": "selected_fact_ids_only",
    "requireEvidenceOnEveryInterpretationSection": true,
    "rejectUnknownFactIds": true,
    "rejectVersionMismatch": true
  },
  "safetyPolicy": {
    "interpretCalculatedFactsOnly": true,
    "allowSymbolicReflection": true,
    "blockInventedPlacements": true,
    "blockDeterministicPredictions": true,
    "blockMedicalLegalFinancialAndMentalHealthAdvice": true,
    "requireCalculationCaveats": true,
    "requiredDisclaimerKey": "astrology_reflection_not_prediction"
  },
  "fixtures": {
    "validRequest": "packages/agent-config/astrology-ai-insight/fixtures/valid-request.json",
    "validInvocation": "packages/agent-config/astrology-ai-insight/fixtures/valid-invocation.json",
    "validResponse": "packages/agent-config/astrology-ai-insight/fixtures/valid-response.json"
  }
} as const;
export const ASTROLOGY_AI_REQUEST_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://nilaza.local/contracts/astrology-ai-insight/request/1.0.0",
  "title": "Nilaza Astrology AI insight request v1",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "requestId",
    "reportId",
    "language",
    "chart",
    "selectedFactIds",
    "facts",
    "caveats",
    "userFocus"
  ],
  "properties": {
    "schemaVersion": {
      "const": "nilaza.astrology.ai-insight.request.v1"
    },
    "requestId": {
      "$ref": "#/definitions/opaqueId"
    },
    "reportId": {
      "$ref": "#/definitions/opaqueId"
    },
    "language": {
      "enum": [
        "vi",
        "en"
      ]
    },
    "chart": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contractId",
        "contractVersion",
        "calculationVersion",
        "reportRevision",
        "calculationStatus"
      ],
      "properties": {
        "contractId": {
          "const": "nilaza.astrology.canonical-chart"
        },
        "contractVersion": {
          "const": "0.2.0"
        },
        "calculationVersion": {
          "const": "nilaza-a3-utc-tt-2"
        },
        "reportRevision": {
          "type": "integer",
          "minimum": 1
        },
        "calculationStatus": {
          "const": "candidate"
        }
      }
    },
    "selectedFactIds": {
      "type": "array",
      "minItems": 1,
      "maxItems": 30,
      "uniqueItems": true,
      "items": {
        "$ref": "#/definitions/factId"
      }
    },
    "facts": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "placements",
        "aspects",
        "houses"
      ],
      "properties": {
        "placements": {
          "type": "array",
          "minItems": 1,
          "maxItems": 12,
          "items": {
            "$ref": "#/definitions/placementFact"
          }
        },
        "aspects": {
          "type": "array",
          "maxItems": 45,
          "items": {
            "$ref": "#/definitions/aspectFact"
          }
        },
        "houses": {
          "type": "array",
          "maxItems": 12,
          "items": {
            "$ref": "#/definitions/houseFact"
          }
        }
      }
    },
    "caveats": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "$ref": "#/definitions/caveat"
      }
    },
    "userFocus": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "mode",
        "theme",
        "sanitizedQuestion",
        "consentScope",
        "contextDisclosure"
      ],
      "properties": {
        "mode": {
          "enum": [
            "overview",
            "question"
          ]
        },
        "theme": {
          "$ref": "#/definitions/focusTheme"
        },
        "sanitizedQuestion": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 500
        },
        "consentScope": {
          "const": "current_focus_only"
        },
        "contextDisclosure": {
          "const": "chart_facts_and_current_focus_only"
        }
      }
    }
  },
  "definitions": {
    "opaqueId": {
      "type": "string",
      "minLength": 8,
      "maxLength": 128,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]+$"
    },
    "factId": {
      "type": "string",
      "minLength": 5,
      "maxLength": 96,
      "pattern": "^(placement|aspect|house)\\.[a-z0-9][a-z0-9._-]*$"
    },
    "caveatId": {
      "type": "string",
      "minLength": 5,
      "maxLength": 96,
      "pattern": "^caveat\\.[a-z0-9][a-z0-9._-]*$"
    },
    "sign": {
      "enum": [
        "aries",
        "taurus",
        "gemini",
        "cancer",
        "leo",
        "virgo",
        "libra",
        "scorpio",
        "sagittarius",
        "capricorn",
        "aquarius",
        "pisces"
      ]
    },
    "body": {
      "enum": [
        "sun",
        "moon",
        "mercury",
        "venus",
        "mars",
        "jupiter",
        "saturn",
        "uranus",
        "neptune",
        "pluto",
        "ascendant",
        "midheaven"
      ]
    },
    "focusTheme": {
      "enum": [
        "identity",
        "relationships",
        "work",
        "decision",
        "patterns",
        "open_reflection"
      ]
    },
    "confidence": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "level",
        "basis",
        "caveatIds"
      ],
      "properties": {
        "level": {
          "enum": [
            "stable",
            "estimated",
            "uncertain",
            "unavailable"
          ]
        },
        "basis": {
          "enum": [
            "deterministic_exact_input",
            "deterministic_approximate_input",
            "sampled_unknown_time",
            "derived_from_chart",
            "missing_required_input"
          ]
        },
        "caveatIds": {
          "type": "array",
          "maxItems": 10,
          "uniqueItems": true,
          "items": {
            "$ref": "#/definitions/caveatId"
          }
        }
      }
    },
    "placementFact": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "factId",
        "body",
        "sign",
        "degree",
        "house",
        "retrograde",
        "confidence"
      ],
      "properties": {
        "factId": {
          "$ref": "#/definitions/factId"
        },
        "body": {
          "$ref": "#/definitions/body"
        },
        "sign": {
          "$ref": "#/definitions/sign"
        },
        "degree": {
          "type": "number",
          "minimum": 0,
          "exclusiveMaximum": 30
        },
        "house": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 1,
          "maximum": 12
        },
        "retrograde": {
          "type": [
            "boolean",
            "null"
          ]
        },
        "confidence": {
          "$ref": "#/definitions/confidence"
        }
      }
    },
    "aspectFact": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "factId",
        "bodyA",
        "bodyB",
        "aspectType",
        "orb",
        "confidence"
      ],
      "properties": {
        "factId": {
          "$ref": "#/definitions/factId"
        },
        "bodyA": {
          "$ref": "#/definitions/body"
        },
        "bodyB": {
          "$ref": "#/definitions/body"
        },
        "aspectType": {
          "enum": [
            "conjunction",
            "sextile",
            "square",
            "trine",
            "opposition"
          ]
        },
        "orb": {
          "type": "number",
          "minimum": 0,
          "maximum": 6
        },
        "confidence": {
          "$ref": "#/definitions/confidence"
        }
      }
    },
    "houseFact": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "factId",
        "house",
        "sign",
        "confidence"
      ],
      "properties": {
        "factId": {
          "$ref": "#/definitions/factId"
        },
        "house": {
          "type": "integer",
          "minimum": 1,
          "maximum": 12
        },
        "sign": {
          "$ref": "#/definitions/sign"
        },
        "confidence": {
          "$ref": "#/definitions/confidence"
        }
      }
    },
    "caveat": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "code",
        "severity",
        "appliesToFactIds"
      ],
      "properties": {
        "id": {
          "$ref": "#/definitions/caveatId"
        },
        "code": {
          "type": "string",
          "minLength": 3,
          "maxLength": 96,
          "pattern": "^[a-z0-9][a-z0-9_]*$"
        },
        "severity": {
          "enum": [
            "blocking",
            "warning",
            "info"
          ]
        },
        "appliesToFactIds": {
          "type": "array",
          "maxItems": 30,
          "uniqueItems": true,
          "items": {
            "$ref": "#/definitions/factId"
          }
        }
      }
    }
  }
} as const;
export const ASTROLOGY_AI_INVOCATION_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://nilaza.local/contracts/astrology-ai-insight/invocation/1.0.0",
  "title": "Nilaza Astrology AI authenticated invocation v1",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "requestId",
    "clientChartId",
    "language",
    "chart",
    "selectedFactIds",
    "facts",
    "caveats",
    "userFocus",
    "consent"
  ],
  "properties": {
    "schemaVersion": {
      "const": "nilaza.astrology.ai-insight.invoke.v1"
    },
    "requestId": {
      "$ref": "https://nilaza.local/contracts/astrology-ai-insight/request/1.0.0#/definitions/opaqueId"
    },
    "clientChartId": {
      "$ref": "https://nilaza.local/contracts/astrology-ai-insight/request/1.0.0#/definitions/opaqueId"
    },
    "language": {
      "enum": [
        "vi",
        "en"
      ]
    },
    "chart": {
      "$ref": "https://nilaza.local/contracts/astrology-ai-insight/request/1.0.0#/properties/chart"
    },
    "selectedFactIds": {
      "$ref": "https://nilaza.local/contracts/astrology-ai-insight/request/1.0.0#/properties/selectedFactIds"
    },
    "facts": {
      "$ref": "https://nilaza.local/contracts/astrology-ai-insight/request/1.0.0#/properties/facts"
    },
    "caveats": {
      "$ref": "https://nilaza.local/contracts/astrology-ai-insight/request/1.0.0#/properties/caveats"
    },
    "userFocus": {
      "$ref": "https://nilaza.local/contracts/astrology-ai-insight/request/1.0.0#/properties/userFocus"
    },
    "consent": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "accepted",
        "version"
      ],
      "properties": {
        "accepted": {
          "const": true
        },
        "version": {
          "const": "astrology_ai_fact_sharing_v1"
        }
      }
    },
    "qaTraceConsent": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "accepted",
        "version"
      ],
      "properties": {
        "accepted": {
          "const": true
        },
        "version": {
          "const": "astrology_ai_qa_trace_v1"
        }
      }
    }
  }
} as const;
export const ASTROLOGY_AI_RESPONSE_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://nilaza.local/contracts/astrology-ai-insight/response/1.0.0",
  "title": "Nilaza Astrology AI insight response v1",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "requestId",
    "reportId",
    "language",
    "headline",
    "synthesis",
    "evidenceFactIds",
    "patterns",
    "tensions",
    "focusSections",
    "reflectionQuestions",
    "suggestedFollowUps",
    "metadata"
  ],
  "properties": {
    "schemaVersion": {
      "const": "nilaza.astrology.ai-insight.response.v1"
    },
    "requestId": {
      "$ref": "#/definitions/opaqueId"
    },
    "reportId": {
      "$ref": "#/definitions/opaqueId"
    },
    "language": {
      "enum": [
        "vi",
        "en"
      ]
    },
    "headline": {
      "$ref": "#/definitions/headline"
    },
    "synthesis": {
      "type": "string",
      "minLength": 20,
      "maxLength": 1200
    },
    "evidenceFactIds": {
      "$ref": "#/definitions/evidenceFactIds"
    },
    "patterns": {
      "type": "array",
      "minItems": 1,
      "maxItems": 5,
      "items": {
        "$ref": "#/definitions/interpretationSection"
      }
    },
    "tensions": {
      "type": "array",
      "maxItems": 5,
      "items": {
        "$ref": "#/definitions/interpretationSection"
      }
    },
    "focusSections": {
      "type": "array",
      "minItems": 1,
      "maxItems": 4,
      "items": {
        "$ref": "#/definitions/focusSection"
      }
    },
    "reflectionQuestions": {
      "type": "array",
      "minItems": 1,
      "maxItems": 5,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 10,
        "maxLength": 240
      }
    },
    "suggestedFollowUps": {
      "type": "array",
      "minItems": 2,
      "maxItems": 5,
      "items": {
        "$ref": "#/definitions/followUp"
      }
    },
    "metadata": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contractId",
        "contractVersion",
        "responseSchema",
        "promptVersionId",
        "promptVersion",
        "chartContractVersion",
        "calculationVersion",
        "reportRevision",
        "interpretationMode",
        "moderationStatus",
        "providerMode",
        "disclaimerKey",
        "generatedAt"
      ],
      "properties": {
        "contractId": {
          "const": "nilaza.astrology.ai-insight"
        },
        "contractVersion": {
          "const": "1.0.0"
        },
        "responseSchema": {
          "const": "astrology_ai_insight_v1"
        },
        "promptVersionId": {
          "type": "string",
          "minLength": 3,
          "maxLength": 96
        },
        "promptVersion": {
          "type": "string",
          "minLength": 3,
          "maxLength": 96
        },
        "chartContractVersion": {
          "const": "0.2.0"
        },
        "calculationVersion": {
          "const": "nilaza-a3-utc-tt-2"
        },
        "reportRevision": {
          "type": "integer",
          "minimum": 1
        },
        "interpretationMode": {
          "const": "evidence_bound_reflection"
        },
        "moderationStatus": {
          "enum": [
            "passed",
            "redacted"
          ]
        },
        "providerMode": {
          "enum": [
            "mock",
            "staging",
            "live"
          ]
        },
        "disclaimerKey": {
          "const": "astrology_reflection_not_prediction"
        },
        "generatedAt": {
          "type": "string",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$"
        }
      }
    }
  },
  "definitions": {
    "opaqueId": {
      "type": "string",
      "minLength": 8,
      "maxLength": 128,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]+$"
    },
    "factId": {
      "type": "string",
      "minLength": 5,
      "maxLength": 96,
      "pattern": "^(placement|aspect|house)\\.[a-z0-9][a-z0-9._-]*$"
    },
    "caveatId": {
      "type": "string",
      "minLength": 5,
      "maxLength": 96,
      "pattern": "^caveat\\.[a-z0-9][a-z0-9._-]*$"
    },
    "focusTheme": {
      "enum": [
        "identity",
        "relationships",
        "work",
        "decision",
        "patterns",
        "open_reflection"
      ]
    },
    "headline": {
      "type": "string",
      "minLength": 8,
      "maxLength": 140
    },
    "evidenceFactIds": {
      "type": "array",
      "minItems": 1,
      "maxItems": 20,
      "uniqueItems": true,
      "items": {
        "$ref": "#/definitions/factId"
      }
    },
    "caveatIds": {
      "type": "array",
      "maxItems": 10,
      "uniqueItems": true,
      "items": {
        "$ref": "#/definitions/caveatId"
      }
    },
    "interpretationSection": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "title",
        "interpretation",
        "evidenceFactIds",
        "caveatIds"
      ],
      "properties": {
        "id": {
          "type": "string",
          "minLength": 3,
          "maxLength": 64,
          "pattern": "^[a-z0-9][a-z0-9._-]*$"
        },
        "title": {
          "$ref": "#/definitions/headline"
        },
        "interpretation": {
          "type": "string",
          "minLength": 20,
          "maxLength": 900
        },
        "evidenceFactIds": {
          "$ref": "#/definitions/evidenceFactIds"
        },
        "caveatIds": {
          "$ref": "#/definitions/caveatIds"
        }
      }
    },
    "focusSection": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "theme",
        "title",
        "insight",
        "evidenceFactIds",
        "caveatIds",
        "reflectionQuestion"
      ],
      "properties": {
        "id": {
          "type": "string",
          "minLength": 3,
          "maxLength": 64,
          "pattern": "^[a-z0-9][a-z0-9._-]*$"
        },
        "theme": {
          "$ref": "#/definitions/focusTheme"
        },
        "title": {
          "$ref": "#/definitions/headline"
        },
        "insight": {
          "type": "string",
          "minLength": 20,
          "maxLength": 900
        },
        "evidenceFactIds": {
          "$ref": "#/definitions/evidenceFactIds"
        },
        "caveatIds": {
          "$ref": "#/definitions/caveatIds"
        },
        "reflectionQuestion": {
          "type": "string",
          "minLength": 10,
          "maxLength": 240
        }
      }
    },
    "followUp": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "label",
        "theme",
        "interactionMode",
        "requiresPremium"
      ],
      "properties": {
        "id": {
          "type": "string",
          "minLength": 3,
          "maxLength": 64,
          "pattern": "^[a-z0-9][a-z0-9._-]*$"
        },
        "label": {
          "type": "string",
          "minLength": 8,
          "maxLength": 160
        },
        "theme": {
          "$ref": "#/definitions/focusTheme"
        },
        "interactionMode": {
          "const": "ask_ai_guide"
        },
        "requiresPremium": {
          "const": true
        }
      }
    }
  }
} as const;
