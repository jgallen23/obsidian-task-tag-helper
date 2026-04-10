import { describe, expect, it } from "vitest";

import {
	buildTagRegex,
	collectTaskTagsFromContent,
	extractTagsFromTaskLine,
	normalizeTagInput,
	removeTagFromTaskLine,
	scanContentForTag,
} from "../lib/taskTagRemoval";

describe("normalizeTagInput", () => {
	it("adds a leading hash when missing", () => {
		expect(normalizeTagInput("next")).toBe("#next");
	});

	it("rejects blank and multi-token input", () => {
		expect(normalizeTagInput("")).toBeNull();
		expect(normalizeTagInput("next later")).toBeNull();
	});
});

describe("removeTagFromTaskLine", () => {
	it("removes the chosen tag from unchecked dash tasks", () => {
		expect(removeTagFromTaskLine("- [ ] Call Alex #next", "#next")).toBe(
			"- [ ] Call Alex",
		);
	});

	it("keeps non-task lines unchanged", () => {
		expect(removeTagFromTaskLine("Call Alex #next", "#next")).toBe(
			"Call Alex #next",
		);
	});

	it("keeps checked tasks unchanged", () => {
		expect(removeTagFromTaskLine("- [x] Call Alex #next", "#next")).toBe(
			"- [x] Call Alex #next",
		);
	});

	it("keeps starred tasks unchanged", () => {
		expect(removeTagFromTaskLine("* [ ] Call Alex #next", "#next")).toBe(
			"* [ ] Call Alex #next",
		);
	});

	it("does not remove partial tag matches", () => {
		expect(removeTagFromTaskLine("- [ ] Call Alex #nextish", "#next")).toBe(
			"- [ ] Call Alex #nextish",
		);
	});

	it("preserves unrelated tags and collapses extra whitespace", () => {
		expect(
			removeTagFromTaskLine("- [ ] Call Alex #next #phone  ", "#next"),
		).toBe("- [ ] Call Alex #phone");
	});
});

describe("extractTagsFromTaskLine", () => {
	it("returns tags from unchecked dash tasks only", () => {
		expect(
			extractTagsFromTaskLine("- [ ] Call Alex #next #phone/home #next"),
		).toEqual(["#next", "#phone/home"]);
		expect(extractTagsFromTaskLine("* [ ] Call Alex #next")).toEqual([]);
	});
});

describe("collectTaskTagsFromContent", () => {
	it("collects unique sorted tags from matching task lines", () => {
		expect(
			collectTaskTagsFromContent(
				[
					"- [ ] One #next #phone",
					"- [ ] Two #agenda",
					"Regular line #ignored",
					"- [x] Done #ignored",
				].join("\n"),
			),
		).toEqual(["#agenda", "#next", "#phone"]);
	});
});

describe("buildTagRegex", () => {
	it("matches tags as standalone tokens", () => {
		expect("- [ ] Task #next #phone".match(buildTagRegex("#next"))).toEqual([
			" #next",
		]);
	});
});

describe("scanContentForTag", () => {
	it("collects matches and updated content", () => {
		const result = scanContentForTag(
			[
				"- [ ] One #next",
				"- [ ] Two #next #phone",
				"- [x] Three #next",
				"* [ ] Four #next",
			].join("\n"),
			"#next",
		);

		expect(result.matches).toHaveLength(2);
		expect(result.matches.map((match) => match.lineNumber)).toEqual([1, 2]);
		expect(result.updatedContent).toBe(
			["- [ ] One", "- [ ] Two #phone", "- [x] Three #next", "* [ ] Four #next"].join(
				"\n",
			),
		);
	});
});
