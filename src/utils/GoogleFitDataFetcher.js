class GoogleFitDataFetcher {
    constructor(accessToken) {
      this.accessToken = accessToken;
      this.baseUrl = 'https://www.googleapis.com/fitness/v1/users/me';
    }
  
    async makeRequest(endpoint, params) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          ...params
        });
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(JSON.stringify(error));
        }
  
        return await response.json();
      } catch (error) {
        console.error('API Request failed:', error);
        throw new Error(`API Request failed: ${error.message}`);
      }
    }
  
    async getStepsData(startTimeMillis, endTimeMillis) {
      const body = {
        aggregateBy: [{
          dataTypeName: "com.google.step_count.delta",
          dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:merge_step_deltas"
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis,
        endTimeMillis
      };
  
      const data = await this.makeRequest('/dataset:aggregate', {
        method: 'POST',
        body: JSON.stringify(body)
      });
  
      return {
        steps: data.bucket.map(bucket => ({
          startTime: new Date(parseInt(bucket.startTimeMillis)),
          endTime: new Date(parseInt(bucket.endTimeMillis)),
          value: bucket.dataset[0].point[0]?.value[0]?.intVal || 0
        }))
      };
    }
  
    async getCaloriesData(startTimeMillis, endTimeMillis) {
      const body = {
        aggregateBy: [{
          dataTypeName: "com.google.calories.expended",
          dataSourceId: "derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended"
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis,
        endTimeMillis
      };
  
      const data = await this.makeRequest('/dataset:aggregate', {
        method: 'POST',
        body: JSON.stringify(body)
      });
  
      return {
        calories: data.bucket.map(bucket => ({
          startTime: new Date(parseInt(bucket.startTimeMillis)),
          endTime: new Date(parseInt(bucket.endTimeMillis)),
          value: Math.round(bucket.dataset[0].point[0]?.value[0]?.fpVal || 0)
        }))
      };
    }
  
    async getHeartRateData(startTimeMillis, endTimeMillis) {
      const body = {
        aggregateBy: [{
          dataTypeName: "com.google.heart_rate.bpm",
          dataSourceId: "derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm"
        }],
        bucketByTime: { durationMillis: 3600000 }, // Hourly buckets for heart rate
        startTimeMillis,
        endTimeMillis
      };
  
      const data = await this.makeRequest('/dataset:aggregate', {
        method: 'POST',
        body: JSON.stringify(body)
      });
  
      return {
        heartRate: data.bucket.map(bucket => ({
          startTime: new Date(parseInt(bucket.startTimeMillis)),
          endTime: new Date(parseInt(bucket.endTimeMillis)),
          min: bucket.dataset[0].point[0]?.value[0]?.fpVal || 0,
          max: bucket.dataset[0].point[0]?.value[1]?.fpVal || 0,
          avg: bucket.dataset[0].point[0]?.value[2]?.fpVal || 0
        })).filter(reading => reading.avg > 0) // Remove entries with no data
      };
    }
  
    async getActivityData(startTimeMillis, endTimeMillis) {
      const body = {
        aggregateBy: [{
          dataTypeName: "com.google.activity.segment",
          dataSourceId: "derived:com.google.activity.segment:com.google.android.gms:merge_activity_segments"
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis,
        endTimeMillis
      };
  
      const data = await this.makeRequest('/dataset:aggregate', {
        method: 'POST',
        body: JSON.stringify(body)
      });
  
      // Activity type mapping according to Google Fit API
      const activityMap = {
        0: "In vehicle",
        1: "Biking",
        2: "On foot",
        3: "Still",
        4: "Unknown",
        5: "Tilting",
        7: "Walking",
        8: "Running",
        9: "Aerobic",
        10: "Strength training"
        // Add more mappings as needed
      };
  
      return {
        activities: data.bucket.map(bucket => ({
          startTime: new Date(parseInt(bucket.startTimeMillis)),
          endTime: new Date(parseInt(bucket.endTimeMillis)),
          activities: bucket.dataset[0].point.map(point => ({
            type: activityMap[point.value[0].intVal] || "Unknown",
            durationMillis: point.value[1].intVal,
            startTime: new Date(parseInt(point.startTimeNanos / 1000000)),
            endTime: new Date(parseInt(point.endTimeNanos / 1000000))
          }))
        }))
      };
    }
  
    async getSleepData(startTimeMillis, endTimeMillis) {
      const body = {
        aggregateBy: [{
          dataTypeName: "com.google.sleep.segment",
          dataSourceId: "derived:com.google.sleep.segment:com.google.android.gms:merged"
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis,
        endTimeMillis
      };
  
      const data = await this.makeRequest('/dataset:aggregate', {
        method: 'POST',
        body: JSON.stringify(body)
      });
  
      // Sleep stage mapping according to Google Fit API
      const sleepStageMap = {
        1: "Awake",
        2: "Sleep",
        3: "Out-of-bed",
        4: "Light sleep",
        5: "Deep sleep",
        6: "REM"
      };
  
      return {
        sleep: data.bucket.map(bucket => ({
          startTime: new Date(parseInt(bucket.startTimeMillis)),
          endTime: new Date(parseInt(bucket.endTimeMillis)),
          segments: bucket.dataset[0].point.map(point => ({
            stage: sleepStageMap[point.value[0].intVal] || "Unknown",
            startTime: new Date(parseInt(point.startTimeNanos / 1000000)),
            endTime: new Date(parseInt(point.endTimeNanos / 1000000))
          }))
        }))
      };
    }
  
    async getLocationData(startTimeMillis, endTimeMillis) {
        try {
          // Using History API for location data
          const body = {
            aggregateBy: [
              {
                dataTypeName: "com.google.distance.delta",
                dataSourceId: "derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta"
              },
              {
                dataTypeName: "com.google.location.sample",
                dataSourceId: "raw:com.google.location.sample:your_app_package_name:locations"
              }
            ],
            bucketByActivitySegment: {
              minDurationMillis: 0,
              activityDataSourceId: "derived:com.google.activity.segment:com.google.android.gms:merge_activity_segments"
            },
            startTimeMillis: startTimeMillis,
            endTimeMillis: endTimeMillis
          };
    
          const data = await this.makeRequest('/dataset:aggregate', {
            method: 'POST',
            body: JSON.stringify(body)
          });
    
          // If no data from first attempt, try alternative source
          if (!data.bucket || data.bucket.length === 0) {
            console.log('Trying alternative location source...');
            return await this.getLocationDataAlternative(startTimeMillis, endTimeMillis);
          }
    
          return {
            locations: data.bucket
              .filter(bucket => bucket.activity && bucket.dataset && bucket.dataset.length > 0)
              .map(bucket => ({
                activity: this.getActivityName(bucket.activity),
                startTime: new Date(parseInt(bucket.startTimeMillis)),
                endTime: new Date(parseInt(bucket.endTimeMillis)),
                distance: bucket.dataset[0].point[0]?.value[0]?.fpVal || 0,
                points: this.extractLocationPoints(bucket.dataset[1]?.point || [])
              }))
          };
        } catch (error) {
          console.log('Error in primary location fetch, trying alternative...');
          return await this.getLocationDataAlternative(startTimeMillis, endTimeMillis);
        }
      }
    
      async getLocationDataAlternative(startTimeMillis, endTimeMillis) {
        const body = {
          aggregateBy: [{
            dataTypeName: "com.google.location.sample"
          }],
          bucketByTime: { durationMillis: 3600000 }, // 1 hour buckets
          startTimeMillis,
          endTimeMillis
        };
    
        try {
          const response = await this.makeRequest('/dataset:aggregate', {
            method: 'POST',
            body: JSON.stringify(body)
          });
    
          if (!response.bucket || response.bucket.length === 0) {
            throw new Error('No location data available');
          }
    
          return {
            locations: response.bucket
              .filter(bucket => bucket.dataset && bucket.dataset[0]?.point)
              .map(bucket => ({
                startTime: new Date(parseInt(bucket.startTimeMillis)),
                endTime: new Date(parseInt(bucket.endTimeMillis)),
                points: this.extractLocationPoints(bucket.dataset[0].point)
              }))
          };
        } catch (error) {
          console.error('Alternative location fetch failed:', error);
          // Try one last method - direct dataset access
          return await this.getLocationDataDirect(startTimeMillis, endTimeMillis);
        }
      }
    
      async getLocationData(startTimeMillis, endTimeMillis) {
        try {
          // Using the sessions API to get location data from activities
          const sessionsResponse = await this.makeRequest('/sessions', {
            method: 'GET',
            params: new URLSearchParams({
              startTime: new Date(startTimeMillis).toISOString(),
              endTime: new Date(endTimeMillis).toISOString()
            })
          });
    
          if (!sessionsResponse.session || sessionsResponse.session.length === 0) {
            return { locations: [] };
          }
    
          // Process each session to get location data
          const locationData = await Promise.all(
            sessionsResponse.session.map(async (session) => {
              try {
                // Get distance data for this session
                const body = {
                  aggregateBy: [{
                    dataTypeName: "com.google.distance.delta",
                    dataSourceId: "derived:com.google.distance.delta:com.google.android.gms:merge_distance_delta"
                  }],
                  startTimeMillis: session.startTimeMillis,
                  endTimeMillis: session.endTimeMillis
                };
    
                const distanceData = await this.makeRequest('/dataset:aggregate', {
                  method: 'POST',
                  body: JSON.stringify(body)
                });
    
                return {
                  sessionId: session.id,
                  name: session.name || 'Unknown activity',
                  description: session.description,
                  activityType: this.getActivityName(session.activityType),
                  startTime: new Date(parseInt(session.startTimeMillis)),
                  endTime: new Date(parseInt(session.endTimeMillis)),
                  distance: this.extractDistance(distanceData),
                  application: session.application,
                  activityType: session.activityType
                };
              } catch (error) {
                console.error(`Error processing session ${session.id}:`, error);
                return null;
              }
            })
          );
    
          // Filter out any null values from failed session processing
          const validLocationData = locationData.filter(data => data !== null);
    
          if (validLocationData.length === 0) {
            return { locations: [] };
          }
    
          return {
            locations: validLocationData,
            summary: {
              totalSessions: validLocationData.length,
              totalDistance: validLocationData.reduce((sum, session) => sum + (session.distance || 0), 0),
              timeRange: {
                start: new Date(startTimeMillis),
                end: new Date(endTimeMillis)
              }
            }
          };
        } catch (error) {
          console.error('Error fetching location data:', error);
          return { 
            locations: [],
            error: error.message 
          };
        }
      }
    
      extractDistance(data) {
        if (!data.bucket || data.bucket.length === 0) return 0;
        
        return data.bucket.reduce((total, bucket) => {
          const points = bucket.dataset?.[0]?.point || [];
          const bucketDistance = points.reduce((sum, point) => {
            return sum + (point.value?.[0]?.fpVal || 0);
          }, 0);
          return total + bucketDistance;
        }, 0);
      }
    
      getActivityName(activityType) {
        const activities = {
          9: "Aerobic",
          119: "Archery",
          10: "Badminton",
          11: "Baseball",
          12: "Basketball",
          13: "Biathlon",
          1: "Biking",
          14: "Handbiking",
          15: "Mountain biking",
          16: "Road biking",
          17: "Spinning",
          18: "Stationary biking",
          19: "Utility biking",
          20: "Boxing",
          21: "Calisthenics",
          22: "Circuit training",
          23: "Cricket",
          113: "Crossfit",
          106: "Curling",
          24: "Dancing",
          102: "Diving",
          25: "Elliptical",
          103: "Ergometer",
          26: "Fencing",
          27: "Football (American)",
          28: "Football (Australian)",
          29: "Football (Soccer)",
          30: "Frisbee",
          31: "Gardening",
          32: "Golf",
          33: "Gymnastics",
          34: "Handball",
          35: "HIIT",
          36: "Hiking",
          37: "Hockey",
          38: "Horseback riding",
          39: "Housework",
          40: "Ice skating",
          41: "In vehicle",
          42: "Interval training",
          43: "Jump rope",
          44: "Kayaking",
          45: "Kettlebell training",
          46: "Kickboxing",
          47: "Kitesurfing",
          48: "Martial arts",
          49: "Meditation",
          50: "Mixed martial arts",
          51: "P90X exercises",
          52: "Paragliding",
          53: "Pilates",
          54: "Polo",
          55: "Racquetball",
          56: "Rock climbing",
          57: "Rowing",
          58: "Rowing machine",
          59: "Rugby",
          60: "Running",
          61: "Jogging",
          62: "Running on sand",
          63: "Running (treadmill)",
          64: "Sailing",
          65: "Scuba diving",
          66: "Skateboarding",
          67: "Skating",
          68: "Cross skating",
          69: "Indoor skating",
          70: "Inline skating (rollerblading)",
          71: "Skiing",
          72: "Back-country skiing",
          73: "Cross-country skiing",
          74: "Downhill skiing",
          75: "Kite skiing",
          76: "Roller skiing",
          77: "Sledding",
          78: "Sleeping",
          79: "Snowboarding",
          80: "Snowmobile",
          81: "Snowshoeing",
          82: "Squash",
          83: "Stair climbing",
          84: "Stair-climbing machine",
          85: "Stand-up paddleboarding",
          86: "Still (not moving)",
          87: "Strength training",
          88: "Surfing",
          89: "Swimming",
          90: "Swimming (pool)",
          91: "Swimming (open water)",
          92: "Table tennis (ping pong)",
          93: "Team sports",
          94: "Tennis",
          95: "Treadmill (walking)",
          96: "Volleyball",
          97: "Volleyball (beach)",
          98: "Volleyball (indoor)",
          99: "Wakeboarding",
          100: "Walking",
          101: "Water polo",
          102: "Weightlifting",
          103: "Wheelchair",
          104: "Windsurfing",
          105: "Yoga",
          108: "Zumba",
        };
        return activities[activityType] || "Unknown activity";
      }
    
      // Helper method to fetch data source list (useful for debugging)
      async getDataSources() {
        try {
          const response = await this.makeRequest('/dataSources', {
            method: 'GET'
          });
          return response.dataSource;
        } catch (error) {
          console.error('Error fetching data sources:', error);
          throw error;
        }
      }
    }
  
  export default GoogleFitDataFetcher;