export const prQuery = `
query ($owner: String!, $repo: String!, $after: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(first: 50, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        id
        title
        number
        createdAt
        closedAt
        mergedAt
        state
        body
        author {
          login
        }
        assignees(first: 5) {
          nodes {
            login
          }
        }
        labels(first: 10) {
          nodes {
            name
            color
          }
        }
        reviews(first: 10) {
          nodes {
            state
            author {
              login
            }
            comments(first: 30) {
              nodes {
                body
                createdAt
                author {
                  login
                }
                path
                position
              }
            }
          }
        }
        additions
        deletions
        changedFiles
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
`