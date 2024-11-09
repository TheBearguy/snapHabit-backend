import vision from '@google-cloud/vision';

class ImageTextMatcher {
  constructor(credentialsPath) {
    this.client = new vision.ImageAnnotatorClient({
      keyFilename: credentialsPath
    });
  }

  async analyzeImage(imagePath) {
    try {
      const [labelResult, objectResult, textResult] = await Promise.all([
        this.client.labelDetection(imagePath),
        this.client.objectLocalization(imagePath),
        this.client.textDetection(imagePath)
      ]);

      return {
        labels: labelResult[0].labelAnnotations
          .filter(label => label.score >= 0.7)
          .map(label => ({
            keyword: label.description.toLowerCase(),
            confidence: label.score
          })),

        objects: objectResult[0].localizedObjectAnnotations
          .map(obj => ({
            keyword: obj.name.toLowerCase(),
            confidence: obj.score
          })),

        textInImage: textResult[0].textAnnotations[0]?.description.toLowerCase() || ''
      };
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  }

  analyzeText(text) {
    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/\s+/);
    const phrases = this.extractPhrases(normalizedText);
    
    return {
      words,
      phrases
    };
  }

  extractPhrases(text) {
    const words = text.split(/\s+/);
    const phrases = [];
    
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(words[i] + ' ' + words[i + 1]); // 2-word phrases
      if (i < words.length - 2) {
        phrases.push(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]); // 3-word phrases
      }
    }
    
    return phrases;
  }

  async matchImageAndText(imagePath, text, options = {}) {
    try {
      const {
        minConfidence = 0.7,
        minMatches = 1,
        requireExactMatch = false
      } = options;

      const imageAnalysis = await this.analyzeImage(imagePath);
      const textAnalysis = this.analyzeText(text);

      const matches = {
        labels: [],
        objects: [],
        textMatches: [],
        totalMatches: 0
      };

      // Check for label matches
      imageAnalysis.labels.forEach(label => {
        if (this.findMatch(label.keyword, textAnalysis, requireExactMatch)) {
          matches.labels.push({
            keyword: label.keyword,
            confidence: label.confidence
          });
          matches.totalMatches++;
        }
      });

      // Check for object matches
      imageAnalysis.objects.forEach(obj => {
        if (this.findMatch(obj.keyword, textAnalysis, requireExactMatch)) {
          matches.objects.push({
            keyword: obj.keyword,
            confidence: obj.confidence
          });
          matches.totalMatches++;
        }
      });

      // Check for text matches if there's text in the image
      if (imageAnalysis.textInImage) {
        const textMatches = this.findTextMatches(imageAnalysis.textInImage, textAnalysis);
        matches.textMatches = textMatches;
        matches.totalMatches += textMatches.length;
      }

      return {
        isMatch: matches.totalMatches >= minMatches,
        confidence: this.calculateOverallConfidence(matches),
        details: {
          ...matches,
          missingKeyElements: this.findMissingKeyElements(imageAnalysis, textAnalysis)
        },
        suggestions: this.generateSuggestions(matches, imageAnalysis)
      };
    } catch (error) {
      console.error('Error in matchImageAndText:', error);
      throw error;
    }
  }

  findMatch(keyword, textAnalysis, requireExactMatch) {
    if (requireExactMatch) {
      return textAnalysis.words.includes(keyword);
    }
    
    return textAnalysis.words.some(word => word.includes(keyword) || keyword.includes(word)) ||
           textAnalysis.phrases.some(phrase => phrase.includes(keyword) || keyword.includes(phrase));
  }

  findTextMatches(imageText, textAnalysis) {
    const matches = [];
    const imageWords = imageText.split(/\s+/);
    
    textAnalysis.words.forEach(word => {
      if (imageWords.includes(word)) {
        matches.push({ keyword: word, confidence: 1.0 });
      }
    });

    return matches;
  }

  calculateOverallConfidence(matches) {
    const allMatches = [...matches.labels, ...matches.objects, ...matches.textMatches];
    if (allMatches.length === 0) return 0;
    
    const totalConfidence = allMatches.reduce((sum, match) => sum + match.confidence, 0);
    return totalConfidence / allMatches.length;
  }

  findMissingKeyElements(imageAnalysis, textAnalysis) {
    return imageAnalysis.labels
      .filter(label => label.confidence > 0.8)
      .filter(label => !this.findMatch(label.keyword, textAnalysis, false))
      .map(label => label.keyword);
  }

  generateSuggestions(matches, imageAnalysis) {
    const suggestions = [];

    if (matches.totalMatches === 0) {
      suggestions.push('The description doesn\'t mention any key elements visible in the image.');
    }

    const highConfidenceLabels = imageAnalysis.labels
      .filter(label => label.confidence > 0.9)
      .map(label => label.keyword);
    
    if (highConfidenceLabels.length > 0) {
      suggestions.push(`Consider mentioning these key elements: ${highConfidenceLabels.join(', ')}`);
    }

    return suggestions;
  }
}

export default ImageTextMatcher;