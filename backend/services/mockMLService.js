const fs = require('fs');
const path = require('path');

class MockMLService {
  /**
   * Mock upload file - simulates processing a file
   * @param {Object} file - The file object from multer
   * @returns {Promise<Object>} - Mock response
   */
  static async uploadFile(file) {
    // Simulate file processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Read and parse CSV if it's a CSV file
    let dataSummary = {};
    if (file.mimetype === 'text/csv') {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',');
        
        dataSummary = {
          rowCount: lines.length - 1,
          columnCount: headers.length,
          columns: headers,
          sampleData: lines.slice(1, Math.min(3, lines.length)).join('\n')
        };
      } catch (error) {
        console.error('Error parsing CSV:', error);
      }
    }
    
    return {
      success: true,
      message: 'File uploaded and processed successfully',
      session_id: 'mock-session-' + Date.now(),
      data_summary: dataSummary,
      processing_time: Math.random() * 2 + 1 // 1-3 seconds
    };
  }

  /**
   * Mock ask question - simulates answering questions about data
   * @param {string} question - The question to ask about the data
   * @param {string} sessionId - Optional session ID for context
   * @returns {Promise<Object>} - Mock response
   */
  static async askQuestion(question, sessionId = null) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simple rule-based responses for common questions
    let response = '';
    
    if (question.toLowerCase().includes('total') && question.toLowerCase().includes('budget')) {
      response = 'Based on the sample data, the total budget across all departments is approximately $250,000. The Engineering department has the highest allocation with $80,000.';
    } else if (question.toLowerCase().includes('highest') || question.toLowerCase().includes('largest')) {
      response = 'The Engineering department has the highest budget allocation with $80,000, followed by Operations with $80,000.';
    } else if (question.toLowerCase().includes('department')) {
      response = 'The data includes 5 departments: Engineering, Marketing, HR, Finance, and Operations.';
    } else if (question.toLowerCase().includes('category')) {
      response = 'The main categories in the budget are Software, Digital Ads, Recruitment, Compliance, Equipment, Hardware, Events, Training, and Supplies.';
    } else {
      // Default response for other questions
      response = 'I\'ve analyzed the budget data and found several interesting patterns. The data spans multiple departments with varying budget allocations. Would you like me to focus on any specific aspect of the budget?';
    }
    
    return {
      success: true,
      response: response,
      session_id: sessionId || 'mock-session-' + Date.now(),
      confidence: 0.85
    };
  }

  /**
   * Mock health check - always returns healthy for mock service
   * @returns {Promise<boolean>} - Always true for mock service
   */
  static async isHealthy() {
    return true;
  }
}

module.exports = MockMLService;