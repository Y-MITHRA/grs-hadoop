import dataTransfer from '../hadoop/dataTransfer.js';

async function testDataTransfer() {
    try {
        console.log('Testing Data Transfer to HDFS...\n');

        // Test Case 1: Export sample data to HDFS
        const sampleData = {
            department: 'Water',
            createdAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
        };

        console.log('Exporting data with query:', sampleData);
        const hdfsPath = await dataTransfer.exportToHDFS('grievances', sampleData);
        console.log('Data exported to HDFS path:', hdfsPath);

        // Test Case 2: Import data back from HDFS
        const localPath = `/tmp/test_import_${Date.now()}.json`;
        console.log('\nImporting data from HDFS to:', localPath);
        const importedData = await dataTransfer.importFromHDFS(hdfsPath, localPath);
        console.log('Imported data sample:', importedData.slice(0, 2));

    } catch (error) {
        console.error('Test Error:', error);
    }
}

// Run the test
console.log('Starting Data Transfer Tests...');
testDataTransfer().then(() => {
    console.log('\nTests completed');
});
