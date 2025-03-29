import tasksSample from '../samples/tasks.json';
import prsSample from '../samples/prs.json';

function isCacheInvalid(localIssuesCache) {
  let cacheInvalid = true;
  try {
    const lastUpdated = localIssuesCache?.lastUpdated;
    if (lastUpdated) {
      const lastUpdatedDate = new Date(lastUpdated);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate - lastUpdatedDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60));
      if (diffDays < 1) {
        cacheInvalid = false;
      }
    }
  } catch (error) {
    console.error("Error fetching from cache", error);
  }
  return cacheInvalid;
}

function getCacheName(cacheKey,repository, projectID) {
  return `${cacheKey}-${projectID}-${repository}`;
}

export const updateLocalCache = ({projectID, repository, data, cacheKey}) => {
  try {
    const name = getCacheName(cacheKey,repository, projectID);
    const localCache = {
      data: data,
      lastUpdated: new Date().toISOString(),
    };
  
    localStorage.setItem(name, JSON.stringify(localCache));
  } catch(error) {
    console.error("Error storing into cache", error);
  }
}

export const fetchFromCache = ({projectID, repository, cacheKey}) => {
  // Check if we're in demo mode
  const isDemoMode = localStorage.getItem('demo_mode') === 'true';
  if (isDemoMode) {
    if(cacheKey === "issues") {
      return tasksSample;
    } else if(cacheKey === "prs") {
      return prsSample;
    }
  }
  const name = getCacheName(cacheKey,repository, projectID);
  let localIssuesCache = JSON.parse(localStorage.getItem(name));
  
  if (!localIssuesCache || isCacheInvalid(localIssuesCache) || !localIssuesCache?.data) {
    return;
  }
  
  return localIssuesCache.data;
}

