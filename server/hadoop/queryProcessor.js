import { matchQueryPattern, QUERY_PATTERNS } from './queryPatternMatcher.js';
import dataTransfer from './dataTransfer.js';
import jobManager from './jobManager.js';

// Common patterns for query analysis
const QUERY_INDICATORS = {
    SHOW: /\b(?:show|display|list|get)\b/i,
    LIST: /\b(?:list|all|every)\b/i,
    COUNT: /\b(?:count|how many|number of)\b/i,
    IN: /\b(?:in|from|at|within)\b/i,
    WITH: /\b(?:with|having|that are|which are)\b/i
};

class QueryProcessor {
    async processQuery(query) {
        try {
            // Match query pattern
            const pattern = matchQueryPattern(query);
            console.log('Pattern match:', pattern);
            
            // For show/list type queries, we don't require filters
            const requiresFilter = !QUERY_INDICATORS.SHOW.test(query.toLowerCase()) && 
                                 !QUERY_INDICATORS.LIST.test(query.toLowerCase());

            if (requiresFilter && 
                !pattern.filters.department && 
                !pattern.filters.status && 
                !pattern.filters.priority && 
                !pattern.filters.location && 
                !pattern.filters.timeframe && 
                !pattern.filters.customDuration && 
                !pattern.filters.pendingDuration) {
                throw new Error('Query must specify at least one filter (department, status, priority, location, timeframe, or duration)');
            }

            // Build MongoDB query with strict filters
            const mongoQuery = {};
            
            // Special handling for escalated cases
            if (pattern.status === 'ESCALATED') {
                // Clear any existing query conditions
                Object.keys(mongoQuery).forEach(key => delete mongoQuery[key]);
                
                // Build base escalation query
                const escalationConditions = [
                    { status: 'ESCALATED' },
                    { isEscalated: true },
                    { escalationLevel: { $gt: 0 } }
                ];
                
                // Build the final query
                if (pattern.filters.department) {
                    // For department-specific queries, use $and to combine conditions
                    mongoQuery.$and = [
                        { $or: escalationConditions },
                        { department: { $regex: new RegExp(pattern.department, 'i') } }
                    ];
                } else {
                    // For general escalation queries, just use $or
                    mongoQuery.$or = escalationConditions;
                }
            }
            
            // Handle custom durations
            if (pattern.filters.customDuration) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - pattern.customDuration);
                mongoQuery.createdAt = { $lt: cutoffDate };
            }
            
            // Handle pending duration
            if (pattern.filters.pendingDuration) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - pattern.pendingDuration);
                mongoQuery.status = 'PENDING';
                mongoQuery.createdAt = { $lt: cutoffDate };
            }
            
            // Only include filters that were explicitly specified in the query with exact matches
            if (pattern.filters.department) {
                mongoQuery.department = { $eq: pattern.department.toUpperCase() };
            }
            
            if (pattern.filters.status && pattern.status && pattern.status !== 'ESCALATED') {
                mongoQuery.status = { $eq: pattern.status.toUpperCase() };
            }
            
            if (pattern.filters.priority) {
                mongoQuery.priority = { $eq: pattern.priority.toUpperCase() };
            }
            
            if (pattern.filters.location) {
                const locationParts = pattern.location.split(' - ');
                const city = locationParts[0];
                const division = locationParts[1];

                // Create exact location match conditions
                const locationConditions = [];

                // Match exact format "City - Division"
                locationConditions.push({ 
                    location: { 
                        $regex: new RegExp(`^${city}\s*-\s*${city}?\s*${division}\s*Division$`, 'i')
                    }
                });

                // Match alternative format "City - City Division"
                locationConditions.push({ 
                    location: { 
                        $regex: new RegExp(`^${city}\s*-\s*${division}\s*Division$`, 'i')
                    }
                });

                // Use $or to match any of the formats
                mongoQuery.$or = locationConditions;
            }
            
            // Time constraints
            if (pattern.timeframe) {
                const now = new Date();
                let startDate, endDate;
                
                switch (pattern.timeframe) {
                    case 'LAST_24_HOURS':
                        startDate = new Date(now - 24 * 60 * 60 * 1000);
                        break;
                    case 'LAST_HOUR':
                        startDate = new Date(now - 60 * 60 * 1000);
                        break;
                    case 'TODAY':
                        startDate = new Date(now.setHours(0, 0, 0, 0));
                        break;
                    case 'THIS_WEEK':
                        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                        break;
                    case 'THIS_MONTH':
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                    case 'LAST_MONTH':
                        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                        break;
                    case 'THIS_YEAR':
                        startDate = new Date(now.getFullYear(), 0, 1);
                        break;
                }
                
                mongoQuery.createdAt = {};
                if (startDate) mongoQuery.createdAt.$gte = startDate;
                if (endDate) mongoQuery.createdAt.$lte = endDate;
            }
            
            console.log('MongoDB Query:', JSON.stringify(mongoQuery, null, 2));
            
            // Export data to HDFS
            const hdfsPath = await dataTransfer.exportToHDFS('grievances', mongoQuery);
            console.log('Data exported to:', hdfsPath);
            
            // Submit MapReduce job with filter information
            const jobConfig = {
                jobName: `grievance_analysis_${Date.now()}`,
                inputPath: hdfsPath,
                mapper: pattern.requiresHistoricalAnalysis ? 'historicalMapper' : 'basicMapper',
                reducer: pattern.requiresHistoricalAnalysis ? 'historicalReducer' : 'basicReducer',
                outputPath: `/output/analysis_${Date.now()}`,
                filters: pattern.filters // Pass filter information to MapReduce job
            };
            
            const jobResult = await jobManager.submitJob(jobConfig);
            console.log('Job submitted:', jobResult);
            
            // Get results
            const localResultPath = `/tmp/analysis_${Date.now()}.json`;
            const results = await dataTransfer.importFromHDFS(jobResult.outputPath + '/part-00000', localResultPath);
            
            // Filter and format results based on query type and explicit filters
            let formattedResults = this.formatResults(results, pattern);
            
            // Handle different query types
            switch (pattern.queryType) {
                case 'COUNT':
                    if (pattern.groupBy.length > 0) {
                        formattedResults = this.groupResults(formattedResults, pattern.groupBy);
                    }
                    break;
                    
                case 'STATUS_CHECK':
                    if (pattern.department) {
                        // Group by both status and department for department-specific status checks
                        formattedResults = this.groupResults(formattedResults, ['status', 'department']);
                    } else {
                        formattedResults = this.groupResults(formattedResults, ['status']);
                    }
                    break;
                    
                case 'PERFORMANCE':
                    if (pattern.performanceMetric === 'PRIORITY_RESPONSE') {
                        formattedResults = this.analyzePerformance(formattedResults, true);
                    } else {
                        formattedResults = this.analyzePerformance(formattedResults, false);
                    }
                    break;
                    
                case 'SHOW':
                    // For show queries, we want to show individual records
                    if (pattern.showAllPriorities) {
                        formattedResults = this.groupResults(formattedResults, ['priority']);
                    }
                    break;
            }
            
            return {
                pattern,
                query: mongoQuery,
                results: formattedResults
            };
            
        } catch (error) {
            console.error('Error processing query:', error);
            throw error;
        }
    }
    
    groupResults(results, groupBy) {
        const grouped = {};
        
        for (const result of results) {
            let key = groupBy.map(dim => result[dim]).join('_');
            if (!grouped[key]) {
                grouped[key] = {
                    count: 0,
                    dimensions: {}
                };
                groupBy.forEach(dim => {
                    grouped[key].dimensions[dim] = result[dim];
                });
            }
            grouped[key].count++;
        }
        
        return Object.values(grouped);
    }

    analyzePerformance(results, priorityOnly = false) {
        // Calculate average response time per department
        const departmentStats = {};
        
        for (const result of results) {
            if (!departmentStats[result.department]) {
                departmentStats[result.department] = {
                    totalResponseTime: 0,
                    caseCount: 0,
                    highPriorityCases: 0,
                    avgResponseTime: 0
                };
            }
            
            const stats = departmentStats[result.department];
            
            // Calculate response time (in hours)
            if (result.resolvedAt && result.createdAt) {
                const responseTime = (new Date(result.resolvedAt) - new Date(result.createdAt)) / (1000 * 60 * 60);
                
                // For priority analysis, only consider high priority cases
                if (priorityOnly) {
                    if (result.priority === 'HIGH') {
                        stats.totalResponseTime += responseTime;
                        stats.caseCount++;
                        stats.highPriorityCases++;
                    }
                } else {
                    stats.totalResponseTime += responseTime;
                    stats.caseCount++;
                    if (result.priority === 'HIGH') {
                        stats.highPriorityCases++;
                    }
                }
            }
        }
        
        // Calculate averages and sort by response time
        return Object.entries(departmentStats)
            .map(([department, stats]) => ({
                department,
                avgResponseTime: stats.caseCount > 0 ? stats.totalResponseTime / stats.caseCount : 0,
                totalCases: stats.caseCount,
                highPriorityCases: stats.highPriorityCases
            }))
            .sort((a, b) => b.avgResponseTime - a.avgResponseTime);
    }

    formatResults(results, pattern) {
        if (!results || !Array.isArray(results)) return [];
        
        // Apply any additional filtering based on pattern
        let filteredResults = results;

        // Special handling for escalated cases in results
        if (pattern.status === 'ESCALATED') {
            filteredResults = results.filter(result => {
                const isEscalated = 
                    result.status === 'ESCALATED' || 
                    result.isEscalated === true || 
                    (result.escalationLevel && result.escalationLevel > 0);
                
                // If department filter exists, apply it
                if (pattern.filters.department) {
                    return isEscalated && 
                           result.department && 
                           result.department.toLowerCase() === pattern.department.toLowerCase();
                }
                
                return isEscalated;
            });
            
            // Sort escalated cases by escalation level and date
            filteredResults.sort((a, b) => {
                // First sort by department if specified
                if (pattern.filters.department) {
                    const deptA = a.department?.toLowerCase() === pattern.department.toLowerCase() ? 1 : 0;
                    const deptB = b.department?.toLowerCase() === pattern.department.toLowerCase() ? 1 : 0;
                    if (deptA !== deptB) return deptB - deptA;
                }
                
                // Then sort by escalation level
                const levelA = a.escalationLevel || 0;
                const levelB = b.escalationLevel || 0;
                if (levelA !== levelB) return levelB - levelA;
                
                // Finally sort by date
                const dateA = new Date(a.escalatedAt || a.updatedAt);
                const dateB = new Date(b.escalatedAt || b.updatedAt);
                return dateB - dateA;
            });
        }
        
        // Apply filters based on explicitly specified criteria with exact matches
        if (pattern.filters.department && pattern.department) {
            const dept = pattern.department.toUpperCase();
            filteredResults = filteredResults.filter(r => {
                if (!r.key || typeof r.key !== 'string') return false;
                const key = r.key.toUpperCase();
                // Only match exact department keys or department-prefixed keys
                return key === dept || key.startsWith(`${dept}_`);
            });
        }
        
        if (pattern.filters.status && pattern.status) {
            const status = pattern.status.toUpperCase();
            filteredResults = filteredResults.filter(r => {
                if (!r.key || typeof r.key !== 'string') return false;
                const key = r.key.toUpperCase();
                // Only match exact status keys or status-prefixed keys
                return key === status || key.startsWith(`${status}_`);
            });
        }
        
        if (pattern.filters.priority && pattern.priority) {
            const priority = pattern.priority.toUpperCase();
            filteredResults = filteredResults.filter(r => {
                if (!r.key || typeof r.key !== 'string') return false;
                const key = r.key.toUpperCase();
                // Only match exact priority keys or priority-prefixed keys
                return key === priority || key.startsWith(`${priority}_`);
            });
        }
        
        if (pattern.filters.location && pattern.location) {
            const locationParts = pattern.location.split(' - ');
            const city = locationParts[0].toUpperCase();
            const division = locationParts[1].toUpperCase();

            filteredResults = filteredResults.filter(r => {
                if (!r.key || typeof r.key !== 'string') return false;
                const key = r.key.toUpperCase();
                
                // Match exact location format
                const exactLocation = `${city}_${division}`;
                return key.includes(exactLocation);
            });
        }
        
        // Apply analysis type filter
        switch (pattern.analysisType) {
            case 'PERFORMANCE':
                return filteredResults.filter(r => 
                    r.key.startsWith('resolution_time_') || 
                    r.key.startsWith('escalation_')
                );
            case 'DISTRIBUTION':
                return filteredResults.filter(r => 
                    r.key.startsWith('department_') || 
                    r.key.startsWith('status_') ||
                    r.key.startsWith('priority_')
                );
            case 'TRENDS':
                return filteredResults.filter(r => r.key.startsWith('month_'));
            case 'RESOURCE':
                return filteredResults.filter(r => r.key.startsWith('resource_needs_'));
            default:
                return filteredResults;
        }
    }
}

export default new QueryProcessor();
