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

function createGraphData(issues) {
    let graphData = {
        nodes: [],
        links: []
    };

    let issueMap = new Map();

    // Create nodes
    issues.forEach(issue => {
        graphData.nodes.push({
            id: issue.number,
            name: issue.title,
            group: issue.state === "open" ? 1 : 2 // Grouping based on issue state
        });
        issueMap.set(issue.number, issue);
    });

    // Create links
    issues.forEach(issue => {
        if (issue.links && issue.links.length > 0) {
            issue.links.forEach(link => {
                if(link.type == 'issue')  {
                    graphData.links.push({
                        source: issue.number,
                        target: parseInt(link.id),
                        value: 1
                    });
                }
            });
        }
    });

    return graphData;
}

export default function main(issues) {

    const filteredIssues = issues.filter(issue=>!issue.pull_request).map((issue) => {
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
    
    const parsedIssues = filteredIssues.map(issue =>{
        return addLinks(issue);
    });

    const graphData = createGraphData(parsedIssues);

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