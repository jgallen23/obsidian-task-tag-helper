import { Plugin } from "obsidian";

import { registerCommands } from "./core/commands";
import {
	DEFAULT_SETTINGS,
	TaskTagsHelperSettingTab,
	type TaskTagsHelperSettings,
} from "./core/settings";

export default class ObsidianTaskTagsHelperPlugin extends Plugin {
	settings: TaskTagsHelperSettings = DEFAULT_SETTINGS;

	override async onload(): Promise<void> {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};

		this.addSettingTab(new TaskTagsHelperSettingTab(this.app, this));
		registerCommands(this);
	}

	override onunload(): void {
		// Obsidian cleans up registered commands and setting tabs automatically.
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
