import {
	ButtonComponent,
	FuzzySuggestModal,
	Modal,
	Setting,
	type App,
	type FuzzyMatch,
	type TextComponent,
} from "obsidian";

export interface PreviewMatch {
	filePath: string;
	lineNumber: number;
	lineText: string;
}

interface RemovalSummary {
	fileCount: number;
	tag: string;
	taskCount: number;
	title: string;
}

class TextPromptModal extends Modal {
	private input!: TextComponent;
	private chosenValue: string | null = null;
	private readonly placeholder: string;
	private readonly prompt: string;
	private readonly title: string;
	private resolved = false;
	private readonly resolveValue: (value: string | null) => void;

	constructor(
		app: App,
		title: string,
		prompt: string,
		placeholder: string,
		resolveValue: (value: string | null) => void,
	) {
		super(app);
		this.title = title;
		this.prompt = prompt;
		this.placeholder = placeholder;
		this.resolveValue = resolveValue;
	}

	override onOpen(): void {
		this.setTitle(this.title);
		this.contentEl.createEl("p", { text: this.prompt });

		new Setting(this.contentEl).addText((text) => {
			this.input = text;
			text.setPlaceholder(this.placeholder);
			text.inputEl.addEventListener("keydown", (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					this.submit();
				}
			});
		});

		const actions = this.contentEl.createDiv({
			cls: "task-tags-helper-modal-actions",
		});

		new ButtonComponent(actions)
			.setButtonText("Cancel")
			.onClick(() => this.close());

		new ButtonComponent(actions)
			.setButtonText("Continue")
			.setCta()
			.onClick(() => this.submit());

		window.setTimeout(() => this.input.inputEl.focus(), 0);
	}

	override onClose(): void {
		this.contentEl.empty();
		if (!this.resolved) {
			this.resolveValue(null);
		}
	}

	private submit(): void {
		this.resolved = true;
		this.chosenValue = this.input.getValue();
		this.close();
		window.setTimeout(() => this.resolveValue(this.chosenValue), 0);
	}
}

class TagSuggestModal extends FuzzySuggestModal<string> {
	private readonly availableTags: string[];
	private chosenTag: string | null = null;
	private resolver: ((value: string | null) => void) | null = null;
	private settled = false;

	constructor(app: App, availableTags: string[]) {
		super(app);
		this.availableTags = availableTags;
		this.setPlaceholder("Choose a tag to remove");
		this.limit = 20;
		this.setInstructions([
			{ command: "↑↓", purpose: "navigate" },
			{ command: "↵", purpose: "choose tag" },
			{ command: "esc", purpose: "cancel" },
		]);
	}

	getItems(): string[] {
		return this.availableTags;
	}

	getItemText(tag: string): string {
		return tag;
	}

	override onChooseSuggestion(
		item: FuzzyMatch<string>,
		evt: MouseEvent | KeyboardEvent,
	): void {
		this.chosenTag = item.item;
		this.finish(item.item);
		super.onChooseSuggestion(item, evt);
	}

	onChooseItem(tag: string, evt: MouseEvent | KeyboardEvent): void {
		void evt;
		this.chosenTag = tag;
		this.finish(tag);
	}

	override onClose(): void {
		super.onClose();
		globalThis.setTimeout(() => {
			this.finish(this.chosenTag);
		}, 0);
	}

	pick(): Promise<string | null> {
		return new Promise((resolve) => {
			this.resolver = resolve;
			this.chosenTag = null;
			this.settled = false;
			globalThis.setTimeout(() => {
				if (!this.settled) {
					this.open();
				}
			}, 0);
		});
	}

	private finish(value: string | null): void {
		if (this.settled || !this.resolver) {
			return;
		}

		this.settled = true;
		const resolve = this.resolver;
		this.resolver = null;
		this.chosenTag = null;
		resolve(value);
	}
}

class ConfirmRemovalModal extends Modal {
	private readonly previewLimit: number;
	private readonly previewMatches: PreviewMatch[];
	private readonly resolveValue: (confirmed: boolean) => void;
	private resolved = false;
	private readonly summary: RemovalSummary;

	constructor(
		app: App,
		summary: RemovalSummary,
		previewMatches: PreviewMatch[],
		previewLimit: number,
		resolveValue: (confirmed: boolean) => void,
	) {
		super(app);
		this.summary = summary;
		this.previewMatches = previewMatches;
		this.previewLimit = previewLimit;
		this.resolveValue = resolveValue;
	}

	override onOpen(): void {
		this.setTitle(this.summary.title);

		this.contentEl.createEl("p", {
			text: `Found ${this.summary.taskCount} unchecked task(s) with ${this.summary.tag} in ${this.summary.fileCount} file(s).`,
		});

		if (this.previewMatches.length > 0) {
			this.contentEl.createEl("p", { text: "Preview:" });
			const preview = this.previewMatches
				.slice(0, this.previewLimit)
				.map(
					(match) =>
						`${match.filePath}:${match.lineNumber} - ${match.lineText}`,
				)
				.join("\n");

			this.contentEl.createEl("pre", {
				cls: "task-tags-helper-preview",
				text:
					this.previewMatches.length > this.previewLimit
						? `${preview}\n...and ${
								this.previewMatches.length - this.previewLimit
						  } more.`
						: preview,
			});
		}

		const actions = this.contentEl.createDiv({
			cls: "task-tags-helper-modal-actions",
		});

		new ButtonComponent(actions)
			.setButtonText("Cancel")
			.onClick(() => this.close());

		new ButtonComponent(actions)
			.setButtonText("Remove tag")
			.setWarning()
			.onClick(() => this.confirm());
	}

	override onClose(): void {
		this.contentEl.empty();
		if (!this.resolved) {
			this.resolveValue(false);
		}
	}

	private confirm(): void {
		this.resolved = true;
		this.resolveValue(true);
		this.close();
	}
}

export async function promptForTag(
	app: App,
	availableTags: string[],
): Promise<string | null> {
	if (availableTags.length === 0) {
		return await new Promise((resolve) => {
			const modal = new TextPromptModal(
				app,
				"Remove task tag",
				"Enter the tag to remove from unchecked tasks.",
				"#next",
				resolve,
			);
			modal.open();
		});
	}

	return await new TagSuggestModal(app, availableTags).pick();
}

export async function confirmRemoval(
	app: App,
	summary: RemovalSummary,
	previewMatches: PreviewMatch[],
	previewLimit = 15,
): Promise<boolean> {
	return await new Promise((resolve) => {
		const modal = new ConfirmRemovalModal(
			app,
			summary,
			previewMatches,
			previewLimit,
			resolve,
		);
		modal.open();
	});
}
