import { matchQueryPattern } from '../hadoop/queryPatternMatcher.js';
import dataTransfer from '../hadoop/dataTransfer.js';
import jobManager from '../hadoop/jobManager.js';

async function testComplexQueries() {
    const queries = [
        "Show resolution efficiency by department",
        "Display escalation rates across departments",
        "Show high priority pending cases in Chennai South",
        "List resolved cases in electricity department from last month",
        "Compare case counts between water and electricity departments",
        "Show monthly grievance patterns for RTO department",
        "Display urgent cases in Chennai South",
        "Show resource requirements by department",
        "What's the average resolution time for water department?",
        "Show department-wise case distribution"
    ];

    for (const query of queries) {
        console.log(`\nProcessing query: "${query}"`);
        
        // Match query pattern
        const pattern = matchQueryPattern(query);
        console.log('Pattern match:', pattern);
        
        // Build MongoDB query
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
        
        // Add time constraints
        if (pattern.timeframe === 'LAST_MONTH') {
            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            mongoQuery.createdAt = {
                $gte: lastMonth,
                $lte: endOfLastMonth
            };
        }
        
        console.log('MongoDB Query:', mongoQuery);
        
        try {
            // Export data to HDFS
            console.log('Exporting data to HDFS...');
            const hdfsPath = await dataTransfer.exportToHDFS('grievances', mongoQuery);
            console.log('Data exported to:', hdfsPath);
            
            // Submit MapReduce job
            console.log('Submitting MapReduce job...');
            const jobConfig = {
                jobName: `grievance_analysis_${Date.now()}`,
                inputPath: hdfsPath,
                mapper: 'grievanceMapper',
                reducer: 'grievanceReducer',
                outputPath: `/output/analysis_${Date.now()}`
            };
            
            const jobResult = await jobManager.submitJob(jobConfig);
            console.log('Job submitted:', jobResult);
            
            // Get results
            console.log('Getting results...');
            const localResultPath = `/tmp/analysis_${Date.now()}.json`;
            const results = await dataTransfer.importFromHDFS(jobResult.outputPath + '/part-00000', localResultPath);
            
            // Process results based on query type
            console.log('\nResults:');
            if (pattern.analysisType === 'PERFORMANCE') {
                const resolutionTimes = results.filter(r => r.key.startsWith('resolution_time_'));
                console.log('Resolution Times:', resolutionTimes);
            } else if (pattern.analysisType === 'DISTRIBUTION') {
                const distribution = results.filter(r => r.key.startsWith('department_') || r.key.startsWith('status_'));
                console.log('Distribution:', distribution);
            } else if (pattern.analysisType === 'TRENDS') {
                const trends = results.filter(r => r.key.startsWith('month_'));
                console.log('Trends:', trends);
            } else {
                console.log('Raw Results:', results);
            }
            
        } catch (error) {
            console.error('Error processing query:', error);
        }
        
        console.log('-------------------');
    }
}

// Run the test
console.log('Starting Complex Query Tests...');
testComplexQueries().then(() => {
    console.log('\nTests completed');
});
