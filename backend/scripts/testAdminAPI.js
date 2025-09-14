const axios = require('axios');
require('dotenv').config();

// Test accessing admin dashboard with a JWT token
async function testAdminAPI() {
  try {
    console.log('Testing admin API access...');
    
    // You would need to get a valid token first by logging in
    // For testing purposes, you can get a token by logging in via the API
    // or use a token from a previous login
    
    // Example of how to login and get a token:
    /*
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'admin@company.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    */
    
    // For now, you'll need to provide a valid token
    const token = process.env.TEST_ADMIN_TOKEN; // Set this in your .env file
    
    if (!token) {
      console.log('Please set TEST_ADMIN_TOKEN in your .env file');
      console.log('Or run the login endpoint to get a token first');
      console.log('\nExample curl command to login:');
      console.log('curl -X POST http://localhost:8000/api/auth/login \\');
      console.log('  -H "Content-Type: application/json" \\');
      console.log('  -d \'{"email":"admin@company.com","password":"admin123"}\'');
      console.log('\nThis will return a token that you can use for subsequent requests.');
      return;
    }
    
    // Use the token to access the admin dashboard
    const response = await axios.get('http://localhost:8000/api/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Admin dashboard data retrieved successfully:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

// Test accessing vendor data with a vendor token
async function testVendorAPI() {
  try {
    console.log('Testing vendor API access...');
    
    // You would need to get a valid token first by logging in as a vendor
    const token = process.env.TEST_VENDOR_TOKEN; // Set this in your .env file
    
    if (!token) {
      console.log('Please set TEST_VENDOR_TOKEN in your .env file');
      console.log('Or run the login endpoint to get a token first');
      console.log('\nExample curl command to login as vendor:');
      console.log('curl -X POST http://localhost:8000/api/auth/login \\');
      console.log('  -H "Content-Type: application/json" \\');
      console.log('  -d \'{"email":"john.smith@company.com","password":"user123"}\'');
      return;
    }
    
    // Use the token to access the vendor dashboard
    const response = await axios.get('http://localhost:8000/api/vendor/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Vendor dashboard data retrieved successfully:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

// Main function
async function main() {
  console.log('🚀 Testing API access with JWT tokens\n');
  
  // Test admin API
  await testAdminAPI();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test vendor API
  await testVendorAPI();
}

if (require.main === module) {
  main();
}

module.exports = { testAdminAPI, testVendorAPI };