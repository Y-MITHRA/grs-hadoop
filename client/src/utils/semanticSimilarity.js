// Utility functions for calculating text similarity in the browser
const calculateTFIDF = (text, allTexts) => {
  // Tokenize and clean text
  const tokens = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);

  // Calculate term frequency (TF)
  const tf = {};
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });

  // Calculate inverse document frequency (IDF)
  const idf = {};
  const docCount = allTexts.length;
  
  // Get unique terms from all texts
  const allTerms = new Set();
  allTexts.forEach(text => {
    const textTokens = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    textTokens.forEach(token => allTerms.add(token));
  });

  // Calculate IDF for each term
  allTerms.forEach(term => {
    const docsWithTerm = allTexts.filter(text => 
      text.toLowerCase().includes(term)
    ).length;
    idf[term] = Math.log(docCount / (1 + docsWithTerm));
  });

  // Calculate TF-IDF
  const tfidf = {};
  Object.keys(tf).forEach(term => {
    tfidf[term] = tf[term] * (idf[term] || Math.log(docCount));
  });

  return tfidf;
};

const cosineSimilarity = (vec1, vec2) => {
  const intersection = Object.keys(vec1).filter(key => vec2[key] !== undefined);
  
  const dotProduct = intersection.reduce((sum, key) => 
    sum + (vec1[key] * vec2[key]), 0);

  const magnitude1 = Math.sqrt(
    Object.values(vec1).reduce((sum, val) => sum + val * val, 0)
  );
  
  const magnitude2 = Math.sqrt(
    Object.values(vec2).reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
};

export const calculateTextSimilarity = (text1, text2, allTexts = []) => {
  // Add current texts to the corpus if not already included
  const corpus = [...new Set([...allTexts, text1, text2])];
  
  // Calculate TF-IDF vectors for both texts
  const vector1 = calculateTFIDF(text1, corpus);
  const vector2 = calculateTFIDF(text2, corpus);

  // Calculate cosine similarity between the vectors
  return cosineSimilarity(vector1, vector2);
};

export const findSimilarGrievances = (currentGrievance, previousGrievances, similarityThreshold = 0.6) => {
  if (!currentGrievance || !previousGrievances || previousGrievances.length === 0) {
    return [];
  }

  const currentText = `${currentGrievance.title} ${currentGrievance.description}`.toLowerCase();
  
  // Create corpus of all grievance texts
  const allTexts = previousGrievances.map(g => 
    `${g.title} ${g.description}`.toLowerCase()
  );

  // Find similar grievances
  return previousGrievances.filter(grievance => {
    if (grievance._id === currentGrievance._id) return false;

    const grievanceText = `${grievance.title} ${grievance.description}`.toLowerCase();
    const similarity = calculateTextSimilarity(currentText, grievanceText, allTexts);

    return similarity >= similarityThreshold;
  });
}; 