import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionContainer } from '../components/ui/SectionContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { DashboardCard } from '../components/ui/DashboardCard';
import { 
    Search, Building2, MapPin, ExternalLink, Briefcase, Sparkles, 
    ArrowUpRight, CheckCircle2, XCircle, Loader2, Filter, Globe,
    Linkedin, Rocket, GraduationCap, ClipboardList, Building, 
    Wifi, Landmark, DollarSign, Clock, ArrowUpDown, Info
} from 'lucide-react';
import { designSystem } from '../utils/designSystem';
import { findJobs } from '../services/api';

// Real, live sources this app actually queries for job listings.
const platformColors = {
    'Adzuna': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    'Jooble': { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800' },
    'RemoteOK': { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
    'Remotive': { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
    'Arbeitnow': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
    'JSearch (Google Jobs)': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    'USAJobs': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
    'Google Jobs': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    // Direct-search-only platforms (no public search API — see platformLinks)
    'LinkedIn': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    'Wellfound': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
    'Indeed': { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
    'Naukri': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
    'Glassdoor': { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
};

const PlatformLogo = ({ platform, className = "w-4 h-4" }) => {
    switch (platform) {
        case 'LinkedIn': return <Linkedin className={className} />;
        case 'Wellfound': return <Rocket className={className} />;
        case 'RemoteOK':
        case 'Remotive': return <Wifi className={className} />;
        case 'Indeed': return <Search className={className} />;
        case 'Naukri': return <ClipboardList className={className} />;
        case 'Glassdoor': return <Building className={className} />;
        case 'USAJobs': return <Landmark className={className} />;
        case 'Adzuna':
        case 'Jooble':
        case 'Google Jobs': return <Globe className={className} />;
        default: return <Globe className={className} />;
    }
};

const JobFinder = () => {
    const [jobs, setJobs] = useState([]);
    const [platformLinks, setPlatformLinks] = useState([]);
    const [activeSources, setActiveSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [filter, setFilter] = useState('all'); // all, internship, full-time, contract, part-time
    const [platformFilter, setPlatformFilter] = useState('all');
    const [location, setLocation] = useState('');
    const [remoteOnly, setRemoteOnly] = useState(false);
    const [sortBy, setSortBy] = useState('relevance'); // relevance, newest, salary, remote
    const [postedWithin, setPostedWithin] = useState('any');

    useEffect(() => {
        fetchJobs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, remoteOnly, sortBy, postedWithin, filter]);

    const fetchJobs = async () => {
        setLoading(true);
        setError('');
        setInfo('');
        try {
            const data = await findJobs({
                location: location || undefined,
                remote: remoteOnly ? 'true' : undefined,
                sortBy,
                postedWithin,
                employmentType: filter !== 'all' ? filter : undefined,
            });
            setJobs(data.jobs || []);
            setPlatformLinks(data.platformLinks || []);
            setActiveSources(data.activeSources || []);
            if (data.message) {
                if (/analyze a resume/i.test(data.message)) setError(data.message);
                else setInfo(data.message);
            }
        } catch (err) {
            console.error('Error finding jobs:', err);
            setError('Failed to fetch job recommendations. Please analyze a resume first.');
        } finally {
            setLoading(false);
        }
    };

    const filteredJobs = jobs.filter(job => {
        const platMatch = platformFilter === 'all' || job.platform === platformFilter;
        return platMatch;
    });

    const getScoreColor = (score) => {
        if (score >= 70) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        if (score >= 40) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    };

    const uniquePlatforms = [...new Set(jobs.map(j => j.platform).filter(Boolean))];

    return (
        <SectionContainer>
            <PageHeader
                title="Job Finder"
                subtitle="AI-powered job & internship recommendations based on your resume skills."
            />

            {/* Platform External Links */}
            {platformLinks.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.4 }}
                    className="mb-8"
                >
                    <h3 className={designSystem.typography.sectionHeading + " mb-3 flex items-center"}>
                        <Globe className="w-5 h-5 mr-2 text-indigo-500" />
                        Search on Job Platforms
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {platformLinks.map((link, idx) => (
                            <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center space-x-2.5 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-100 dark:hover:shadow-none transition-all duration-200"
                            >
                                <span className="text-xl flex-shrink-0 text-indigo-500/80"><PlatformLogo platform={link.name} className="w-5 h-5" /></span>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{link.name}</span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 ml-auto transition-colors" />
                            </a>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex flex-wrap items-center gap-3 mb-6"
            >
                <div className="flex items-center space-x-2 mr-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter:</span>
                </div>
                {['all', 'internship', 'full-time', 'part-time', 'contract'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border capitalize ${
                            filter === f 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none' 
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                        }`}
                    >
                        {f === 'all' ? 'All Types' : f}
                    </button>
                ))}

                <button
                    onClick={() => setRemoteOnly(r => !r)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border inline-flex items-center gap-1.5 ${
                        remoteOnly
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                    }`}
                >
                    <Wifi className="w-3.5 h-3.5" /> Remote Only
                </button>

                <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchJobs()}
                    placeholder="Location"
                    className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 w-32 focus:w-44 transition-all outline-none focus:border-indigo-400"
                />

                <select
                    value={postedWithin}
                    onChange={e => setPostedWithin(e.target.value)}
                    className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400"
                >
                    <option value="any">Any time</option>
                    <option value="today">Posted Today</option>
                    <option value="3days">Last 3 Days</option>
                    <option value="week">Last Week</option>
                </select>

                <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400"
                    >
                        <option value="relevance">Best Match</option>
                        <option value="newest">Newest</option>
                        <option value="salary">Highest Salary</option>
                        <option value="remote">Remote First</option>
                    </select>
                </div>

                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                {['all', ...uniquePlatforms].map(p => (
                    <button
                        key={p}
                        onClick={() => setPlatformFilter(p)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all border flex items-center space-x-1.5 ${
                            platformFilter === p
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                        }`}
                    >
                        {p !== 'all' && <span className="text-sm mr-1"><PlatformLogo platform={p} className="w-4 h-4" /></span>}
                        <span>{p === 'all' ? 'All Platforms' : p}</span>
                    </button>
                ))}
            </motion.div>

            {/* Info banner (e.g. missing API keys) */}
            {info && !loading && (
                <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{info}</span>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-64">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 mt-auto"></div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mt-2"></div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error / Empty State */}
            {!loading && jobs.length === 0 && (
                <DashboardCard className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                    <Search className="w-14 h-14 text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className={designSystem.typography.sectionHeading + " mb-2"}>
                        {error ? "No skills detected from resume" : "No matching jobs found."}
                    </h3>
                    <p className={designSystem.typography.body + " max-w-md"}>
                        {error
                            ? "Upload a resume to get job recommendations."
                            : "Try adding more skills to your resume."}
                    </p>
                    {error && (
                        <Link 
                            to="/analyzer" 
                            className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md inline-flex items-center hover:scale-[1.02]"
                        >
                            <Search className="w-4 h-4 mr-2" />
                            Upload Resume
                        </Link>
                    )}
                </DashboardCard>
            )}

            {/* Job Cards Grid */}
            {!loading && filteredJobs.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <div className="mb-6">
                        <h3 className={designSystem.typography.sectionHeading + " flex items-center"}>
                            <Sparkles className="w-5 h-5 mr-2 text-amber-500" />
                            Top {filteredJobs.length} jobs matching your profile
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">
                            Recommended jobs based on your resume skills.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {filteredJobs.map((job, idx) => {
                                const pColor = platformColors[job.platform] || platformColors['LinkedIn'];
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                                        className={`bg-white dark:bg-gray-800 flex flex-col rounded-xl p-5 border shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 ${
                                            job.matchScore >= 70
                                                ? 'border-indigo-300 dark:border-indigo-600'
                                                : 'border-gray-100 dark:border-gray-700'
                                        }`}
                                    >
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 min-w-0">
                                                    {job.applyUrl ? (
                                                        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="block no-underline hover:underline">
                                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 truncate">{job.title}</h4>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                                <span className="flex items-center space-x-1">
                                                                    <Briefcase className="w-4 h-4" />
                                                                    <span className="font-medium">{job.company}</span>
                                                                </span>
                                                                {job.location && (
                                                                    <span className="flex items-center space-x-1">
                                                                        <MapPin className="w-4 h-4" />
                                                                        <span>{job.location}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </a>
                                                    ) : (
                                                        <>
                                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 truncate">{job.title}</h4>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                                <span className="flex items-center space-x-1">
                                                                    <Briefcase className="w-4 h-4" />
                                                                    <span className="font-medium">{job.company}</span>
                                                                </span>
                                                                {job.location && (
                                                                    <span className="flex items-center space-x-1">
                                                                        <MapPin className="w-4 h-4" />
                                                                        <span>{job.location}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold inline-block ${getScoreColor(job.matchScore)}`}>
                                                        {job.matchScore}% Match
                                                    </span>
                                                </div>
                                        </div>

                                        {/* Tags: Platform + Type + Remote */}
                                        <div className="flex items-center flex-wrap gap-2 mb-3">
                                            {job.platform && (
                                                <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${pColor.bg} ${pColor.text} ${pColor.border}`}>
                                                    <span><PlatformLogo platform={job.platform} className="w-3.5 h-3.5" /></span>
                                                    <span>{job.platform}</span>
                                                </span>
                                            )}
                                            {(job.employmentType || job.type) && (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600">
                                                    {job.employmentType || job.type}
                                                </span>
                                            )}
                                            {job.remote && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                                                    <Wifi className="w-3 h-3" /> Remote
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mb-5 pb-5 border-b border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                                            {job.salary && (
                                                <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{job.salary}</span>
                                            )}
                                            {job.postedDate && (
                                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(job.postedDate).toLocaleDateString()}</span>
                                            )}
                                        </div>

                                        {/* Skills */}
                                        <div className="mb-6 flex-1">
                                            <div className="mb-4">
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Matched Skills</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {job.matchedSkills?.slice(0, 3).map(skill => (
                                                        <span key={skill} className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-md shadow-sm">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {job.matchedSkills?.length > 3 && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-md shadow-sm">
                                                            +{job.matchedSkills.length - 3} more
                                                        </span>
                                                    )}
                                                    {(!job.matchedSkills || job.matchedSkills.length === 0) && (
                                                        <span className="text-xs text-gray-500">None</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Missing Skills</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {job.missingSkills?.slice(0, 3).map(skill => (
                                                        <span key={skill} className="px-2 py-1 text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 rounded-md shadow-sm">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {job.missingSkills?.length > 3 && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-md shadow-sm">
                                                            +{job.missingSkills.length - 3} more
                                                        </span>
                                                    )}
                                                    {(!job.missingSkills || job.missingSkills.length === 0) && (
                                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Perfect Match!</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Apply Button */}
                                        <div className="mt-auto">
                                            {job.applyUrl ? (
                                                <a
                                                    href={job.applyUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
                                                >
                                                    Apply Now
                                                </a>
                                            ) : (
                                                <button disabled className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-sm font-semibold rounded-lg cursor-not-allowed">
                                                    Apply Link Not Available
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}

            {/* No results after filter */}
            {!loading && jobs.length > 0 && filteredJobs.length === 0 && (
                <DashboardCard className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                    <Filter className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className={designSystem.typography.sectionHeading + " mb-2"}>No jobs match your filters</h3>
                    <p className={designSystem.typography.body + " max-w-sm mb-6"}>Try changing the job type or platform to see more recommendations.</p>
                    <button 
                        onClick={() => { setFilter('all'); setPlatformFilter('all'); }}
                        className="px-5 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 dark:text-indigo-400 rounded-xl text-sm font-semibold transition-colors"
                    >
                        Clear Filters
                    </button>
                </DashboardCard>
            )}
        </SectionContainer>
    );
};

export default JobFinder;
