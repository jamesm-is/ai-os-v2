import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
export interface TemplateMetadata {
    name: string;
    description: string;
}
export declare const listTemplates: () => TemplateMetadata[];
export interface AgentEntry {
    readonly name: string;
    readonly label: string;
    readonly defaultModel: string;
    readonly factoryImport: string;
    readonly dockerfileTemplate: string;
    /** Lines to include in the generated `.env.example` for this agent's API key. */
    readonly envExample: string;
    /**
     * Copy-pasteable interactive command that feeds the custom-issue-tracker
     * setup prompt to this agent's CLI on the host. Printed in init's next steps
     * when the `custom` issue tracker is selected. Runs on the host (the
     * sandbox image isn't built yet), so the user must have the CLI installed.
     */
    readonly setupCommand: string;
}
export declare const listAgents: () => AgentEntry[];
export interface IssueTrackerEntry {
    readonly name: string;
    readonly label: string;
    readonly templateArgs: {
        readonly LIST_TASKS_COMMAND: string;
        readonly VIEW_TASK_COMMAND: string;
        readonly CLOSE_TASK_COMMAND: string;
        readonly ISSUE_TRACKER_TOOLS: string;
    };
    /** Lines to append to `.env.example` for this issue tracker, or empty string if none needed. */
    readonly envExample: string;
}
export declare const listIssueTrackers: () => IssueTrackerEntry[];
export declare const getIssueTracker: (name: string) => IssueTrackerEntry | undefined;
export declare const getAgent: (name: string) => AgentEntry | undefined;
export interface SandboxProviderEntry {
    readonly name: string;
    readonly label: string;
    /** Filename written to .sandcastle/ (e.g. "Dockerfile" or "Containerfile") */
    readonly containerfileName: string;
    /** CLI namespace for build/remove commands (e.g. "docker" or "podman") */
    readonly cliNamespace: string;
}
export declare const listSandboxProviders: () => SandboxProviderEntry[];
export declare const getSandboxProvider: (name: string) => SandboxProviderEntry | undefined;
export declare function getNextStepsLines(template: string, mainFilename: string, issueTracker: IssueTrackerEntry, agent: AgentEntry): string[];
export interface ScaffoldOptions {
    agent: AgentEntry;
    model: string;
    templateName?: string;
    createLabel?: boolean;
    issueTracker?: IssueTrackerEntry;
    sandboxProvider?: SandboxProviderEntry;
}
export interface ScaffoldResult {
    mainFilename: string;
}
export declare const scaffold: (repoDir: string, options: ScaffoldOptions) => Effect.Effect<ScaffoldResult, Error, FileSystem.FileSystem>;
//# sourceMappingURL=InitService.d.ts.map