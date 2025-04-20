import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import Grievance from '../models/Grievance.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Official from '../models/Official.js';
import Assignment from '../models/Assignment.js';
import { createNotification } from './notificationController.js';

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

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define valid department values
const VALID_DEPARTMENTS = ['Water', 'RTO', 'Electricity'];

// Enhance the department detection logic
function cleanDepartment(dept) {
    if (!dept) return '';

    const deptLower = dept.toLowerCase().trim();

    // More comprehensive keyword matching
    if (deptLower.includes('water') ||
        deptLower.includes('drinking') ||
        deptLower.includes('sewage') ||
        deptLower.includes('sanitation') ||
        deptLower.includes('contamination') ||
        deptLower.includes('pipeline') ||
        deptLower.includes('leak') ||
        deptLower.includes('drainage')) {
        return 'Water';
    }

    if (deptLower.includes('electricity') ||
        deptLower.includes('power') ||
        deptLower.includes('electric') ||
        deptLower.includes('transformer') ||
        deptLower.includes('voltage') ||
        deptLower.includes('current')) {
        return 'Electricity';
    }

    if (deptLower.includes('rto') ||
        deptLower.includes('transport') ||
        deptLower.includes('vehicle') ||
        deptLower.includes('license') ||
        deptLower.includes('driving') ||
        deptLower.includes('registration') ||
        deptLower.includes('motor')) {
        return 'RTO';
    }

    return dept; // Return original if no match
}

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
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('Gemini API key is not configured');
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No document uploaded' });
        }

        const petitioner = req.user.id;
        const filePath = req.file.path;

        // Initialize Gemini 2.0 Flash model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Read the file content
        const fileContent = await fs.promises.readFile(filePath);
        const imageData = fileContent.toString('base64');

        // First, try to detect if the document is in Tamil
        const languageDetectionPrompt = "Is this document written in Tamil? Answer with 'yes' or 'no' only.";
        const languageResult = await model.generateContent({
            contents: [{
                parts: [
                    { text: languageDetectionPrompt },
                    {
                        inlineData: {
                            mimeType: req.file.mimetype,
                            data: imageData
                        }
                    }
                ]
            }]
        });

        const isTamil = languageResult.response.text().toLowerCase().includes('yes');

        // If Tamil, translate to English
        let englishText;
        if (isTamil) {
            const translationPrompt = "Translate this Tamil document to English. Provide only the English translation.";
            const translationResult = await model.generateContent({
                contents: [{
                    parts: [
                        { text: translationPrompt },
                        {
                            inlineData: {
                                mimeType: req.file.mimetype,
                                data: imageData
                            }
                        }
                    ]
                }]
            });
            englishText = translationResult.response.text();
        } else {
            // If English, extract text directly
            const textExtractionPrompt = "Extract the text from this document.";
            const textResult = await model.generateContent({
                contents: [{
                    parts: [
                        { text: textExtractionPrompt },
                        {
                            inlineData: {
                                mimeType: req.file.mimetype,
                                data: imageData
                            }
                        }
                    ]
                }]
            });
            englishText = textResult.response.text();
        }

        // Extract key information using Gemini
        const extractionPrompt = `Analyze this text carefully and provide the following information in a structured format.

        First, determine which department this grievance is meant for:
        - If it mentions vehicles, licenses, driving, registration, transport, or motor vehicles, classify it as "RTO" department
        - If it mentions water supply, pipes, sewage, drainage, or water quality, classify it as "Water" department
        - If it mentions electricity, power supply, electrical issues, or billing for electricity, classify it as "Electricity" department

        For priority, carefully analyze the content and assign based on these criteria:
        - High: Life-threatening situations, safety hazards, critical infrastructure issues, immediate health risks
        - Medium: Service disruptions, maintenance issues, quality concerns, non-critical problems
        - Low: General complaints, improvement suggestions, minor inconveniences

        IMPORTANT: Pay special attention to identifying the correct department, district, division, and taluk information.

        Title: [Main topic or subject]
        Department: [Water, RTO, or Electricity only]
        Location: [Address or area mentioned]
        Description: [Main content or issue]
        Priority: [High, Medium, or Low]
        Priority Explanation: [Brief explanation of why this priority was assigned]
        District: [District mentioned, if Chennai is mentioned use "Chennai"]
        Division: [Division mentioned, for RTO documents look for mentions of regions like "Chennai Central"]
        Taluk: [Taluk mentioned, for RTO documents look for mentions of areas like "Egmore"]

        Text to analyze: ${englishText}`;

        const extractionResult = await model.generateContent({
            contents: [{
                parts: [{ text: extractionPrompt }]
            }]
        });

        // Parse the response text to extract information
        const responseText = extractionResult.response.text();
        const extractedData = {
            title: '',
            department: '',
            location: '',
            description: '',
            priority: 'Medium', // Default priority
            priorityExplanation: '',
            district: '',
            division: '',
            taluk: ''
        };

        // Modified regex patterns to capture multi-line content
        const titleMatch = responseText.match(/Title:\s*([^\n]+(?:\n[^\n:]+)*)/i);
        const departmentMatch = responseText.match(/Department:\s*([^\n]+)/i);
        const locationMatch = responseText.match(/Location:\s*([^\n]+(?:\n[^\n:]+)*)/i);
        const descriptionMatch = responseText.match(/Description:\s*([^\n]+(?:\n[^\n:]+)*)/i);
        const priorityMatch = responseText.match(/Priority:\s*([^\n]+)/i);
        const priorityExplanationMatch = responseText.match(/Priority Explanation:\s*([^\n]+(?:\n[^\n:]+)*)/i);
        const districtMatch = responseText.match(/District:\s*([^\n]+)/i);
        const divisionMatch = responseText.match(/Division:\s*([^\n]+)/i);
        const talukMatch = responseText.match(/Taluk:\s*([^\n]+)/i);

        // Add a direct text analysis for document type when regex fails
        if (!departmentMatch) {
            // Analyze text directly for keywords
            const text = englishText.toLowerCase();
            if (text.includes('water') || text.includes('contamination') || text.includes('sewage') ||
                text.includes('pipe') || text.includes('sanitation')) {
                extractedData.department = 'Water';
            } else if (text.includes('electricity') || text.includes('power supply') ||
                text.includes('voltage') || text.includes('transformer')) {
                extractedData.department = 'Electricity';
            } else if (text.includes('vehicle') || text.includes('license') || text.includes('rto') ||
                text.includes('traffic') || text.includes('registration')) {
                extractedData.department = 'RTO';
            }
        }

        // Add a direct text analysis for title when regex fails
        if (!titleMatch && englishText) {
            // Extract first line that could be a subject line
            const lines = englishText.split('\n').filter(line => line.trim());
            const subjectLine = lines.find(line => line.toLowerCase().includes('subject:'));

            if (subjectLine) {
                extractedData.title = subjectLine.replace(/^subject:\s*/i, '').trim();
            } else if (lines.length > 0) {
                // Use first non-empty line as title if it's reasonably short
                const possibleTitle = lines[0].trim();
                if (possibleTitle.length < 100) {
                    extractedData.title = possibleTitle;
                }
            }
        }

        // Extract district, division, and taluk from text if regex fails
        if (!districtMatch || !divisionMatch || !talukMatch) {
            const text = englishText.toLowerCase();

            // Try to find district
            const districtKeywords = ['chennai district', 'district'];
            if (!extractedData.district) {
                for (const keyword of districtKeywords) {
                    const index = text.indexOf(keyword);
                    if (index !== -1) {
                        const beforeText = text.substring(Math.max(0, index - 20), index);
                        const afterText = text.substring(index, index + 50);
                        const districtMatch = (beforeText + afterText).match(/(\w+)\s+district/i);
                        if (districtMatch && districtMatch[1]) {
                            extractedData.district = districtMatch[1].charAt(0).toUpperCase() + districtMatch[1].slice(1);
                            break;
                        }
                    }
                }
            }

            // Try to find division
            const divisionKeywords = ['division', 'south division', 'north division', 'east division', 'west division', 'central division'];
            if (!extractedData.division) {
                for (const keyword of divisionKeywords) {
                    const index = text.indexOf(keyword);
                    if (index !== -1) {
                        const beforeText = text.substring(Math.max(0, index - 20), index);
                        const afterText = text.substring(index, index + 50);
                        const divisionMatch = (beforeText + afterText).match(/(\w+)\s+division/i);
                        if (divisionMatch && divisionMatch[1]) {
                            extractedData.division = divisionMatch[1].charAt(0).toUpperCase() + divisionMatch[1].slice(1);
                            break;
                        }
                    }
                }
            }

            // Try to find taluk
            const talukKeywords = ['taluk', 'taluka'];
            if (!extractedData.taluk) {
                for (const keyword of talukKeywords) {
                    const index = text.indexOf(keyword);
                    if (index !== -1) {
                        const beforeText = text.substring(Math.max(0, index - 20), index);
                        const afterText = text.substring(index, index + 50);
                        const talukMatch = (beforeText + afterText).match(/(\w+)\s+taluk/i);
                        if (talukMatch && talukMatch[1]) {
                            extractedData.taluk = talukMatch[1].charAt(0).toUpperCase() + talukMatch[1].slice(1);
                            break;
                        }
                    }
                }
            }
        }

        // Try to extract description from the full text if regex fails
        if (!descriptionMatch && englishText) {
            const lines = englishText.split('\n').filter(line => line.trim());
            // Skip the first few lines which are likely header/addressing information
            const contentLines = lines.slice(3);
            if (contentLines.length > 0) {
                // Join multiple lines to form a description
                extractedData.description = contentLines.join(' ').substring(0, 500); // Limit to 500 chars
            }
        }

        if (titleMatch) extractedData.title = titleMatch[1].trim();
        if (departmentMatch) extractedData.department = cleanDepartment(departmentMatch[1]);
        if (locationMatch) extractedData.location = locationMatch[1].trim();
        if (descriptionMatch) extractedData.description = descriptionMatch[1].trim();
        if (priorityMatch) extractedData.priority = priorityMatch[1].trim();
        if (priorityExplanationMatch) extractedData.priorityExplanation = priorityExplanationMatch[1].trim();
        if (districtMatch) extractedData.district = districtMatch[1].trim();
        if (divisionMatch) extractedData.division = divisionMatch[1].trim();
        if (talukMatch) extractedData.taluk = talukMatch[1].trim();

        // Add debug logging
        console.log('Document extraction results:', {
            title: extractedData.title || 'NOT FOUND',
            department: extractedData.department || 'NOT FOUND',
            description: extractedData.description ? (extractedData.description.substring(0, 50) + '...') : 'NOT FOUND',
            location: extractedData.location || 'NOT FOUND',
            district: extractedData.district || 'NOT FOUND',
            division: extractedData.division || 'NOT FOUND',
            taluk: extractedData.taluk || 'NOT FOUND',
            priority: extractedData.priority || 'NOT FOUND'
        });

        // Validate and finalize the extracted data
        console.log('Before validation:', extractedData);

        // Update the validation check to handle default values for required fields
        if (!extractedData.title) {
            extractedData.title = 'Document Grievance'; // Default title
        }

        if (!extractedData.department || !VALID_DEPARTMENTS.includes(extractedData.department)) {
            // If we couldn't determine department from regex or direct text analysis,
            // make one final attempt to extract from description or full text
            const textToAnalyze = extractedData.description || englishText;
            const cleanedDept = cleanDepartment(textToAnalyze);

            if (VALID_DEPARTMENTS.includes(cleanedDept)) {
                extractedData.department = cleanedDept;
            } else {
                console.log('Invalid department detected:', extractedData.department);
                extractedData.department = 'Water'; // Default to Water department
            }
        }

        if (!extractedData.description) {
            extractedData.description = englishText.substring(0, 500); // Use part of the document as description
        }

        // Set reasonable default location info if missing
        if (!extractedData.district) {
            extractedData.district = 'Chennai'; // Default district
        }

        if (!extractedData.division) {
            extractedData.division = 'South'; // Default division
        }

        if (!extractedData.taluk) {
            extractedData.taluk = 'Adyar'; // Default taluk
        }

        console.log('After validation:', extractedData);

        // Validate required fields
        if (!extractedData.title || !extractedData.department || !extractedData.description) {
            throw new Error('Failed to extract required information from the document');
        }

        // Validate department is one of the allowed values
        if (!VALID_DEPARTMENTS.includes(extractedData.department)) {
            throw new Error(`Invalid department: ${extractedData.department}. Must be one of: ${VALID_DEPARTMENTS.join(', ')}`);
        }

        // Validate priority is one of the allowed values
        const validPriorities = ['High', 'Medium', 'Low'];
        if (!validPriorities.includes(extractedData.priority)) {
            extractedData.priority = 'Medium'; // Default to Medium if invalid
        }

        // Create new grievance
        const grievance = new Grievance({
            petitionId: `GRV${Date.now().toString().slice(-6)}`,
            title: extractedData.title,
            description: extractedData.description,
            department: extractedData.department,
            ...(extractedData.location && { location: extractedData.location }),
            district: extractedData.district || 'Chennai', // Default to Chennai if not extracted
            division: extractedData.division || 'Central', // Default to Central if not extracted
            taluk: extractedData.taluk || 'Egmore', // Default to Egmore if not extracted
            petitioner,
            status: 'pending',
            priority: extractedData.priority,
            priorityExplanation: extractedData.priorityExplanation || 'Priority assigned based on content analysis',
            portal_type: 'GRS',
            statusHistory: [{
                status: 'pending',
                updatedBy: petitioner,
                updatedByType: 'petitioner',
                comment: `Document-based grievance submitted. Priority: ${extractedData.priority} - ${extractedData.priorityExplanation || 'Based on content analysis'}`
            }],
            originalDocument: {
                filename: req.file.originalname,
                path: filePath,
                uploadedAt: new Date()
            },
            recommendedResponseTime: extractedData.priority === 'High' ? '24' :
                extractedData.priority === 'Medium' ? '48' : '72',
            impactAssessment: extractedData.priority === 'High' ? 'High' :
                extractedData.priority === 'Medium' ? 'Medium' : 'Low'
        });

        await grievance.save();

        // Find and assign officials
        const district = extractedData.district || 'Chennai';
        const division = extractedData.division || 'Central';
        const taluk = extractedData.taluk || 'Egmore';

        console.log('Searching for officials with criteria:', {
            department: extractedData.department,
            district: district,
            division: division,
            taluk: taluk
        });

        // Case insensitive search - convert all jurisdiction fields to lowercase for matching
        const officials = await Official.find({
            department: extractedData.department,
            $and: [
                { $expr: { $eq: [{ $toLower: "$district" }, district.toLowerCase()] } },
                { $expr: { $eq: [{ $toLower: "$division" }, division.toLowerCase()] } },
                { $expr: { $eq: [{ $toLower: "$taluk" }, taluk.toLowerCase()] } }
            ]
        });

        console.log(`Found ${officials.length} matching officials for exact jurisdiction match`);

        // If no officials found with exact match, try a more flexible search
        let assignmentOfficials = officials;

        if (officials.length === 0) {
            console.log('No exact jurisdiction match. Trying partial match...');

            // Try to match with just department and district
            const districtOfficials = await Official.find({
                department: extractedData.department,
                $expr: { $eq: [{ $toLower: "$district" }, district.toLowerCase()] }
            });

            console.log(`Found ${districtOfficials.length} officials in same district`);

            if (districtOfficials.length > 0) {
                assignmentOfficials = districtOfficials;
                console.log('Using district-level officials instead');
            } else {
                // If still no match, get all officials in the department
                console.log('No district match either. Searching for any officials in this department...');
                const allDeptOfficials = await Official.find({
                    department: extractedData.department
                });
                console.log(`Found ${allDeptOfficials.length} officials in ${extractedData.department} department`);

                if (allDeptOfficials.length > 0) {
                    console.log('Official jurisdictions in this department:');
                    allDeptOfficials.forEach(official => {
                        console.log(`- ${official.firstName} ${official.lastName}: ${official.taluk}, ${official.division}, ${official.district}`);
                    });

                    // Use all department officials if specific jurisdiction officials not found
                    assignmentOfficials = allDeptOfficials;
                }
            }
        }

        // Create assignments with the officials we found (either specific jurisdiction or department-wide)
        const assignments = await Promise.all(assignmentOfficials.map(official => {
            return new Assignment({
                grievanceId: grievance._id,
                officialId: official._id,
                status: 'Pending'
            }).save();
        }));

        // After finding officials and creating assignments, update the grievance with assignedOfficials
        grievance.assignedOfficials = assignmentOfficials.map(official => official._id);
        await grievance.save();

        // Create notifications for assigned officials
        for (const official of assignmentOfficials) {
            await createNotification(
                official._id,
                'Official',
                'NEW_GRIEVANCE',
                `A new document-based grievance has been submitted${officials.length === 0 ? ' that may require your attention' : ' in your jurisdiction'}. Please review the uploaded document and accept if you can handle it.`,
                grievance._id
            );
        }

        res.status(201).json({
            message: 'Document processed successfully',
            grievance,
            assignments
        });
    } catch (error) {
        console.error('Error processing document:', error);
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
                console.log('Cleaned up uploaded file:', req.file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
            }
        }
        res.status(500).json({
            error: 'Failed to process document',
            details: error.message
        });
    }
}; 