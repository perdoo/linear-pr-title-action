import * as core from "@actions/core";
import * as github from "@actions/github";
import { LinearClient } from "@linear/sdk";
import { isNil } from "lodash";

const PR_TITLE_UPDATE_KEYWORD = "x";

type PullRequest = {
  number: number;
  title: string;
  body: string | null;
  head: {
    ref: string;
    repo: {
      name: string;
      owner: {
        login: string;
      };
    } | null;
  };
};

export const getLinearIssueIds = (pullRequest: PullRequest) => {
  const issueIds: string[] = [];

  // From the branch name
  const branchName = pullRequest.head.ref;
  let match = branchName.match(/^([a-z]+\-\d+)\-/);
  if (!isNil(match)) issueIds.push(match[1].toUpperCase());

  // From the PR body
  const body = isNil(pullRequest.body) ? "" : pullRequest.body;
  const bodyRegex = /Fixes ([a-z]+\-\d+)|Resolves ([a-z]+\-\d+)/gi;
  match = bodyRegex.exec(body);
  while (match != null) {
    issueIds.push(match[1] || match[2]);
    match = bodyRegex.exec(body);
  }

  return issueIds;
};

const getTitleFromIssueId = async (
  linearClient: LinearClient,
  pullRequest: PullRequest,
  issueId: string
) => {
  if (pullRequest.title != PR_TITLE_UPDATE_KEYWORD) {
    core.info(`PR title isn't set to keyword '${PR_TITLE_UPDATE_KEYWORD}'.`);
    return pullRequest.title;
  }

  const issue = await linearClient.issue(issueId);
  const parentIssue = await issue.parent;
  const project = await issue.project;

  let title = project ? `${project.name} | ` : "";
  title += issue.title;
  title += parentIssue ? ` < ${parentIssue.title}` : "";

  return title;
};

const getBodyWithIssues = async (
  linearClient: LinearClient,
  pullRequest: PullRequest,
  issueIds: string[]
) => {
  let body = isNil(pullRequest.body) ? "" : pullRequest.body;
  let previousIssueUrl: string | null = null;

  for (const issueId in issueIds) {
    const issue = await linearClient.issue(issueId);

    if (!body.includes(issue.url)) {
      const markdownUrl = `Linear: [${issue.title}](${issue.url})`;

      if (previousIssueUrl) {
        body = body.replace(
          `](${previousIssueUrl})`,
          `](${previousIssueUrl})\n${markdownUrl}`
        );
      } else {
        body = `${markdownUrl}\n${body}`;
      }
    }

    previousIssueUrl = issue.url;
  }

  return body;
};

const updatePrTitleAndBody = async (
  linearClient: LinearClient,
  octokit,
  pullRequest: PullRequest
) => {
  if (isNil(pullRequest.head.repo)) {
    // `.head.repo` can be null.
    // Reference: https://github.com/octokit/rest.js/issues/31#issue-860734069
    core.info(`PR is sourced from an "unknown repository".`);
    return;
  }

  const issueIds = getLinearIssueIds(pullRequest);

  if (!issueIds.length) {
    core.info("PR isn't linked to any Linear issues.");
    return;
  } else {
    core.info(`PR linked to Linear issues: ${issueIds.join(", ")}.`);
  }

  const data = {
    repo: pullRequest.head.repo.name,
    owner: pullRequest.head.repo.owner.login,
    pull_number: pullRequest.number,
    title: await getTitleFromIssueId(linearClient, pullRequest, issueIds[0]),
    body: await getBodyWithIssues(linearClient, pullRequest, issueIds),
  };

  await octokit.rest.pulls.update(data);
};

async function run() {
  try {
    const linearApiKey = core.getInput("linearApiKey");
    const ghToken = core.getInput("ghToken");

    core.setSecret("linearApiKey");
    core.setSecret("ghToken");

    const linearClient = new LinearClient({
      apiKey: linearApiKey,
    });
    const octokit = github.getOctokit(ghToken);

    const { number: prNumber, repository } = github.context.payload;
    if (isNil(repository)) return;
    const { data: pullRequest } = await octokit.rest.pulls.get({
      repo: repository.name,
      owner: repository.owner.login,
      pull_number: prNumber,
    });

    await updatePrTitleAndBody(linearClient, octokit, pullRequest);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

if (process.env.GITHUB_ACTIONS) {
  run();
}
