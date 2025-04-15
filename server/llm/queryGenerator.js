import { GoogleGenerativeAI } from '@google/generative-ai';
import { INTENTS } from './intentClassifier.js';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        topK: 40
    }
});

export async function generateMongoQuery(query, intent, parameters) {
    try {
        const prompt = `You are a MongoDB query generator for a Grievance Redressal System. Generate a MongoDB query object for the following natural language query.

Natural Language Query: "${query}"
Intent: ${intent}
Parameters: ${JSON.stringify(parameters, null, 2)}

Rules:
1. Only use these allowed fields: department, location, priority, status, createdAt, updatedAt, escalatedAt, resourceManagement, title, description
2. Return ONLY the MongoDB query object in valid JSON format, nothing else
3. For date fields, use proper MongoDB date operators
4. For text fields, use case-insensitive regex when appropriate
5. For status and priority, use exact matches

Example Response:
{
    "status": "pending",
    "department": "water",
    "priority": "high"
}

Generate the MongoDB query:`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const generatedText = response.text();

        try {
            // Extract the MongoDB query object from the generated text
            const queryMatch = generatedText.match(/\{[\s\S]*\}/);
            if (queryMatch) {
                const queryObj = JSON.parse(queryMatch[0]);
                return validateAndSanitizeQuery(queryObj);
            }
        } catch (error) {
            console.error('Error parsing generated query:', error);
        }

        return generateFallbackQuery(intent, parameters);
    } catch (error) {
        console.error('Error in query generation:', error);
        return generateFallbackQuery(intent, parameters);
    }
}

function validateAndSanitizeQuery(queryObj) {
    // Basic validation and sanitization
    const sanitizedQuery = {};

    // Only allow specific fields in the query
    const allowedFields = [
        'department', 'Department', // Allow both cases
        'location', 'Location',
        'priority', 'Priority',
        'status', 'Status',
        'createdAt', 'updatedAt', 'escalatedAt',
        'resourceManagement', 'title', 'description',
        'grievanceId', 'GrievanceId', // Add grievance ID field
        'zone', 'Zone', // Add zone field
        'ward', 'Ward' // Add ward field
    ];

    for (const [key, value] of Object.entries(queryObj)) {
        const normalizedKey = key.toLowerCase();
        const matchingField = allowedFields.find(field => field.toLowerCase() === normalizedKey);
        if (matchingField) {
            // For department queries, make it case insensitive
            if (normalizedKey === 'department') {
                sanitizedQuery[matchingField] = new RegExp(value, 'i');
            } else {
                sanitizedQuery[matchingField] = value;
            }
        }
    }

    return sanitizedQuery;
}

function generateFallbackQuery(intent, parameters) {
    const query = {};

    // Add parameters to query based on intent
    switch (intent) {
        case INTENTS.STATUS_QUERY:
            if (parameters.status) {
                query.Status = parameters.status;
            }
            break;
        case INTENTS.RESOURCE_QUERY:
            query.resourceManagement = { $exists: true };
            break;
        case INTENTS.PRIORITY_ANALYSIS:
            if (parameters.priority) {
                query.Priority = parameters.priority;
            }
            break;
        case INTENTS.ESCALATION_SUMMARY:
            query.escalatedAt = { $exists: true };
            break;
        case INTENTS.GRIEVANCE_DETAIL:
            if (parameters.department) {
                query.Department = new RegExp(parameters.department, 'i');
            }
            break;
    }

    // Add common parameters with case-insensitive search for text fields
    if (parameters.department) {
        query.Department = new RegExp(parameters.department, 'i');
    }
    if (parameters.location) {
        query.Location = new RegExp(parameters.location, 'i');
    }

    return query;
} 