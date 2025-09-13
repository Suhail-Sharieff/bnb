import React, { useState, useMemo, useCallback } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, Sector 
} from 'recharts';
import { useBudgetTransactions, useDepartments } from '../hooks/useApi';
import { cn } from '../lib/utils';

// --- Helper Functions ---
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

// --- Custom Components for Charts ---

// Custom Tooltip with Glassmorphism effect
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const name = payload[0].name;

    return (
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-600 rounded-lg p-3 shadow-lg animate-fadeIn">
        <p className="text-sm font-semibold text-gray-200">{label || name}</p>
        <p className="text-lg font-bold text-indigo-400">
          {formatCurrency(value)}
        </p>
      </div>
    );
  }
  return null;
};

// Type definition for the props Recharts passes to the active shape
interface ActiveShapeProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: { name: string };
  percent: number;
  value: number;
}

// Custom Active Shape for the Pie Chart with interactive labels
const renderActiveShape = (props: ActiveShapeProps) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-bold text-lg transition-opacity duration-300">
        {payload.name}
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#fff" className="font-semibold">{formatCurrency(value)}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

// --- Main Analytics Component ---

const Analytics: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    
    // Fetch live data from API
    const { data: transactionsData, loading: transactionsLoading, error: transactionsError } = useBudgetTransactions();
    const { data: departmentsData, loading: departmentsLoading } = useDepartments();
    
    // Use ONLY live data - no fallback to mock data
    const transactions = (transactionsData as any)?.transactions || [];
    const isLoading = transactionsLoading || departmentsLoading;
    
    // Show loading state
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
                <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700 flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700 flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }
    
    // Show error state or empty state when no real data
    if (transactionsError || transactions.length === 0) {
        return (
            <div className="bg-amber-900/20 border border-amber-500 rounded-xl p-6">
                <h3 className="text-amber-400 font-semibold mb-2">No Analytics Data Available</h3>
                <p className="text-amber-300 text-sm">
                    {transactionsError ? `Error: ${transactionsError}` : 'No transaction data found in the database.'}
                </p>
                <p className="text-gray-400 text-sm mt-2">Please add some budget transactions to view analytics.</p>
            </div>
        );
    }

    const onPieEnter = useCallback((_: any, index: number) => {
        setActiveIndex(index);
    }, []);
    
    // Memoize data processing to prevent recalculations on re-render
    const { monthlyData, categoryData } = useMemo(() => {
        // Use the transactions array we defined above
        const monthlySpending = transactions.reduce((acc: Record<string, number>, tx: any) => {
            const month = new Date(tx.timestamp || tx.createdAt).toLocaleString('default', { month: 'short' });
            acc[month] = (acc[month] || 0) + (tx.amount || 0);
            return acc;
        }, {});

        const spendingByCategory = transactions.reduce((acc: Record<string, number>, tx: any) => {
            const category = tx.category || 'Other';
            acc[category] = (acc[category] || 0) + (tx.amount || 0);
            return acc;
        }, {});

        const monthlyData = Object.keys(monthlySpending).map(month => ({
            name: month,
            spending: monthlySpending[month]
        }));
        
        const categoryData = Object.keys(spendingByCategory).map(category => ({
            name: category,
            value: spendingByCategory[category]
        }));

        return { monthlyData, categoryData };
    }, [transactions]);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
            {/* Monthly Spending Bar Chart */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-50 mb-4">Monthly Spending</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value as number)}`}/>
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(136, 132, 216, 0.1)' }} />
                        <Bar dataKey="spending" fill="url(#colorSpending)" radius={[4, 4, 0, 0]}>
                             {monthlyData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                        <defs>
                            <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
                            </linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            {/* Spending by Category Pie Chart */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-50 mb-4">Spending by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                            // The `any` cast here is the key to fixing the TypeScript error.
                            // It tells TypeScript to trust us that these props are correct for Recharts.
                            {...{
                                activeIndex: activeIndex,
                                activeShape: renderActiveShape,
                                onMouseEnter: onPieEnter,
                            } as any}
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            dataKey="value"
                            stroke="none"
                        >
                            {categoryData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Legend iconType="circle" formatter={(value) => <span className="text-gray-300">{value}</span>}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Analytics;