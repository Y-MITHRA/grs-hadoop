import { processQuery } from '../hadoop/queryProcessor.js';
import { matchQueryPattern } from '../hadoop/queryPatternMatcher.js';
import dataTransfer from '../hadoop/dataTransfer.js';
import jobManager from '../hadoop/jobManager.js';
import dotenv from 'dotenv';

dotenv.config();

async function testQueries() {
    try {
        // Test Case 1: Historical Analysis Query
        console.log('\nTest Case 1: Historical Analysis Query');
        const historicalQuery = 'Show me trends in water department complaints over the last year';
        const result1 = await processQuery(historicalQuery);
        console.log('Pattern Match Result:', result1);

        // Test Case 2: Current Status Query
        console.log('\nTest Case 2: Current Status Query');
        const currentQuery = 'What is the current status of electricity complaints?';
        const result2 = await processQuery(currentQuery);
        console.log('Pattern Match Result:', result2);

        // Test Case 3: Export Data to HDFS
        console.log('\nTest Case 3: Export Data to HDFS');
        const exportResult = await dataTransfer.exportToHDFS('grievances', {
            department: 'Water',
            createdAt: {
                $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
            }
        });
        console.log('Export Result:', exportResult);

        // Test Case 4: Run MapReduce Job
        console.log('\nTest Case 4: Run MapReduce Job');
        const jobConfig = {
            jobName: 'test_water_analysis',
            inputPath: exportResult,
            mapper: 'grievanceMapper',
            reducer: 'grievanceReducer',
            outputPath: `/output/water_analysis_${Date.now()}`
        };
        const jobResult = await jobManager.submitJob(jobConfig);
        console.log('Job Submission Result:', jobResult);

        // Wait for job completion
        const jobStatus = await jobManager.waitForJobCompletion(jobResult.jobId);
        console.log('Job Final Status:', jobStatus);

    } catch (error) {
        console.error('Test Error:', error);
    }
}

// Run the tests
console.log('Starting Hadoop Integration Tests...');
testQueries().then(() => {
    console.log('Tests completed');
});
