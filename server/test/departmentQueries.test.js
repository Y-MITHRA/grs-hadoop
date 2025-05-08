import queryProcessor from '../hadoop/queryProcessor.js';

async function testDepartmentQueries() {
    const queries = [
        "Show pending cases in RTO department",
        "List all electricity complaints",
        "Show water department issues",
        "Compare RTO and electricity department performance",
        "Show high priority cases in electricity department",
        "List water department cases from last month"
    ];

    for (const query of queries) {
        console.log(`\nTesting query: "${query}"`);
        
        try {
            const result = await queryProcessor.processQuery(query);
            console.log('Query results:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('Error processing query:', error);
        }
        
        console.log('-------------------');
    }
}

// Run the test
console.log('Starting Department Query Tests...\n');
testDepartmentQueries().then(() => {
    console.log('\nTests completed');
});
