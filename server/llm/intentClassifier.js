import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        topK: 40
    }
});

// Define the known intents
export const INTENTS = {
    STATUS_QUERY: 'status_query',
    RESOURCE_QUERY: 'resource_query',
    PRIORITY_ANALYSIS: 'priority_analysis',
    ESCALATION_SUMMARY: 'escalation_summary',
    GRIEVANCE_DETAIL: 'grievance_detail',
    CUSTOM_QUERY: 'custom_query',
    GREETING: 'greeting',
    THANKS: 'thanks',
    HELP: 'help'
};

// Define casual conversation patterns
const CASUAL_PATTERNS = {
    [INTENTS.GREETING]: [
        'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
        'how are you', 'how\'s it going', 'how do you do'
    ],
    [INTENTS.THANKS]: [
        'thanks', 'thank you', 'appreciate it', 'much appreciated',
        'thank you very much', 'thanks a lot'
    ],
    [INTENTS.HELP]: [
        'help', 'what can you do', 'how can you help', 'what are your capabilities',
        'what can you help me with', 'what do you do'
    ]
};

export async function generateResponse(query, intent, results = [], parameters = {}, context = []) {
    try {
        let prompt = '';
        const contextString = context.map(msg => `${msg.role}: ${msg.content}`).join('\n');

        switch (intent) {
            case INTENTS.GREETING:
                prompt = `You are a helpful Grievance Redressal System assistant. Consider the following chat history and respond to the greeting in a friendly and professional manner:

Previous messages:
${contextString}

Current query: "${query}"`;
                break;

            case INTENTS.THANKS:
                prompt = `You are a helpful Grievance Redressal System assistant. Consider the following chat history and respond to this expression of thanks in a polite and professional manner:

Previous messages:
${contextString}

Current query: "${query}"`;
                break;

            case INTENTS.HELP:
                prompt = `You are a helpful Grievance Redressal System assistant. Consider the following chat history and explain your capabilities in a clear and concise way. Mention that you can help with:
                1. Checking grievance status
                2. Resource management queries
                3. Priority analysis
                4. Escalation summaries
                5. Detailed grievance information

Previous messages:
${contextString}

Current query: "${query}"`;
                break;

            default:
                prompt = `You are a helpful Grievance Redressal System assistant. Based on the following information and chat history, provide a clear and helpful response:

Previous messages:
${contextString}

Current query: "${query}"
Intent: ${intent}
Results: ${JSON.stringify(results, null, 2)}
Parameters: ${JSON.stringify(parameters, null, 2)}

Provide a natural, conversational response that addresses the user's query, takes into account the previous conversation context, and includes relevant information from the results.`;
        }

        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating response:', error);
        return 'I apologize, but I encountered an error while generating a response. Please try again.';
    }
}

export async function classifyIntent(query) {
    try {
        // First check for casual conversation patterns
        const queryLower = query.toLowerCase();
        for (const [intent, patterns] of Object.entries(CASUAL_PATTERNS)) {
            if (patterns.some(pattern => queryLower.includes(pattern))) {
                return intent;
            }
        }

        const prompt = `You are a Grievance Redressal System assistant. Classify the following query into one of these intents: ${Object.values(INTENTS).join(', ')}.
        
        Query: "${query}"
        
        Respond with ONLY the intent, nothing else.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const generatedText = response.text().toLowerCase();

        const intentMatch = Object.values(INTENTS).find(intent =>
            generatedText.includes(intent.toLowerCase())
        );

        return intentMatch || INTENTS.CUSTOM_QUERY;
    } catch (error) {
        console.error('Error in intent classification:', error);
        return INTENTS.CUSTOM_QUERY;
    }
}

// Helper function to extract parameters from query
export function extractParameters(query, intent) {
    const parameters = {};
    const queryLower = query.toLowerCase();

    // Extract department
    const departments = ['water', 'electricity', 'rto'];
    for (const dept of departments) {
        if (queryLower.includes(dept)) {
            parameters.department = dept.charAt(0).toUpperCase() + dept.slice(1);
            break;
        }
    }

    // Extract location
    const locations = ['kanchipuram', 'madurai', 'salem', 'coimbatore', 'tirunelveli', 'tambaram', 'chennai'];
    for (const loc of locations) {
        if (queryLower.includes(loc)) {
            parameters.location = loc.charAt(0).toUpperCase() + loc.slice(1);
            break;
        }
    }

    // Extract priority
    if (queryLower.includes('high priority')) {
        parameters.priority = 'High';
    } else if (queryLower.includes('medium priority')) {
        parameters.priority = 'Medium';
    } else if (queryLower.includes('low priority')) {
        parameters.priority = 'Low';
    }

    // Extract status
    if (queryLower.includes('resolved')) {
        parameters.status = 'Resolved';
    } else if (queryLower.includes('pending')) {
        parameters.status = 'Pending';
    } else if (queryLower.includes('in progress') || queryLower.includes('inprogress')) {
        parameters.status = 'In Progress';
    }

    // Extract zone
    const zones = ['north', 'south', 'east', 'west', 'central'];
    for (const zone of zones) {
        if (queryLower.includes(zone)) {
            parameters.zone = zone.charAt(0).toUpperCase() + zone.slice(1);
            break;
        }
    }

    return parameters;
} 