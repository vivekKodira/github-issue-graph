# GitHub Issue Graph

I built this React application to help me visualize GitHub repository issues and pull requests through interactive charts and graphs. It helps me understand my team's progress, performance patterns, and code review behaviors. I use it to track sprint velocity, analyze workload distribution, and identify trends in our development process.

## Features

- Interactive visualization of GitHub issues and pull requests
- Team performance analysis
- Code review insights
- Sprint velocity tracking
- Issue dependency graph
- Automated insights generation

## Screenshots

### Project Overview
![Project Overview](docs/images/project-overview.png)
*Track project completion, sprint velocity, and task distribution at a glance*

### Team Analysis
![Team Analysis](docs/images/team-analysis.png)
*Monitor team performance with assignee workload and reviewer contribution charts*

### Pull Requests
![Pull Requests](docs/images/pull-requests.png)
*Analyze code review patterns, PR lifecycle, and review quality metrics*

### Issue Graph
![Issue Graph](docs/images/issue-graph.png)
![Issue Graph](docs/images/issue-graph_1.png)
*Visualize issue dependencies and relationships in an interactive network graph*

### Insights
![Insights](docs/images/insights.png)
*Get automated, color-coded insights about team performance and project trends*

## How to Use

1. Enter your GitHub repository details in the configuration section:
   - Repository Owner
   - Repository Name
   - Project ID (optional)
   - GitHub Token (required for API access)

2. Click the "Render" button to fetch and display your repository data

## Dashboard Tabs

### Project Overview
- **Completion Charts**
  - Planned Task Completion Count
  - Planned Task Completion Effort
  - Overall Task Completion
- **Sprint Velocity Chart**: Track team's velocity across sprints
- **Status Chart**: View issue status distribution
- **Sprint Chart**: Analyze sprint-wise task distribution

### Team Analysis
- **Assignee Charts**
  - Task distribution by assignee
  - Pie charts showing workload distribution
  - Line charts tracking assignee performance over time
- **Reviewer Charts**
  - Review workload distribution
  - Reviewer performance trends
- **Author Charts**
  - PR creation trends by author
  - Author contribution patterns

### Pull Requests
- **PR Review Chart**: Review patterns and statistics
- **PR Lifecycle Chart**: Time taken for PR reviews and merges
- **Code Churn Chart**: Code changes and modifications
- **Review Quality Chart**: Quality metrics for code reviews
- **Review Word Cloud**: Common terms in PR reviews

### Issue Graph
- Interactive visualization of issue dependencies
- Network graph showing relationships between issues
- Filter and explore issue connections

### Insights
- Automated insights generation based on data analysis
- Color-coded insights (green for positive trends, red for negative)
- Key metrics and patterns highlighted

## Limitations

This application assumes certain custom fields are configured in your GitHub repository:
- **Sprint**: Used to group tasks into sprints (e.g., "Sprint-1", "Sprint-2")
- **Size**: Used for task size estimation (e.g., "S", "M", "L")
- **Estimate (days)**: Planned effort in days
- **Actual (days)**: Actual effort spent in days

These fields are used for:
- Effort estimation and tracking
- Sprint velocity calculations
- Workload distribution analysis
- Performance trend insights

If your repository doesn't use these custom fields, some charts and insights may not work as expected. You can configure these field mappings in the project configuration.

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```