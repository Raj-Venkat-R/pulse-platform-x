const { Pool } = require('pg');

class AICategorizationService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async categorizeComplaint(complaintId, description) {
    try {
      // Mock AI categorization - replace with actual AI service integration
      const categorization = await this.mockAICategorization(description);
      
      // Update complaint with AI suggestions
      await this.updateComplaintWithAICategorization(complaintId, categorization);
      
      return categorization;
    } catch (error) {
      console.error('AI categorization failed:', error);
      throw error;
    }
  }

  async mockAICategorization(description) {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const description_lower = description.toLowerCase();
    
    // Mock categorization logic based on keywords
    let category = 'other';
    let subcategory = null;
    let urgency = 'medium';
    let confidence = 0.7;
    let suggested_tags = [];

    // Category detection based on keywords
    if (description_lower.includes('bill') || description_lower.includes('charge') || 
        description_lower.includes('payment') || description_lower.includes('cost')) {
      category = 'billing';
      subcategory = 'payment_issue';
      urgency = 'medium';
      confidence = 0.85;
      suggested_tags = ['billing', 'payment'];
    } else if (description_lower.includes('doctor') || description_lower.includes('nurse') || 
               description_lower.includes('treatment') || description_lower.includes('medical')) {
      category = 'medical_care';
      subcategory = 'treatment_quality';
      urgency = 'high';
      confidence = 0.9;
      suggested_tags = ['medical', 'treatment'];
    } else if (description_lower.includes('rude') || description_lower.includes('unprofessional') || 
               description_lower.includes('staff') || description_lower.includes('behavior')) {
      category = 'staff_behavior';
      subcategory = 'unprofessional_conduct';
      urgency = 'medium';
      confidence = 0.8;
      suggested_tags = ['staff', 'behavior'];
    } else if (description_lower.includes('appointment') || description_lower.includes('schedule') || 
               description_lower.includes('booking') || description_lower.includes('cancel')) {
      category = 'appointment';
      subcategory = 'scheduling_issue';
      urgency = 'low';
      confidence = 0.75;
      suggested_tags = ['appointment', 'scheduling'];
    } else if (description_lower.includes('clean') || description_lower.includes('facility') || 
               description_lower.includes('room') || description_lower.includes('environment')) {
      category = 'facilities';
      subcategory = 'cleanliness';
      urgency = 'low';
      confidence = 0.7;
      suggested_tags = ['facilities', 'cleanliness'];
    }

    // Urgency adjustment based on keywords
    if (description_lower.includes('urgent') || description_lower.includes('emergency') || 
        description_lower.includes('critical') || description_lower.includes('immediately')) {
      urgency = 'critical';
      confidence = Math.min(confidence + 0.1, 1.0);
    } else if (description_lower.includes('serious') || description_lower.includes('important') || 
               description_lower.includes('concerned')) {
      urgency = 'high';
      confidence = Math.min(confidence + 0.05, 1.0);
    }

    // Sentiment analysis (mock)
    let sentiment = 'neutral';
    if (description_lower.includes('angry') || description_lower.includes('frustrated') || 
        description_lower.includes('disappointed') || description_lower.includes('terrible')) {
      sentiment = 'negative';
      urgency = urgency === 'low' ? 'medium' : urgency;
    } else if (description_lower.includes('happy') || description_lower.includes('satisfied') || 
               description_lower.includes('pleased') || description_lower.includes('excellent')) {
      sentiment = 'positive';
    }

    // Extract entities (mock)
    const entities = this.extractEntities(description);

    return {
      category,
      subcategory,
      urgency,
      confidence,
      sentiment,
      suggested_tags,
      entities,
      ai_processed_at: new Date().toISOString(),
      processing_time_ms: 1000
    };
  }

  extractEntities(description) {
    const entities = {
      people: [],
      locations: [],
      dates: [],
      amounts: []
    };

    // Mock entity extraction
    const words = description.split(/\s+/);
    
    // Extract potential names (capitalized words)
    words.forEach(word => {
      if (word.length > 2 && word[0] === word[0].toUpperCase() && /^[A-Za-z]+$/.test(word)) {
        entities.people.push(word);
      }
    });

    // Extract potential amounts
    const amountRegex = /\$[\d,]+\.?\d*/g;
    const amounts = description.match(amountRegex);
    if (amounts) {
      entities.amounts = amounts;
    }

    // Extract potential dates
    const dateRegex = /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g;
    const dates = description.match(dateRegex);
    if (dates) {
      entities.dates = dates;
    }

    return entities;
  }

  async updateComplaintWithAICategorization(complaintId, categorization) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update complaint with AI suggestions (only if not already set)
      const updateQuery = `
        UPDATE complaints 
        SET 
          category = CASE WHEN category = 'other' OR category IS NULL THEN $1 ELSE category END,
          subcategory = CASE WHEN subcategory IS NULL THEN $2 ELSE subcategory END,
          urgency = CASE WHEN urgency = 'medium' THEN $3 ELSE urgency END,
          tags = CASE WHEN array_length(tags, 1) IS NULL THEN $4 ELSE tags END,
          internal_notes = CASE 
            WHEN internal_notes IS NULL THEN $5 
            ELSE internal_notes || '\n\nAI Analysis: ' || $5 
          END,
          updated_at = NOW()
        WHERE id = $6
      `;

      const aiNotes = `AI Confidence: ${(categorization.confidence * 100).toFixed(1)}%
Sentiment: ${categorization.sentiment}
Suggested Category: ${categorization.category}
Suggested Subcategory: ${categorization.subcategory}
Suggested Urgency: ${categorization.urgency}
Suggested Tags: ${categorization.suggested_tags.join(', ')}`;

      await client.query(updateQuery, [
        categorization.category,
        categorization.subcategory,
        categorization.urgency,
        categorization.suggested_tags,
        aiNotes,
        complaintId
      ]);

      // Store AI analysis results in a separate table for analytics
      const aiAnalysisQuery = `
        INSERT INTO ai_complaint_analysis (
          complaint_id, category, subcategory, urgency, confidence,
          sentiment, suggested_tags, entities, processing_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (complaint_id) DO UPDATE SET
          category = EXCLUDED.category,
          subcategory = EXCLUDED.subcategory,
          urgency = EXCLUDED.urgency,
          confidence = EXCLUDED.confidence,
          sentiment = EXCLUDED.sentiment,
          suggested_tags = EXCLUDED.suggested_tags,
          entities = EXCLUDED.entities,
          processing_time_ms = EXCLUDED.processing_time_ms,
          updated_at = NOW()
      `;

      await client.query(aiAnalysisQuery, [
        complaintId,
        categorization.category,
        categorization.subcategory,
        categorization.urgency,
        categorization.confidence,
        categorization.sentiment,
        categorization.suggested_tags,
        JSON.stringify(categorization.entities),
        categorization.processing_time_ms
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAIAnalysis(complaintId) {
    const query = `
      SELECT * FROM ai_complaint_analysis 
      WHERE complaint_id = $1
    `;

    const result = await this.pool.query(query, [complaintId]);
    return result.rows[0];
  }

  async getAIPerformanceStats(dateRange = {}) {
    const { start_date, end_date } = dateRange;
    
    let whereClause = '';
    const values = [];
    
    if (start_date && end_date) {
      whereClause = 'WHERE created_at BETWEEN $1 AND $2';
      values.push(start_date, end_date);
    }

    const query = `
      SELECT 
        COUNT(*) as total_analyzed,
        AVG(confidence) as avg_confidence,
        COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_sentiment,
        COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_sentiment,
        COUNT(*) FILTER (WHERE sentiment = 'neutral') as neutral_sentiment,
        AVG(processing_time_ms) as avg_processing_time,
        COUNT(DISTINCT category) as categories_detected
      FROM ai_complaint_analysis
      ${whereClause}
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // Method to integrate with real AI service (OpenAI, Azure AI, etc.)
  async integrateWithRealAIService(description) {
    // Example integration with OpenAI
    /*
    const openai = require('openai');
    const client = new openai.OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that categorizes healthcare complaints. Analyze the complaint and return a JSON response with category, subcategory, urgency (low/medium/high/critical), confidence (0-1), sentiment (positive/negative/neutral), and suggested_tags array."
        },
        {
          role: "user",
          content: `Categorize this healthcare complaint: ${description}`
        }
      ],
      temperature: 0.1,
    });

    return JSON.parse(response.choices[0].message.content);
    */

    // For now, return mock data
    return this.mockAICategorization(description);
  }

  // Method to train/improve AI model based on human corrections
  async recordHumanCorrection(complaintId, humanCategory, humanUrgency, humanTags) {
    const query = `
      INSERT INTO ai_training_data (
        complaint_id, ai_category, ai_urgency, ai_tags,
        human_category, human_urgency, human_tags,
        correction_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;

    const aiAnalysis = await this.getAIAnalysis(complaintId);
    if (!aiAnalysis) {
      throw new Error('No AI analysis found for this complaint');
    }

    const correctionType = 
      (aiAnalysis.category !== humanCategory) ? 'category' :
      (aiAnalysis.urgency !== humanUrgency) ? 'urgency' :
      'tags';

    await this.pool.query(query, [
      complaintId,
      aiAnalysis.category,
      aiAnalysis.urgency,
      aiAnalysis.suggested_tags,
      humanCategory,
      humanUrgency,
      humanTags,
      correctionType
    ]);
  }
}

module.exports = new AICategorizationService();
