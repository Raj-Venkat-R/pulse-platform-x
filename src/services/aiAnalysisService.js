const { Pool } = require('pg');
const natural = require('natural');
const sentiment = require('sentiment');

class AIAnalysisService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Initialize NLP tools
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.sentimentAnalyzer = new sentiment();
    
    // AI model configurations
    this.models = {
      categorization: {
        version: 'v1.0',
        confidence_threshold: 0.7
      },
      urgency_scoring: {
        version: 'v1.0',
        confidence_threshold: 0.6
      },
      sentiment_analysis: {
        version: 'v1.0',
        confidence_threshold: 0.5
      }
    };

    // Category keywords for classification
    this.categoryKeywords = {
      billing: ['bill', 'payment', 'charge', 'cost', 'price', 'invoice', 'refund', 'insurance', 'coverage'],
      service_quality: ['service', 'quality', 'care', 'treatment', 'experience', 'satisfaction', 'professional'],
      medical_care: ['medical', 'doctor', 'nurse', 'treatment', 'diagnosis', 'medication', 'prescription', 'health'],
      staff_behavior: ['staff', 'rude', 'unprofessional', 'attitude', 'behavior', 'courtesy', 'respect'],
      facilities: ['facility', 'clean', 'dirty', 'equipment', 'room', 'building', 'maintenance', 'hygiene'],
      appointment: ['appointment', 'schedule', 'booking', 'time', 'wait', 'delay', 'cancellation'],
      communication: ['communication', 'call', 'email', 'response', 'information', 'update', 'notification'],
      other: ['other', 'miscellaneous', 'general', 'complaint']
    };

    // Urgency keywords
    this.urgencyKeywords = {
      critical: ['emergency', 'urgent', 'critical', 'immediate', 'asap', 'stat', 'life-threatening', 'serious'],
      high: ['important', 'priority', 'escalate', 'manager', 'supervisor', 'serious', 'concern'],
      medium: ['concern', 'issue', 'problem', 'complaint', 'dissatisfied', 'unhappy'],
      low: ['suggestion', 'feedback', 'improvement', 'minor', 'small']
    };

    // Sentiment indicators
    this.sentimentIndicators = {
      positive: ['good', 'excellent', 'great', 'satisfied', 'happy', 'pleased', 'thankful'],
      negative: ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'disappointed', 'upset'],
      neutral: ['okay', 'fine', 'acceptable', 'average', 'normal']
    };
  }

  async analyzeComplaint({ description, subject, patient_id }) {
    const startTime = Date.now();
    
    try {
      // Extract keywords and entities
      const keywords = this.extractKeywords(description);
      const entities = this.extractEntities(description);
      
      // Categorize complaint
      const categorization = await this.categorizeComplaint(description, keywords);
      
      // Calculate urgency score
      const urgencyAnalysis = await this.calculateUrgencyScore(description, keywords, patient_id);
      
      // Analyze sentiment
      const sentimentAnalysis = this.analyzeSentiment(description);
      
      // Determine SLA deadline
      const slaDeadline = this.calculateSlaDeadline(
        urgencyAnalysis.urgency_level,
        categorization.category,
        new Date()
      );

      const processingTime = Date.now() - startTime;

      return {
        category: categorization.category,
        subcategory: categorization.subcategory,
        urgency_score: urgencyAnalysis.score,
        urgency_level: urgencyAnalysis.urgency_level,
        sentiment_score: sentimentAnalysis.score,
        keywords: keywords,
        entities: entities,
        confidence: Math.min(categorization.confidence, urgencyAnalysis.confidence),
        sla_deadline: slaDeadline,
        processing_time: processingTime,
        expertise_areas: this.determineExpertiseAreas(categorization.category, keywords)
      };
    } catch (error) {
      console.error('Error in AI analysis:', error);
      throw new Error('AI analysis failed');
    }
  }

  extractKeywords(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    const keywords = tokens
      .filter(token => token.length > 2 && !stopWords.has(token))
      .map(token => this.stemmer.stem(token))
      .filter((token, index, array) => array.indexOf(token) === index); // Remove duplicates
    
    return keywords.slice(0, 10); // Return top 10 keywords
  }

  extractEntities(text) {
    const entities = {
      people: [],
      amounts: [],
      dates: [],
      locations: [],
      medical_terms: []
    };

    // Extract amounts (money, numbers)
    const amountRegex = /\$[\d,]+\.?\d*|\d+\s*(dollars?|cents?|USD)/gi;
    const amounts = text.match(amountRegex);
    if (amounts) {
      entities.amounts = amounts;
    }

    // Extract dates
    const dateRegex = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi;
    const dates = text.match(dateRegex);
    if (dates) {
      entities.dates = dates;
    }

    // Extract medical terms
    const medicalTerms = ['doctor', 'nurse', 'patient', 'treatment', 'diagnosis', 'medication', 'prescription', 'surgery', 'therapy'];
    entities.medical_terms = medicalTerms.filter(term => 
      text.toLowerCase().includes(term)
    );

    return entities;
  }

  async categorizeComplaint(description, keywords) {
    const scores = {};
    
    // Calculate scores for each category
    for (const [category, categoryKeywords] of Object.entries(this.categoryKeywords)) {
      let score = 0;
      let matches = 0;
      
      for (const keyword of keywords) {
        for (const categoryKeyword of categoryKeywords) {
          if (keyword.includes(categoryKeyword) || categoryKeyword.includes(keyword)) {
            score += 1;
            matches++;
          }
        }
      }
      
      // Also check in full description
      for (const categoryKeyword of categoryKeywords) {
        if (description.toLowerCase().includes(categoryKeyword)) {
          score += 0.5;
          matches++;
        }
      }
      
      scores[category] = {
        score: score,
        matches: matches,
        confidence: Math.min(score / categoryKeywords.length, 1.0)
      };
    }

    // Find best category
    const bestCategory = Object.entries(scores)
      .sort(([,a], [,b]) => b.score - a.score)[0];

    return {
      category: bestCategory[0],
      subcategory: this.getSubcategory(bestCategory[0], description),
      confidence: bestCategory[1].confidence,
      all_scores: scores
    };
  }

  getSubcategory(category, description) {
    const subcategories = {
      billing: ['payment_issue', 'insurance_claim', 'overcharge', 'refund_request'],
      service_quality: ['wait_time', 'staff_attitude', 'cleanliness', 'equipment_issue'],
      medical_care: ['misdiagnosis', 'medication_error', 'treatment_quality', 'follow_up'],
      staff_behavior: ['rudeness', 'unprofessional', 'discrimination', 'incompetence'],
      facilities: ['cleanliness', 'maintenance', 'accessibility', 'safety'],
      appointment: ['scheduling', 'wait_time', 'cancellation', 'rescheduling'],
      communication: ['no_response', 'unclear_info', 'language_barrier', 'accessibility']
    };

    const categorySubs = subcategories[category] || [];
    const descriptionLower = description.toLowerCase();
    
    for (const sub of categorySubs) {
      if (descriptionLower.includes(sub.replace('_', ' '))) {
        return sub;
      }
    }
    
    return 'general';
  }

  async calculateUrgencyScore(description, keywords, patient_id) {
    let score = 0.0;
    let confidence = 0.0;
    
    // Check urgency keywords
    for (const [level, levelKeywords] of Object.entries(this.urgencyKeywords)) {
      let levelScore = 0;
      let matches = 0;
      
      for (const keyword of keywords) {
        for (const levelKeyword of levelKeywords) {
          if (keyword.includes(levelKeyword) || levelKeyword.includes(keyword)) {
            levelScore += 1;
            matches++;
          }
        }
      }
      
      // Also check in full description
      for (const levelKeyword of levelKeywords) {
        if (description.toLowerCase().includes(levelKeyword)) {
          levelScore += 0.5;
          matches++;
        }
      }
      
      if (matches > 0) {
        const levelWeight = {
          critical: 0.9,
          high: 0.7,
          medium: 0.5,
          low: 0.3
        };
        
        score = Math.max(score, levelWeight[level] * Math.min(levelScore / levelKeywords.length, 1.0));
        confidence = Math.max(confidence, Math.min(levelScore / levelKeywords.length, 1.0));
      }
    }

    // Adjust based on patient history
    if (patient_id) {
      const patientHistory = await this.getPatientHistory(patient_id);
      if (patientHistory.urgent_complaints_count > 2) {
        score = Math.min(1.0, score + 0.2);
      } else if (patientHistory.urgent_complaints_count > 0) {
        score = Math.min(1.0, score + 0.1);
      }
    }

    // Determine urgency level
    const urgencyLevel = this.determineUrgencyLevel(score);

    return {
      score: Math.round(score * 100) / 100,
      urgency_level: urgencyLevel,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  async getPatientHistory(patient_id) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_complaints,
          COUNT(*) FILTER (WHERE urgency_level = 'critical') as urgent_complaints_count,
          AVG(urgency_score) as avg_urgency_score
        FROM complaints 
        WHERE patient_id = $1 
        AND created_at >= NOW() - INTERVAL '1 year'
      `;
      
      const result = await this.pool.query(query, [patient_id]);
      return result.rows[0] || { total_complaints: 0, urgent_complaints_count: 0, avg_urgency_score: 0 };
    } catch (error) {
      console.error('Error fetching patient history:', error);
      return { total_complaints: 0, urgent_complaints_count: 0, avg_urgency_score: 0 };
    }
  }

  determineUrgencyLevel(score) {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  analyzeSentiment(description) {
    const result = this.sentimentAnalyzer.analyze(description);
    
    return {
      score: Math.max(-1, Math.min(1, result.score / 10)), // Normalize to -1 to 1
      comparative: result.comparative,
      positive: result.positive,
      negative: result.negative
    };
  }

  calculateSlaDeadline(urgencyLevel, category, createdAt) {
    let hoursToAdd = 72; // Default 3 days
    
    // Adjust by urgency level
    switch (urgencyLevel) {
      case 'critical': hoursToAdd = 2; break;
      case 'high': hoursToAdd = 4; break;
      case 'medium': hoursToAdd = 24; break;
      case 'low': hoursToAdd = 72; break;
    }
    
    // Adjust by category
    switch (category) {
      case 'medical_care': hoursToAdd = Math.floor(hoursToAdd / 2); break;
      case 'staff_behavior': hoursToAdd = Math.floor(hoursToAdd / 2); break;
      case 'billing': hoursToAdd = hoursToAdd * 2; break;
    }
    
    return new Date(createdAt.getTime() + hoursToAdd * 60 * 60 * 1000);
  }

  determineExpertiseAreas(category, keywords) {
    const expertiseMap = {
      billing: ['billing', 'finance', 'insurance'],
      medical_care: ['medical', 'clinical', 'healthcare'],
      staff_behavior: ['hr', 'management', 'training'],
      facilities: ['facilities', 'maintenance', 'operations'],
      appointment: ['scheduling', 'operations'],
      communication: ['communications', 'customer_service']
    };
    
    return expertiseMap[category] || ['general'];
  }

  async prioritizeComplaints(complaints) {
    // AI-powered prioritization algorithm
    return complaints.sort((a, b) => {
      // Primary sort: urgency score
      if (a.urgency_score !== b.urgency_score) {
        return b.urgency_score - a.urgency_score;
      }
      
      // Secondary sort: SLA deadline
      if (a.sla_deadline && b.sla_deadline) {
        return new Date(a.sla_deadline) - new Date(b.sla_deadline);
      }
      
      // Tertiary sort: creation time
      return new Date(a.created_at) - new Date(b.created_at);
    });
  }

  async generateInsights(analytics) {
    const insights = {
      trends: await this.analyzeTrends(analytics),
      predictions: await this.generatePredictions(analytics),
      recommendations: await this.generateRecommendations(analytics),
      anomalies: await this.detectAnomalies(analytics)
    };
    
    return insights;
  }

  async analyzeTrends(analytics) {
    // Analyze complaint trends over time
    const trends = {
      category_trends: {},
      urgency_trends: {},
      resolution_trends: {}
    };
    
    // This would implement trend analysis logic
    // For now, return mock data
    return trends;
  }

  async generatePredictions(analytics) {
    // Generate predictions for future complaints
    const predictions = {
      expected_volume: 0,
      peak_hours: [],
      category_forecast: {},
      sla_risk_assessment: {}
    };
    
    // This would implement prediction logic
    return predictions;
  }

  async generateRecommendations(analytics) {
    // Generate actionable recommendations
    const recommendations = [
      {
        type: 'staffing',
        priority: 'high',
        description: 'Consider increasing staff during peak hours',
        impact: 'Reduce wait times by 30%'
      },
      {
        type: 'training',
        priority: 'medium',
        description: 'Provide additional training on billing procedures',
        impact: 'Reduce billing complaints by 25%'
      }
    ];
    
    return recommendations;
  }

  async detectAnomalies(analytics) {
    // Detect unusual patterns or anomalies
    const anomalies = [];
    
    // This would implement anomaly detection logic
    return anomalies;
  }

  async logAnalysis(analysisData) {
    try {
      const query = `
        INSERT INTO ai_analysis_history (
          complaint_id, analysis_type, input_text, ai_model_version,
          confidence_score, analysis_result, processing_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        analysisData.complaint_id,
        analysisData.analysis_type,
        analysisData.input_text,
        this.models[analysisData.analysis_type].version,
        analysisData.confidence_score,
        JSON.stringify(analysisData.analysis_result),
        analysisData.processing_time_ms
      ];
      
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error logging AI analysis:', error);
      throw error;
    }
  }
}

module.exports = new AIAnalysisService();
