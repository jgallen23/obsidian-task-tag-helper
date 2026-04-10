import { Notice, TFolder, type TFile } from "obsidian";

import type ObsidianTaskTagsHelperPlugin from "../main";
import {
	confirmRemoval,
	promptForTag,
	type PreviewMatch,
} from "./modals";
import { isFolderPathValid, normalizeFolderSetting } from "./settings";
import {
	collectTaskTagsFromContent,
	normalizeTagInput,
	scanContentForTag,
} from "../lib/taskTagRemoval";

interface FileChangePlan {
	file: TFile;
	matches: PreviewMatch[];
	updatedContent: string;
}

export function registerCommands(
	plugin: ObsidianTaskTagsHelperPlugin,
): void {
	plugin.addCommand({
		id: "remove-task-tag-in-vault",
		name: "Remove task tag in vault",
		callback: async () => {
			await removeTaskTagInVault(plugin);
		},
	});

	plugin.addCommand({
		id: "remove-task-tag-in-current-file",
		name: "Remove task tag in current file",
		callback: async () => {
			await removeTaskTagInCurrentFile(plugin);
		},
	});
}

async function removeTaskTagInVault(
	plugin: ObsidianTaskTagsHelperPlugin,
): Promise<void> {
	const scope = normalizeFolderSetting(plugin.settings.defaultScanFolder);
	if (!isFolderPathValid(plugin.app, scope)) {
		new Notice(`Folder not found: ${scope}`);
		return;
	}

	const folder =
		scope.length === 0 ? null : plugin.app.vault.getAbstractFileByPath(scope);
	if (folder !== null && !(folder instanceof TFolder)) {
		new Notice(`Folder not found: ${scope}`);
		return;
	}

	const files = scopeMarkdownFiles(plugin, scope);
	if (files.length === 0) {
		new Notice(
			scope.length === 0
				? "No markdown files found in the vault."
				: `No markdown files found in ${scope}.`,
		);
		return;
	}

	const tag = await promptForRemovalTag(plugin, files);
	if (tag === null) {
		return;
	}

	const plans = await buildFileChangePlans(plugin, files, tag);
	await confirmAndApplyPlans(plugin, tag, plans, "Remove task tag in vault");
}

async function removeTaskTagInCurrentFile(
	plugin: ObsidianTaskTagsHelperPlugin,
): Promise<void> {
	const activeFile = plugin.app.workspace.getActiveFile();
	if (activeFile === null || activeFile.extension !== "md") {
		new Notice("Open a markdown file to use this command.");
		return;
	}

	const tag = await promptForRemovalTag(plugin, [activeFile]);
	if (tag === null) {
		return;
	}

	const plans = await buildFileChangePlans(plugin, [activeFile], tag);
	await confirmAndApplyPlans(
		plugin,
		tag,
		plans,
		"Remove task tag in current file",
	);
}

async function promptForRemovalTag(
	plugin: ObsidianTaskTagsHelperPlugin,
	files: TFile[],
): Promise<string | null> {
	const availableTags = await collectAvailableTaskTags(plugin, files);
	const rawTag = await promptForTag(plugin.app, availableTags);
	if (rawTag === null) {
		return null;
	}

	const tag = normalizeTagInput(rawTag);
	if (tag === null) {
		new Notice("Enter a single tag such as #next.");
		return null;
	}

	return tag;
}

async function collectAvailableTaskTags(
	plugin: ObsidianTaskTagsHelperPlugin,
	files: TFile[],
): Promise<string[]> {
	const availableTags = new Set<string>();

	for (const file of files) {
		const content = await plugin.app.vault.cachedRead(file);
		for (const tag of collectTaskTagsFromContent(content)) {
			availableTags.add(tag);
		}
	}

	return [...availableTags].sort((left, right) => left.localeCompare(right));
}

function scopeMarkdownFiles(
	plugin: ObsidianTaskTagsHelperPlugin,
	folderPath: string,
): TFile[] {
	return plugin.app.vault.getMarkdownFiles().filter((file) => {
		if (folderPath.length === 0) {
			return true;
		}

		return file.path === folderPath || file.path.startsWith(`${folderPath}/`);
	});
}

async function buildFileChangePlans(
	plugin: ObsidianTaskTagsHelperPlugin,
	files: TFile[],
	tag: string,
): Promise<FileChangePlan[]> {
	const plans: FileChangePlan[] = [];

	for (const file of files) {
		const content = await plugin.app.vault.cachedRead(file);
		const result = scanContentForTag(content, tag);

		if (result.matches.length === 0) {
			continue;
		}

		plans.push({
			file,
			matches: result.matches.map((match) => ({
				filePath: file.path,
				lineNumber: match.lineNumber,
				lineText: match.lineText,
			})),
			updatedContent: result.updatedContent,
		});
	}

	return plans;
}

async function confirmAndApplyPlans(
	plugin: ObsidianTaskTagsHelperPlugin,
	tag: string,
	plans: FileChangePlan[],
	title: string,
): Promise<void> {
	const matchCount = plans.reduce((total, plan) => total + plan.matches.length, 0);
	if (matchCount === 0) {
		new Notice(`No unchecked task lines with ${tag} found.`);
		return;
	}

	const confirmed = await confirmRemoval(
		plugin.app,
		{
			fileCount: plans.length,
			tag,
			taskCount: matchCount,
			title,
		},
		plans.flatMap((plan) => plan.matches),
	);

	if (!confirmed) {
		new Notice("Cancelled.");
		return;
	}

	for (const plan of plans) {
		await plugin.app.vault.modify(plan.file, plan.updatedContent);
	}

	new Notice(
		`Removed ${tag} from ${matchCount} unchecked task(s) in ${plans.length} file(s).`,
		8000,
	);
}
