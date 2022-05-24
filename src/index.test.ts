import { getLinearIssueIds } from ".";

let pullRequest;

beforeEach(() => {
  pullRequest = {
    number: 123,
    title: "",
    body: null,
    head: {
      ref: null,
      repo: {
        name: "bar",
        owner: {
          login: "foo",
        },
      },
    },
  };
});

describe("getLinearIssueIds", () => {
  test("it should parse the branch name correctly", () => {
    pullRequest.head.ref = "eng-952-wow-make-pr-titles-autoupdate-with";
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual(["ENG-952"]);
  });

  test("it should ignore other numbers", () => {
    pullRequest.head.ref = "eng-952-234-wow234-make-pr-3746-2726";
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual(["ENG-952"]);
  });

  test("it should work with other teams", () => {
    pullRequest.head.ref = "pro-397-something";
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual(["PRO-397"]);
  });

  test("it should return an empty list upon incorrect format", () => {
    pullRequest.head.ref = "something/eng-397-something";
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual([]);
  });

  test("it should parse the body correctly", () => {
    pullRequest.head.ref = "foo";
    pullRequest.body = "Much wow\nHopefully fixes ENG-123, resolves ENG-454";
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual(["ENG-123", "ENG-454"]);
  });

  test("it should return an empty list if no issue is mentioned in the body", () => {
    pullRequest.head.ref = "foo";
    pullRequest.body = "This is a story all about how...";
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual([]);
  });

  test("it should return an empty list if the body's empty", () => {
    pullRequest.head.ref = "foo";
    pullRequest.body = null;
    const issueIds = getLinearIssueIds(pullRequest);
    expect(issueIds).toEqual([]);
  });
});
