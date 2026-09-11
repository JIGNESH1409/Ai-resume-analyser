import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, User, Building2, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RoleSelect = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // If already logged in, redirect to appropriate dashboard
    useEffect(() => {
        if (user) {
            if (user.role === 'user') {
                navigate('/analyzer', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [user, navigate]);

    const roles = [
        {
            key: 'user',
            title: 'Job Seeker',
            subtitle: 'Analyse your resume against a job description',
            description: 'Upload your resume, paste a job description and get an instant AI-powered ATS score, skill gap analysis, and improvement suggestions.',
            icon: User,
            gradient: 'from-indigo-500 to-indigo-600',
            lightBg: 'bg-indigo-50 dark:bg-indigo-950/40',
            border: 'border-indigo-200 dark:border-indigo-800',
            iconBg: 'bg-indigo-100 dark:bg-indigo-900',
            iconColor: 'text-indigo-600 dark:text-indigo-400',
            hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-500',
            features: ['Single resume analysis', 'ATS score & feedback', 'Skill gap report', 'AI improvement tips'],
        },
        {
            key: 'org',
            title: 'Organisation',
            subtitle: 'Screen 50–100 resumes at once',
            description: 'Upload a batch of candidate resumes, set a job description, and instantly get a ranked analytics dashboard of all applicants.',
            icon: Building2,
            gradient: 'from-violet-500 to-purple-600',
            lightBg: 'bg-violet-50 dark:bg-violet-950/40',
            border: 'border-violet-200 dark:border-violet-800',
            iconBg: 'bg-violet-100 dark:bg-violet-900',
            iconColor: 'text-violet-600 dark:text-violet-400',
            hoverBorder: 'hover:border-violet-400 dark:hover:border-violet-500',
            features: ['Bulk upload 50–100 PDFs', 'Ranked candidates table', 'Analytics dashboard', 'Job postings & shortlisting'],
        },
    ];

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-gray-950 px-4 py-12 transition-colors duration-200">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center mb-12"
            >
                <div className="flex items-center justify-center mb-4">
                    <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 mr-3">
                        <BrainCircuit className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">ATS Analyzer</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">AI-Powered Recruitment</p>
                    </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-6">Who are you?</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-base">Choose how you want to use ATS Analyzer</p>
            </motion.div>

            {/* Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                {roles.map((role, i) => (
                    <motion.div
                        key={role.key}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.12 }}
                    >
                        <div
                            className={`relative rounded-2xl border-2 ${role.border} ${role.lightBg} ${role.hoverBorder} p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group`}
                            onClick={() => navigate(`/login?role=${role.key}`)}
                        >
                            {/* Icon */}
                            <div className={`${role.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                                <role.icon className={`w-6 h-6 ${role.iconColor}`} />
                            </div>

                            {/* Title */}
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{role.title}</h2>
                            <p className={`text-sm font-semibold mb-3 bg-gradient-to-r ${role.gradient} bg-clip-text text-transparent`}>
                                {role.subtitle}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">{role.description}</p>

                            {/* Feature list */}
                            <ul className="space-y-2 mb-6">
                                {role.features.map((feat) => (
                                    <li key={feat} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                        <Sparkles className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${role.iconColor}`} />
                                        {feat}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <div className={`flex items-center text-sm font-semibold bg-gradient-to-r ${role.gradient} bg-clip-text text-transparent group-hover:gap-2 transition-all`}>
                                Get started
                                <ChevronRight className={`w-4 h-4 ml-1 ${role.iconColor} group-hover:translate-x-1 transition-transform`} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bottom note */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-xs text-gray-400 dark:text-gray-600 mt-10"
            >
                Already have an account?{' '}
                <button onClick={() => navigate('/login')} className="text-indigo-500 hover:underline font-medium">
                    Log in
                </button>
            </motion.p>
        </div>
    );
};

export default RoleSelect;
