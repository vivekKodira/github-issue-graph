import { toaster } from "@/components/ui/toaster"
import { fetchFromCache, updateLocalCache } from "./commonFunctions.js";
import issueFetcher from "./issueFetcher.js";
import { convertGraphQLFormat, TaskFormat } from "./taskConverter.js";
import { appendRenderLog } from "./renderDebugLog";

// Debug flag - controlled by localStorage
// To enable: Open browser console and run: localStorage.setItem('ENABLE_DEBUG', 'true')
// To disable: localStorage.removeItem('ENABLE_DEBUG')
const ENABLE_DEBUG = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('ENABLE_DEBUG') === 'true';
    }
    return false;
};

const debugLogGraphQLResponse = (item: any) => {
    if (!ENABLE_DEBUG()) return;
    console.log('Raw GraphQL Response (first item):', JSON.stringify(item, null, 2));
};

const GITHUB_API_URL = "https://api.github.com/graphql";

/** Yield to main thread between paginated requests to avoid browser throttling/abort when devtools is closed. */
const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 50));

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
    const tasks: ProjectItem[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;
    let page = 0;

    while (hasNextPage) {
        await yieldToMain();
        page += 1;
        appendRenderLog(`[project] page ${page} start`);
        const variables = { projectId, after: endCursor };
        const body = JSON.stringify({ query, variables });

        try {
            const response = await fetch(GITHUB_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${githubToken}`,
                    "Content-Type": "application/json"
                },
                body
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const data: ProjectItemsResponse = await response.json();

            if (data.errors) {
                console.error("GraphQL Errors:", data.errors);
                throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
            }

            const items = data.data?.node.items;
            if (!items) {
                console.warn("No items found in response");
                break;
            }

            // Debug: Log first item raw response
            if (tasks.length === 0 && items.nodes.length > 0) {
                debugLogGraphQLResponse(items.nodes[0]);
            }

            tasks.push(...items.nodes);

            hasNextPage = items.pageInfo.hasNextPage;
            endCursor = items.pageInfo.endCursor;
            appendRenderLog(`[project] page ${page} ok (${items.nodes.length} items)`);
        } catch (error: unknown) {
            const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
            appendRenderLog(`[project] page ${page} error: ${msg}`);
            console.error("Error fetching project tasks:", error);
            throw error;
        }
    }

    return tasks;
}

export const flattenGraphQLResponse = function (response) {
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
        
        // Extract milestone title
        flat["milestone"] = response.content.milestone?.title || null;
        
        // New fields from enhanced query
        flat["body"] = response.content.body;
        flat["state"] = response.content.state;
        flat["Status"] = response.content.state === "closed" ? "Done" : "Todo"; // Match taskConverter format
        flat["html_url"] = response.content.url;
        flat["createdAt"] = response.content.createdAt;
        
        // Debug logging for first item
        if (!flattenGraphQLResponse.hasLogged) {
            console.log('[DEBUG] First GraphQL response.content:', response.content);
            console.log('[DEBUG] Extracted createdAt:', response.content.createdAt);
            flattenGraphQLResponse.hasLogged = true;
        }
        
        // Issue type from repository
        if (response.content.issueType) {
            flat["Type"] = typeof response.content.issueType === 'string' 
                ? response.content.issueType 
                : response.content.issueType.name;
        }

        // Process sub-issues into links array
        flat["links"] = (response.content.subIssues?.nodes || [])
            .filter(node => node?.source?.number) // Filter out any invalid references
            .map(node => ({
                type: "issue",
                id: node.source.number.toString(),
                url: node.source.url || `https://github.com/${flat["repo_owner"]}/${flat["repository"]}/issues/${node.source.number}`
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
        const cacheKey = "issues";
        const cachedTasks = await fetchFromCache({cacheKey, projectID, repository});
        
        if(cachedTasks) {
            toaster.create({
                description: `Fetched tasks from cache`,
                type: "info",
            });
            return cachedTasks;
        }

        toaster.create({
            description: `Fetching tasks from Github`,
            type: "info",
        });

        let fetchedTasks: TaskFormat[];
        if(projectID) {
            const graphqlTasks = await fetchAllProjectTasks(projectID, githubToken);
            // Filter out Pull Requests (PRs have mergedAt field) and items without content
            const issuesOnly = graphqlTasks.filter(item => 
                item.content && 
                item.content.title !== null &&
                !item.content.mergedAt  // PRs have mergedAt, Issues don't
            );
            console.log(`Filtered ${graphqlTasks.length - issuesOnly.length} non-issue items (PRs, drafts, etc.)`);
            const flattened = issuesOnly.map(flattenGraphQLResponse);
            fetchedTasks = flattened.map(convertGraphQLFormat);
            
            // Debug: Log first converted task
            if (fetchedTasks.length > 0) {
                console.log('[DEBUG] First flattened task:', flattened[0]);
                console.log('[DEBUG] First converted task:', fetchedTasks[0]);
                console.log('[DEBUG] First task createdAt:', fetchedTasks[0].createdAt);
            }
        } else {
            fetchedTasks = await issueFetcher({repository, githubToken, repoOwner});
        }

        if (fetchedTasks && fetchedTasks.length > 0) {
            console.log(`Successfully fetched ${fetchedTasks.length} tasks from GitHub`);
            await updateLocalCache({projectID, repository, data: fetchedTasks, cacheKey});
        } else {
            console.warn("No tasks fetched from GitHub");
        }

        return fetchedTasks;
    } catch(error) {
        console.error("Fetch Error:", error);
        toaster.create({
            description: "Error fetching tasks. Please try again.",
            type: "error",
        });
        return [];
    }
}

export default mainScript;