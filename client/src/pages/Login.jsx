import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, User, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PrimaryButton } from '../components/ui/Button';
import { designSystem } from '../utils/designSystem';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const searchParams = new URLSearchParams(location.search);
    const roleHint = searchParams.get('role') || 'org';
    const isJobSeeker = roleHint === 'user';

    useEffect(() => {
        if (user) {
            if (user.role === 'user') navigate('/analyzer', { replace: true });
            else navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) { setError('Please enter both your email and password.'); return; }
        setLoading(true);
        try {
            const loggedUser = await login(email, password);
            if (loggedUser.role === 'user') navigate('/analyzer', { replace: true });
            else navigate('/dashboard', { replace: true });
        } catch (err) {
            const message = err?.response?.data?.error ||
                (err?.message?.includes('Network Error')
                    ? 'Unable to reach the server. Make sure the backend is running on localhost:5001.'
                    : 'Something went wrong while logging in. Please try again.');
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const accentColor = isJobSeeker
        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
        : 'bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400';
    const ringColor = isJobSeeker ? 'focus:ring-indigo-500' : 'focus:ring-violet-500';

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] dark:bg-gray-950 px-4 transition-colors duration-200">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`${designSystem.card.elevated} w-full max-w-md`}
            >
                <div className="flex flex-col items-center text-center mb-8">
                    <div className={`${accentColor} p-3 rounded-xl mb-4`}>
                        {isJobSeeker ? <User className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
                    </div>
                    <h1 className={designSystem.typography.pageTitle}>Welcome back</h1>
                    <p className={`${designSystem.typography.body} mt-1`}>
                        {isJobSeeker ? 'Log in to your Job Seeker account' : 'Log in to your Organisation account'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 flex items-start space-x-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                autoComplete="email"
                                className={`w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 ${ringColor} focus:border-transparent placeholder:text-gray-400`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                className={`w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 ${ringColor} focus:border-transparent placeholder:text-gray-400`}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <PrimaryButton type="submit" loading={loading} className="mt-2">
                        {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging in...</>) : 'Log in'}
                    </PrimaryButton>
                </form>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    Don`t have an account?{' '}
                    <Link to={`/register?role=${roleHint}`} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Sign up</Link>
                </p>
                <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-2">
                    <button onClick={() => navigate('/')} className="hover:underline">← Back to role selection</button>
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
