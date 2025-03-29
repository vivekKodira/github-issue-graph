import { toaster } from "@/components/ui/toaster"
import { fetchFromCache, updateLocalCache } from "./commonFunctions.js";
import issueFetcher from "./issueFetcher.js";
import { convertGraphQLFormat, TaskFormat } from "./taskConverter.js";




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
        // Basic issue fields
        flat["title"] = response.content.title;
        flat["issue_number"] = response.content.number;
        flat["repository"] = response.content.repository?.name;
        flat["repo_owner"] = response.content.repository?.owner?.login;
        flat["labels"] = response.content.labels?.nodes || [];
        flat["assignees"] = response.content?.assignees?.nodes.map(a => a.login) || [];
        
        // New fields from enhanced query
        flat["body"] = response.content.body;
        flat["state"] = response.content.state;
        flat["Status"] = response.content.state === "closed" ? "Done" : "Todo"; // Match taskConverter format
        flat["html_url"] = response.content.html_url;

        // Process sub-issues into links array
        flat["links"] = (response.content.subIssues?.nodes || [])
            .filter(node => node?.source?.number) // Filter out any invalid references
            .map(node => ({
                type: "issue",
                id: node.source.number.toString(),
                url: node.source.html_url || `https://github.com/${flat["repo_owner"]}/${flat["repository"]}/issues/${node.source.number}`
            }));
    }

    // Extract fieldValues (custom project fields)
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

async function mainScript({projectID="", githubToken, repository="", repoOwner}): Promise<TaskFormat[]> {
    try {
        let tasks = fetchFromCache({cacheKey: "issues", projectID, repository});
        
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
                tasks = graphqlTasks.map(flattenGraphQLResponse).map(convertGraphQLFormat);
            } else {
                const tasksResponse = await issueFetcher({repository, githubToken, repoOwner})
                tasks = tasksResponse;
            }
            updateLocalCache({projectID, repository, data:tasks, cacheKey: "issues"});
        }
        return tasks;
    } catch(error) {
        console.log("Fetch Error:", error)
        return [];
    }
}

export default mainScript;