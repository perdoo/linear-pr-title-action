"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBodyWithIssues = exports.getLinearIssueIds = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const sdk_1 = require("@linear/sdk");
const lodash_1 = require("lodash");
const PR_TITLE_UPDATE_KEYWORD = "x";
const getLinearIssueIds = (pullRequest) => {
    var _a;
    const issueIds = [];
    // From the branch name
    const branchName = pullRequest.head.ref;
    let match = branchName.match(/^([a-z]+\-\d+)\-/);
    if (!(0, lodash_1.isNil)(match))
        issueIds.push(match[1].toUpperCase());
    // From the PR body
    const body = (_a = pullRequest.body) !== null && _a !== void 0 ? _a : "";
    const regexp = /Fixes ([a-z]+\-\d+)|Resolves ([a-z]+\-\d+)/gi;
    const matches = [...body.matchAll(regexp)];
    matches.forEach((match) => {
        const captureMatch = match[1] || match[2];
        issueIds.push(captureMatch.toUpperCase());
    });
    return issueIds;
};
exports.getLinearIssueIds = getLinearIssueIds;
/**
 * @see https://www.conventionalcommits.org/en/v1.0.0/
 */
const getConventionalCommitPrefix = (issue) => __awaiter(void 0, void 0, void 0, function* () {
    const labels = yield issue.labels();
    const isBug = labels.nodes.some(label => /bug/i.test(label.name));
    if (isBug)
        return "fix: ";
    const isChore = labels.nodes.some(label => /chore/i.test(label.name));
    if (isChore)
        return "chore: ";
    const isFeature = labels.nodes.some(label => /feature/i.test(label.name));
    if (isFeature)
        return "feat: ";
    return null;
});
const getTitleFromIssueId = (linearClient, pullRequest, issueId) => __awaiter(void 0, void 0, void 0, function* () {
    if (pullRequest.title != PR_TITLE_UPDATE_KEYWORD) {
        core.info(`PR title isn't set to keyword '${PR_TITLE_UPDATE_KEYWORD}'.`);
        return pullRequest.title;
    }
    core.info(`Calculating title from issue ${issueId}`);
    const issue = yield linearClient.issue(issueId);
    core.info(`Fetched issue ${issue.title}`);
    const parentIssue = yield issue.parent;
    if (!(0, lodash_1.isNil)(parentIssue))
        core.info(`Fetched parent issue ${parentIssue.title}`);
    const project = yield issue.project;
    if (!(0, lodash_1.isNil)(project))
        core.info(`Fetched project ${project.name}`);
    let prefix = yield getConventionalCommitPrefix(issue);
    if (!(0, lodash_1.isNil)(parentIssue) && (0, lodash_1.isNil)(prefix))
        prefix = yield getConventionalCommitPrefix(parentIssue);
    let title = prefix;
    title += project ? `${project.name} | ` : "";
    title += issue.title;
    title += parentIssue ? ` < ${parentIssue.title}` : "";
    return title;
});
const getBodyWithIssues = (linearClient, pullRequest, issueIds) => __awaiter(void 0, void 0, void 0, function* () {
    let body = (0, lodash_1.isNil)(pullRequest.body) ? "" : pullRequest.body;
    let previousIssueUrl = null;
    core.info(`Calculating body from issues: ${issueIds.join(", ")}`);
    for (const issueId of issueIds) {
        const issue = yield linearClient.issue(issueId);
        if (!body.includes(issue.url)) {
            const markdownUrl = `Linear: [${issue.title}](${issue.url})`;
            if (!(0, lodash_1.isNil)(previousIssueUrl)) {
                body = body.replace(`](${previousIssueUrl})`, `](${previousIssueUrl})\n${markdownUrl}`);
            }
            else {
                body = `${markdownUrl}\n${body}`;
            }
        }
        // once we add a link, remove the manual "fixes ENG-123", if any, to avoid duplication.
        const issueIdRegex = new RegExp(`(fixes|resolves) ${issueId}\n`, "i");
        if (issueIdRegex.test(body)) {
            body = body.replace(issueIdRegex, "");
        }
        previousIssueUrl = issue.url;
    }
    return body;
});
exports.getBodyWithIssues = getBodyWithIssues;
const updatePrTitleAndBody = (linearClient, octokit, pullRequest) => __awaiter(void 0, void 0, void 0, function* () {
    if ((0, lodash_1.isNil)(pullRequest.head.repo)) {
        // `.head.repo` can be null.
        // Reference: https://github.com/octokit/rest.js/issues/31#issue-860734069
        core.info(`PR is sourced from an "unknown repository".`);
        return;
    }
    const issueIds = (0, exports.getLinearIssueIds)(pullRequest);
    if (!issueIds.length) {
        core.info("PR isn't linked to any Linear issues.");
        return;
    }
    core.info(`PR linked to Linear issues: ${issueIds.join(", ")}.`);
    const title = yield getTitleFromIssueId(linearClient, pullRequest, issueIds[0]);
    core.info(`Inferred title: ${title}`);
    const body = yield (0, exports.getBodyWithIssues)(linearClient, pullRequest, issueIds);
    core.info(`Inferred body: ${body}`);
    const data = {
        repo: pullRequest.head.repo.name,
        owner: pullRequest.head.repo.owner.login,
        pull_number: pullRequest.number,
        title,
        body,
    };
    yield octokit.rest.pulls.update(data);
});
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const linearApiKey = core.getInput("linearApiKey");
            const ghToken = core.getInput("ghToken");
            core.setSecret("linearApiKey");
            core.setSecret("ghToken");
            const linearClient = new sdk_1.LinearClient({
                apiKey: linearApiKey,
            });
            const octokit = github.getOctokit(ghToken);
            const { number: prNumber, repository } = github.context.payload;
            if ((0, lodash_1.isNil)(repository))
                return;
            const { data: pullRequest } = yield octokit.rest.pulls.get({
                repo: repository.name,
                owner: repository.owner.login,
                pull_number: prNumber,
            });
            yield updatePrTitleAndBody(linearClient, octokit, pullRequest);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
if (process.env.GITHUB_ACTIONS) {
    run();
}
//# sourceMappingURL=index.js.map