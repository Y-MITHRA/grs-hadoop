import jobManager from '../hadoop/jobManager.js';
import dataTransfer from '../hadoop/dataTransfer.js';

async function testMapReduce() {
    try {
        console.log('Starting MapReduce Test...\n');

        // Step 1: Export data to HDFS
        console.log('1. Exporting data to HDFS...');
        const query = {
            department: 'Water',
            createdAt: {
                $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
            }
        };
        const hdfsInputPath = await dataTransfer.exportToHDFS('grievances', query);
        console.log('Data exported to:', hdfsInputPath);

        // Step 2: Submit MapReduce job
        console.log('\n2. Submitting MapReduce job...');
        const jobConfig = {
            jobName: 'water_complaints_analysis',
            inputPath: hdfsInputPath.replace('/data.json', ''),
            mapper: 'grievanceMapper',
            reducer: 'grievanceReducer',
            outputPath: `/output/water_analysis_${Date.now()}`
        };
        
        const jobResult = await jobManager.submitJob(jobConfig);
        console.log('Job submitted:', jobResult);

        // Step 3: Import results
        console.log('\n3. Importing results...');
        const localResultPath = `/tmp/water_analysis_${Date.now()}.json`;
        const results = await dataTransfer.importFromHDFS(jobResult.outputPath + '/part-00000', localResultPath);
        
        console.log('\nAnalysis Results:');
        console.log(JSON.stringify(results, null, 2));

    } catch (error) {
        console.error('Test Error:', error);
    }
}

// Run the test
console.log('Starting MapReduce Integration Test...');
testMapReduce().then(() => {
    console.log('\nTest completed');
});
