import React, { Suspense, useState, FC,} from "react";
import { Eye, EyeOff, Lock, Mail, Shield, GitBranch, Users, ShieldCheck } from 'lucide-react';
import { apiClient } from "../lib/api";// Import your actual API client
import Dashboard from "./Dashboard";

// --- LAZY-LOADED SPLINE COMPONENT ---
const Spline = React.lazy(() => import('@splinetool/react-spline'));

// --- TYPE DEFINITIONS ---
interface LoginFormData {
  email: string;
  password: string;
}

interface LoginErrors {
  email?: string;
  password?: string;
  general?: string;
}

interface LoginProps {
  onLoginSuccess: (token: string) => void;
  onSwitchToSignup?: () => void;
}

interface SignupProps {
    onSignupSuccess: (token: string) => void;
    onSwitchToLogin?: () => void;
}


interface HomePageProps {
  navigateToApp: () => void;
}

// --- CORE COMPONENTS ---

// Spline visual from your prompt
const SplineDark: FC = () => (
    <div
        style={{
            width: "650px",
            height: "550px",
            position: "relative",
            zIndex: 10,
            opacity: 1,
            filter: "contrast(1.1) brightness(2)",
            backgroundColor: "black",
        }}
        className="transform translate-x-3"
    >
        <Suspense fallback={<div className="text-white">Loading...</div>}>
            <Spline scene="https://prod.spline.design/bDyxXGUprsX4UP-Q/scene.splinecode" />
        </Suspense>
    </div>
);

const SplineBrain: FC = () => (
    <div className="w-full md:w-1/2 flex justify-center items-center relative">
        <div className="flex flex-col items-center relative transform -translate-y-10 translate-x-10">
            <SplineDark />
            <div className="absolute bottom-6 right-4 w-[120px] h-[40px] md:w-[180px] rounded-2xl z-20 translate-x-[20%] translate-y-[20%] flex items-center justify-center text-black bg-white/80 backdrop-blur-lg font-semibold">
                Veritas.AI
            </div>
        </div>
    </div>
);

// Login component with YOUR provided logic
const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToSignup }) => {
    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: ''
    });
    
    const [errors, setErrors] = useState<LoginErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validateForm = (): boolean => {
        const newErrors: LoginErrors = {};
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof LoginErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsLoading(true);
        setErrors({});
        try {
            const response = await apiClient.login(formData);
            if (response.success && response.data) {
                localStorage.setItem('userInfo', JSON.stringify(response.data.user));
                onLoginSuccess(response.data.token);
            } else {
                setErrors({ general: response.message || 'Login failed. Please try again.' });
            }
        } catch (error: any) {
            console.error('Login error:', error);
            setErrors({ general: error.message || 'Login failed. Please check your connection and try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
                    <div className="text-center mb-8">
                        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-indigo-600"><Shield className="h-6 w-6 text-white" /></div>
                        <h2 className="mt-4 text-3xl font-bold text-white">Welcome Back</h2>
                        <p className="mt-2 text-sm text-gray-400">Sign in to your Veritas Ledger account</p>
                    </div>
                    {errors.general && <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md"><p className="text-sm text-red-400">{errors.general}</p></div>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                                <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleInputChange} className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${errors.email ? 'border-red-600 bg-red-900/20' : 'border-gray-600 bg-gray-700'} text-white placeholder-gray-400`} placeholder="Enter your email" />
                            </div>
                            {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div>
                                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={formData.password} onChange={handleInputChange} className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${errors.password ? 'border-red-600 bg-red-900/20' : 'border-gray-600 bg-gray-700'} text-white placeholder-gray-400`} placeholder="Enter your password" />
                                <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 right-0 pr-3 flex items-center">{showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}</button>
                            </div>
                            {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors">
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                    <div className="mt-6 text-center space-y-3">
                        <p className="text-sm text-gray-400">Don't have an account?{' '}<button onClick={onSwitchToSignup} className="font-medium text-indigo-400 hover:text-indigo-300">Sign up here</button></p>
                        
                    </div>
                </div>
            </div>
            {/* {showConnectionTest && <ConnectionTest onClose={() => setShowConnectionTest(false)} />} */}
        </div>
    );
};

// Placeholder Signup Component
const Signup: FC<SignupProps> = ({ onSignupSuccess, onSwitchToLogin }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="max-w-md w-full p-8 bg-gray-800 rounded-xl border border-gray-700 text-center">
                <h2 className="text-3xl font-bold mb-4">Sign Up</h2>
                <p className="text-gray-400 mb-6">This is a placeholder for the signup form.</p>
                <button onClick={() => onSignupSuccess("fake-signup-token")} className="w-full bg-indigo-600 py-3 rounded-lg mb-4">Complete Sign Up</button>
                <button onClick={onSwitchToLogin} className="text-indigo-400 hover:underline">Already have an account? Log in</button>
            </div>
        </div>
    );
};



// HomePage Component
const HomePage: FC<HomePageProps> = ({ navigateToApp }) => (
    <div className="bg-black text-gray-200 font-sans">
      <header className="fixed top-0 left-0 w-full bg-black/50 backdrop-blur-md z-50">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Veritas Ledger</h1>
          <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
          <button onClick={navigateToApp} className="bg-cyan-500 text-black font-bold py-2 px-5 rounded-lg hover:bg-cyan-400">Request a Demo</button>
        </nav>
      </header>
      <main>
        <section className="relative h-screen flex items-center overflow-hidden">
          <div className="container mx-auto px-6 flex flex-col md:flex-row items-center z-10">
            <div className="md:w-1/2 text-center md:text-left">
              <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">Financial Transparency, <br /><span className="text-cyan-400">Solidified on the Ledger.</span></h2>
              <p className="mt-4 text-lg text-gray-400 max-w-xl">Trust is eroded by financial opacity. Veritas Ledger provides an immutable, transparent, and user-friendly platform to track institutional funds.</p>
              <div className="mt-8"><button onClick={navigateToApp} className="bg-white text-black font-bold py-3 px-8 rounded-lg hover:bg-gray-200">See it in Action</button></div>
            </div>
            <SplineBrain />
          </div>
        </section>
        <section id="features" className="py-20 bg-gray-900/50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                    <h3 className="text-4xl font-bold text-white">The Challenge, Solved.</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gray-800/60 p-8 rounded-2xl border border-gray-700"><div className="w-16 h-16 bg-cyan-500/10 rounded-xl mb-6 flex items-center justify-center"><GitBranch className="w-8 h-8 text-cyan-400"/></div><h4 className="text-2xl font-bold text-white mb-3">Transparent Fund Flow</h4><p className="text-gray-400">Follow how a budget is divided and moves across departments, projects, and vendors.</p></div>
                    <div className="bg-gray-800/60 p-8 rounded-2xl border border-gray-700"><div className="w-16 h-16 bg-cyan-500/10 rounded-xl mb-6 flex items-center justify-center"><Users className="w-8 h-8 text-cyan-400"/></div><h4 className="text-2xl font-bold text-white mb-3">Clarity for All Stakeholders</h4><p className="text-gray-400">We make complex financial data easy to grasp for everyone—from citizens to donors.</p></div>
                    <div className="bg-gray-800/60 p-8 rounded-2xl border border-gray-700"><div className="w-16 h-16 bg-cyan-500/10 rounded-xl mb-6 flex items-center justify-center"><ShieldCheck className="w-8 h-8 text-cyan-400"/></div><h4 className="text-2xl font-bold text-white mb-3">Guaranteed Data Integrity</h4><p className="text-gray-400">Ensure every piece of data is authentic, traceable, and reliable.</p></div>
                </div>
            </div>
        </section>
      </main>
      <footer className="bg-gray-900 border-t border-gray-800 py-8">
        <div className="container mx-auto px-6 text-center text-gray-500">
            <p>&copy; 2025 Veritas Ledger. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
);

// --- MAIN CONTROLLER COMPONENT ---
const Controller: FC = () => {
    const [view, setView] = useState<'home' | 'auth'>('home');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [showSignup, setShowSignup] = useState<boolean>(false);

    const handleLoginSuccess = (token: string) => {
        console.log("Authentication successful with token:", token);
        setIsAuthenticated(true);
    };
    const handleLogout = () => setIsAuthenticated(false);
    const handleSignupSuccess = (token: string) => {
        console.log("Signup successful with token:", token);
        setIsAuthenticated(true);
    };

    if (view === 'home') {
        return <HomePage navigateToApp={() => setView('auth')} />;
    }
    if (isAuthenticated) {
        return <Dashboard onLogout={handleLogout} />;
    }
    if (showSignup) {
        return <Signup onSignupSuccess={handleSignupSuccess} onSwitchToLogin={() => setShowSignup(false)} />;
    }
    return <Login onLoginSuccess={handleLoginSuccess} onSwitchToSignup={() => setShowSignup(true)} />;
};

export default Controller;