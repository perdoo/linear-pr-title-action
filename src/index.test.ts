import { getIssueIdFromBranchName } from ".";

describe("getIssueIdFromBranchName", () => {

    test('it should parse the branch name correctly', () => {
        const branchName = "feature/eng-952-wow-make-pr-titles-autoupdate-with";
        const issueId = getIssueIdFromBranchName(branchName);
        expect(issueId).toBe("ENG-952");
    });

    test('it should ignore other numbers', () => {
        const branchName = "feature/eng-952-234-wow234-make-pr-3746-2726";
        const issueId = getIssueIdFromBranchName(branchName);
        expect(issueId).toBe("ENG-952");
    });

    test('it should work with other teams', () => {
        const branchName = "feature/pro-397-something";
        const issueId = getIssueIdFromBranchName(branchName);
        expect(issueId).toBe("PRO-397");
    });

    test('it should return nothing upon incorrect format', () => {
        const branchName = "nonfeature/eng-397-something";
        const issueId = getIssueIdFromBranchName(branchName);
        expect(issueId).toBeNull();
    });

})
