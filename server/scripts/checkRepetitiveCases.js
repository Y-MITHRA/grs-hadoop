import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Grievance from '../models/Grievance.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Function to calculate cosine similarity between two vectors
function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
  const norm1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
  const norm2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (norm1 * norm2);
}

// Simple text similarity calculation
function calculateTextSimilarity(text1, text2) {
  // Convert to lowercase and split into words
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  // Create word frequency vectors
  const wordFreq1 = {};
  const wordFreq2 = {};
  
  words1.forEach(word => {
    wordFreq1[word] = (wordFreq1[word] || 0) + 1;
  });
  
  words2.forEach(word => {
    wordFreq2[word] = (wordFreq2[word] || 0) + 1;
  });
  
  // Get all unique words
  const allWords = new Set([...Object.keys(wordFreq1), ...Object.keys(wordFreq2)]);
  
  // Create vectors
  const vec1 = [];
  const vec2 = [];
  
  allWords.forEach(word => {
    vec1.push(wordFreq1[word] || 0);
    vec2.push(wordFreq2[word] || 0);
  });
  
  // Calculate cosine similarity
  return cosineSimilarity(vec1, vec2);
}

// Function to find repetitive cases
async function findRepetitiveCases(similarityThreshold = 0.8) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all grievances
    const grievances = await Grievance.find().select('_id petitionId title description division district taluk createdAt status');
    console.log(`Found ${grievances.length} grievances in the database`);
    
    // Group grievances by location (division, district, taluk)
    const locationGroups = {};
    grievances.forEach(grievance => {
      const locationKey = `${grievance.division}|${grievance.district}|${grievance.taluk}`;
      if (!locationGroups[locationKey]) {
        locationGroups[locationKey] = [];
      }
      locationGroups[locationKey].push(grievance);
    });
    
    console.log(`Grouped grievances into ${Object.keys(locationGroups).length} location groups`);
    
    // Find repetitive cases within each location group
    const repetitiveCases = [];
    
    for (const locationKey in locationGroups) {
      const locationGrievances = locationGroups[locationKey];
      
      if (locationGrievances.length <= 1) continue;
      
      console.log(`Checking ${locationGrievances.length} grievances in location: ${locationKey}`);
      
      for (let i = 0; i < locationGrievances.length; i++) {
        const currentGrievance = locationGrievances[i];
        
        for (let j = i + 1; j < locationGrievances.length; j++) {
          const otherGrievance = locationGrievances[j];
          
          const similarity = calculateTextSimilarity(
            currentGrievance.description,
            otherGrievance.description
          );
          
          if (similarity >= similarityThreshold) {
            repetitiveCases.push({
              grievance1: {
                id: currentGrievance._id,
                petitionId: currentGrievance.petitionId,
                title: currentGrievance.title,
                createdAt: currentGrievance.createdAt,
                status: currentGrievance.status
              },
              grievance2: {
                id: otherGrievance._id,
                petitionId: otherGrievance.petitionId,
                title: otherGrievance.title,
                createdAt: otherGrievance.createdAt,
                status: otherGrievance.status
              },
              location: locationKey,
              similarity
            });
          }
        }
      }
    }
    
    console.log(`Found ${repetitiveCases.length} pairs of repetitive cases`);
    
    // Print repetitive cases
    if (repetitiveCases.length > 0) {
      console.log('\nRepetitive Cases:');
      repetitiveCases.forEach((pair, index) => {
        console.log(`\nPair ${index + 1} (Similarity: ${(pair.similarity * 100).toFixed(1)}%):`);
        console.log(`Location: ${pair.location}`);
        console.log(`Grievance 1: ${pair.grievance1.petitionId} - ${pair.grievance1.title} (${pair.grievance1.status})`);
        console.log(`Grievance 2: ${pair.grievance2.petitionId} - ${pair.grievance2.title} (${pair.grievance2.status})`);
      });
    } else {
      console.log('No repetitive cases found');
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    return repetitiveCases;
  } catch (error) {
    console.error('Error finding repetitive cases:', error);
    return [];
  }
}

// Run the script
findRepetitiveCases(0.8)
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 