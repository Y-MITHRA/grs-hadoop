import express from 'express';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import { JWT_SECRET, JWT_OPTIONS } from '../config/jwt.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import Grievance from '../models/Grievance.js';
import Official from '../models/Official.js';
import ResourceManagement from '../models/ResourceManagement.js';
import auth from '../middleware/auth.js';

dotenv.config();

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Constants for validation 
const VALID_DEPARTMENTS = ['Water', 'RTO', 'Electricity'];
const VALID_DIVISIONS = [
  'Chennai North', 'Chennai South', 'Chennai Central',
  'Coimbatore North', 'Coimbatore South',
  'Madurai Central', 'Madurai South',
  'Salem East', 'Salem West',
  'Tiruchirappalli Central', 'Tiruchirappalli South'
];
const VALID_DISTRICTS = ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Belagavi', 'Kalaburagi', 'Mangaluru', 'Hubballi', 'Dharwad'];
const VALID_TALUKS = ['Bengaluru East', 'Bengaluru West', 'Bengaluru South', 'Bengaluru North', 'Nelamangala', 'Doddaballapura', 'Devanahalli', 'Hosakote', 'Anekal', 'Central Mysuru', 'North Mysuru', 'South Mysuru'];
const VALID_STATUSES = ['Pending', 'In Progress', 'Resolved', 'Declined'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

// Authentication middleware
const authenticateToken = (req, res, next) => {
    try {
        // Check for authorization header
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({
                error: 'Authentication header is missing',
                details: 'Please provide a valid Bearer token'
            });
        }

        // Extract token from header
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: 'Token is missing',
                details: 'Bearer token not found in authorization header'
            });
        }

        try {
            // Verify and decode the token
            const decoded = jwt.verify(token, JWT_SECRET, JWT_OPTIONS);

            // Log decoded token for debugging
            console.log('Decoded token:', decoded);

            // Check token expiration
            const tokenExp = new Date(decoded.exp * 1000);
            const now = new Date();
            if (now >= tokenExp) {
                return res.status(401).json({
                    error: 'Token expired',
                    details: 'Please login again to obtain a new token'
                });
            }

            // Validate user role
            if (!decoded.role || (decoded.role !== 'admin' && decoded.role !== 'analyst')) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    details: 'This endpoint requires admin or analyst privileges'
                });
            }

            // Attach user info to request
            req.user = {
                id: decoded.id,
                role: decoded.role
            };

            next();
        } catch (error) {
            console.error('Token verification error:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token expired',
                    details: 'Please login again to obtain a new token'
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(403).json({
                    error: 'Invalid token',
                    details: 'The provided token is malformed or invalid'
                });
            }
            throw error;
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            error: 'Authentication error',
            details: error.message || 'An unexpected error occurred during authentication'
        });
    }
};

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Define valid options for filtering and analytics
const VALID_DESIGNATIONS = ['Manager', 'Officer', 'Supervisor', 'Assistant'];

// Analytics functions
const calculateAnalytics = (results, params) => {
    const stats = {
        total: results.length,
        byDepartment: {},
        byLocation: {},
        byStatus: {},
        byPriority: {},
        totalFunds: 0,
        totalManpower: 0
    };

    results.forEach(item => {
        // Count by department
        if (item.department) {
            stats.byDepartment[item.department] = (stats.byDepartment[item.department] || 0) + 1;
        }

        // Count by location
        if (item.district && item.division) {
            const location = `${item.district} - ${item.division}`;
            stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;
        } else if (item.district) {
            stats.byLocation[item.district] = (stats.byLocation[item.district] || 0) + 1;
        } else if (item.taluk) {
            stats.byLocation[item.taluk] = (stats.byLocation[item.taluk] || 0) + 1;
        }

        // Count by status
        if (item.status) {
            stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
        }

        // Count by priority
        if (item.priority) {
            stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;
        }

        // Add up resource metrics
        if (item.resourceManagement) {
            if (item.resourceManagement.fundsRequired) {
                stats.totalFunds += item.resourceManagement.fundsRequired;
            }
            if (item.resourceManagement.manpowerNeeded) {
                stats.totalManpower += item.resourceManagement.manpowerNeeded;
            }
        }

        // Count by designation (for officials)
        if (item.designation) {
            stats.byDesignation = stats.byDesignation || {};
            stats.byDesignation[item.designation] = (stats.byDesignation[item.designation] || 0) + 1;
        }
    });

    // Filter out empty categories
    for (const category of Object.keys(stats)) {
        if (typeof stats[category] === 'object' && Object.keys(stats[category]).length === 0) {
            delete stats[category];
        }
    }

    return stats;
};

// Define response patterns with more specific acknowledgments
const RESPONSE_PATTERNS = {
    greeting: /^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))$/i,
    acknowledgment: /^(ok(ay)?|got\s*it|sure|alright|yes|yeah|fine|understood|k)$/i,
    thanks: /^(thanks|thank\s*you|ty|thankyou|thx)$/i,
    listRequest: /^(list|show|display|get)\s*(all|them|cases|grievances)?$/i
};

// Update the Gemini prompt to better handle filters
const getQueryPrompt = (query, context) => `You are a backend assistant for a grievance management system. Extract the intent and parameters from the admin's question.

Question: "${query}"
Previous context: ${JSON.stringify(context)}

Valid options:
- Departments: ${JSON.stringify(VALID_DEPARTMENTS)}
- Divisions: ${JSON.stringify(VALID_DIVISIONS)}
- Districts: ${JSON.stringify(VALID_DISTRICTS)}
- Taluks: ${JSON.stringify(VALID_TALUKS)}
- Priorities: ${JSON.stringify(VALID_PRIORITIES)}
- Statuses: ${JSON.stringify(VALID_STATUSES)}

Location hierarchy:
- Department (e.g., Water, RTO)
- Division (e.g., North, South)
- District (e.g., Chennai, Coimbatore)
- Taluk (specific to each district)

Priority levels:
- High: Urgent cases requiring immediate attention
- Medium: Standard priority cases
- Low: Non-urgent cases

Status types:
- Pending: New cases
- In Progress: Cases being worked on
- Resolved: Completed cases
- Escalated: Cases requiring higher attention

Time-based queries:
- If the query asks for cases from a specific period (e.g., "last month", "this week", "today", "last year", "this year"), extract a "timeframe" parameter.
- Valid timeframe values: "today", "this_week", "last_week", "this_month", "last_month", "this_year", "last_year".
- Example: "Show cases from last month" -> intent: "case_query", params: { timeframe: "last_month" }
- Example: "How many RTO cases today?" -> intent: "count_query", params: { countTarget: "cases", department: "RTO", timeframe: "today" }

Intent Classification:
- case_query: When asking about grievances/cases itself (not resources). Can include timeframe.
- resource_query: When asking about resources/requirements for cases
- manpower_query: When asking specifically about manpower needs
- count_query: When asking for counts or totals of cases, resources, or officials. Can include timeframe.
- stats_query: When asking for statistics, summaries, or aggregated information. Can include timeframe.
- official_info: When asking about officials/employees/staff
- case_lookup: When looking up a specific case by ID

For count_query, extract:
1. What is being counted (cases, funds, manpower, officials)
2. Location filters (department, division, district, taluk)
3. Status filters if specified
4. Priority filters if specified
5. Timeframe if specified (e.g., timeframe: "today")

For stats_query, extract:
1. Type of statistics (funds, manpower, resource allocation)
2. Location filters (department, division, district, taluk)
3. Time period if specified (e.g., timeframe: "last_month")
4. Any grouping parameters (by department, by status, etc)

For official_info, extract:
1. Department if specified
2. Division, district, or taluk if specified
3. Role or designation if specified
4. Whether looking for a specific official or aggregate count

For case_lookup, extract:
1. The case ID or petition ID
2. What specific information is needed about the case

For case queries, extract:
1. Location details (department, division, district, taluk)
2. Priority level if specified
3. Status if specified
4. Timeframe if specified (e.g., timeframe: "this_week")

For resource and manpower queries, extract:
1. Location details (department, division, district, taluk)
2. Resource type (manpower, funds, or both)
3. Priority level if specified
4. Status if specified
5. Any specific conditions or filters

IMPORTANT GUIDELINES:
- When a query mentions "count", "how many", "total", or similar terms, use "count_query"
- When a query mentions "cases", "grievances", or specific case statuses without mentioning resources or requirements, use "case_query"
- When a query explicitly mentions a case ID or petition ID, use "case_lookup"
- When a query mentions "officials", "staff", "employees", or similar terms, use "official_info"
- When a query asks for sums, averages, or other aggregate metrics, use "stats_query"
- If a query mentions both resources and cases, but emphasizes resources, use "resource_query"

Respond with a JSON object:
{
  "intent": "case_query|manpower_query|resource_query|count_query|stats_query|official_info|case_lookup",
  "params": {
    "department": "string or null",
    "division": "string or null",
    "district": "string or null",
    "taluk": "string or null",
    "priority": "high|medium|low|null",
    "status": "pending|in progress|resolved|escalated|null",
    "searchValue": "string describing what to search for",
    "caseId": "string when looking up a specific case",
    "countTarget": "cases|resources|officials|funds|manpower",
    "includeDetails": true
  }
}`;

// Route handler for processing queries
router.post('/query', async (req, res) => {
    try {
        const { query } = req.body;

        // Log request details
        console.log('Processing query:', {
            query,
            userId: req.user?.id,
            timestamp: new Date().toISOString()
        });

        if (!query) {
            return res.status(400).json({
                error: 'Query is required',
                details: 'Please provide a query string'
            });
        }

        const queryLower = query.toLowerCase().trim();

        // Get previous messages for context
        const previousMessages = await Message.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(5)
            .lean();

        // Handle acknowledgments and simple responses
        if (RESPONSE_PATTERNS.acknowledgment.test(queryLower)) {
            // Check previous message for context
            const prevMessage = previousMessages[0];
            if (prevMessage && prevMessage.role === 'assistant') {
                const response = "Would you like to:\n" +
                    "1. Filter these results by priority (high/medium/low)\n" +
                    "2. Filter by status (pending/in progress/resolved)\n" +
                    "3. Look for cases in a different location\n" +
                    "4. Start a new search\n" +
                    "\nPlease specify what you'd like to do.";

                await saveInteraction(req.user.id, query, response);
                return res.json({
                    response,
                    isAcknowledgment: true,
                    requiresFollowUp: true
                });
            }

            const response = "What would you like to know about the grievances? You can ask about:\n" +
                "1. Resource requirements in specific locations\n" +
                "2. Manpower needs for departments\n" +
                "3. High priority cases\n" +
                "4. Pending or in-progress cases";

            await saveInteraction(req.user.id, query, response);
            return res.json({
                response,
                isAcknowledgment: true
            });
        }

        // Handle greetings
        if (RESPONSE_PATTERNS.greeting.test(queryLower)) {
            const greeting = "Hello! I'm your smart query assistant. I can help you with:\n" +
                "1. Finding resource requirements for grievances\n" +
                "2. Checking manpower needs in specific locations\n" +
                "3. Filtering cases by priority or status\n" +
                "4. Getting detailed breakdowns by department\n\n" +
                "What would you like to know?";

            await saveInteraction(req.user.id, query, greeting);
            return res.json({
                response: greeting,
                isGreeting: true
            });
        }

        // Handle list requests without context
        if (RESPONSE_PATTERNS.listRequest.test(queryLower)) {
            const response = "Please specify what you'd like to list. For example:\n" +
                "- High priority cases in water department\n" +
                "- Resource requirements in tambaram\n" +
                "- Pending cases with manpower needs\n" +
                "- Cases in south division";

            await saveInteraction(req.user.id, query, response);
            return res.json({
                response,
                requiresSpecification: true
            });
        }

        // Get context from previous messages
        const context = await getQueryContext(req.user.id);

        // Initialize Gemini model
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = getQueryPrompt(query, context);

        // Get Gemini's analysis
        const result = await geminiModel.generateContent(prompt);
        const analysisText = result.response.text();
        console.log('Gemini Analysis:', analysisText);

        // Parse and validate the analysis
        const analysis = parseAndValidateAnalysis(analysisText);

        // Check if this is the same query as before
        const lastQuery = context.lastQuery?.toLowerCase();
        const currentQuery = query.toLowerCase();
        if (lastQuery && currentQuery &&
            (lastQuery === currentQuery ||
                (lastQuery.includes(currentQuery) || currentQuery.includes(lastQuery)))) {
            const response = "I notice you're repeating a similar query. Would you like to:\n" +
                "1. Filter the current results differently\n" +
                "2. Look for cases in a different location\n" +
                "3. Start a completely new search\n" +
                "\nPlease specify what you'd like to do.";

            await saveInteraction(req.user.id, query, response);
            return res.json({
                response,
                requiresSpecification: true
            });
        }

        // Build and execute MongoDB query
        const mongoQuery = await buildMongoQuery(analysis);
        console.log('MongoDB Query:', JSON.stringify(mongoQuery, null, 2));

        const db = mongoose.connection.db;
        let results;

        if (mongoQuery.isCount) {
            // Execute a count query
            const count = await db.collection(mongoQuery.collection)
                .countDocuments(mongoQuery.query);

            results = {
                isCount: true,
                count,
                countTarget: mongoQuery.countTarget
            };

            console.log(`Count query returned: ${count}`);
        } else if (mongoQuery.isStats) {
            // For stats queries, fetch the data and let the formatter handle aggregation
            const data = await db.collection(mongoQuery.collection)
                .find(mongoQuery.query)
                .toArray();

            results = data;

            // Also calculate and attach some basic aggregations
            if (mongoQuery.collection === 'grievances' && data.length > 0) {
                // Calculate total resource metrics if relevant
                const totalFunds = data.reduce((sum, grievance) => {
                    if (grievance.resourceManagement && grievance.resourceManagement.fundsRequired) {
                        return sum + grievance.resourceManagement.fundsRequired;
                    }
                    return sum;
                }, 0);

                const totalManpower = data.reduce((sum, grievance) => {
                    if (grievance.resourceManagement && grievance.resourceManagement.manpowerNeeded) {
                        return sum + grievance.resourceManagement.manpowerNeeded;
                    }
                    return sum;
                }, 0);

                results.totalFunds = totalFunds;
                results.totalManpower = totalManpower;
            }

            console.log(`Stats query found ${results.length} records`);
        } else {
            // Regular query
            results = await db.collection(mongoQuery.collection)
                .find(mongoQuery.query)
                .toArray();

            console.log(`Found ${results.length} results`);
        }

        // Generate response
        const finalResponse = await generateResponse(results, query, analysis);

        // Save interaction
        await saveInteraction(req.user.id, query, finalResponse);

        // Send response
        res.json({
            response: finalResponse
        });
    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({
            error: 'Failed to process your query',
            details: error.message
        });
    }
});

// Helper function to get query context
async function getQueryContext(userId) {
    const previousMessages = await Message.find({ userId })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean();

    const context = {
        department: null,
        division: null,
        district: null,
        taluk: null,
        lastQuery: null
    };

    for (const msg of previousMessages.reverse()) {
        if (msg.role === 'user') {
            const msgLower = msg.content.toLowerCase();

            // Update context based on message content
            for (const dept of VALID_DEPARTMENTS) {
                if (msgLower.includes(dept.toLowerCase())) {
                    context.department = dept;
                }
            }

            for (const div of VALID_DIVISIONS) {
                if (msgLower.includes(div.toLowerCase())) {
                    context.division = div;
                }
            }

            for (const dist of VALID_DISTRICTS) {
                if (msgLower.includes(dist.toLowerCase())) {
                    context.district = dist;
                }
            }

            for (const [district, taluks] of Object.entries(VALID_TALUKS)) {
                for (const taluk of taluks) {
                    if (msgLower.includes(taluk.toLowerCase())) {
                        context.taluk = taluk;
                        if (!context.district) context.district = district;
                    }
                }
            }

            context.lastQuery = msg.content;
        }
    }

    return context;
}

// Helper function to parse and validate analysis
function parseAndValidateAnalysis(analysisText) {
    try {
        // Extract JSON object from text, accounting for potential text wrapping around JSON
        const jsonMatch = analysisText.match(/({[\s\S]*})/);
        if (!jsonMatch) {
            throw new Error('Could not find JSON object in Gemini response');
        }

        const jsonText = jsonMatch[1];
        const analysis = JSON.parse(jsonText);

        if (!analysis.intent) {
            throw new Error('Invalid analysis: missing intent');
        }

        if (!analysis.params) {
            analysis.params = {};
        }

        // Normalize intent and parameter values
        analysis.intent = analysis.intent.toLowerCase();

        // Validate intent type
        const validIntents = [
            'case_query',
            'resource_query',
            'manpower_query',
            'count_query',
            'stats_query',
            'official_info',
            'case_lookup',
            'grievance_query',
            'official_query',
            'official_stats',
            'location_stats',
            'department_stats'
        ];

        if (!validIntents.includes(analysis.intent)) {
            console.warn(`Unexpected intent type: ${analysis.intent}. Defaulting to case_query.`);
            analysis.intent = 'case_query';
        }

        // Normalize and validate parameters
        if (analysis.params.department) {
            const departmentInput = analysis.params.department.charAt(0).toUpperCase() +
                analysis.params.department.slice(1).toLowerCase();

            if (VALID_DEPARTMENTS.includes(departmentInput)) {
                analysis.params.department = departmentInput;
            } else {
                console.warn(`Invalid department: ${analysis.params.department}`);
                delete analysis.params.department;
            }
        }

        // Division validation (case-insensitive, trimmed, no duplicate declaration)
        if (analysis.params.division) {
            const divisionInput = analysis.params.division.trim();
            console.log('DEBUG: divisionInput:', JSON.stringify(divisionInput), 'length:', divisionInput.length);
            VALID_DIVISIONS.forEach(d => {
                console.log('DEBUG: VALID_DIVISION:', JSON.stringify(d), 'length:', d.length);
            });
            const matchedDivision = VALID_DIVISIONS.find(
                d => d.trim().toLowerCase() === divisionInput.toLowerCase()
            );
            if (matchedDivision) {
                analysis.params.division = matchedDivision;
            } else {
                console.warn(`Invalid division: ${analysis.params.division}`);
                delete analysis.params.division;
            }
        }

        if (analysis.params.district) {
            // Try to find a case-insensitive match with the valid districts
            const districtInput = analysis.params.district;
            const matchedDistrict = VALID_DISTRICTS.find(d =>
                d.toLowerCase() === districtInput.toLowerCase());

            if (matchedDistrict) {
                analysis.params.district = matchedDistrict;
            } else {
                console.warn(`Invalid district: ${analysis.params.district}`);
                delete analysis.params.district;
            }
        }

        if (analysis.params.taluk) {
            // Try to find a case-insensitive match with the valid taluks
            const talukInput = analysis.params.taluk;
            const matchedTaluk = VALID_TALUKS.find(t =>
                t.toLowerCase() === talukInput.toLowerCase());

            if (matchedTaluk) {
                analysis.params.taluk = matchedTaluk;
            } else {
                console.warn(`Invalid taluk: ${analysis.params.taluk}`);
                delete analysis.params.taluk;
            }
        }

        // Normalize status and priority fields
        if (analysis.params.status) {
            const statusInput = analysis.params.status.charAt(0).toUpperCase() +
                analysis.params.status.slice(1).toLowerCase();

            if (VALID_STATUSES.includes(statusInput)) {
                analysis.params.status = statusInput;
            } else {
                console.warn(`Invalid status: ${analysis.params.status}`);
                delete analysis.params.status;
            }
        }

        if (analysis.params.priority) {
            const priorityInput = analysis.params.priority.charAt(0).toUpperCase() +
                analysis.params.priority.slice(1).toLowerCase();

            if (VALID_PRIORITIES.includes(priorityInput)) {
                analysis.params.priority = priorityInput;
            } else {
                console.warn(`Invalid priority: ${analysis.params.priority}`);
                delete analysis.params.priority;
            }
        }

        // Handle count_query and stats_query parameter validation
        if (analysis.intent === 'count_query' && !analysis.params.countTarget) {
            // Default to counting cases if not specified
            analysis.params.countTarget = 'cases';
        }

        // Handle case_lookup validation
        if (analysis.intent === 'case_lookup' && !analysis.params.caseId && analysis.params.searchValue) {
            // Try to extract an ID from the search value
            const idMatch = analysis.params.searchValue.match(/(\w+\d+)/);
            if (idMatch) {
                analysis.params.caseId = idMatch[1];
            }
        }

        // Fallback: Infer district and division from searchValue if missing
        if (analysis.params.searchValue) {
            const search = analysis.params.searchValue.toLowerCase();
            // Try to extract district
            if (!analysis.params.district) {
                for (const district of VALID_DISTRICTS) {
                    if (search.includes(district.toLowerCase())) {
                        analysis.params.district = district;
                        break;
                    }
                }
            }
            // Try to extract division
            if (!analysis.params.division) {
                for (const division of VALID_DIVISIONS) {
                    // Match 'South division', 'Central division', 'Chennai Central', etc.
                    const divisionPattern = new RegExp(`\\b${division.toLowerCase()}( division)?\\b`);
                    if (divisionPattern.test(search)) {
                        analysis.params.division = division;
                        break;
                    }
                }
                // Also handle patterns like 'Chennai Central', 'Chennai South', etc.
                if (!analysis.params.division && analysis.params.district) {
                    for (const division of VALID_DIVISIONS) {
                        const combined = `${analysis.params.district} ${division}`.toLowerCase();
                        if (search.includes(combined)) {
                            analysis.params.division = division;
                            break;
                        }
                    }
                }
            }
        }
        // Debug: Print VALID_DIVISIONS
        console.log('DEBUG: VALID_DIVISIONS:', VALID_DIVISIONS);
        // Debug: Before combining
        console.log('DEBUG: Before combining - params.district:', analysis.params.district, 'params.division:', analysis.params.division);
        // Combine district and division if both are present and match a known division (always run)
        if (analysis.params.district && analysis.params.division) {
            const combinedDivision = `${analysis.params.district} ${analysis.params.division}`;
            console.log('DEBUG: Trying combinedDivision:', combinedDivision);
            if (VALID_DIVISIONS.includes(combinedDivision)) {
                analysis.params.division = combinedDivision;
                delete analysis.params.district;
                console.log('DEBUG: Combination successful! New params.division:', analysis.params.division);
            }
        }
        // Debug: After combining
        console.log('DEBUG: After combining - params.district:', analysis.params.district, 'params.division:', analysis.params.division);

        return analysis;
    } catch (error) {
        console.error('Error parsing Gemini analysis:', error, '\nOriginal text:', analysisText);

        // Return a default analysis
        return {
            intent: 'case_query',
            params: {}
        };
    }
}

// Helper function to extract values from text
function extractFromText(text, regex) {
    const match = text.match(regex);
    return match ? match[1] : null;
}

// Helper function to save user interactions
async function saveInteraction(userId, query, response) {
    await Promise.all([
        Message.create({
            userId,
            role: 'user',
            content: query,
            timestamp: new Date()
        }),
        Message.create({
            userId,
            role: 'assistant',
            content: response,
            timestamp: new Date()
        })
    ]);
}

// Helper function to calculate date ranges
function calculateDateRange(timeframe) {
    const now = new Date();
    let startDate, endDate;

    // Set hours, minutes, seconds, and ms to 0 for start of day
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Set hours, minutes, seconds, and ms to end of day
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    switch (timeframe) {
        case 'today':
            startDate = new Date(todayStart);
            endDate = new Date(todayEnd);
            break;
        case 'this_week':
            startDate = new Date(todayStart);
            // Assuming week starts on Monday (0 for Sunday, 1 for Monday, etc.)
            // Go back to the previous Monday or stay if today is Monday
            const dayOfWeek = startDate.getDay(); // 0 (Sun) - 6 (Sat)
            const diffToMonday = (dayOfWeek === 0) ? 6 : (dayOfWeek - 1); // if Sunday, go back 6 days, else dayOfWeek - 1
            startDate.setDate(startDate.getDate() - diffToMonday);
            
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Monday + 6 days = Sunday
            endDate.setHours(23, 59, 59, 999); // End of Sunday
            break;
        case 'last_week':
            startDate = new Date(todayStart);
            // Go to the Monday of last week
            const dayOfWeekLast = startDate.getDay();
            const diffToLastMonday = (dayOfWeekLast === 0) ? (6 + 7) : (dayOfWeekLast - 1 + 7);
            startDate.setDate(startDate.getDate() - diffToLastMonday);

            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Monday + 6 days = Sunday of last week
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // 0th day of next month is last day of current month
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'last_month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0); // 0th day of current month is last day of previous month
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1); // January is month 0
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), 11, 31); // December is month 11
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'last_year':
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now.getFullYear() - 1, 11, 31);
            endDate.setHours(23, 59, 59, 999);
            break;
        default:
            console.warn(`Unknown timeframe: ${timeframe}`);
            return null;
    }
    return { startDate, endDate };
}

// Helper function to get a display string for a timeframe
function getDisplayTimeframe(timeframe) {
    if (!timeframe) return "";

    const now = new Date();
    let monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    switch (timeframe) {
        case 'today':
            return `(Today, ${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()})`;
        case 'this_week':
            return "(This Week)"; // Could be enhanced to show date range
        case 'last_week':
            return "(Last Week)"; // Could be enhanced to show date range
        case 'this_month':
            return `(${monthNames[now.getMonth()]} ${now.getFullYear()})`;
        case 'last_month':
            const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return `(${monthNames[prevMonthDate.getMonth()]} ${prevMonthDate.getFullYear()})`;
        case 'this_year':
            return `(${now.getFullYear()})`;
        case 'last_year':
            return `(${(now.getFullYear() - 1)})`;
        default:
            // Capitalize first letter of each word and replace underscore with space
            const formattedTimeframe = timeframe.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            return `(${formattedTimeframe})`;
    }
}

// Function to build MongoDB query based on intent and parameters
async function buildMongoQuery(analysis) {
    const { intent, params } = analysis;
    let query = {};

    // Fallback: Infer timeframe or specific date from searchValue if missing
    if (!params.timeframe && params.searchValue) {
        let search = params.searchValue.toLowerCase().replace(/['']/g, ''); // Remove apostrophes
        if (/\btoday\b/.test(search)) params.timeframe = 'today';
        else if (/\bthis week\b/.test(search)) params.timeframe = 'this_week';
        else if (/\blast week\b/.test(search)) params.timeframe = 'last_week';
        else if (/\bthis month\b/.test(search)) params.timeframe = 'this_month';
        else if (/\blast month\b/.test(search)) params.timeframe = 'last_month';
        else if (/\bthis year\b/.test(search)) params.timeframe = 'this_year';
        else if (/\blast year\b/.test(search)) params.timeframe = 'last_year';
        else {
            // Try to match 'on dd/mm/yyyy', 'on d/m/yyyy', or 'on yyyy-mm-dd'
            let dateMatch = search.match(/on\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (dateMatch) {
                const day = parseInt(dateMatch[1], 10);
                const month = parseInt(dateMatch[2], 10) - 1; // JS months are 0-based
                const year = parseInt(dateMatch[3], 10);
                const start = new Date(year, month, day, 0, 0, 0, 0);
                const end = new Date(year, month, day, 23, 59, 59, 999);
                params.dateRange = { start, end };
            } else {
                // Try to match 'on yyyy-mm-dd'
                dateMatch = search.match(/on\s*(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
                if (dateMatch) {
                    const year = parseInt(dateMatch[1], 10);
                    const month = parseInt(dateMatch[2], 10) - 1;
                    const day = parseInt(dateMatch[3], 10);
                    const start = new Date(year, month, day, 0, 0, 0, 0);
                    const end = new Date(year, month, day, 23, 59, 59, 999);
                    params.dateRange = { start, end };
                }
            }
        }
    }
    // Flexible location-based filtering using regex for division and district
    if (params.division) {
        // If the division is more than one word, extract the most specific part (e.g., 'South' from 'Chennai South')
        const divisionParts = params.division.split(/\s+/);
        const mainDivision = divisionParts[divisionParts.length - 1];
        // Match any division containing the value, case-insensitive
        query.division = { $regex: mainDivision, $options: 'i' };
    }
    if (params.district) {
        query.district = { $regex: params.district, $options: 'i' };
    }
    // Debug: Print VALID_DIVISIONS
    console.log('DEBUG: VALID_DIVISIONS:', VALID_DIVISIONS);
    // Debug: Before combining
    console.log('DEBUG: Before combining - params.district:', params.district, 'params.division:', params.division);
    // Combine district and division if both are present and match a known division (always run)
    if (params.district && params.division) {
        const combinedDivision = `${params.district} ${params.division}`;
        console.log('DEBUG: Trying combinedDivision:', combinedDivision);
        if (VALID_DIVISIONS.includes(combinedDivision)) {
            params.division = combinedDivision;
            delete params.district;
            console.log('DEBUG: Combination successful! New params.division:', params.division);
        }
    }
    // Debug: After combining
    console.log('DEBUG: After combining - params.district:', params.district, 'params.division:', params.division);
    // Debug: Log params after fallback
    console.log('DEBUG: After fallback - params.timeframe:', params.timeframe);
    console.log('DEBUG: After fallback - params.dateRange:', params.dateRange);

    switch (intent) {
        case 'case_query':
            if (params.department) query.department = params.department;
            if (params.division) query.division = params.division;
            if (params.district) query.district = params.district;
            if (params.taluk) query.taluk = params.taluk;
            if (params.priority) query.priority = params.priority;
            if (params.status) query.status = params.status;
            if (params.timeframe) {
                const dateRange = calculateDateRange(params.timeframe);
                if (dateRange) {
                    query.createdAt = { $gte: dateRange.startDate, $lte: dateRange.endDate };
                }
            }
            break;
        case 'resource_query':
            if (params.department) query.department = params.department;
            if (params.division) query.division = params.division;
            if (params.district) query.district = params.district;
            if (params.taluk) query.taluk = params.taluk;
            if (params.priority) query.priority = params.priority;
            if (params.status) query.status = params.status;
            break;
        case 'manpower_query':
            if (params.department) query.department = params.department;
            if (params.division) query.division = params.division;
            if (params.district) query.district = params.district;
            if (params.taluk) query.taluk = params.taluk;
            break;
        case 'count_query':
            if (params.department) query.department = params.department;
            if (params.division) query.division = params.division;
            if (params.district) query.district = params.district;
            if (params.taluk) query.taluk = params.taluk;
            if (params.priority) query.priority = params.priority;
            if (params.status) query.status = params.status;
            if (params.timeframe) {
                const dateRange = calculateDateRange(params.timeframe);
                if (dateRange) {
                    query.createdAt = { $gte: dateRange.startDate, $lte: dateRange.endDate };
                }
            }
            return {
                collection: 'grievances',
                query,
                isCount: true,
                countTarget: params.countTarget
            };
        case 'stats_query':
            if (params.department) query.department = params.department;
            if (params.division) query.division = params.division;
            if (params.district) query.district = params.district;
            if (params.taluk) query.taluk = params.taluk;
            if (params.priority) query.priority = params.priority;
            if (params.status) query.status = params.status;
            if (params.timeframe) {
                const dateRange = calculateDateRange(params.timeframe);
                if (dateRange) {
                    query.createdAt = { $gte: dateRange.startDate, $lte: dateRange.endDate };
                }
            }
            return {
                collection: 'grievances',
                query,
                isStats: true
            };
        case 'official_info':
            if (params.department) query.department = params.department;
            if (params.division) query.division = params.division;
            if (params.district) query.district = params.district;
            if (params.taluk) query.taluk = params.taluk;
            if (params.designation) query.designation = params.designation;
            return {
                collection: 'officials',
                query
            };
        case 'case_lookup':
            if (params.caseId) query._id = params.caseId;
            return {
                collection: 'grievances',
                query
            };
        default:
            console.warn(`Unexpected intent type: ${intent}. Defaulting to case_query.`);
            if (params.department) query.department = params.department;
            if (params.division) query.division = params.division;
            if (params.district) query.district = params.district;
            if (params.taluk) query.taluk = params.taluk;
            if (params.priority) query.priority = params.priority;
            if (params.status) query.status = params.status;
            if (params.timeframe) {
                const dateRange = calculateDateRange(params.timeframe);
                if (dateRange) {
                    query.createdAt = { $gte: dateRange.startDate, $lte: dateRange.endDate };
                }
            }
            break;
    }

    // After query is built for case_query, always apply date filter if params.timeframe or params.dateRange is set
    if ((intent === 'case_query' || intent === 'grievance_query')) {
        if (params.timeframe) {
            const dateRange = calculateDateRange(params.timeframe);
            if (dateRange && dateRange.startDate && dateRange.endDate) {
                query.createdAt = {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate
                };
            }
        } else if (params.dateRange && params.dateRange.start && params.dateRange.end) {
            query.createdAt = {
                $gte: params.dateRange.start,
                $lte: params.dateRange.end
            };
        }
    }

    // Debug: Log final query before return
    console.log('DEBUG: Final query before return:', JSON.stringify(query, null, 2));

    return {
        collection: 'grievances',
        query
    };
}

// Function to generate response based on results and analysis
async function generateResponse(results, query, analysis) {
    const { intent, params } = analysis;

    switch (intent) {
        case 'case_query':
            if (params.timeframe) {
                return formatStatsResponse(results, analysis);
            } else {
                return formatGrievanceResponse(results, query, analysis);
            }
        case 'resource_query':
            return formatResourceResponse(results, query, analysis);
        case 'manpower_query':
            return formatManpowerResponse(results, query, analysis);
        case 'count_query':
            return formatCountResponse(results, query, analysis);
        case 'stats_query':
            return formatStatsResponse(results, analysis);
        case 'official_info':
            return formatOfficialResponse(results, query, analysis);
        case 'case_lookup':
            return formatCaseLookupResponse(results, query, analysis);
        default:
            console.warn(`Unexpected intent type: ${intent}. Defaulting to case_query.`);
            return formatGrievanceResponse(results, query, analysis);
    }
}

// Helper function to format grievance response
function formatGrievanceResponse(results, query, analysis) {
    if (results.length === 0) {
        return "No cases found matching the criteria.";
    }

    let response = `Found ${results.length} cases matching the criteria:\n`;
    results.forEach((grievance, index) => {
        response += `\n${index + 1}. ${grievance.title} - ${grievance.status} (${grievance.department}, ${grievance.district})\n`;
    });

    return response;
}

// Helper function to format resource response
function formatResourceResponse(results, query, analysis) {
    if (results.length === 0) {
        return "No resource requirements found matching the criteria.";
    }

    let response = `Resource requirements for ${results.length} cases matching the criteria:\n`;
    results.forEach((grievance, index) => {
        const { resourceManagement } = grievance;
        response += `\n${index + 1}. ${grievance.title} - ${grievance.status} (${grievance.department}, ${grievance.district})\n`;
        response += `   Funds required: ${resourceManagement.fundsRequired}\n`;
        response += `   Manpower needed: ${resourceManagement.manpowerNeeded}\n`;
    });

    return response;
}

// Helper function to format manpower response
function formatManpowerResponse(results, query, analysis) {
    if (results.length === 0) {
        return "No manpower needs found matching the criteria.";
    }

    let response = `Manpower needs for ${results.length} cases matching the criteria:\n`;
    results.forEach((grievance, index) => {
        const { resourceManagement } = grievance;
        response += `\n${index + 1}. ${grievance.title} - ${grievance.status} (${grievance.department}, ${grievance.district})\n`;
        response += `   Manpower needed: ${resourceManagement.manpowerNeeded}\n`;
    });

    return response;
}

// Helper function to format count response
function formatCountResponse(results, query, analysis) {
    const { count, countTarget, isCount } = results;
    if (!isCount) {
        console.error('formatCountResponse called with non-count results');
        return "Error: Invalid count response";
    }

    let response = `Total ${countTarget} in all departments (all locations): ${count}\n`;
    if (analysis.params.timeframe) {
        response += `For the period ${getDisplayTimeframe(analysis.params.timeframe)}\n`;
    }

    return response;
}

// Enhanced stats response function
function formatStatsResponse(results, analysis) {
    try {
        if (!results || (Array.isArray(results) && results.length === 0)) {
            return "No data found matching your criteria.";
        }

        // If this was a count query that got routed here, handle it simply.
        if (results.isCount) {
            let countResponse = `Total ${analysis.params.countTarget || 'items'}: ${results.count || 0}`;
            if (analysis.params.timeframe) {
                countResponse += ` ${getDisplayTimeframe(analysis.params.timeframe)}`;
            }
            return countResponse;
        }

        const { params } = analysis;
        const stats = calculateAnalytics(results, params); //Leverages existing analytics

        const timeframeDisplay = params.timeframe ? getDisplayTimeframe(params.timeframe) : "";

        let response = `Total Cases ${timeframeDisplay}: ${stats.total}\n`;

        // Department breakdown
        if (stats.byDepartment && Object.keys(stats.byDepartment).length > 0) {
            // Ensure VALID_DEPARTMENTS are listed if possible, or just what's in byDepartment
            // For now, iterates what's found. Add Health if it's a valid department.
            // const departmentsToList = { ...VALID_DEPARTMENTS.reduce((acc, dept) => ({...acc, [dept]: 0 }), {}), ...stats.byDepartment };
            for (const [dept, count] of Object.entries(stats.byDepartment)) {
                if (count > 0) { // Only list departments with cases
                    response += `- ${dept}: ${count}\n`;
                }
            }
        }

        // Status breakdown
        if (stats.byStatus && Object.keys(stats.byStatus).length > 0) {
            let statusParts = [];
            // Desired order for statuses if possible, otherwise alphabetical or as they come.
            const statusOrder = ['Pending', 'In Progress', 'Resolved', 'Escalated', 'Declined'];
            
            for (const statusName of statusOrder) {
                if (stats.byStatus[statusName]) {
                    statusParts.push(`${stats.byStatus[statusName]} ${statusName}`);
                }
            }
            // Add any other statuses not in the preferred order
            for (const [statusName, count] of Object.entries(stats.byStatus)) {
                if (!statusOrder.includes(statusName) && count > 0) {
                     statusParts.push(`${count} ${statusName}`);
                }
            }

            if (statusParts.length > 0) {
                response += `Status: ${statusParts.join(' | ' )}\n`;
            }
        }
        
        // Note: The original formatStatsResponse had location and resource metrics.
        // These are omitted here to match the user's requested format explicitly.
        // If they are needed, they can be re-added.

        return response.trim(); // Trim any trailing newline

    } catch (error) {
        console.error('Error formatting stats response:', error);
        // Fallback to a simpler stats display in case of an error with the new format
        const fallbackStats = calculateAnalytics(results, analysis.params);
        return `Statistics Summary: Total Records: ${fallbackStats.total}. Departments: ${Object.keys(fallbackStats.byDepartment || {}).length}. Statuses: ${Object.keys(fallbackStats.byStatus || {}).length}. An error occurred formatting the detailed view.`;
    }
}

// Helper function to format official response
function formatOfficialResponse(results, query, analysis) {
    if (results.length === 0) {
        return "No officials found matching the criteria.";
    }

    let response = `Found ${results.length} officials matching the criteria:\n`;
    results.forEach((official, index) => {
        response += `\n${index + 1}. ${official.name} - ${official.designation} (${official.department}, ${official.district})\n`;
    });

    return response;
}

// Helper function to format case lookup response
function formatCaseLookupResponse(results, query, analysis) {
    if (results.length === 0) {
        return "No case found with the provided ID.";
    }

    const grievance = results[0];
    let response = `Case details for ID ${grievance._id}:\n`;
    response += `Title: ${grievance.title}\n`;
    response += `Status: ${grievance.status}\n`;
    response += `Department: ${grievance.department}\n`;
    response += `District: ${grievance.district}\n`;
    response += `Taluk: ${grievance.taluk}\n`;
    response += `Priority: ${grievance.priority}\n`;
    response += `Created At: ${grievance.createdAt}\n`;
    response += `Resource Management:\n`;
    response += `  Funds Required: ${grievance.resourceManagement.fundsRequired}\n`;
    response += `  Manpower Needed: ${grievance.resourceManagement.manpowerNeeded}\n`;

    return response;
}

// Route to save a message
router.post('/messages', async (req, res) => {
    try {
        const { content, role } = req.body;
        const userId = req.user.id;

        const message = new Message({
            userId,
            content,
            role
        });

        await message.save();
        res.json({ success: true, message });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// Route to get message history
router.get('/messages', async (req, res) => {
    try {
        const userId = req.user.id;
        const messages = await Message.find({ userId })
            .sort({ timestamp: 1 })
            .limit(100); // Limit to last 100 messages

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch message history' });
    }
});

// Route to clear message history
router.delete('/messages', async (req, res) => {
    try {
        console.log('Clearing messages for user:', req.user.id);
        const userId = req.user.id;
        const result = await Message.deleteMany({ userId });
        console.log('Delete result:', result);
        res.json({
            success: true,
            message: 'Chat history cleared',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error clearing messages:', error);
        res.status(500).json({
            error: 'Failed to clear message history',
            details: error.message
        });
    }
});

export default router; 