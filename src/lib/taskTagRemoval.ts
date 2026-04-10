const UNCHECKED_DASH_TASK_LINE = /^\s*- \[ \]/;
const TASK_TAG = /(^|\s)(#[^\s#]+)/g;

export interface TaskLineMatch {
	lineNumber: number;
	lineText: string;
	updatedLine: string;
}

export interface ContentScanResult {
	matches: TaskLineMatch[];
	updatedContent: string;
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeTagInput(input: string): string | null {
	const trimmed = input.trim();
	if (trimmed.length === 0 || /\s/.test(trimmed)) {
		return null;
	}

	return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function isUncheckedDashTaskLine(line: string): boolean {
	return UNCHECKED_DASH_TASK_LINE.test(line);
}

export function buildTagRegex(tag: string): RegExp {
	return new RegExp(`(^|\\s)${escapeRegex(tag)}(?=\\s|$)`, "g");
}

export function extractTagsFromTaskLine(line: string): string[] {
	if (!isUncheckedDashTaskLine(line)) {
		return [];
	}

	const tags = new Set<string>();
	for (const match of line.matchAll(TASK_TAG)) {
		tags.add(match[2]);
	}

	return [...tags];
}

export function collectTaskTagsFromContent(content: string): string[] {
	const tags = new Set<string>();

	for (const line of content.split("\n")) {
		for (const tag of extractTagsFromTaskLine(line)) {
			tags.add(tag);
		}
	}

	return [...tags].sort((left, right) => left.localeCompare(right));
}

export function removeTagFromTaskLine(line: string, tag: string): string {
	if (!isUncheckedDashTaskLine(line)) {
		return line;
	}

	const tagRegex = buildTagRegex(tag);
	if (!tagRegex.test(line)) {
		return line;
	}

	const updated = line
		.replace(tagRegex, "$1")
		.replace(/[ \t]{2,}/g, " ")
		.replace(/\s+$/g, "");

	return updated;
}

export function scanContentForTag(
	content: string,
	tag: string,
): ContentScanResult {
	const lines = content.split("\n");
	const matches: TaskLineMatch[] = [];

	const updatedLines = lines.map((line, index) => {
		const updatedLine = removeTagFromTaskLine(line, tag);
		if (updatedLine !== line) {
			matches.push({
				lineNumber: index + 1,
				lineText: line,
				updatedLine,
			});
		}

		return updatedLine;
	});

	return {
		matches,
		updatedContent: matches.length === 0 ? content : updatedLines.join("\n"),
	};
}
