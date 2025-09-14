const BudgetFlow = require('../models/BudgetFlow');
const BudgetRequest = require('../models/BudgetRequest');
const Department = require('../models/Department');
const User = require('../models/User');

class BudgetFlowService {
  /**
   * Create or update budget flow when a new budget request is created
   */
  static async initializeBudgetFlow(budgetRequest) {
    try {
      // Check if a budget flow already exists for this fiscal year
      const existingFlow = await BudgetFlow.findOne({ fiscalYear: new Date().getFullYear() });
      
      if (existingFlow) {
        // If exists, return the existing flow
        return existingFlow;
      }
      
      // Create a new budget flow if none exists
      const budgetFlowData = {
        budgetId: `BUDGET-${new Date().getFullYear()}`,
        budgetName: `Annual Budget ${new Date().getFullYear()}`,
        totalAmount: 0, // Will be updated when requests are approved
        fiscalYear: new Date().getFullYear(),
        description: `Budget flow for fiscal year ${new Date().getFullYear()}`,
        createdBy: budgetRequest.requester,
        departmentAllocations: []
      };
      
      const budgetFlow = await BudgetFlow.createBudgetFlow(budgetFlowData);
      return budgetFlow;
    } catch (error) {
      console.error('Error initializing budget flow:', error);
      throw error;
    }
  }
  
  /**
   * Update budget flow when a budget request is approved
   */
  static async updateOnApproval(budgetRequest) {
    try {
      // Get or create budget flow for current fiscal year
      let budgetFlow = await BudgetFlow.findOne({ fiscalYear: new Date().getFullYear() });
      
      if (!budgetFlow) {
        // Create initial budget flow if it doesn't exist
        const budgetFlowData = {
          budgetId: `BUDGET-${new Date().getFullYear()}`,
          budgetName: `Annual Budget ${new Date().getFullYear()}`,
          totalAmount: budgetRequest.amount,
          fiscalYear: new Date().getFullYear(),
          description: `Budget flow for fiscal year ${new Date().getFullYear()}`,
          createdBy: budgetRequest.requester,
          departmentAllocations: []
        };
        
        budgetFlow = await BudgetFlow.createBudgetFlow(budgetFlowData);
      } else {
        // Update total budget amount
        budgetFlow.totalAmount += budgetRequest.amount;
        await budgetFlow.save();
      }
      
      // Get or create department allocation
      let departmentAllocation = budgetFlow.departmentAllocations.find(
        dept => dept.departmentName === budgetRequest.department
      );
      
      if (!departmentAllocation) {
        // Create new department allocation
        const department = await Department.findOne({ name: budgetRequest.department });
        const departmentData = {
          departmentId: department ? department._id : null,
          departmentName: budgetRequest.department,
          allocatedAmount: budgetRequest.amount,
          spentAmount: 0
        };
        
        budgetFlow = await budgetFlow.addDepartmentAllocation(departmentData);
      } else {
        // Update existing department allocation
        const deptIndex = budgetFlow.departmentAllocations.findIndex(
          dept => dept.departmentName === budgetRequest.department
        );
        
        budgetFlow.departmentAllocations[deptIndex].allocatedAmount += budgetRequest.amount;
        await budgetFlow.save();
      }
      
      return budgetFlow;
    } catch (error) {
      console.error('Error updating budget flow on approval:', error);
      throw error;
    }
  }
  
  /**
   * Update budget flow when funds are allocated to a vendor
   */
  static async updateOnAllocation(budgetRequest, vendorId, allocatedAmount) {
    try {
      let budgetFlow = await BudgetFlow.findOne({ fiscalYear: new Date().getFullYear() });
      
      // If no budget flow exists for current fiscal year, create one
      if (!budgetFlow) {
        const budgetFlowData = {
          budgetId: `BUDGET-${new Date().getFullYear()}`,
          budgetName: `Annual Budget ${new Date().getFullYear()}`,
          totalAmount: allocatedAmount,
          fiscalYear: new Date().getFullYear(),
          description: `Budget flow for fiscal year ${new Date().getFullYear()}`,
          createdBy: budgetRequest.requester,
          departmentAllocations: []
        };
        
        budgetFlow = await BudgetFlow.createBudgetFlow(budgetFlowData);
      }
      
      // Find the department allocation
      let deptIndex = budgetFlow.departmentAllocations.findIndex(
        dept => dept.departmentName === budgetRequest.department
      );
      
      // If department allocation doesn't exist, create it
      if (deptIndex === -1) {
        const department = await Department.findOne({ name: budgetRequest.department });
        const departmentData = {
          departmentId: department ? department._id : null,
          departmentName: budgetRequest.department,
          allocatedAmount: allocatedAmount,
          spentAmount: 0
        };
        
        budgetFlow = await budgetFlow.addDepartmentAllocation(departmentData);
        // Refresh deptIndex after adding
        deptIndex = budgetFlow.departmentAllocations.length - 1;
      } else {
        // Update existing department allocation
        budgetFlow.departmentAllocations[deptIndex].allocatedAmount += allocatedAmount;
      }
      
      // Get or create project allocation
      let projectAllocation = budgetFlow.departmentAllocations[deptIndex].projectAllocations.find(
        proj => proj.projectName === budgetRequest.project
      );
      
      if (!projectAllocation) {
        // Create new project allocation
        const projectData = {
          projectId: budgetRequest._id,
          projectName: budgetRequest.project,
          allocatedAmount: allocatedAmount,
          spentAmount: 0
        };
        
        budgetFlow.departmentAllocations[deptIndex].projectAllocations.push(projectData);
      } else {
        // Update existing project allocation
        const projIndex = budgetFlow.departmentAllocations[deptIndex].projectAllocations.findIndex(
          proj => proj.projectName === budgetRequest.project
        );
        
        budgetFlow.departmentAllocations[deptIndex].projectAllocations[projIndex].allocatedAmount += allocatedAmount;
      }
      
      // Get vendor details
      const vendor = await User.findById(vendorId);
      
      // Create vendor allocation
      const vendorData = {
        vendorId: vendorId,
        vendorName: vendor.companyName || vendor.fullName,
        allocatedAmount: allocatedAmount,
        spentAmount: 0,
        walletAddress: vendor.walletAddress,
        status: 'allocated'
      };
      
      // Add vendor allocation to the project
      const projIndex = budgetFlow.departmentAllocations[deptIndex].projectAllocations.findIndex(
        proj => proj.projectName === budgetRequest.project
      );
      
      budgetFlow.departmentAllocations[deptIndex].projectAllocations[projIndex].vendorAllocations.push(vendorData);
      
      await budgetFlow.save();
      return budgetFlow;
    } catch (error) {
      console.error('Error updating budget flow on allocation:', error);
      throw error;
    }
  }
  
  /**
   * Update spent amounts when a transaction occurs
   */
  static async updateOnTransaction(budgetRequestId, amount) {
    try {
      const budgetFlow = await BudgetFlow.findOne({ fiscalYear: new Date().getFullYear() });
      
      // If no budget flow exists, we can't update transaction data
      // This is not an error condition, just means no budget flow tracking
      if (!budgetFlow) {
        console.log('No budget flow found for current fiscal year, skipping transaction update');
        return null;
      }
      
      // Find the budget request to get department and project info
      const budgetRequest = await BudgetRequest.findById(budgetRequestId);
      
      if (!budgetRequest) {
        throw new Error('Budget request not found');
      }
      
      // Find department allocation
      const deptIndex = budgetFlow.departmentAllocations.findIndex(
        dept => dept.departmentName === budgetRequest.department
      );
      
      if (deptIndex === -1) {
        throw new Error('Department allocation not found');
      }
      
      // Update department spent amount
      budgetFlow.departmentAllocations[deptIndex].spentAmount += amount;
      
      // Find project allocation
      const projIndex = budgetFlow.departmentAllocations[deptIndex].projectAllocations.findIndex(
        proj => proj.projectName === budgetRequest.project
      );
      
      if (projIndex === -1) {
        throw new Error('Project allocation not found');
      }
      
      // Update project spent amount
      budgetFlow.departmentAllocations[deptIndex].projectAllocations[projIndex].spentAmount += amount;
      
      // Find vendor allocation (assuming the first vendor for simplicity)
      if (budgetFlow.departmentAllocations[deptIndex].projectAllocations[projIndex].vendorAllocations.length > 0) {
        const vendorIndex = 0; // In a real implementation, you'd find the specific vendor
        budgetFlow.departmentAllocations[deptIndex].projectAllocations[projIndex].vendorAllocations[vendorIndex].spentAmount += amount;
        budgetFlow.departmentAllocations[deptIndex].projectAllocations[projIndex].vendorAllocations[vendorIndex].status = 'in-progress';
      }
      
      await budgetFlow.save();
      return budgetFlow;
    } catch (error) {
      console.error('Error updating budget flow on transaction:', error);
      throw error;
    }
  }
  
  /**
   * Get complete budget flow for visualization
   */
  static async getBudgetFlowForVisualization(budgetFlowId) {
    try {
      const budgetFlow = await BudgetFlow.findById(budgetFlowId)
        .populate('createdBy', 'fullName email')
        .populate('departmentAllocations.departmentId')
        .populate('departmentAllocations.projectAllocations.projectId')
        .populate('departmentAllocations.projectAllocations.vendorAllocations.vendorId');
      
      if (!budgetFlow) {
        throw new Error('Budget flow not found');
      }
      
      // Calculate additional metrics for visualization
      const budgetData = {
        id: budgetFlow._id,
        name: budgetFlow.budgetName,
        totalAmount: budgetFlow.totalAmount,
        spentAmount: budgetFlow.totalSpent,
        remainingAmount: budgetFlow.remainingAmount,
        utilization: budgetFlow.utilization
      };
      
      const departments = budgetFlow.departmentAllocations.map(dept => ({
        id: dept._id,
        name: dept.departmentName,
        allocatedAmount: dept.allocatedAmount,
        spentAmount: dept.spentAmount,
        remainingAmount: dept.allocatedAmount - dept.spentAmount,
        utilization: dept.allocatedAmount > 0 ? (dept.spentAmount / dept.allocatedAmount) * 100 : 0,
        projects: dept.projectAllocations.map(proj => ({
          id: proj._id,
          name: proj.projectName,
          allocatedAmount: proj.allocatedAmount,
          spentAmount: proj.spentAmount,
          remainingAmount: proj.allocatedAmount - proj.spentAmount,
          utilization: proj.allocatedAmount > 0 ? (proj.spentAmount / proj.allocatedAmount) * 100 : 0,
          vendors: proj.vendorAllocations.map(vendor => ({
            id: vendor._id,
            name: vendor.vendorName,
            allocatedAmount: vendor.allocatedAmount,
            spentAmount: vendor.spentAmount,
            remainingAmount: vendor.allocatedAmount - vendor.spentAmount,
            utilization: vendor.allocatedAmount > 0 ? (vendor.spentAmount / vendor.allocatedAmount) * 100 : 0,
            walletAddress: vendor.walletAddress,
            transactionHash: vendor.transactionHash,
            status: vendor.status
          }))
        }))
      }));
      
      return {
        budget: budgetData,
        departments: departments
      };
    } catch (error) {
      console.error('Error getting budget flow for visualization:', error);
      throw error;
    }
  }
}

module.exports = BudgetFlowService;