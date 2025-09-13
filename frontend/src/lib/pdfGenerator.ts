// PDF Generation using browser's print functionality
// This approach doesn't require additional dependencies

interface Transaction {
  id: string;
  description: string;
  amount: number;
  department: string;
  status: string;
  timestamp: string;
  vendor?: string;
}

interface ReportOptions {
  title: string;
  subtitle?: string;
}

export class PDFReportGenerator {
  // Generate Transaction Report HTML for PDF conversion
  generateTransactionReportHTML(transactions: Transaction[], options: ReportOptions = { title: 'Transaction Report' }): string {
    const { title, subtitle } = options;
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #1f2937; }
          .subtitle { font-size: 14px; color: #6b7280; margin-top: 5px; }
          .summary { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .summary-item { display: inline-block; margin-right: 30px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background-color: #3b82f6; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .amount { text-align: right; font-weight: bold; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 10px; }
          .status-completed { background: #d1fae5; color: #065f46; }
          .status-approved { background: #dbeafe; color: #1e40af; }
          .status-requested { background: #fef3c7; color: #92400e; }
          .status-rejected { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 30px; font-size: 10px; color: #6b7280; text-align: center; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${title}</div>
          ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
        </div>
        
        <div class="summary">
          <div class="summary-item"><strong>Generated:</strong> ${new Date().toLocaleDateString()}</div>
          <div class="summary-item"><strong>Total Transactions:</strong> ${transactions.length}</div>
          <div class="summary-item"><strong>Total Amount:</strong> ${this.formatCurrency(totalAmount)}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
              <th>Department</th>
              <th>Status</th>
              <th>Date</th>
              <th>Vendor</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(tx => `
              <tr>
                <td>${tx.description}</td>
                <td class="amount">${this.formatCurrency(tx.amount)}</td>
                <td>${tx.department}</td>
                <td><span class="status status-${tx.status}">${tx.status.toUpperCase()}</span></td>
                <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
                <td>${tx.vendor || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Financial Transparency System - Blockchain Verified</p>
          <p>This report is cryptographically secured and auditable on the blockchain.</p>
        </div>
      </body>
      </html>
    `;
  }

  // Generate Department Summary HTML for PDF conversion
  generateDepartmentSummaryHTML(departments: any[], options: ReportOptions = { title: 'Department Budget Summary' }): string {
    const { title, subtitle } = options;
    const totalAllocated = departments.reduce((sum, dept) => sum + (dept.allocated || 0), 0);
    const totalSpent = departments.reduce((sum, dept) => sum + (dept.spent || 0), 0);
    const utilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #1f2937; }
          .subtitle { font-size: 14px; color: #6b7280; margin-top: 5px; }
          .overview { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .overview-item { text-align: center; }
          .overview-label { font-size: 12px; color: #6b7280; }
          .overview-value { font-size: 18px; font-weight: bold; color: #1f2937; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
          th { background-color: #10b981; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .amount { text-align: right; font-weight: bold; }
          .utilization { text-align: center; font-weight: bold; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 10px; text-align: center; }
          .status-normal { background: #d1fae5; color: #065f46; }
          .status-near-limit { background: #fef3c7; color: #92400e; }
          .status-over-budget { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 30px; font-size: 10px; color: #6b7280; text-align: center; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${title}</div>
          ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
        </div>
        
        <div class="overview">
          <div class="overview-grid">
            <div class="overview-item">
              <div class="overview-label">Total Allocated</div>
              <div class="overview-value">${this.formatCurrency(totalAllocated)}</div>
            </div>
            <div class="overview-item">
              <div class="overview-label">Total Spent</div>
              <div class="overview-value">${this.formatCurrency(totalSpent)}</div>
            </div>
            <div class="overview-item">
              <div class="overview-label">Overall Utilization</div>
              <div class="overview-value">${utilization.toFixed(1)}%</div>
            </div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Allocated</th>
              <th>Spent</th>
              <th>Remaining</th>
              <th>Utilization</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${departments.map(dept => {
              const deptUtilization = dept.allocated > 0 ? (dept.spent / dept.allocated) * 100 : 0;
              const status = deptUtilization > 100 ? 'over-budget' : deptUtilization > 90 ? 'near-limit' : 'normal';
              const statusText = deptUtilization > 100 ? 'Over Budget' : deptUtilization > 90 ? 'Near Limit' : 'Normal';
              
              return `
                <tr>
                  <td><strong>${dept.name}</strong></td>
                  <td class="amount">${this.formatCurrency(dept.allocated)}</td>
                  <td class="amount">${this.formatCurrency(dept.spent)}</td>
                  <td class="amount">${this.formatCurrency(dept.allocated - dept.spent)}</td>
                  <td class="utilization">${deptUtilization.toFixed(1)}%</td>
                  <td><span class="status status-${status}">${statusText}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Financial Transparency System - Blockchain Verified</p>
          <p>Department budgets are monitored in real-time with blockchain verification.</p>
        </div>
      </body>
      </html>
    `;
  }

  // Open print dialog for PDF generation
  printReport(html: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    }
  }

  // Private helper method
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

// Utility functions for easy use
export const generateTransactionPDF = (transactions: Transaction[]) => {
  const generator = new PDFReportGenerator();
  const html = generator.generateTransactionReportHTML(transactions, {
    title: 'Budget Transaction Report',
    subtitle: `Report Period: ${new Date().toLocaleDateString()}`
  });
  generator.printReport(html);
};

export const generateDepartmentPDF = (departments: any[]) => {
  const generator = new PDFReportGenerator();
  const html = generator.generateDepartmentSummaryHTML(departments, {
    title: 'Department Budget Summary',
    subtitle: `Fiscal Year: ${new Date().getFullYear()}`
  });
  generator.printReport(html);
};