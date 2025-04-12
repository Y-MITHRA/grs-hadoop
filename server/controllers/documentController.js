import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import Grievance from '../models/Grievance.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createWorker } from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for document uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/documents/'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and images are allowed.'));
        }
    }
});

// Clean and validate department value
const cleanDepartment = (department) => {
    // Remove any special characters and extra spaces
    const cleaned = department.replace(/[*#@!]/g, '').trim();

    // Map common variations to valid department names
    const departmentMap = {
        'water': 'Water',
        'rto': 'RTO',
        'electricity': 'Electricity',
        'water department': 'Water',
        'rto department': 'RTO',
        'electricity department': 'Electricity'
    };

    return departmentMap[cleaned.toLowerCase()] || cleaned;
};

// Function to analyze text and determine priority
const analyzePriority = (text) => {
    const highPriorityKeywords = [
        'urgent', 'emergency', 'critical', 'immediate', 'life-threatening',
        'dangerous', 'hazard', 'risk', 'safety', 'accident', 'injury',
        'health', 'medical', 'hospital', 'fire', 'flood', 'leak', 'breakdown',
        'outage', 'power cut', 'water supply', 'sewage', 'blockage'
    ];

    const mediumPriorityKeywords = [
        'inconvenience', 'delay', 'waiting', 'pending', 'issue',
        'problem', 'complaint', 'request', 'maintenance', 'repair',
        'service', 'quality', 'standard', 'improvement'
    ];

    const textLower = text.toLowerCase();
    const highPriorityCount = highPriorityKeywords.filter(keyword =>
        textLower.includes(keyword)
    ).length;

    const mediumPriorityCount = mediumPriorityKeywords.filter(keyword =>
        textLower.includes(keyword)
    ).length;

    if (highPriorityCount > 0) return 'High';
    if (mediumPriorityCount > 0) return 'Medium';
    return 'Low';
};

// Process document and create grievance
export const processDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        let extractedText = '';

        // Extract text from document using OCR if it's an image
        if (req.file.mimetype.startsWith('image/')) {
            const worker = await createWorker();
            await worker.loadLanguage('eng+tam');
            await worker.initialize('eng+tam');
            const { data: { text } } = await worker.recognize(filePath);
            await worker.terminate();
            extractedText = text;
        } else {
            // For PDFs, you would use a PDF parser here
            // This is a placeholder for PDF parsing logic
            extractedText = 'PDF text extraction placeholder';
        }

        // Initialize Gemini AI with error handling
        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not set in environment variables');
            throw new Error('GEMINI_API_KEY is not configured');
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Analyze the extracted text
        const extractionPrompt = `
            Analyze the following grievance text and extract relevant information. 
            Consider the full context and implications of the situation.
            
            Text to analyze: "${extractedText}"
            
            Please provide a comprehensive analysis in the following format:
            
            TITLE: [Extract a clear, concise title that captures the main issue]
            DESCRIPTION: [Provide a detailed description of the grievance]
            LOCATION: [Extract the specific location mentioned, if any]
            DEPARTMENT: [Identify the most relevant department based on the nature of the issue]
            PRIORITY: [Analyze the situation holistically and determine if it's High/Medium/Low]
            PRIORITY_EXPLANATION: [Explain the reasoning behind the priority level]
            IMPACT_ASSESSMENT: [Analyze the broader implications and impact]
            RECOMMENDED_RESPONSE_TIME: [Suggest an appropriate response timeframe]
            
            Format the response exactly as shown above, with each field on a new line.
        `;

        const extractionResult = await model.generateContent({
            contents: [{
                parts: [{ text: extractionPrompt }]
            }]
        });

        const extractionResponse = extractionResult.response.text();

        // Extract information using regex
        const titleMatch = extractionResponse.match(/TITLE:\s*([^\n]+)/i);
        const descriptionMatch = extractionResponse.match(/DESCRIPTION:\s*([^\n]+)/i);
        const locationMatch = extractionResponse.match(/LOCATION:\s*([^\n]+)/i);
        const departmentMatch = extractionResponse.match(/DEPARTMENT:\s*([^\n]+)/i);
        const priorityMatch = extractionResponse.match(/PRIORITY:\s*([^\n]+)/i);
        const priorityExplanationMatch = extractionResponse.match(/PRIORITY_EXPLANATION:\s*([^\n]+)/i);
        const impactAssessmentMatch = extractionResponse.match(/IMPACT_ASSESSMENT:\s*([^\n]+)/i);
        const recommendedResponseTimeMatch = extractionResponse.match(/RECOMMENDED_RESPONSE_TIME:\s*([^\n]+)/i);

        // Use extracted data or defaults
        const extractedData = {
            title: titleMatch ? titleMatch[1].trim() : 'Untitled Grievance',
            description: descriptionMatch ? descriptionMatch[1].trim() : extractedText,
            location: locationMatch ? locationMatch[1].trim() : 'Location not specified',
            department: departmentMatch ? departmentMatch[1].trim() : 'Department not specified',
            priority: priorityMatch ? priorityMatch[1].trim() : 'Medium',
            priorityExplanation: priorityExplanationMatch ? priorityExplanationMatch[1].trim() : 'Priority determined based on content analysis',
            impactAssessment: impactAssessmentMatch ? impactAssessmentMatch[1].trim() : 'Impact assessment pending',
            recommendedResponseTime: recommendedResponseTimeMatch ? recommendedResponseTimeMatch[1].trim() : 'Standard response time'
        };

        // Create new grievance
        const grievance = new Grievance({
            title: extractedData.title,
            description: extractedData.description,
            department: extractedData.department,
            location: extractedData.location,
            petitioner: req.user.id,
            status: 'pending',
            priority: extractedData.priority,
            priorityExplanation: extractedData.priorityExplanation,
            impactAssessment: extractedData.impactAssessment,
            recommendedResponseTime: extractedData.recommendedResponseTime,
            statusHistory: [{
                status: 'pending',
                updatedBy: req.user.id,
                updatedByType: 'petitioner',
                comment: `Document-based grievance submitted. Priority: ${extractedData.priority} - ${extractedData.priorityExplanation}`
            }],
            originalDocument: {
                filename: req.file.filename,
                path: filePath,
                uploadedAt: new Date()
            }
        });

        await grievance.save();

        res.status(201).json({
            message: 'Document processed successfully',
            grievance
        });
    } catch (error) {
        console.error('Error processing document:', error);
        res.status(500).json({
            error: 'Failed to process document',
            details: error.message
        });
    }
}; 