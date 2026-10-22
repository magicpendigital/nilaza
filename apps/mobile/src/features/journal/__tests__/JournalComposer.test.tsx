import React from "react";
import renderer, { act } from "react-test-renderer";
jest.mock("react-native", () => {
  const React = require("react");
  const component = (name: string) => ({ children, ...props }: any) => React.createElement(name, props, children);
  return { View: component("View"), Text: component("Text"), TextInput: component("TextInput"), StyleSheet: { create: (x: unknown) => x } };
});
jest.mock("../../../a2ui", () => {
  const React = require("react");
  const component = (name: string) => (props: any) => React.createElement(name, props);
  return { Chip: component("Chip"), PrimaryButton: component("PrimaryButton"), SecondaryButton: component("SecondaryButton") };
});
import { JournalComposer } from "../JournalComposer";
import { createJournalDraftStore, type JournalDraftEnvelope } from "../journalDraftStore";
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
const textInput = (tree: renderer.ReactTestRenderer) => tree.root.findAllByType("TextInput" as any)[1];
const primary = (tree: renderer.ReactTestRenderer) => tree.root.findByType("PrimaryButton" as any);
const secondary = (tree: renderer.ReactTestRenderer, label: string) => tree.root.findAllByType("SecondaryButton" as any).find(node => node.props.label === label)!;
const seed = (body: string): JournalDraftEnvelope => ({ schemaVersion: 1, revision: 3, draft: { title: "QA", body, mood: "calm" } });

test("hydration disables editing, restores saved text without empty write", async () => {
  const reading = deferred<unknown>(), write = jest.fn(), store = createJournalDraftStore({ read: () => reading.promise, write, isActive: () => true });
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<JournalComposer language="en" onSave={jest.fn()} onClose={jest.fn()} draftStore={store} />); });
  expect(textInput(tree).props.editable).toBe(false); expect(primary(tree).props.disabled).toBe(true);
  await act(async () => { reading.resolve(seed("existing fictional text")); });
  expect(textInput(tree).props.value).toBe("existing fictional text"); expect(write).not.toHaveBeenCalled();
});
test("read error offers retry and never overwrites stored draft", async () => {
  const read = jest.fn().mockRejectedValueOnce(new Error("fixture read fail")).mockResolvedValueOnce(seed("recovered")), write = jest.fn();
  const store = createJournalDraftStore({ read, write, isActive: () => true }); let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<JournalComposer language="en" onSave={jest.fn()} onClose={jest.fn()} draftStore={store} />); });
  expect(textInput(tree).props.editable).toBe(false);
  await act(async () => { secondary(tree, "Retry opening").props.onPress(); });
  expect(textInput(tree).props.value).toBe("recovered"); expect(write).not.toHaveBeenCalled();
});
test("back/remount and reboot retain ACK draft; failed disk retry retains typed text", async () => {
  let persisted: unknown = null;
  const write = jest.fn().mockRejectedValueOnce(new Error("fixture disk fail")).mockImplementation(async (value: unknown) => { persisted = value; });
  const store = createJournalDraftStore({ read: async () => persisted, write, isActive: () => true }), save = jest.fn(), close = jest.fn(); let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<JournalComposer language="en" onSave={save} onClose={close} draftStore={store} />); });
  await act(async () => { textInput(tree).props.onChangeText("retained fictional draft"); await store.flush(); });
  expect(store.getSnapshot().persistence).toBe("error");
  await act(async () => { secondary(tree, "Retry saving draft").props.onPress(); await store.flush(); });
  await act(async () => { secondary(tree, "Back").props.onPress(); tree.unmount(); });
  await act(async () => { tree = renderer.create(<JournalComposer language="en" onSave={save} onClose={close} draftStore={store} />); });
  expect(textInput(tree).props.value).toBe("retained fictional draft"); expect(save).not.toHaveBeenCalled();
  const reboot = createJournalDraftStore({ read: async () => persisted, write, isActive: () => true }); await reboot.hydrate();
  expect(reboot.getSnapshot().draft.body).toBe("retained fictional draft");
});
test("saved note then failed clear retries cleanup without duplicate save", async () => {
  const write = jest.fn().mockRejectedValueOnce(new Error("fixture clear fail")).mockResolvedValueOnce(undefined), save = jest.fn().mockResolvedValue(true), close = jest.fn();
  const store = createJournalDraftStore({ read: async () => seed("saved fictional note"), write, isActive: () => true }); let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<JournalComposer language="en" onSave={save} onClose={close} draftStore={store} />); });
  await act(async () => { primary(tree).props.onPress(); });
  expect(primary(tree).props.disabled).toBe(true); expect(close).not.toHaveBeenCalled();
  await act(async () => { secondary(tree, "Finish saving").props.onPress(); });
  expect(save).toHaveBeenCalledTimes(1); expect(close).toHaveBeenCalledTimes(1); expect(store.getSnapshot().draft.body).toBe("");
});
test("unmount during note save retains lock through remount, then clears on ACK", async () => {
  const saved = deferred<boolean>(), save = jest.fn(() => saved.promise), oldClose = jest.fn(), newClose = jest.fn();
  const store = createJournalDraftStore({ read: async () => seed("pending"), write: jest.fn().mockResolvedValue(undefined), isActive: () => true }); let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<JournalComposer language="en" onSave={save} onClose={oldClose} draftStore={store} />); });
  await act(async () => { primary(tree).props.onPress(); });
  await act(async () => { tree.unmount(); tree = renderer.create(<JournalComposer language="en" onSave={save} onClose={newClose} draftStore={store} />); });
  await act(async () => { primary(tree).props.onPress(); }); expect(save).toHaveBeenCalledTimes(1);
  await act(async () => { saved.resolve(true); }); expect(textInput(tree).props.value).toBe("");
  expect(oldClose).not.toHaveBeenCalled(); expect(newClose).not.toHaveBeenCalled();
});
test("ACK between render and subscription cannot strand the form in loading", async () => {
  const store = createJournalDraftStore({ read: async () => null, write: jest.fn(), isActive: () => true });
  const ready = { ...store.getSnapshot(), status: "ready" as const, draft: seed("missed ACK").draft };
  let current = store.getSnapshot();
  const bridged = { ...store, getSnapshot: () => current, subscribe: (_listener: () => void) => { current = ready; return () => {}; }, hydrate: async () => true };
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<JournalComposer language="en" onSave={jest.fn()} onClose={jest.fn()} draftStore={bridged} />); });
  expect(textInput(tree).props.editable).toBe(true); expect(textInput(tree).props.value).toBe("missed ACK");
});

test("failed local save retains draft and permits explicit retry", async () => {
  const save = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true), close = jest.fn();
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<JournalComposer language="vi" onSave={save} onClose={close} />); });
  const input = () => tree.root.findAllByType("TextInput" as any)[1];
  await act(async () => { input().props.onChangeText("  QA ghi chú giả lập  "); });
  await act(async () => { await tree.root.findByType("PrimaryButton" as any).props.onPress(); });
  expect(save).toHaveBeenCalledWith({ title: "Ghi chú của mình", summary: "QA ghi chú giả lập", mood: "reflective" });
  expect(close).not.toHaveBeenCalled();
  expect(input().props.value).toBe("  QA ghi chú giả lập  ");
  expect(tree.root.findAllByProps({ accessibilityRole: "alert" }).filter(node => node.type === "Text")).toHaveLength(1);
  await act(async () => { await tree.root.findByType("PrimaryButton" as any).props.onPress(); });
  expect(close).toHaveBeenCalledTimes(1);
});

test("empty and rapid double submit cannot create duplicate notes", async () => {
  let acknowledge!: (value: boolean) => void;
  const save = jest.fn(() => new Promise<boolean>(resolve => { acknowledge = resolve; })), close = jest.fn();
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<JournalComposer language="en" onSave={save} onClose={close} />); });
  expect(tree.root.findByType("PrimaryButton" as any).props.disabled).toBe(true);
  await act(async () => { tree.root.findByType("PrimaryButton" as any).props.onPress(); });
  expect(save).not.toHaveBeenCalled();
  await act(async () => { tree.root.findAllByType("TextInput" as any)[1].props.onChangeText("Fictional QA note"); });
  const submit = tree.root.findByType("PrimaryButton" as any).props.onPress;
  await act(async () => { submit(); submit(); });
  expect(save).toHaveBeenCalledTimes(1);
  expect(tree.root.findByType("SecondaryButton" as any).props.disabled).toBe(true);
  await act(async () => { acknowledge(true); });
  expect(close).toHaveBeenCalledTimes(1);
});
