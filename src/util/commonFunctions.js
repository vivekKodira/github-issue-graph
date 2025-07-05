import tasksSample from '../samples/tasks.json';
import prsSample from '../samples/prs.json';

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

export const updateLocalCache = ({projectID, repository, data, cacheKey}) => {
  try {
    const name = getCacheName(cacheKey, repository, projectID);
    const localCache = {
      data: data,
      lastUpdated: new Date().toISOString(),
      version: CACHE_VERSION
    };
  
    localStorage.setItem(name, JSON.stringify(localCache));
    console.log(`Cache updated for key: ${name} at ${localCache.lastUpdated}`);
  } catch(error) {
    console.error("Error storing into cache:", error);
  }
}

export const fetchFromCache = ({projectID, repository, cacheKey}) => {
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

  const name = getCacheName(cacheKey, repository, projectID);
  let localIssuesCache;
  
  try {
    const cacheStr = localStorage.getItem(name);
    if (!cacheStr) {
      console.log(`No cache found for key: ${name}`);
      return;
    }
    
    localIssuesCache = JSON.parse(cacheStr);
    console.log(`Found cache for ${name} with version ${localIssuesCache?.version} and lastUpdated ${localIssuesCache?.lastUpdated}`);
    
    if (!localIssuesCache) {
      console.log(`Cache invalid: null cache object for ${name}`);
      return;
    }
    
    if (!localIssuesCache.data) {
      console.log(`Cache invalid: missing data for ${name}`);
      return;
    }
    
    if (isCacheInvalid(localIssuesCache)) {
      console.log(`Cache invalid: failed validation for ${name}`);
      return;
    }
    
    console.log(`Cache hit for key: ${name}`);
    return localIssuesCache.data;
  } catch (error) {
    console.error(`Error fetching from cache for key ${name}:`, error);
    return;
  }
}

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
        const aMatch = a.match(/Sprint-(\d+)/);
        const bMatch = b.match(/Sprint-(\d+)/);
        
        if (aMatch && bMatch) {
            return parseInt(aMatch[1]) - parseInt(bMatch[1]);
        }
        
        // Fallback to string sort if pattern doesn't match
        return a.localeCompare(b);
    });
};

