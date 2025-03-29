import  "./IssueGraph.css";
import graphCreator from "./graphCreator.js"
import issueFetcher from "@/util/issueFetcher.js";
import { initializeGraph } from "./graph.js";
import {  Button } from "@chakra-ui/react";
import { useState } from "react";


export const IssueGraph = ({
    repoOwner,
    repository,
    githubToken,
  }) => {
    const [loading, setLoading] = useState(false);
    const isButtonDisabled =!repoOwner ||!repository ||!githubToken;
    const handleClick = async () => {
        setLoading(true);
        const issues = await issueFetcher({repoOwner, repository, githubToken});
        const graph = graphCreator(issues);
        initializeGraph(graph);
        setLoading(false);
    };
    return (
        <>
            <Button
                    disabled={isButtonDisabled}
                    id="render-graph"
                    loading={loading}
                    colorPalette="gray"
                    variant="outline"
                    onClick={handleClick}
                  >
                    Render
                  </Button>
            <div id="graph-container"></div>
        </>
    )
}