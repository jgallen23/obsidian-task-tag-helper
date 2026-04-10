import {
	PluginSettingTab,
	Setting,
	normalizePath,
	type App,
	type TFolder,
} from "obsidian";

import type ObsidianTaskTagsHelperPlugin from "../main";

export interface TaskTagsHelperSettings {
	defaultScanFolder: string;
}

export const DEFAULT_SETTINGS: TaskTagsHelperSettings = {
	defaultScanFolder: "",
};

export function normalizeFolderSetting(value: string): string {
	const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
	return trimmed.length === 0 ? "" : normalizePath(trimmed);
}

export function isFolderPathValid(app: App, folderPath: string): boolean {
	if (folderPath.length === 0) {
		return true;
	}

	const folder = app.vault.getAbstractFileByPath(folderPath);
	return folder !== null && (folder as TFolder).children !== undefined;
}

export class TaskTagsHelperSettingTab extends PluginSettingTab {
	plugin: ObsidianTaskTagsHelperPlugin;

	constructor(app: App, plugin: ObsidianTaskTagsHelperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	override display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Default scan folder")
			.setDesc(
				"Optional vault-relative folder for the vault-wide command. Leave blank to scan the whole vault.",
			)
			.addText((text) => {
				text
					.setPlaceholder("0Tasks")
					.setValue(this.plugin.settings.defaultScanFolder)
					.onChange(async (value) => {
						this.plugin.settings.defaultScanFolder =
							normalizeFolderSetting(value);
						await this.plugin.saveSettings();
					});
			});
	}
}
