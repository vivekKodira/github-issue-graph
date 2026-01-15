# RxDB Migration Guide

## Overview

This document describes the migration from in-memory state management to RxDB for data storage and filtering in the GitHub Issue Graph application.

## What Changed

### 1. Data Storage
**Before:** Data was fetched from GitHub and stored in React state (`flattenedData`, `prs`)

**After:** Data is fetched from GitHub, stored in RxDB collections, and React components subscribe to database changes

### 2. Filtering
**Before:** Filtering was done in-memory using JavaScript array methods in the `useFilterableDimensions` hook

**After:** Filtering uses RxDB queries with reactive subscriptions via the `useRxDBFilters` hook

## Key Benefits

1. **Persistent Storage:** Data persists in IndexedDB across browser sessions
2. **Reactive Updates:** Components automatically update when database changes
3. **Better Performance:** RxDB handles data indexing and query optimization
4. **Scalability:** Can handle larger datasets more efficiently
5. **Offline Support:** Data available even when offline

## Architecture

### Database Schema

#### Tasks Collection
```typescript
{
  id: string,              // Primary key
  title: string,
  issue_number: number,
  repository: string,
  repo_owner: string,
  body: string,
  state: string,
  Status: string,          // Indexed
  Type: string,            // Indexed
  labels: array,
  assignees: array,
  links: array,
  customFields: object,    // Dynamic project fields
  _updatedAt: number       // Indexed timestamp
}
```

#### PRs Collection
```typescript
{
  id: string,              // Primary key
  number: number,
  title: string,
  author: string,          // Indexed
  state: string,           // Indexed
  createdAt: string,
  mergedAt: string,
  closedAt: string,
  repository: string,
  repo_owner: string,
  data: object,            // Full PR data
  _updatedAt: number       // Indexed timestamp
}
```

### New Files Added

1. **`src/db/rxdb.ts`**
   - Database initialization and configuration
   - Schema definitions
   - Helper functions for data conversion and bulk operations

2. **`src/context/RxDBContext.tsx`**
   - React context provider for RxDB database
   - Handles database lifecycle
   - Provides database instance to components via `useRxDB()` hook

3. **`src/components/ui/ECharts/hooks/useRxDBFilters.ts`**
   - Replacement for `useFilterableDimensions`
   - Subscribes to RxDB data changes
   - Implements filtering logic with reactive updates

### Modified Files

1. **`src/main.tsx`**
   - Wrapped app with `RxDBProvider`

2. **`src/components/ui/ProjectDashboard/ProjectDashboard.tsx`**
   - Added RxDB integration for storing fetched data
   - Subscribed to database changes for reactive updates
   - Removed reliance on direct state management for fetched data

3. **`src/components/ui/ECharts/IssueAnalysisDashboard.tsx`**
   - Switched from `useFilterableDimensions` to `useRxDBFilters`
   - Removed `flattenedData` prop dependency

## Data Flow

### Before (In-Memory)
```
GitHub API → Fetch → State → Components
                      ↓
                   Filters → Filtered Data
```

### After (RxDB)
```
GitHub API → Fetch → RxDB → Reactive Subscription → Components
                      ↓
                   Indexes & Queries → Filtered Data
```

## Usage

### Fetching and Storing Data

```typescript
// Automatically happens in ProjectDashboard when user clicks "Render"
const [flattenedTasks, fetchedPRs] = await Promise.all([
  fetchProjectDetails(...),
  fetchPRs(...)
]);

// Store in RxDB
await bulkInsertTasks(flattenedTasks);
await bulkInsertPRs(fetchedPRs);
```

### Subscribing to Data

```typescript
import { useRxDB } from '@/context/RxDBContext';
import { taskFromRxDBFormat } from '@/db/rxdb';

const { db, isReady } = useRxDB();

useEffect(() => {
  if (!db || !isReady) return;

  const subscription = db.tasks
    .find()
    .sort({ _updatedAt: 'desc' })
    .$
    .subscribe((docs) => {
      const tasks = docs.map(taskFromRxDBFormat);
      // Use tasks
    });

  return () => subscription.unsubscribe();
}, [db, isReady]);
```

### Using Filters

```typescript
import { useRxDBFilters } from './hooks/useRxDBFilters';

const {
  isReady,
  filteredData,
  selectedFilters,
  filterOperator,
  handleFilterToggle,
  // ... other filter controls
} = useRxDBFilters({
  storageKey: 'myComponentState',
});
```

## Migration Checklist

- [x] Install RxDB dependencies
- [x] Create database schema
- [x] Create RxDB context provider
- [x] Update main.tsx to wrap app with provider
- [x] Migrate ProjectDashboard to store data in RxDB
- [x] Create RxDB-based filtering hook
- [x] Update IssueAnalysisDashboard to use RxDB filtering
- [x] Test build and compilation

## Future Enhancements

1. **Advanced Queries:** Implement more complex RxDB queries for better performance
2. **Sync:** Add real-time sync capabilities
3. **Compression:** Implement data compression for storage
4. **Migration:** Add schema migration support for future updates
5. **Caching Strategy:** Implement smarter cache invalidation
6. **Multi-Collection Queries:** Join queries across tasks and PRs

## Troubleshooting

### Database Not Initializing
- Check browser console for errors
- Ensure IndexedDB is enabled in browser
- Clear browser storage and reload

### Data Not Updating
- Verify RxDB subscriptions are properly set up
- Check that `isReady` is true before querying
- Ensure cleanup functions unsubscribe properly

### Performance Issues
- Monitor IndexedDB size in browser dev tools
- Consider adding more indexes for frequently queried fields
- Implement pagination for large datasets

## API Reference

### `getDatabase()`
Returns the RxDB database instance

### `bulkInsertTasks(tasks: any[])`
Bulk insert tasks into the database

### `bulkInsertPRs(prs: any[])`
Bulk insert PRs into the database

### `taskFromRxDBFormat(doc: TaskDocument)`
Convert RxDB document back to original task format

### `prFromRxDBFormat(doc: PRDocument)`
Convert RxDB document back to original PR format

### `useRxDB()`
React hook to access database instance and ready state

### `useRxDBFilters(options)`
React hook for filtering with RxDB

