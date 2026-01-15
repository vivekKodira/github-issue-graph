const findFigma = (originalIssue) => {
    const clone = {...originalIssue};
    clone.links = clone.links || [];
    // Regular expression to match Figma URLs
    const figmaUrlRegex = /https:\/\/www\.figma\.com\/[^\s\\]+/g;
    const figmaURLs = clone.body.match(figmaUrlRegex);
    if (figmaURLs) {
        for (let i=0; i<figmaURLs.length; i++) {
            clone.links.push({
                id: `figma_${i}`,
                type: "figma",
                url: figmaURLs[i],
            });
        }
    }
    return clone;
}

const findIssues = (originalIssue) => {
    const clone = {...originalIssue};
    clone.links = clone.links || [];
    const issueRegex = /#(\d+)/g;
    const matchedIssues = clone.body.match(issueRegex);
    if (matchedIssues) {
        for (let issue of matchedIssues) {
            const issueNumber = issue.replace("#", "");
            clone.links.push({
                type: "issue",
                id: issueNumber,
                url: `https://github.com/Beyondsquare/finalyzer-ui/issues/${issueNumber}`
            });
        }
    }
    return clone;
}

const addLinks = (originalIssue) => {
    let clone = {...originalIssue};
    if(!originalIssue.body) {
        return clone;
    }
    clone = findIssues(clone);
    clone = findFigma(clone);
    return clone;
};

export function createGraphData(issues, prs) {
    let graphData = {
        nodes: [],
        links: []
    };

    let issueMap = new Map();
    let prMap = new Map();

    // Create nodes for issues
    issues.forEach(issue => {
        graphData.nodes.push({
            id: issue.number,
            name: issue.title,
            group: issue.state === "open" ? 1 : 2, // Grouping based on issue state
            type: 'issue',
            state: issue.state,
            labels: issue.labels || [],
            size: issue.Size || 'M' // Default to Medium if no size specified
        });
        issueMap.set(issue.number, issue);
    });

    // Create nodes for PRs
    prs.forEach(pr => {
        graphData.nodes.push({
            id: `pr_${pr.number}`,
            name: pr.title,
            group: pr.state === "open" ? 3 : 4, // Different group for PRs
            type: 'pr',
            state: pr.state,
            labels: pr.labels || []
        });
        prMap.set(pr.number, pr);
    });

    // Create links between issues
    issues.forEach(issue => {
        if (issue.links && issue.links.length > 0) {
            issue.links.forEach(link => {
                if(link.type === 'issue')  {
                    const targetId = parseInt(link.id);
                    // Only create link if target node exists
                    if (issueMap.has(targetId)) {
                        graphData.links.push({
                            source: issue.number,
                            target: targetId,
                            value: 1,
                            type: 'issue'
                        });
                    }
                }
            });
        }
    });

    // Create links between PRs and issues
    prs.forEach(pr => {
        if (pr.body) {
            const issueRegex = /#(\d+)/g;
            const matchedIssues = pr.body.match(issueRegex);
            if (matchedIssues) {
                matchedIssues.forEach(issue => {
                    const issueNumber = parseInt(issue.replace("#", ""));
                    if (issueMap.has(issueNumber)) {
                        graphData.links.push({
                            source: `pr_${pr.number}`,
                            target: issueNumber,
                            value: 1,
                            type: 'pr'
                        });
                    }
                });
            }
        }
    });

    return graphData;
}

export default function main(issues, prs) {
    const filteredIssues = issues.filter(issue => !issue.pull_request).map((issue) => {
        return {
            id: issue.id,
            title: issue.title,
            number: issue.number,
            body: issue.body,
            state: issue.state,
            html_url: issue.html_url,
            links: issue.links || []
        }
    });
    
    const parsedIssues = filteredIssues.map(issue => {
        return addLinks(issue);
    });

    const graphData = createGraphData(parsedIssues, prs || []);

    const nodes = graphData.nodes.map(node => node.id);
    
    // Filter any links which are not in the graph nodes
    graphData.links = graphData.links.filter(link => {
        let outcome = nodes.includes(link.target) && nodes.includes(link.source);
        if(!outcome) {
            console.log(`Removing link: ${link.source} -> ${link.target}`);
        }
        return outcome;
    });

    return graphData;
}