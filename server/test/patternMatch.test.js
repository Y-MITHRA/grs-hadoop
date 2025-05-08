import { matchQueryPattern } from '../hadoop/queryPatternMatcher.js';

// Test different query patterns
const testQueries = [
    {
        query: 'Show me trends in water department complaints',
        expected: {
            requiresHistoricalAnalysis: true,
            dataType: 'water'
        }
    },
    {
        query: 'What is the current status of electricity complaints?',
        expected: {
            requiresHistoricalAnalysis: false,
            dataType: 'electricity'
        }
    },
    {
        query: 'Historical data about RTO complaints',
        expected: {
            requiresHistoricalAnalysis: true,
            dataType: 'RTO'
        }
    }
];

console.log('Starting Pattern Matching Tests...\n');

testQueries.forEach((test, index) => {
    console.log(`Test Case ${index + 1}: "${test.query}"`);
    const result = matchQueryPattern(test.query);
    console.log('Result:', result);
    console.log('Expected:', test.expected);
    console.log('Match:', 
        result.requiresHistoricalAnalysis === test.expected.requiresHistoricalAnalysis &&
        result.dataType.toLowerCase() === test.expected.dataType.toLowerCase()
    );
    console.log('-------------------\n');
});
