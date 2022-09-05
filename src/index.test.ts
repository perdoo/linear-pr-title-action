import { getBodyWithIssues, getLinearIssueIds } from ".";

const getPullRequest = (branchName: string, body: string | null) => {
  return {
    number: 123,
    title: "",
    body: body,
    head: {
      ref: branchName,
      repo: {
        name: "bar",
        owner: {
          login: "foo",
        },
      },
    },
  };
};

const mockLinearClient = {
  issue: (issueId: string) => Promise.resolve({
    title: "some issue title",
    url: "https://example.org/some-issue",
  }),
};

describe("getLinearIssueIds", () => {
  test("it should parse the branch name correctly", () => {
    const branchName = "eng-952-wow-make-pr-titles-autoupdate-with";
    const pullRequest = getPullRequest(branchName, null);
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual(["ENG-952"]);
  });

  test("it should ignore other numbers", () => {
    const branchName = "eng-952-234-wow234-make-pr-3746-2726";
    const pullRequest = getPullRequest(branchName, null);
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual(["ENG-952"]);
  });

  test("it should work with other teams", () => {
    const branchName = "pro-397-something";
    const pullRequest = getPullRequest(branchName, null);
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual(["PRO-397"]);
  });

  test("it should return an empty list upon incorrect format", () => {
    const branchName = "something/eng-397-something";
    const pullRequest = getPullRequest(branchName, null);
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual([]);
  });

  test("it should parse the body correctly", () => {
    const branchName = "foo";
    const body = "Much wow\nHopefully fixes ENG-123, resolves ENG-454";
    const pullRequest = getPullRequest(branchName, body);
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual(["ENG-123", "ENG-454"]);
  });

  test("it should return an empty list if no issue is mentioned in the body", () => {
    const branchName = "foo";
    const body = "Lorem ipsum dolor sit amet";
    const pullRequest = getPullRequest(branchName, body);
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual([]);
  });

  test("it should return an empty list if the body's empty", () => {
    const branchName = "foo";
    const body = null;
    const pullRequest = getPullRequest(branchName, body);
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual([]);
  });

  test("it should return issues from the branch and the body", () => {
    const branchName = "eng-397-something";
    const body = "resolves eng-454";
    const pullRequest = getPullRequest(branchName, body);
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual(["ENG-397", "ENG-454"]);
  });

  it("should replace manually added issue id with a link", async () => {
    const branchName = "foo";
    const body = "hi!\nfixes eng-123\nbye!";
    const pullRequest = getPullRequest(branchName, body);
    const issueIds = getLinearIssueIds(pullRequest);
    // @ts-expect-error is not an actual LinearClinet but doesn't matter
    const newBody = await getBodyWithIssues(mockLinearClient, pullRequest, issueIds);

    expect(newBody).toEqual("Linear: [some issue title](https://example.org/some-issue)\nhi!\nbye!");
  });
});
