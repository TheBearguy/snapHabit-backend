// Example implementation file (e.g., fetchFitnessData.js)
import GoogleFitDataFetcher from './GoogleFitDataFetcher.js';

// Helper function to get date range (last 7 days by default)
const getDateRange = (days = 7) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startTimeMillis: start.getTime(),
    endTimeMillis: end.getTime()
  };
};

// Main function to fetch fitness data
async function fetchUserFitnessData(accessToken) {
  try {
    // Initialize the fetcher with your access token
    const fitDataFetcher = new GoogleFitDataFetcher(accessToken);
    
    // Get date range for last 7 days
    const { startTimeMillis, endTimeMillis } = getDateRange(7);
    
    // Fetch different types of data
    const [
      activities,
      steps,
      calories,
      heartRate,
      sleep,
      location
    ] = await Promise.all([
      fitDataFetcher.getActivityData(startTimeMillis, endTimeMillis),
      fitDataFetcher.getStepsData(startTimeMillis, endTimeMillis),
      fitDataFetcher.getCaloriesData(startTimeMillis, endTimeMillis),
      fitDataFetcher.getHeartRateData(startTimeMillis, endTimeMillis),
      fitDataFetcher.getSleepData(startTimeMillis, endTimeMillis),
      fitDataFetcher.getLocationData(startTimeMillis, endTimeMillis)
    ]);

    // Process and format the data
    const processedData = {
      activities: processActivityData(activities),
      steps: processStepsData(steps),
      calories: processCaloriesData(calories),
      heartRate: processHeartRateData(heartRate),
      sleep: processSleepData(sleep),
      location: processLocationData(location)
    };

    return processedData;
  } catch (error) {
    console.error('Error fetching fitness data:', error);
    throw error;
  }
}

// Helper functions to process different types of data
function processActivityData(data) {
  return data.bucket?.map(bucket => ({
    startTime: new Date(parseInt(bucket.startTimeMillis)),
    endTime: new Date(parseInt(bucket.endTimeMillis)),
    activities: bucket.dataset?.[0]?.point?.map(point => ({
      activityType: point.value?.[0]?.intVal,
      durationMillis: point.value?.[1]?.intVal,
    })) || []
  })) || [];
}

function processStepsData(data) {
  return data.bucket?.map(bucket => ({
    date: new Date(parseInt(bucket.startTimeMillis)),
    steps: bucket.dataset?.[0]?.point?.reduce((total, point) => 
      total + (point.value?.[0]?.intVal || 0), 0) || 0
  })) || [];
}

function processCaloriesData(data) {
  return data.bucket?.map(bucket => ({
    date: new Date(parseInt(bucket.startTimeMillis)),
    calories: bucket.dataset?.[0]?.point?.reduce((total, point) => 
      total + (point.value?.[0]?.fpVal || 0), 0) || 0
  })) || [];
}

function processHeartRateData(data) {
  return data.bucket?.map(bucket => ({
    timestamp: new Date(parseInt(bucket.startTimeMillis)),
    avgBpm: bucket.dataset?.[0]?.point?.reduce((sum, point) => 
      sum + (point.value?.[0]?.fpVal || 0), 0) / 
      (bucket.dataset?.[0]?.point?.length || 1)
  })) || [];
}

function processSleepData(data) {
  return data.bucket?.map(bucket => ({
    date: new Date(parseInt(bucket.startTimeMillis)),
    segments: bucket.dataset?.[0]?.point?.map(point => ({
      startTime: new Date(parseInt(point.startTimeNanos / 1000000)),
      endTime: new Date(parseInt(point.endTimeNanos / 1000000)),
      sleepType: point.value?.[0]?.intVal
    })) || []
  })) || [];
}

function processLocationData(data) {
  return data.bucket?.map(bucket => ({
    timestamp: new Date(parseInt(bucket.startTimeMillis)),
    locations: bucket.dataset?.[0]?.point?.map(point => ({
      latitude: point.value?.[0]?.fpVal,
      longitude: point.value?.[1]?.fpVal,
      accuracy: point.value?.[2]?.fpVal
    })) || []
  })) || [];
}

// Test the token and scope access
// const testRequest = async (accessToken) => {
//     try {
//       const fetcher = new GoogleFitDataFetcher(accessToken);
//       const now = new Date();
//       const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
//       const testData = await fetcher.getStepsData(
//         yesterday.getTime(),
//         now.getTime()
//       );
//       console.log('Test request successful:', testData);
//     } catch (error) {
//       console.error('Test request failed:', error);
//     }
//   };
  
//   await testRequest(accessToken);

export default fetchUserFitnessData;