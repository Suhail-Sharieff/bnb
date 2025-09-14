const fetch = require('node-fetch');

async function testRequestsPage() {
  try {
    console.log('Testing requests page functionality...');
    
    // Test the backend API directly
    const response = await fetch('http://localhost:8000/api/admin/budget-requests');
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log(`Found ${data.data.length} budget requests`);
      
      if (data.data.length > 0) {
        const firstRequest = data.data[0];
        console.log('First request keys:', Object.keys(firstRequest));
        console.log('First request project field:', firstRequest.project);
        console.log('First request title field:', firstRequest.title);
      }
    } else {
      console.log('API call failed:', data.error || data.message);
    }
  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
}

// Run the test
testRequestsPage();