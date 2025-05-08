import dotenv from 'dotenv';
dotenv.config();

// Query pattern matching constants
// Common patterns for query analysis
const QUERY_INDICATORS = {
    SHOW: /\b(?:show|display|list|get|what'?s)\b/i,
    COUNT: /\b(?:count|how many|number of|categorize|group|summarize)\b/i,
    IN: /\b(?:in|from|at|within|during|for)\b/i,
    WITH: /\b(?:with|having|that are|which are)\b/i,
    PER: /\b(?:per|by|for each)\b/i,
    TIME: /\b(?:today|yesterday|last\s+(?:24\s+hours?|day|week|month|year)|this\s+(?:day|week|month|year)|more\s+than\s+\d+\s+days?)\b/i,
    PERFORMANCE: /\b(?:slowest|fastest|performance|response\s+time|how\s+(?:fast|slow)|which\s+(?:department|district)\s+has)\b/i
};

const QUERY_PATTERNS = {
    DEPARTMENT_PATTERNS: {
        'RTO': /\b(?:rto\s+(?:department|cases|grievances)?|transport\s+office)\b/i,
        'WATER': /\b(?:water\s+(?:department|cases|grievances)?)\b/i,
        'ELECTRICITY': /\b(?:electricity\s+(?:department|cases|grievances)?|power\s+(?:department|cases|grievances)?|electric\s+department)\b/i
    },
    GROUPING_PATTERNS: {
        'BY_DEPARTMENT': /\b(?:per|by|for each)\s+department\b/i,
        'BY_DISTRICT': /\b(?:per|by|for each)\s+district\b/i,
        'BY_PRIORITY': /\b(?:per|by|for each)\s+priority\b/i,
        'BY_STATUS': /\b(?:per|by|for each)\s+status\b/i
    },
    STATUS_PATTERNS: {
        'PENDING': /\b(?:pending|waiting|not\s+started|unresolved|open)\b/i,
        'ASSIGNED': /\b(?:assigned|allocated|delegated)\b/i,
        'IN_PROGRESS': /\b(?:in[- ]?progress|ongoing|processing|being\s+handled|under\s+review)\b/i,
        'RESOLVED': /\b(?:resolved|completed|fixed|done)\b/i,
        'CLOSED': /\b(?:closed|finished|concluded|ended)\b/i,
        'ESCALATED': /\b(?:escalated|elevated|raised|promoted|escalation|escalated\s+(?:cases?|grievances?|complaints?|issues?)|(?:cases?|grievances?|complaints?|issues?)\s+(?:that\s+(?:are|were|have\s+been)\s+)?escalated)\b/i
    },
    ESCALATION_PATTERNS: {
        'DEPARTMENT_ESCALATED': /\b(?:escalated|elevated|raised|promoted|escalation)\s+(?:cases?|grievances?|complaints?|issues?)?\s+(?:in|from|at|within|of|for)\s+(?:the\s+)?(?:water|rto|electricity|transport\s+office|power)(?:\s+department)?\b/i,
        'DEPARTMENT_WITH_ESCALATED': /\b(?:water|rto|electricity|transport\s+office|power)(?:\s+department)?\s+(?:cases?|grievances?|complaints?|issues?)?\s+(?:that\s+(?:are|were|have\s+been)\s+)?(?:escalated|elevated|raised|promoted)\b/i
    },
    STATUS_QUERY_PATTERNS: {
        'STATUS_CHECK': /\b(?:what'?s?\s+(?:the\s+)?status|how\s+(?:are|is)|show\s+status)\b/i
    },
    PRIORITY_PATTERNS: {
        'HIGH': /\b(?:high|urgent|critical|priority\s+(?:1|one)|p1|highest)\b/i,
        'MEDIUM': /\b(?:medium|normal|moderate|priority\s+(?:2|two)|p2|standard)\b/i,
        'LOW': /\b(?:low|routine|minor|priority\s+(?:3|three)|p3)\b/i
    },
    PRIORITY_QUERY_PATTERNS: {
        'PRIORITY_CHECK': /\b(?:priority|urgent|important)\s+(?:cases?|grievances?|issues?|complaints?)?\b/i
    },
    LOCATION_PATTERNS: {
        'CHENNAI - CENTRAL': /\b(?:chennai(?:\s*-\s*(?:chennai\s*)?central|\s+central)(?:\s+division)?|central\s+chennai)\b/i,
        'CHENNAI - NORTH': /\b(?:chennai(?:\s*-\s*(?:chennai\s*)?north|\s+north)(?:\s+division)?|north\s+chennai)\b/i,
        'CHENNAI - SOUTH': /\b(?:chennai(?:\s*-\s*(?:chennai\s*)?south|\s+south)(?:\s+division)?|south\s+chennai)\b/i,
        'MADURAI - CENTRAL': /\b(?:madurai(?:\s*-\s*(?:madurai\s*)?central|\s+central)(?:\s+division)?|central\s+madurai)\b/i,
        'COIMBATORE - NORTH': /\b(?:coimbatore(?:\s*-\s*(?:coimbatore\s*)?north|\s+north)(?:\s+division)?|north\s+coimbatore)\b/i,
        'COIMBATORE - EAST': /\b(?:coimbatore(?:\s*-\s*(?:coimbatore\s*)?east|\s+east)(?:\s+division)?|east\s+coimbatore)\b/i
    },
    TIME_PATTERNS: {
        'LAST_24_HOURS': /\b(?:last\s*24\s*hours?|past\s*day)\b/i,
        'LAST_HOUR': /\blast\s*hour\b/i,
        'TODAY': /\btoday\b/i,
        'THIS_WEEK': /\bthis\s*week\b/i,
        'THIS_MONTH': /\bthis\s*month\b/i,
        'LAST_MONTH': /\blast\s*month\b/i,
        'THIS_YEAR': /\bthis\s*year\b/i,
        'CUSTOM_DAYS': /\bmore\s*than\s*(\d+)\s*days?\b/i
    },
    DURATION_PATTERNS: {
        'PENDING_DURATION': /\b(?:pending|unresolved|open)\s+(?:for|since)\s+more\s+than\s+(\d+)\s+days?\b/i,
        'RESOLVED_DURATION': /\b(?:resolved|closed|completed)\s+(?:within|in)\s+(\d+)\s+days?\b/i
    }
};

function matchQueryPattern(query) {
    // Initialize pattern with strict defaults
    const pattern = {
        timeframe: null,
        department: null,
        status: null,
        priority: null,
        location: null,
        analysisType: 'BASIC_COUNT',
        requiresHistoricalAnalysis: false,
        originalQuery: query,
        filters: {}, // Track which filters are explicitly specified
        queryType: null, // Track the type of query (show, count, etc)
        groupBy: [], // Track grouping dimensions
        customDuration: null, // For custom duration filters
        pendingDuration: null, // For pending duration filters
        showAllPriorities: false, // For showing all priority cases
        responseTime: null, // For performance queries
        performanceMetric: null // For performance analysis
    };

    // Convert query to lowercase for case-insensitive matching
    const lowerQuery = query.toLowerCase();

    // Determine query type and grouping
    if (QUERY_INDICATORS.COUNT.test(lowerQuery)) {
        pattern.queryType = 'COUNT';
        
        // Check for grouping patterns
        for (const [groupType, regex] of Object.entries(QUERY_PATTERNS.GROUPING_PATTERNS)) {
            if (regex.test(lowerQuery)) {
                pattern.groupBy.push(groupType.replace('BY_', '').toLowerCase());
            }
        }
    } else if (QUERY_INDICATORS.SHOW.test(lowerQuery)) {
        pattern.queryType = 'SHOW';
    }

    if (!pattern.queryType) {
        // If no clear query type is found, default to SHOW
        pattern.queryType = 'SHOW';
    }

    // Split query into parts for better context understanding
    const queryParts = query.split(/\s+/);
    let currentContext = null;

    // Analyze query structure
    for (let i = 0; i < queryParts.length; i++) {
        const word = queryParts[i].toLowerCase();
        
        if (QUERY_INDICATORS.IN.test(word)) {
            currentContext = 'LOCATION';
            continue;
        } else if (QUERY_INDICATORS.WITH.test(word)) {
            currentContext = 'STATUS';
            continue;
        }

        // Use context to improve matching accuracy
        if (currentContext === 'LOCATION') {
            // Look ahead for complete location phrase
            const locationPhrase = queryParts.slice(i).join(' ');
            for (const [loc, regex] of Object.entries(QUERY_PATTERNS.LOCATION_PATTERNS)) {
                if (regex.test(locationPhrase)) {
                    pattern.location = loc;
                    pattern.filters.location = true;
                    break;
                }
            }
            if (pattern.filters.location) {
                currentContext = null;
                continue;
            }
        }
    }

    // Department matching with context
    let departmentMatch = null;
    for (const [dept, regex] of Object.entries(QUERY_PATTERNS.DEPARTMENT_PATTERNS)) {
        const match = lowerQuery.match(regex);
        if (match) {
            // If we find a department match, make sure it's a complete phrase
            // This prevents partial matches like 'water' in 'watermelon'
            const matchedText = match[0];
            const wordBefore = lowerQuery.charAt(match.index - 1);
            const wordAfter = lowerQuery.charAt(match.index + matchedText.length);
            
            // Only accept if it's a complete word/phrase
            if ((!wordBefore || /\s/.test(wordBefore)) && 
                (!wordAfter || /\s/.test(wordAfter))) {
                departmentMatch = dept;
                break;
            }
        }
    }
    
    if (departmentMatch) {
        pattern.department = departmentMatch.toUpperCase();
        pattern.filters.department = true;
    }

    // Check for status query
    if (QUERY_PATTERNS.STATUS_QUERY_PATTERNS.STATUS_CHECK.test(lowerQuery)) {
        pattern.queryType = 'STATUS_CHECK';
        pattern.groupBy.push('status');
        if (pattern.department) {
            pattern.groupBy.push('department');
        }
    }

    // Check for performance query
    if (QUERY_INDICATORS.PERFORMANCE.test(lowerQuery)) {
        pattern.queryType = 'PERFORMANCE';
        pattern.requiresHistoricalAnalysis = true;
        pattern.groupBy = ['department'];
        if (pattern.filters.priority) {
            pattern.performanceMetric = 'PRIORITY_RESPONSE';
        } else {
            pattern.performanceMetric = 'GENERAL_RESPONSE';
        }
    }

    // Check for priority query
    if (QUERY_PATTERNS.PRIORITY_QUERY_PATTERNS.PRIORITY_CHECK.test(lowerQuery) || 
        Object.values(QUERY_PATTERNS.PRIORITY_PATTERNS).some(regex => regex.test(lowerQuery))) {
        pattern.filters.priority = true;
        // If no specific priority is mentioned, set to show all priorities
        if (!pattern.priority) {
            pattern.showAllPriorities = true;
        }
        // For priority queries, default to SHOW if no other type is set
        if (!pattern.queryType) {
            pattern.queryType = 'SHOW';
        }
    }

    // Check for department-specific escalation patterns first
    let isEscalatedQuery = false;
    for (const [, regex] of Object.entries(QUERY_PATTERNS.ESCALATION_PATTERNS)) {
        if (regex.test(lowerQuery)) {
            pattern.status = 'ESCALATED';
            pattern.filters.status = true;
            isEscalatedQuery = true;
            break;
        }
    }

    // If not already marked as escalated, check general status patterns
    if (!isEscalatedQuery) {
        for (const [status, regex] of Object.entries(QUERY_PATTERNS.STATUS_PATTERNS)) {
            if (regex.test(lowerQuery)) {
                pattern.status = status.toUpperCase();
                pattern.filters.status = true;
                break;
            }
        }
    }
    
    // For escalated cases, always set queryType to SHOW
    if (pattern.status === 'ESCALATED') {
        pattern.queryType = 'SHOW';
        pattern.requiresEscalationHandling = true;
        // Remove any grouping for escalated cases to show individual records
        pattern.groupBy = [];
    }

    // Priority matching - exact match required
    for (const [priority, regex] of Object.entries(QUERY_PATTERNS.PRIORITY_PATTERNS)) {
        if (regex.test(lowerQuery)) {
            pattern.priority = priority.toUpperCase();
            pattern.filters.priority = true;
            break;
        }
    }

    // Location matching - exact match required
    for (const [location, regex] of Object.entries(QUERY_PATTERNS.LOCATION_PATTERNS)) {
        if (regex.test(lowerQuery)) {
            pattern.location = location.toUpperCase();
            pattern.filters.location = true;
            break;
        }
    }

    // Time and duration matching
    for (const [timeframe, regex] of Object.entries(QUERY_PATTERNS.TIME_PATTERNS)) {
        const match = lowerQuery.match(regex);
        if (match) {
            if (timeframe === 'CUSTOM_DAYS' && match[1]) {
                pattern.customDuration = parseInt(match[1]);
                pattern.filters.customDuration = true;
            } else {
                pattern.timeframe = timeframe;
                pattern.filters.timeframe = true;
            }
            break;
        }
    }

    // Check for pending duration
    const pendingMatch = lowerQuery.match(QUERY_PATTERNS.DURATION_PATTERNS.PENDING_DURATION);
    if (pendingMatch && pendingMatch[1]) {
        pattern.pendingDuration = parseInt(pendingMatch[1]);
        pattern.filters.pendingDuration = true;
        pattern.status = 'PENDING';
        pattern.filters.status = true;
    }

    // Analysis type detection
    if (lowerQuery.includes('performance') || lowerQuery.includes('how well')) {
        pattern.analysisType = 'PERFORMANCE';
        pattern.requiresHistoricalAnalysis = true;
    } else if (lowerQuery.includes('distribution') || lowerQuery.includes('breakdown')) {
        pattern.analysisType = 'DISTRIBUTION';
    } else if (lowerQuery.includes('trend') || lowerQuery.includes('over time')) {
        pattern.analysisType = 'TRENDS';
        pattern.requiresHistoricalAnalysis = true;
    } else if (lowerQuery.includes('resource') || lowerQuery.includes('staff')) {
        pattern.analysisType = 'RESOURCE';
    }

    // Set unspecified filters to null to ensure strict matching
    if (!pattern.filters.department) pattern.department = null;
    if (!pattern.filters.status) pattern.status = null;
    if (!pattern.filters.priority) pattern.priority = null;
    if (!pattern.filters.location) pattern.location = null;
    if (!pattern.filters.timeframe) pattern.timeframe = null;

    return pattern;
}

function generateHadoopQuery(matchResult) {
    if (!matchResult.requiresHistoricalAnalysis) {
        return null;
    }

    // Generate Hadoop MapReduce job configuration
    return {
        jobName: `${matchResult.department}_${matchResult.analysisType}_${Date.now()}`,
        inputCollection: matchResult.department,
        mapper: `${matchResult.department}Mapper`,
        reducer: `${matchResult.department}Reducer`,
        outputPath: `/analysis/${matchResult.department}_${matchResult.analysisType}_${Date.now()}`
    };
}

export { matchQueryPattern, generateHadoopQuery, QUERY_PATTERNS };
