import { Octokit } from "octokit";
import { toaster } from "../components/ui/toaster"
import { fetchFromCache, updateLocalCache } from "./commonFunctions";

const cacheName = "localIssuesCache";
async function fetchSubIssues(octokit, issueData, repo_owner, repository) {
  for (const issue of issueData) {
    if (issue.sub_issues_summary?.total > 0) {
      toaster.create({
        description: `Fetching sub-issues for issue ${issue.number}`,
        type: "info",
      });
      let subIssues = await octokit.paginate(
        "GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues",
        {
          owner: repo_owner,
          repo: repository,
          issue_number: issue.number,
          per_page: 100,
          state: "all",
          headers: {
            "x-github-api-version": "2022-11-28",
          },
        }
      );
      issue.links = issue.links || [];

      issue.links.push(
        ...(subIssues || []).map((subIssue) => {
          return {
            type: "issue",
            id: subIssue.number,
            url: subIssue.html_url,
          };
        })
      );
    }
  }
}


async function fetchFromGithub(octokit, repoOwner, repository) {
  toaster.create({
    description: `Fetching issues from Github`,
    type: "info",
  });
  const issueData = await octokit.paginate(
    "GET /repos/{owner}/{repo}/issues?",
    {
      owner: repoOwner,
      repo: repository,
      per_page: 100,
      state: "all",
      headers: {
        "x-github-api-version": "2022-11-28",
      },
    }
  );

  await fetchSubIssues(octokit, issueData, repoOwner, repository);

  return issueData;
}



export default async function ({ repoOwner, repository, githubToken }) {
  const octokit = new Octokit({
    auth: githubToken,
  });

  let issueData = fetchFromCache(cacheName);

  if(issueData) {
    toaster.create({
      description: `Fetched issues from cache`,
      type: "info",
    });
    return issueData;
  }
  
  issueData = await fetchFromGithub(octokit, repoOwner, repository);

  updateLocalCache(cacheName, issueData);

  return issueData;
}

