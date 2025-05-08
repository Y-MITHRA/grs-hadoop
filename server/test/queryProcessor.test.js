import { matchQueryPattern } from '../hadoop/queryPatternMatcher.js';
import dataTransfer from '../hadoop/dataTransfer.js';
import jobManager from '../hadoop/jobManager.js';

async function testQueryProcessor() {
    try {
        const testQueries = [
            "Show high priority pending cases in the water department",
            "Show resolution trends by department",
            "List issues in South division of Chennai",
            "Show department-wise case distribution",
            "What's the average resolution time?"
        ];

        for (const query of testQueries) {
            console.log(`\nProcessing query: "${query}"`);
            
            // Step 1: Match query pattern
            const pattern = matchQueryPattern(query);
            console.log('Pattern match:', pattern);
            
            // Step 2: Build MongoDB query based on pattern
            const mongoQuery = {};
            
            if (pattern.department !== 'ALL_DEPARTMENTS') {
                mongoQuery.department = pattern.department.toLowerCase();
            }
            if (pattern.status !== 'ALL_STATUS') {
                mongoQuery.status = pattern.status.toLowerCase();
            }
            if (pattern.priority !== 'ALL_PRIORITY') {
                mongoQuery.priority = pattern.priority;
            }
            if (pattern.location !== 'ALL_LOCATIONS') {
                mongoQuery.location = pattern.location;
            }
            
            // Add time constraints if needed
            if (pattern.timeframe !== 'ALL_TIME') {
                const now = new Date();
                mongoQuery.createdAt = { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) }; // Last 90 days
            }
            
            console.log('MongoDB Query:', mongoQuery);
            
            // Step 3: Export matching data to HDFS
            console.log('Exporting data to HDFS...');
            const hdfsPath = await dataTransfer.exportToHDFS('grievances', mongoQuery);
            console.log('Data exported to:', hdfsPath);
            
            // Step 4: Submit MapReduce job
            console.log('Submitting MapReduce job...');
            const jobConfig = {
                jobName: `grievance_analysis_${Date.now()}`,
                inputPath: hdfsPath.replace('/data.json', ''),
                mapper: 'grievanceMapper',
                reducer: 'grievanceReducer',
                outputPath: `/output/analysis_${Date.now()}`
            };
            
            const jobResult = await jobManager.submitJob(jobConfig);
            console.log('Job submitted:', jobResult);
            
            // Step 5: Get results
            console.log('Getting results...');
            const localResultPath = `/tmp/analysis_${Date.now()}.json`;
            const results = await dataTransfer.importFromHDFS(jobResult.outputPath + '/part-00000', localResultPath);
            console.log('Results:', JSON.stringify(results, null, 2));
            
            console.log('-------------------');
        }

    } catch (error) {
        console.error('Test Error:', error);
    }
}

// Run the test
console.log('Starting Query Processor Test...');
testQueryProcessor().then(() => {
    console.log('\nTest completed');
});
