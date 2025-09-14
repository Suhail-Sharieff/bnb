const { apiClient } = require('./src/lib/api');

async function testRequestsPage() {
  try {
    // Test the getBudgetRequests API call
    console.log('Testing getBudgetRequests API call...');
    
    // Mock token for testing (in a real scenario, you'd use a real token)
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('userInfo', JSON.stringify({ role: 'admin' }));
    
    const response = await apiClient.getBudgetRequests();
    console.log('API Response:', response);
    
    if (response.success && response.data) {
      console.log(`Found ${response.data.length} budget requests`);
      
      // Check the structure of the first request
      if (response.data.length > 0) {
        const firstRequest = response.data[0];
        console.log('First request structure:', firstRequest);
        
        // Verify that it has the expected fields
        const requiredFields = ['_id', 'project', 'description', 'amount', 'department', 'category', 'priority', 'state'];
        const missingFields = requiredFields.filter(field => !(field in firstRequest));
        
        if (missingFields.length > 0) {
          console.log(`Missing fields: ${missingFields.join(', ')}`);
        } else {
          console.log('All required fields present');
        }
        
        // Test the transformation that happens in RequestsManagement.tsx
        const transformedRequest = {
          ...firstRequest,
          title: firstRequest.project // This is what the component does
        };
        
        console.log('Transformed request (with title field):', transformedRequest);
      }
    } else {
      console.log('API call failed:', response.error);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testRequestsPage();