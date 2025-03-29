import { toaster } from "@/components/ui/toaster"
import { fetchFromCache, updateLocalCache } from "@/util/commonFunctions";
import issueFetcher from "@/util/issueFetcher.js";



const getCacheName = (project) => {
    return project ? "localProjectCache" : "localIssuesCache";
};
const GITHUB_API_URL = "https://api.github.com/graphql";

import {query} from "./github-project-status-query.js";

interface FieldValue {
    name?: string; // Status field (e.g., "Done", "In Progress")
}

interface ProjectItem {
    id: string;
    title: string;
    fieldValues: {
        nodes: FieldValue[];
    };
}

interface PageInfo {
    hasNextPage: boolean;
    endCursor: string | null;
}

interface ProjectItemsResponse {
    data?: {
        node: {
            items: {
                nodes: ProjectItem[];
                pageInfo: PageInfo;
            };
        };
    };
    errors?: { message: string }[];
}

// Fetch tasks in a GitHub ProjectV2 with pagination
async function fetchAllProjectTasks(projectId: string, githubToken: string): Promise<ProjectItem[]> {
    let tasks: ProjectItem[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {

        const variables = { projectId, after: endCursor };
        const body = JSON.stringify({ query, variables });

        // console.log(`query: [${body}]`);

        const response = await fetch(GITHUB_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${githubToken}`,
                "Content-Type": "application/json"
            },
            body
        });

        const data: ProjectItemsResponse = await response.json();

        if (data.errors) {
            console.error("GraphQL Errors:", data.errors);
            return tasks;
        }

        const items = data.data?.node.items;
        if (!items) break;

        tasks = tasks.concat(items.nodes);

        // Update pagination info
        hasNextPage = items.pageInfo.hasNextPage;
        endCursor = items.pageInfo.endCursor;
    }

    return tasks;
}

const flattenGraphQLResponse = function (response) {
    const flat = {};

    // Extract top-level fields
    flat["id"] = response.id;
    if (response.content) {
        flat["title"] = response.content.title;
        flat["issue_number"] = response.content.number;
        flat["repository"] = response.content.repository?.name;
        flat["repo_owner"] = response.content.repository?.owner?.login;
        flat["labels"] = response.content.labels?.nodes || [];
        
        // Extract assignees (comma-separated list)
        flat["assignees"] = response.content?.assignees?.nodes.map(a => a.login);
    }

    // Extract fieldValues
    if (response.fieldValues) {
        response.fieldValues.nodes.forEach(field => {
            if (field.field && field.field.name) {
                if (field.text !== undefined) {
                    flat[field.field.name] = field.text;
                } else if (field.name !== undefined) {
                    flat[field.field.name] = field.name;
                } else if (field.number !== undefined) {
                    flat[field.field.name] = field.number;
                } else if (field.title !== undefined) {
                    flat[field.field.name] = field.title;
                }
            }
        });
    }

    return flat;
}


function convertTaskFormat(source) {
    return {
      id: source.node_id || null,
      title: source.title || null,
      issue_number: source.number || null,
      repository: source.repository_url?.split("/").pop() || null,
      repo_owner: source.repository_url?.split("/")[4] || null,
      labels: source.labels?.map((label) => label.name) || [],
      assignees: source.assignees?.map((assignee) => assignee.login) || [],
      Title: source.title || null,
      Status: source.state === "closed" ? "Done" : "Todo",
      Sprint: null, // Sprint information is not available in the source format
      Size: null, // Size information is not available in the source format
      "Estimate (days)": null, // Estimate is not available in the source format
      "Actual (days)": null, // Actual effort is not available in the source format
    };
  }

async function mainScript ({projectID, githubToken, repository, repoOwner}){
    try {
        const cacheName = getCacheName(projectID);
        let tasks = fetchFromCache(cacheName);
        
        if(tasks) {
            toaster.create({
                description: `Fetched tasks from cache`,
                type: "info",
            });
        } else {
            toaster.create({
                description: `Fetched tasks from Github`,
                type: "info",
            });
            if(projectID) {
                const graphqlTasks = await fetchAllProjectTasks(projectID, githubToken)
                tasks = graphqlTasks.map(flattenGraphQLResponse);
            } else {
                const tasksResponse = await issueFetcher({repository, githubToken, repoOwner})
                tasks = tasksResponse.map(convertTaskFormat);
            }
            updateLocalCache(cacheName, tasks);
        }
        return tasks;
       
    } catch(error) {
        console.log("Fetch Error:", error)
    }
    
}

export default mainScript;