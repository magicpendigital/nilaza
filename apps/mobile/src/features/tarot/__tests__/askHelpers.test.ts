import { detectTarotTopic, suggestTarotQuestion } from "../askHelpers";

test("topic follows the question, with or without Vietnamese tones", () => {
  expect(detectTarotTopic("Người ấy có thật lòng với mình không?")).toBe("love");
  expect(detectTarotTopic("nguoi ay co that long voi minh khong")).toBe("love");
  expect(detectTarotTopic("Sếp có đánh giá cao dự án của mình?")).toBe("career");
  expect(detectTarotTopic("Có nên nghỉ việc để đi học không?")).toBe("decision");
  expect(detectTarotTopic("Vì sao dạo này mình thấy mệt?")).toBe("self");
  expect(detectTarotTopic("Should I take the offer?")).toBe("decision");
  expect(detectTarotTopic("")).toBeNull();
  expect(detectTarotTopic("Hôm nay trời đẹp")).toBeNull();
});

test("untoned single syllables do not trigger a topic by accident", () => {
  expect(detectTarotTopic("Sao mình thấy yếu đuối thì phải?")).toBeNull();
  expect(detectTarotTopic("Mình vô tình làm sai")).toBeNull();
  expect(detectTarotTopic("Vì sao mình mệt mỏi?")).toBe("self");
});

test("mind-reading questions get a self-focused reframe and an honest note", () => {
  const suggestion = suggestTarotQuestion("Người ấy có thật lòng với mình không?", "love", "vi");
  expect(suggestion?.question).toBe("Mình cần biết điều gì để cảm thấy an toàn trong mối quan hệ này?");
  expect(suggestion?.note).toContain("không đọc được suy nghĩ");
  expect(suggestTarotQuestion("Người yêu cũ có quay lại không?", "love", "vi")?.question).toContain("dù người ấy có quay lại hay không");
});

test("prediction questions get a topic reframe; open questions are left alone", () => {
  expect(suggestTarotQuestion("Khi nào mình được thăng chức?", "career", "vi")?.question).toContain("công việc");
  expect(suggestTarotQuestion("When will I find a job?", "career", "en")?.note).toContain("doesn't predict");
  expect(suggestTarotQuestion("Mình cần chú ý điều gì trong tuần này?", "self", "vi")).toBeNull();
  expect(suggestTarotQuestion("ok", "self", "vi")).toBeNull();
});
