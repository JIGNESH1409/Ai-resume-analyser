import {
    LayoutDashboard,
    FileSearch,
    Users,
    Briefcase,
    BarChart,
    Settings,
    BrainCircuit,
    Moon,
    Sun,
    Search,
    LogOut,
    Upload,
    User,
    Building2
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const [theme, setTheme] = useTheme();
    const isDarkMode = theme === 'dark';
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isOrg = !user?.role || user?.role === 'org';

    const handleLogout = () => {
        logout();
        navigate('/', { replace: true });
    };

    // Org nav — full suite (Resume Analyzer, Job Postings & Job Finder removed)
    const orgNavItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Bulk Upload', icon: Upload, path: '/bulk-upload' },
        { name: 'Candidates', icon: Users, path: '/candidates' },
        { name: 'Analytics', icon: BarChart, path: '/analytics' },
        { name: 'Settings', icon: Settings, path: '/settings' },
    ];

    // Job Seeker nav — only Resume Analyzer
    const userNavItems = [
        { name: 'Resume Analyzer', icon: FileSearch, path: '/analyzer' },
    ];

    const navItems = isOrg ? orgNavItems : userNavItems;

    return (
        <div className="w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col fixed left-0 top-0 transition-colors">
            {/* Logo Area */}
            <div className="p-6 flex items-center space-x-3">
                <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="font-bold text-gray-900 dark:text-white leading-tight text-sm">ATS Analyzer</h1>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">AI-Powered Recruitment</p>
                </div>
            </div>

            {/* Role badge */}
            <div className="px-5 mb-2">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${isOrg ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'}`}>
                    {isOrg ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {isOrg ? 'Organisation' : 'Job Seeker'}
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto mt-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-gradient-to-r from-indigo-500 to-indigo-400 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Bottom */}
            <div className="p-4 space-y-3">
                {/* User Profile */}
                <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'Guest')}`}
                        alt="User Avatar"
                        className="w-8 h-8 rounded-full bg-indigo-100"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || 'Guest'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.companyName || user?.email || ''}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Log out"
                        className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>

                <button
                    onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
                    className="w-full flex justify-center items-center space-x-2 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
                >
                    {isDarkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    <span>{isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
