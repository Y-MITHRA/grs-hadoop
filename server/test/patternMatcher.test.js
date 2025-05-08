import { matchQueryPattern } from '../hadoop/queryPatternMatcher.js';

const testQueries = [
    {
        query: "How many water complaints were filed in the last hour?",
        expected: {
            timeframe: "LAST_HOUR",
            department: "WATER",
            analysisType: "BASIC_COUNT"
        }
    },
    {
        query: "Count grievances per department per district filed this month",
        expected: {
            timeframe: "THIS_MONTH",
            department: "ALL_DEPARTMENTS",
            analysisType: "DISTRIBUTION"
        }
    },
    {
        query: "Show high priority pending cases in the water department",
        expected: {
            department: "WATER",
            status: "PENDING",
            priority: "HIGH"
        }
    },
    {
        query: "Show resolution trends by department",
        expected: {
            status: "RESOLVED",
            analysisType: "TRENDS",
            requiresHistoricalAnalysis: true
        }
    },
    {
        query: "List issues in South division of Chennai",
        expected: {
            location: "SOUTH",
            analysisType: "BASIC_COUNT"
        }
    }
];

console.log('Starting Pattern Matcher Tests...\n');

testQueries.forEach((test, index) => {
    console.log(`Test Case ${index + 1}: "${test.query}"`);
    const result = matchQueryPattern(test.query);
    console.log('Result:', result);
    
    // Check if expected fields match
    const matches = Object.entries(test.expected).map(([key, value]) => {
        const matches = result[key] === value;
        if (!matches) {
            console.log(`❌ Mismatch in ${key}: Expected ${value}, got ${result[key]}`);
        }
        return matches;
    });
    
    const allMatch = matches.every(m => m);
    console.log(allMatch ? '✅ All expected fields match' : '❌ Some fields did not match');
    console.log('-------------------\n');
});
