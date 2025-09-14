const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const MockMLService = require('./mockMLService');

// ML API Configuration
const ML_API_BASE_URL = process.env.ML_API_URL || 'https://yashaswini23cse-mlapi.replit.app'; // Default Replit URL
// Force mock service for now since Replit API is not accessible
const USE_MOCK_SERVICE = true; //process.env.USE_MOCK_ML_SERVICE === 'true'; // Enable mock service with env var

console.log('ML Service Configuration:');
console.log('- ML_API_BASE_URL:', ML_API_BASE_URL);
console.log('- USE_MOCK_ML_SERVICE:', USE_MOCK_SERVICE);

class MLAnalysisService {
  /**
   * Upload a file to the ML API for analysis
   * @param {Object} file - The file object from multer
   * @returns {Promise<Object>} - The response from the ML API
   */
  static async uploadFile(file) {
    // Use mock service if enabled
    if (USE_MOCK_SERVICE) {
      console.log('Using mock ML service for file upload');
      return await MockMLService.uploadFile(file);
    }
    
    try {
      console.log('Uploading file to ML API:', file.path);
      const formData = new FormData();
      formData.append('file', fs.createReadStream(file.path));

      const response = await axios.post(`${ML_API_BASE_URL}/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000 // 30 second timeout
      });

      console.log('ML API upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error uploading file to ML API:', error.message);
      if (error.response) {
        console.error('ML API Error Response:', error.response.data);
        throw new Error(`ML API Error: ${error.response.data.error || error.response.statusText}`);
      } else if (error.request) {
        console.error('ML API No Response:', error.request);
        throw new Error('ML API is not responding. Please check if the service is running.');
      } else {
        throw new Error(`Failed to upload file: ${error.message}`);
      }
    }
  }

  /**
   * Ask questions about the uploaded data
   * @param {string} question - The question to ask about the data
   * @param {string} sessionId - Optional session ID for context
   * @returns {Promise<Object>} - The response from the ML API
   */
  static async askQuestion(question, sessionId = null) {
    // Use mock service if enabled
    if (USE_MOCK_SERVICE) {
      console.log('Using mock ML service for question');
      return await MockMLService.askQuestion(question, sessionId);
    }
    
    try {
      console.log('Asking question to ML API:', question);
      const payload = { question };
      if (sessionId) {
        payload.session_id = sessionId;
      }

      const response = await axios.post(`${ML_API_BASE_URL}/chat`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 second timeout
      });

      console.log('ML API chat response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error asking question to ML API:', error.message);
      if (error.response) {
        console.error('ML API Error Response:', error.response.data);
        throw new Error(`ML API Error: ${error.response.data.error || error.response.statusText}`);
      } else if (error.request) {
        console.error('ML API No Response:', error.request);
        throw new Error('ML API is not responding. Please check if the service is running.');
      } else {
        throw new Error(`Failed to get response: ${error.message}`);
      }
    }
  }

  /**
   * Get the health status of the ML API
   * @returns {Promise<boolean>} - Whether the API is healthy
   */
  static async isHealthy() {
    // Use mock service if enabled
    if (USE_MOCK_SERVICE) {
      console.log('Using mock ML service for health check');
      return await MockMLService.isHealthy();
    }
    
    try {
      console.log('Checking ML API health at:', `${ML_API_BASE_URL}/health`);
      const response = await axios.get(`${ML_API_BASE_URL}/health`, {
        timeout: 10000 // 10 second timeout
      });
      console.log('ML API health response:', response.data);
      return response.status === 200 && response.data.healthy === true;
    } catch (error) {
      console.error('ML API health check failed:', error.message);
      if (error.response) {
        console.error('ML API Health Error Response:', error.response.data);
      } else if (error.request) {
        console.error('ML API Health No Response:', error.request);
      }
      return false;
    }
  }
}

module.exports = MLAnalysisService;