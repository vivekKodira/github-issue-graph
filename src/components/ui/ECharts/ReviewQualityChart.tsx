import { ECharts } from "./ECharts";
import { useState, useEffect } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

export const ReviewQualityChart = ({ prs, styleOptions }) => {
    const [chartOptions, setChartOptions] = useState(null);

    useEffect(() => {
        if (!prs?.length) return;

        // Calculate review quality metrics
        const metrics = prs.reduce((acc, pr) => {
            // First-time approval rate
            const hasApproval = pr.reviewStates.includes('APPROVED');
            const hasChangesRequested = pr.reviewStates.includes('CHANGES_REQUESTED');
            if (hasApproval && !hasChangesRequested) acc.firstTimeApprovals++;
            
            // Comments per PR
            acc.totalComments += pr.reviewComments.length;
            
            // Review participation
            const uniqueReviewers = new Set(pr.reviewers).size;
            acc.totalReviewers += uniqueReviewers;
            
            acc.total++;
            return acc;
        }, { firstTimeApprovals: 0, totalComments: 0, totalReviewers: 0, total: 0 });

        const options = {
            title: {
                text: 'Review Quality Metrics',
                textStyle: {
                    color: '#ffffff'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            legend: {
                textStyle: {
                    color: '#ffffff'
                },
                data: ['Quality Metrics']
            },
            radar: {
                indicator: [
                    { name: 'First-time Approval Rate', max: 100 },
                    { name: 'Review Participation', max: 100 },
                    { name: 'Comment Density', max: 100 }
                ]
            },
            series: [{
                type: 'radar',
                data: [{
                    value: [
                        (metrics.firstTimeApprovals / metrics.total) * 100,
                        (metrics.totalReviewers / (metrics.total * 2)) * 100, // Assuming 2 reviewers is ideal
                        Math.min((metrics.totalComments / metrics.total / 5) * 100, 100) // Normalize to 5 comments per PR
                    ],
                    name: 'Quality Metrics'
                }]
            }]
        };

        setChartOptions(options);
    }, [prs]);

    return (
        <div >
            {chartOptions && (
                <ErrorBoundary chartName="Review Quality">
                    <ECharts option={chartOptions} style={styleOptions} />
                </ErrorBoundary>
            )}
        </div>
    );
}; 