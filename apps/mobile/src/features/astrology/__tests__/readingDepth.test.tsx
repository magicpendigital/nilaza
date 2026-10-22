import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import fixture from "../../../../../../packages/agent-config/astrology-ai-insight/fixtures/valid-response.json";
import { toAstrologyAiGuideAnswer, type AstrologyAiInsightResponse } from "../astrologyAiInsight";
import { AstrologyAiGuidePanel } from "../AstrologyAiGuidePanel";
import { buildAstrologyGuidePrompts } from "../interpretation";

test.each(["vi", "en"] as const)("full %s AI response has a readable path to every section and reflection", language => {
  const response = { ...fixture, language,
    patterns: Array.from({ length: 5 }, (_, i) => ({ ...fixture.patterns[0], id: `pattern-${i}`, title: `Pattern ${i}`, interpretation: `Pattern detail ${i}` })),
    tensions: Array.from({ length: 5 }, (_, i) => ({ ...fixture.tensions[0], id: `tension-${i}`, title: `Tension ${i}`, interpretation: `Tension detail ${i}` })),
    focusSections: Array.from({ length: 4 }, (_, i) => ({ ...fixture.focusSections[0], id: `focus-${i}`, title: `Focus ${i}`, insight: `Focus detail ${i}`, reflectionQuestion: `Focus question ${i}` })),
    reflectionQuestions: Array.from({ length: 5 }, (_, i) => `Reflection ${i}`),
  } as AstrologyAiInsightResponse;
  const answer = toAstrologyAiGuideAnswer(response);
  expect(answer.sections).toHaveLength(19);
  const screen = render(<AstrologyAiGuidePanel language={language} status="success" question="" onQuestionChange={jest.fn()} onSubmitQuestion={jest.fn()} answer={answer} />);
  const label = language === "vi" ? "Đọc đầy đủ các phần" : "Read all sections";
  fireEvent.press(screen.getByRole("button", { name: new RegExp(label) }));
  for (const item of [...response.patterns, ...response.tensions]) expect(screen.getByText(item.interpretation)).toBeTruthy();
  for (const item of response.focusSections) {
    expect(screen.getByText(item.title)).toBeTruthy();
    expect(screen.getByText(item.insight)).toBeTruthy();
    expect(screen.getByText(item.reflectionQuestion)).toBeTruthy();
  }
  for (const item of response.reflectionQuestions) expect(screen.getByText(item)).toBeTruthy();
});

test.each(["vi", "en"] as const)("%s prompts name Venus rather than Sun and aspects identify both bodies", language => {
  const venus = { kind: "body", id: "body:venus", bodyId: "venus", sign: "aries", sourceKind: "placement", evidenceRefs: [], personalized: true } as const;
  const prompts = buildAstrologyGuidePrompts(venus, language);
  expect(prompts.every(item => item.includes(language === "vi" ? "Sao Kim" : "Venus"))).toBe(true);
  expect(prompts.join(" ")).not.toContain(language === "vi" ? "Mặt Trời" : "Sun");
  const aspect = { kind: "aspect", id: "aspect.moon_venus.square", bodyA: "moon", bodyB: "venus", aspectType: "square", evidenceRefs: [], personalized: true } as const;
  const questions = buildAstrologyGuidePrompts(aspect, language);
  for (const question of questions) {
    expect(question).toContain(language === "vi" ? "Sao Kim" : "Venus");
    expect(question).toContain(language === "vi" ? "Mặt Trăng" : "Moon");
  }
});

test("the real answer panel keeps original language and offers explicit save and feedback", () => {
  const onSaveAnswer = jest.fn(), onReportAnswer = jest.fn();
  const answer = toAstrologyAiGuideAnswer(fixture as AstrologyAiInsightResponse);
  const screen = render(<AstrologyAiGuidePanel language="en" status="success" question="" onQuestionChange={jest.fn()}
    onSubmitQuestion={jest.fn()} answer={answer} onSaveAnswer={onSaveAnswer} onReportAnswer={onReportAnswer} />);
  expect(screen.getByText(/keeps its original language/)).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Save full answer" }));
  fireEvent.press(screen.getByRole("button", { name: "Give feedback on this answer" }));
  expect(onSaveAnswer).toHaveBeenCalledTimes(1);
  expect(onReportAnswer).toHaveBeenCalledTimes(1);
});
