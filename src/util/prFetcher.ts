import { toaster } from "@/components/ui/toaster";
import { fetchFromCache, updateLocalCache } from "./commonFunctions.js";
import { prQuery } from "./github-pr-query.js";
import { appendRenderLog } from "./renderDebugLog";

const GITHUB_API_URL = "https://api.github.com/graphql";

/** Yield to main thread between paginated requests to avoid browser throttling/abort when devtools is closed. */
const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 50));

interface ReviewComment {
    body: string;
    createdAt: string;
    author: {
        login: string;
    };
    path: string;
    position: number | null;
}

interface Review {
    state: string;
    author: {
        login: string;
    };
    comments: {
        nodes: ReviewComment[];
    };
}

interface PullRequest {
    id: string;
    title: string;
    number: number;
    createdAt: string;
    closedAt: string | null;
    mergedAt: string | null;
    state: string;
    body: string;
    author: {
        login: string;
    };
    assignees: {
        nodes: { login: string; }[];
    };
    labels: {
        nodes: { name: string; color: string; }[];
    };
    reviews: {
        nodes: Review[];
    };
    additions: number;
    deletions: number;
    changedFiles: number;
}

interface PageInfo {
    hasNextPage: boolean;
    endCursor: string | null;
}

interface PRQueryResponse {
    data?: {
        repository: {
            pullRequests: {
                totalCount: number;
                nodes: PullRequest[];
                pageInfo: PageInfo;
            };
        };
    };
    errors?: { message: string }[];
}

type OnProgress = (fetched: number, total: number) => void;

async function fetchAllPullRequests(
    owner: string,
    repo: string,
    githubToken: string,
    onProgress?: OnProgress
): Promise<PullRequest[]> {
    let pullRequests: PullRequest[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;
    let page = 0;
    let totalCount: number | null = null;

    while (hasNextPage) {
        await yieldToMain();
        page += 1;
        appendRenderLog(`[pr] page ${page} start`);
        const variables = { owner, repo, after: endCursor };
        const body = JSON.stringify({ query: prQuery, variables });

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
                const err = new Error(`GitHub API error: ${response.status} ${response.statusText}`);
                appendRenderLog(`[pr] page ${page} error: ${err.message}`);
                throw err;
            }

            const data: PRQueryResponse = await response.json();

            if (data.errors) {
                console.error("GraphQL Errors:", data.errors);
                appendRenderLog(`[pr] page ${page} error: GraphQL ${JSON.stringify(data.errors)}`);
                return pullRequests;
            }

            const prs = data.data?.repository.pullRequests;
            if (!prs) break;

            if (totalCount === null) totalCount = prs.totalCount;
            pullRequests = pullRequests.concat(prs.nodes);
            onProgress?.(pullRequests.length, totalCount);

            hasNextPage = prs.pageInfo.hasNextPage;
            endCursor = prs.pageInfo.endCursor;
            appendRenderLog(`[pr] page ${page} ok (${prs.nodes.length} prs)`);
        } catch (error: unknown) {
            const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
            appendRenderLog(`[pr] page ${page} error: ${msg}`);
            throw error;
        }
    }

    return pullRequests;
}

const flattenPRResponse = (pr: PullRequest) => {
    // Flatten all review comments into a single array
    const reviewComments = pr.reviews.nodes.flatMap(review => 
        review.comments.nodes.map(comment => ({
            body: comment.body,
            createdAt: comment.createdAt,
            author: comment.author.login,
            path: comment.path,
            position: comment.position,
            reviewState: review.state,
            reviewAuthor: review.author.login
        }))
    );

    return {
        id: pr.id,
        title: pr.title,
        number: pr.number,
        createdAt: pr.createdAt,
        closedAt: pr.closedAt,
        mergedAt: pr.mergedAt,
        state: pr.state,
        body: pr.body,
        author: pr.author.login,
        assignees: pr.assignees.nodes.map(a => a.login),
        labels: pr.labels.nodes,
        reviewers: pr.reviews.nodes.map(r => r.author.login),
        reviewStates: pr.reviews.nodes.map(r => r.state),
        reviewComments,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changedFiles,
    };
};

interface FetchPRsParams {
    repoOwner: string;
    repository: string;
    githubToken: string;
    onProgress?: OnProgress;
}

async function fetchPRs({ repoOwner, repository, githubToken, onProgress }: FetchPRsParams) {
    try {
        const cacheKey = `prs`;
        let prs = await fetchFromCache({cacheKey, repository});
        
        if (prs) {
            toaster.create({
                description: "Fetched PRs from cache",
                type: "info",
            });
        } else {
            toaster.create({
                description: "Fetching PRs from Github",
                type: "info",
            });
            
            const rawPRs = await fetchAllPullRequests(repoOwner, repository, githubToken, onProgress);
            prs = rawPRs.map(flattenPRResponse);
            
            await updateLocalCache({cacheKey, repository, data:prs});
        }
        
        return prs;
    } catch (error) {
        console.error("PR Fetch Error:", error);
        return [];
    }
}

export default fetchPRs; 