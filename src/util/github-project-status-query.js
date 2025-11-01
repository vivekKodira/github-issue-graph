export const query = `
query ($projectId: ID!, $after: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      fields(first: 100) {
        nodes {
          ... on ProjectV2Field {
            id
            name
          }
          ... on ProjectV2SingleSelectField {
            id
            name
            options {
              id
              name
            }
          }
          ... on ProjectV2IterationField {
            id
            name
          }
        }
      }
      items(first: 50, after: $after) {
        nodes {
          id
          content {
            __typename
            ... on Issue {
              id
              title
              number
              body
              state
              url
              createdAt
              issueType {
                id
                name
                description
              }
              repository {
                name
                owner { login }
              }
              assignees(first: 5) {
                nodes { login }
              }
              labels(first: 10) { 
                nodes {
                  name
                  color
                }
              }
              subIssues: timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
                nodes {
                  ... on CrossReferencedEvent {
                    source {
                      ... on Issue {
                        number
                        url
                      }
                    }
                  }
                }
              }
            }
            ... on PullRequest {
              id
              title
              number
              mergedAt
            }
          }
          fieldValues(first: 100) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { 
                  ... on ProjectV2FieldCommon { 
                    name
                    id 
                  } 
                }
              }
              ... on ProjectV2ItemFieldTextValue {
                text
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldNumberValue {
                number
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldIterationValue {
                title
                field {
                  ... on ProjectV2FieldCommon { name }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}

`