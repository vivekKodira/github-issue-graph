import { 
  createRxDatabase, 
  addRxPlugin,
  RxDatabase,
  RxCollection,
  RxDocument
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

// Enable dev mode plugin in development
if (import.meta.env.DEV) {
  addRxPlugin(RxDBDevModePlugin);
}

// Add query builder plugin for advanced queries
addRxPlugin(RxDBQueryBuilderPlugin);

// Add migration schema plugin for schema versioning
addRxPlugin(RxDBMigrationSchemaPlugin);

// Task schema based on the TaskFormat interface
const taskSchema = {
  version: 2,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    title: {
      type: 'string'
    },
    issue_number: {
      type: ['number', 'null']
    },
    repository: {
      type: ['string', 'null']
    },
    repo_owner: {
      type: ['string', 'null']
    },
    body: {
      type: ['string', 'null']
    },
    state: {
      type: 'string',
      maxLength: 100
    },
    Status: {
      type: 'string',
      maxLength: 100
    },
    html_url: {
      type: ['string', 'null']
    },
    Type: {
      type: 'string',
      maxLength: 100
    },
    labels: {
      type: 'array',
      items: {
        type: 'object'
      }
    },
    assignees: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    links: {
      type: 'array',
      items: {
        type: 'object'
      }
    },
    // Dynamic fields - stored as a JSON object to handle any custom project fields
    customFields: {
      type: 'object'
    },
    // Issue creation timestamp
    createdAt: {
      type: ['string', 'null']
    },
    // Timestamp for cache management
    updatedAt: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9007199254740991
    }
  },
  required: ['id', 'title', 'state', 'Status', 'Type', 'updatedAt'],
  indexes: [
    'Status', 
    'Type', 
    'state', 
    'updatedAt',
    // Note: createdAt is nullable, so cannot be indexed directly in RxDB
    // Compound indexes for common query combinations
    ['Status', 'Type'],
    ['Status', 'updatedAt'],
    ['Type', 'updatedAt']
  ]
};

// PR schema
const prSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    number: {
      type: 'number'
    },
    title: {
      type: 'string'
    },
    author: {
      type: 'string',
      maxLength: 100
    },
    state: {
      type: 'string',
      maxLength: 100
    },
    createdAt: {
      type: ['string', 'null']
    },
    mergedAt: {
      type: ['string', 'null']
    },
    closedAt: {
      type: ['string', 'null']
    },
    repository: {
      type: ['string', 'null']
    },
    repo_owner: {
      type: ['string', 'null']
    },
    // Store all PR data as JSON for flexibility
    data: {
      type: 'object'
    },
    // Timestamp for cache management
    updatedAt: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9007199254740991
    }
  },
  required: ['id', 'number', 'title', 'state', 'author', 'updatedAt'],
  indexes: ['state', 'author', 'updatedAt']
};

export type TaskDocument = RxDocument<{
  id: string;
  title: string;
  issue_number?: number;
  repository?: string;
  repo_owner?: string;
  body?: string;
  state: string;
  Status: string;
  html_url?: string;
  Type: string;
  labels: any[];
  assignees: string[];
  links: any[];
  customFields: Record<string, any>;
  createdAt?: string;
  updatedAt: number;
}>;

export type PRDocument = RxDocument<{
  id: string;
  number: number;
  title: string;
  author: string;
  state: string;
  createdAt?: string;
  mergedAt?: string;
  closedAt?: string;
  repository?: string;
  repo_owner?: string;
  data: any;
  updatedAt: number;
}>;

export type TaskCollection = RxCollection<TaskDocument>;
export type PRCollection = RxCollection<PRDocument>;

export type GitHubIssueGraphCollections = {
  tasks: TaskCollection;
  prs: PRCollection;
};

export type GitHubIssueGraphDatabase = RxDatabase<GitHubIssueGraphCollections>;

let dbPromise: Promise<GitHubIssueGraphDatabase> | null = null;

/**
 * Create or get the RxDB database instance
 */
export async function getDatabase(): Promise<GitHubIssueGraphDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = createRxDatabase<GitHubIssueGraphCollections>({
    name: 'github_issue_graph_db',
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageDexie()
    }),
    ignoreDuplicate: true
  }).then(async (db) => {
    console.log('RxDB database created');

    // Create collections
    try {
      console.log('Adding collections...');
      await db.addCollections({
        tasks: {
          schema: taskSchema,
          migrationStrategies: {
            // Migration from version 0 to 1: add createdAt field
            1: function(oldDoc: any) {
              return {
                ...oldDoc,
                createdAt: null // Default to null for existing documents
              };
            },
            // Migration from version 1 to 2: add indexes (no data changes needed)
            2: function(oldDoc: any) {
              return oldDoc; // No changes to document structure, only indexes
            }
          }
        },
        prs: {
          schema: prSchema
        }
      });

      console.log('RxDB collections created');
      return db;
    } catch (error) {
      console.error('Error creating collections:', error);
      throw error;
    }
  }).catch(error => {
    console.error('Error creating RxDB database:', error);
    throw error;
  });

  return dbPromise;
}

/**
 * Clear all data from the database
 */
export async function clearDatabase() {
  const db = await getDatabase();
  await db.tasks.find().remove();
  await db.prs.find().remove();
  console.log('Database cleared');
}

/**
 * Completely destroy the database and clear IndexedDB
 */
export async function destroyDatabase() {
  try {
    // Clear all collections first
    if (dbPromise) {
      const db = await dbPromise;
      await db.tasks.find().remove();
      await db.prs.find().remove();
      console.log('Database collections cleared');
    }
    
    // Reset the promise so next call will create a new database
    dbPromise = null;
    
    // Delete IndexedDB to ensure clean state
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase('github_issue_graph_db');
      deleteRequest.onsuccess = () => {
        console.log('IndexedDB deleted successfully');
        resolve();
      };
      deleteRequest.onerror = () => {
        console.error('Error deleting IndexedDB');
        reject(deleteRequest.error);
      };
      deleteRequest.onblocked = () => {
        console.warn('IndexedDB deletion blocked - close all tabs using this database');
        reject(new Error('Database deletion blocked'));
      };
    });
    
    console.log('Database destroyed');
  } catch (error) {
    console.error('Error destroying database:', error);
    throw error;
  }
}

/**
 * Convert task data to RxDB format
 */
export function taskToRxDBFormat(task: any) {
  const { labels, assignees, links, id, title, issue_number, repository, repo_owner, 
          body, state, Status, html_url, Type, createdAt, ...customFields } = task;
  
  const rxdbTask = {
    id: id || `task_${Date.now()}_${Math.random()}`,
    title: title || 'Untitled',
    issue_number: issue_number || null,
    repository: repository || null,
    repo_owner: repo_owner || null,
    body: body || null,
    state: state || 'unknown',
    Status: Status || 'unknown',
    html_url: html_url || null,
    Type: Type || 'unknown',
    labels: labels || [],
    assignees: assignees || [],
    links: links || [],
    customFields: customFields || {},
    createdAt: createdAt || null,
    updatedAt: Date.now()
  };
  
  // Debug: Log first task conversion
  if (!taskToRxDBFormat.hasLogged) {
    console.log('[DEBUG] taskToRxDBFormat - Input task:', task);
    console.log('[DEBUG] taskToRxDBFormat - Input createdAt:', createdAt);
    console.log('[DEBUG] taskToRxDBFormat - Output RxDB task:', rxdbTask);
    taskToRxDBFormat.hasLogged = true;
  }
  
  return rxdbTask;
}

/**
 * Convert PR data to RxDB format
 */
export function prToRxDBFormat(pr: any) {
  return {
    id: pr.id || `pr_${Date.now()}_${Math.random()}`,
    number: pr.number,
    title: pr.title || 'Untitled',
    author: pr.author || 'unknown',
    state: pr.state || 'unknown',
    createdAt: pr.createdAt || null,
    mergedAt: pr.mergedAt || null,
    closedAt: pr.closedAt || null,
    repository: pr.repository || null,
    repo_owner: pr.repo_owner || null,
    data: pr,
    updatedAt: Date.now()
  };
}

/**
 * Bulk insert tasks into the database
 */
export async function bulkInsertTasks(tasks: any[]) {
  const db = await getDatabase();
  
  // Remove all existing tasks first
  await db.tasks.find().remove();
  
  // Convert and insert new tasks
  const tasksToInsert = tasks.map(taskToRxDBFormat);
  
  try {
    await db.tasks.bulkInsert(tasksToInsert);
    console.log(`Inserted ${tasksToInsert.length} tasks into RxDB`);
  } catch (error) {
    console.error('Error bulk inserting tasks:', error);
    throw error;
  }
}

/**
 * Bulk insert PRs into the database
 */
export async function bulkInsertPRs(prs: any[]) {
  const db = await getDatabase();
  
  // Remove all existing PRs first
  await db.prs.find().remove();
  
  // Convert and insert new PRs
  const prsToInsert = prs.map(prToRxDBFormat);
  
  try {
    await db.prs.bulkInsert(prsToInsert);
    console.log(`Inserted ${prsToInsert.length} PRs into RxDB`);
  } catch (error) {
    console.error('Error bulk inserting PRs:', error);
    throw error;
  }
}

/**
 * Reconstruct task from RxDB document back to original format
 */
export function taskFromRxDBFormat(doc: TaskDocument): any {
  const data = doc.toJSON();
  const { customFields, updatedAt, ...baseFields } = data;
  
  return {
    ...baseFields,
    ...customFields
  };
}

/**
 * Reconstruct PR from RxDB document back to original format
 */
export function prFromRxDBFormat(doc: PRDocument): any {
  const data = doc.toJSON();
  return data.data;
}

