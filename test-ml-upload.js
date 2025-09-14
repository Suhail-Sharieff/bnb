const fs = require('fs');
const axios = require('axios');

async function register() {
  try {
    const response = await axios.post('http://localhost:8000/api/auth/register', {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'test123',
      role: 'admin'
    });
    
    console.log('Registration Response:', JSON.stringify(response.data, null, 2));
    
    // Return the token from the response
    return response.data.token;
  } catch (error) {
    console.error('Registration Error:', error.response?.data || error.message);
    return null;
  }
}

async function login() {
  try {
    const response = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'test@example.com',
      password: 'test123'
    });
    
    console.log('Login Response:', JSON.stringify(response.data, null, 2));
    
    // Return the token from the response
    return response.data.token;
  } catch (error) {
    console.error('Login Error:', error.response?.data || error.message);
    return null;
  }
}

async function testMLUpload() {
  try {
    // First, try to register
    console.log('Registering user...');
    let token = await register();
    
    if (!token) {
      // If registration fails, try login
      console.log('Registration failed, trying to login...');
      token = await login();
    }
    
    if (!token) {
      console.log('Failed to authenticate');
      return;
    }
    
    console.log('Authentication successful, token received');
    
    // Read the test CSV file
    const filePath = 'c:\\Users\\vyash\\OneDrive\\Desktop\\Blockchain\\test-data.csv';
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    // Make the request with authentication
    const response = await axios.post('http://localhost:8000/api/ml/upload', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        // Let axios set the Content-Type for multipart/form-data
      }
    });
    
    console.log('Upload Response:', response.data);
  } catch (error) {
    console.error('Upload Error:', error.response?.data || error.message);
  }
}

testMLUpload();