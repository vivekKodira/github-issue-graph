import tasksSample from '../samples/tasks.json';
import prsSample from '../samples/prs.json';
import { getDatabase } from '../db/rxdb';

const CACHE_VERSION = '1.0';
const CACHE_TTL_HOURS = 1;

function isCacheInvalid(localIssuesCache) {
  let cacheInvalid = true;
  try {
    const lastUpdated = localIssuesCache?.lastUpdated;
    const version = localIssuesCache?.version;
    
    if (!lastUpdated || !version) {
      console.log('Cache invalid: missing lastUpdated or version');
      return true;
    }

    if (version !== CACHE_VERSION) {
      console.log(`Cache invalid: version mismatch. Expected ${CACHE_VERSION}, got ${version}`);
      return true;
    }
    
    const lastUpdatedDate = new Date(lastUpdated);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - lastUpdatedDate);
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    console.log(`Cache age: ${diffHours} hours, TTL: ${CACHE_TTL_HOURS} hours`);
    
    if (diffHours <= CACHE_TTL_HOURS) {
      cacheInvalid = false;
    } else {
      console.log('Cache invalid: expired');
    }
  } catch (error) {
    console.error("Error checking cache validity:", error);
  }
  return cacheInvalid;
}

function getCacheName(cacheKey, repository, projectID) {
  // Ensure projectID is always a string, even if undefined
  const safeProjectID = projectID || 'no-project';
  const name = `${cacheKey}-${safeProjectID}-${repository}`;
  console.log(`Generated cache name: ${name}`);
  return name;
}

export const updateLocalCache = async ({projectID, repository, data, cacheKey}) => {
  try {
    const db = await getDatabase();
    const id = getCacheName(cacheKey, repository, projectID);
    const lastUpdated = new Date().toISOString();
    
    const cacheEntry = {
      id: id,
      cacheKey: cacheKey,
      projectID: projectID || null,
      repository: repository,
      data: data,
      lastUpdated: lastUpdated,
      version: CACHE_VERSION
    };
  
    // Upsert the cache entry
    await db.cache.upsert(cacheEntry);
    console.log(`Cache updated for key: ${id} at ${lastUpdated}`);
  } catch(error) {
    console.error("Error storing into cache:", error);
  }
}

export const fetchFromCache = async ({projectID, repository, cacheKey}) => {
  // Check if we're in demo mode
  const isDemoMode = localStorage.getItem('demo_mode') === 'true';
  if (isDemoMode) {
    console.log('Using demo mode data');
    if(cacheKey === "issues") {
      return tasksSample;
    } else if(cacheKey === "prs") {
      return prsSample;
    }
  }

  const id = getCacheName(cacheKey, repository, projectID);
  
  try {
    const db = await getDatabase();
    const cacheDoc = await db.cache.findOne(id).exec();
    
    if (!cacheDoc) {
      console.log(`No cache found for key: ${id}`);
      return;
    }
    
    const cacheData = cacheDoc.toJSON();
    console.log(`Found cache for ${id} with version ${cacheData?.version} and lastUpdated ${cacheData?.lastUpdated}`);
    
    if (!cacheData) {
      console.log(`Cache invalid: null cache object for ${id}`);
      return;
    }
    
    if (!cacheData.data) {
      console.log(`Cache invalid: missing data for ${id}`);
      return;
    }
    
    if (isCacheInvalid(cacheData)) {
      console.log(`Cache invalid: failed validation for ${id}`);
      return;
    }
    
    console.log(`Cache hit for key: ${id}`);
    return cacheData.data;
  } catch (error) {
    console.error(`Error fetching from cache for key ${id}:`, error);
    return;
  }
}

/** Label for tasks that have no sprint assigned (shown as last x-axis value in sprint charts). */
export const NO_SPRINT_LABEL = 'No Sprint';

/**
 * Sorts sprint names numerically (e.g., Sprint-1, Sprint-2, Sprint-10, Sprint-11)
 * instead of alphabetically which would put Sprint-10 before Sprint-2
 * @param {string[]} sprints - Array of sprint names to sort
 * @returns {string[]} - Sorted array of sprint names
 */
export const sortSprintsNumerically = (sprints) => {
    return sprints.sort((a, b) => {
        // Handle null/undefined values
        if (!a && !b) return 0;
        if (!a) return -1;
        if (!b) return 1;
        
        // Extract sprint numbers for proper numeric sorting
        // Handle both "Sprint-12" and "Sprint -12" formats
        const aMatch = a.match(/Sprint\s*-(\d+)/);
        const bMatch = b.match(/Sprint\s*-(\d+)/);
        
        if (aMatch && bMatch) {
            return parseInt(aMatch[1]) - parseInt(bMatch[1]);
        }
        
        // Fallback to string sort if pattern doesn't match
        return a.localeCompare(b);
    });
};

