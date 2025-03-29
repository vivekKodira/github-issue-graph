
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
}

export const updateLocalCache = (name, data ) => {
  try{
    const localCache = {
      data: data,
      lastUpdated: new Date().toISOString(),
    };
  
    localStorage.setItem(name, JSON.stringify(localCache));
  }catch(error){
    console.error("Error storing into cache", error);
  }
}

export const fetchFromCache =  (name) => {
  let localIssuesCache = JSON.parse(localStorage.getItem(name));
  if(!localIssuesCache || isCacheInvalid(localIssuesCache) || !localIssuesCache?.data) {
    return;
  }
  return localIssuesCache.data;
}