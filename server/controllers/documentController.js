import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import Grievance from '../models/Grievance.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createWorker } from 'tesseract.js';
import Official from '../models/Official.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/documents/');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for document uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
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
            try {
                const worker = await createWorker();
                await worker.loadLanguage('eng+tam');
                await worker.initialize('eng+tam');
                const { data: { text } } = await worker.recognize(filePath);
                await worker.terminate();
                extractedText = text;
            } catch (ocrError) {
                console.error('OCR error:', ocrError);
                extractedText = 'Failed to extract text from image. Please provide a clearer image.';
            }
        } else {
            // For PDFs, you would use a PDF parser here
            // This is a placeholder for PDF parsing logic
            extractedText = 'PDF text extraction placeholder';
        }

        // Initialize variables for extracted data
        let extractedData = {
            title: 'Untitled Grievance',
            description: extractedText,
            location: 'Location not specified',
            taluk: 'Taluk not specified',
            district: 'District not specified',
            division: 'Division not specified',
            department: 'Department not specified',
            priority: 'Medium',
            priorityExplanation: 'Priority determined based on content analysis',
            impactAssessment: 'Impact assessment pending',
            recommendedResponseTime: 'Standard response time'
        };

        // Try to use Gemini AI for analysis if API key is available
        if (process.env.GEMINI_API_KEY) {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ 
                    model: "gemini-flash-2.0",
                    generationConfig: {
                        temperature: 0.3,
                        topK: 32,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                });

                // Analyze the extracted text
                const extractionPrompt = `
                    Analyze the following grievance text and extract relevant information. 
                    Consider the full context and implications of the situation.
                    Pay special attention to location-based administrative information.
                    
                    Text to analyze: "${extractedText}"
                    
                    Please provide a comprehensive analysis in the following format:
                    
                    TITLE: [Extract a clear, concise title that captures the main issue]
                    DESCRIPTION: [Provide a detailed description of the grievance]
                    LOCATION: [Extract the specific location/address mentioned]
                    TALUK: [Extract the taluk (sub-district) mentioned]
                    DISTRICT: [Extract the district mentioned]
                    DIVISION: [Extract the division mentioned, if any]
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
                const talukMatch = extractionResponse.match(/TALUK:\s*([^\n]+)/i);
                const districtMatch = extractionResponse.match(/DISTRICT:\s*([^\n]+)/i);
                const divisionMatch = extractionResponse.match(/DIVISION:\s*([^\n]+)/i);
                const departmentMatch = extractionResponse.match(/DEPARTMENT:\s*([^\n]+)/i);
                const priorityMatch = extractionResponse.match(/PRIORITY:\s*([^\n]+)/i);
                const priorityExplanationMatch = extractionResponse.match(/PRIORITY_EXPLANATION:\s*([^\n]+)/i);
                const impactAssessmentMatch = extractionResponse.match(/IMPACT_ASSESSMENT:\s*([^\n]+)/i);
                const recommendedResponseTimeMatch = extractionResponse.match(/RECOMMENDED_RESPONSE_TIME:\s*([^\n]+)/i);

                // Update extracted data with Gemini results
                if (titleMatch) extractedData.title = titleMatch[1].trim();
                if (descriptionMatch) extractedData.description = descriptionMatch[1].trim();
                if (locationMatch) extractedData.location = locationMatch[1].trim();
                if (talukMatch) extractedData.taluk = talukMatch[1].trim();
                if (districtMatch) extractedData.district = districtMatch[1].trim();
                if (divisionMatch) extractedData.division = divisionMatch[1].trim();
                if (departmentMatch) extractedData.department = cleanDepartment(departmentMatch[1]);
                if (priorityMatch) extractedData.priority = priorityMatch[1].trim();
                if (priorityExplanationMatch) extractedData.priorityExplanation = priorityExplanationMatch[1].trim();
                if (impactAssessmentMatch) extractedData.impactAssessment = impactAssessmentMatch[1].trim();
                if (recommendedResponseTimeMatch) extractedData.recommendedResponseTime = recommendedResponseTimeMatch[1].trim();
            } catch (geminiError) {
                console.error('Gemini AI error:', geminiError);
                // Fallback to local priority analysis
                extractedData.priority = analyzePriority(extractedText);
                extractedData.priorityExplanation = `Priority determined using local analysis: ${extractedData.priority}`;
            }
        } else {
            console.warn('GEMINI_API_KEY is not set. Using local priority analysis.');
            // Fallback to local priority analysis
            extractedData.priority = analyzePriority(extractedText);
            extractedData.priorityExplanation = `Priority determined using local analysis: ${extractedData.priority}`;
        }

        // Validate department is one of the allowed values
        const validDepartments = ['Water', 'RTO', 'Electricity'];
        if (!validDepartments.includes(extractedData.department)) {
            extractedData.department = 'Water'; // Default to Water if invalid
        }

        // Validate priority is one of the allowed values
        const validPriorities = ['High', 'Medium', 'Low'];
        if (!validPriorities.includes(extractedData.priority)) {
            extractedData.priority = 'Medium'; // Default to Medium if invalid
        }

        // Find matching officials based on location and department
        const matchingOfficials = await Official.find({
            department: extractedData.department,
            $or: [
                { taluk: extractedData.taluk },
                { district: extractedData.district },
                { division: extractedData.division }
            ]
        });

        // Create new grievance
        const grievance = new Grievance({
            petitionId: `GRV${Date.now().toString().slice(-6)}`,
            title: extractedData.title,
            description: extractedData.description,
            department: extractedData.department,
            location: extractedData.location,
            taluk: extractedData.taluk,
            district: extractedData.district,
            division: extractedData.division,
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

        // If matching officials found, assign the grievance
        if (matchingOfficials.length > 0) {
            // Sort officials by jurisdiction match (exact matches first)
            const sortedOfficials = matchingOfficials.sort((a, b) => {
                const aScore = (a.taluk === extractedData.taluk ? 3 : 0) +
                             (a.district === extractedData.district ? 2 : 0) +
                             (a.division === extractedData.division ? 1 : 0);
                const bScore = (b.taluk === extractedData.taluk ? 3 : 0) +
                             (b.district === extractedData.district ? 2 : 0) +
                             (b.division === extractedData.division ? 1 : 0);
                return bScore - aScore;
            });

            // Assign to the best matching official
            grievance.assignedTo = sortedOfficials[0]._id;
            grievance.status = 'assigned';
            grievance.statusHistory.push({
                status: 'assigned',
                updatedBy: sortedOfficials[0]._id,
                updatedByType: 'system',
                comment: `Automatically assigned to official based on jurisdiction match`
            });
        }

        await grievance.save();

        // Return response with location information and official assignment
        res.status(201).json({
            message: 'Document processed successfully',
            grievance,
            locationInfo: {
                taluk: extractedData.taluk,
                district: extractedData.district,
                division: extractedData.division
            },
            officialAssignment: matchingOfficials.length > 0 ? {
                assigned: true,
                officialId: matchingOfficials[0]._id,
                matchReason: `Matched based on ${matchingOfficials[0].taluk === extractedData.taluk ? 'taluk' : 
                             matchingOfficials[0].district === extractedData.district ? 'district' : 'division'} jurisdiction`
            } : {
                assigned: false,
                reason: 'No matching officials found for the specified location'
            }
        });
    } catch (error) {
        console.error('Error processing document:', error);
        res.status(500).json({
            error: 'Failed to process document',
            details: error.message
        });
    }
}; 