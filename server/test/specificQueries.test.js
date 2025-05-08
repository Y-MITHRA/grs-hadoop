import { mockGrievances } from './mockData.js';
import queryProcessor from '../hadoop/queryProcessor.js';

console.log('Starting Specific Query Tests...\n');

// Test specific queries
async function testQueries() {
    const queries = [
        'Show assigned cases in RTO department',
        'Show in-progress cases in Electricity department'
    ];

    for (const query of queries) {
        console.log(`\nTesting query: "${query}"`);
        const results = await queryProcessor.processQuery(query);
        console.log('Query results:', JSON.stringify(results, null, 2));
        console.log('-------------------');
    }
}

// Run tests
testQueries()
    .then(() => console.log('\nTests completed'))
    .catch(error => console.error('Test error:', error));
