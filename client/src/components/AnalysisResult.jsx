import { useState } from 'react';
import { CheckCircle2, AlertCircle, TrendingUp, Sparkles, PlusCircle, GraduationCap, Wand2, Mail, Loader2, Copy, Check } from 'lucide-react';
import { tailorResume, generateCoverLetter } from '../services/api';

const ATS_LABELS = {
    skills: 'Skills',
    projects: 'Projects',
    experience: 'Experience',
    education: 'Education',
    keywords: 'Keywords',
    formatting: 'Formatting',
    achievements: 'Achievements',
    softSkills: 'Soft Skills',
    missingKeywords: 'Keyword Coverage',
    grammar: 'Grammar',
    resumeLength: 'Resume Length',
};

const AtsBreakdown = ({ breakdown, atsScore }) => {
    if (!breakdown || Object.keys(breakdown).length === 0) return null;
    return (
        <div className="glass rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/80">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">ATS Score Breakdown</h3>
                <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{atsScore}%</span>
            </div>
            <div className="space-y-3">
                {Object.entries(breakdown).map(([key, value]) => (
                    <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-300 font-medium">{ATS_LABELS[key] || key}</span>
                            <span className="text-gray-500 dark:text-gray-400">{value}/20</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-700"
                                style={{ width: `${(value / 20) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TailorAndCoverLetter = ({ candidateId, jobDescription }) => {
    const [tailorLoading, setTailorLoading] = useState(false);
    const [tailored, setTailored] = useState(null);
    const [tailorError, setTailorError] = useState('');

    const [letterLoading, setLetterLoading] = useState(false);
    const [letter, setLetter] = useState('');
    const [letterError, setLetterError] = useState('');
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    const [copied, setCopied] = useState(false);

    if (!candidateId) return null;

    const runTailor = async () => {
        setTailorLoading(true);
        setTailorError('');
        try {
            const res = await tailorResume(candidateId, jobDescription || '');
            setTailored(res.data);
        } catch (err) {
            setTailorError(err.response?.data?.error || 'Failed to tailor resume.');
        } finally {
            setTailorLoading(false);
        }
    };

    const runCoverLetter = async () => {
        setLetterLoading(true);
        setLetterError('');
        try {
            const res = await generateCoverLetter({ candidateId, jobDescription, companyName: company, roleTitle: role });
            setLetter(res.data.coverLetter);
        } catch (err) {
            setLetterError(err.response?.data?.error || 'Failed to generate cover letter.');
        } finally {
            setLetterLoading(false);
        }
    };

    const copyLetter = () => {
        navigator.clipboard.writeText(letter);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="grid md:grid-cols-2 gap-6">
            {/* Tailor Resume */}
            <div className="glass rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/80">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                        <Wand2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Tailor Resume</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Rewrites your summary, skills, and experience wording to better fit this job description — using only what's already on your resume.
                </p>
                <button
                    onClick={runTailor}
                    disabled={tailorLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
                >
                    {tailorLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {tailorLoading ? 'Tailoring...' : 'Tailor Resume'}
                </button>
                {tailorError && <p className="text-sm text-red-500 mt-3">{tailorError}</p>}
                {tailored && (
                    <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                        {tailored.tailoredSummary && (
                            <div><span className="font-semibold">Summary: </span>{tailored.tailoredSummary}</div>
                        )}
                        {Array.isArray(tailored.tailoredExperience) && tailored.tailoredExperience.length > 0 && (
                            <div>
                                <span className="font-semibold">Experience:</span>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                    {tailored.tailoredExperience.map((b, i) => <li key={i}>{b}</li>)}
                                </ul>
                            </div>
                        )}
                        {tailored.changesExplanation && (
                            <p className="italic text-gray-500 dark:text-gray-400">{tailored.changesExplanation}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Cover Letter */}
            <div className="glass rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/80 w-full overflow-hidden">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                        <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Cover Letter Generator</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Personalize your cover letter with optional target details:</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2.5 mb-4 w-full">
                    <input
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        placeholder="Company Name (optional e.g., Google)"
                        className="w-full text-sm px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-400"
                    />
                    <input
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        placeholder="Job Title (optional e.g., Full Stack Developer)"
                        className="w-full text-sm px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-400"
                    />
                </div>
                <button
                    onClick={runCoverLetter}
                    disabled={letterLoading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
                >
                    {letterLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {letterLoading ? 'Generating...' : 'Generate Cover Letter'}
                </button>
                {letterError && <p className="text-sm text-red-500 mt-3">{letterError}</p>}
                {letter && (
                    <div className="mt-4 relative">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg max-h-64 overflow-y-auto">{letter}</pre>
                        <button onClick={copyLetter} className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const AnalysisResult = ({ data }) => {
    if (!data) return null;

    const matchScore = data.matchPercentage ?? data.matchScore ?? data.atsScore ?? 0;
    const matchedSkills = data.matchedSkills || data.skillsFound || [];
    const missingSkills = data.missingSkills || [];
    const additionalSkills = data.additionalSkills || [];
    const suggestions = data.suggestions || [];
    const strengths = data.strengths || [];
    const weaknesses = data.weaknesses || [];
    const learningPath = data.learningPath || [];
    const atsBreakdown = data.atsBreakdown || {};
    const atsScore = data.atsScore ?? matchScore;

    // Circular Progress Chart calculations
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (matchScore / 100) * circumference;

    let scoreColor = "text-red-500 stroke-red-500 dark:text-red-400 dark:stroke-red-400";
    if (matchScore >= 80) {
        scoreColor = "text-green-500 stroke-green-500 dark:text-green-400 dark:stroke-green-400";
    } else if (matchScore >= 60) {
        scoreColor = "text-yellow-500 stroke-yellow-500 dark:text-yellow-400 dark:stroke-yellow-400";
    }

    // Helper to format basic markdown like **bold** in the feedback text
    const formatText = (text) => {
        if (!text) return text;
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return (
                    <strong key={i} className="font-bold text-gray-900 dark:text-white">
                        {part.slice(2, -2)}
                    </strong>
                );
            }
            return part;
        });
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Match Score Card */}
            <div className="glass rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="space-y-2 text-center md:text-left">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Job Match Analysis
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">Detailed breakdown of how your resume fits the job description.</p>
                </div>

                <div className="flex flex-col items-center justify-center relative">
                    <svg className="w-36 h-36 transform -rotate-90">
                        <circle
                            className="text-gray-100 dark:text-gray-700 stroke-current"
                            strokeWidth="12"
                            cx="72"
                            cy="72"
                            r="50"
                            fill="transparent"
                        ></circle>
                        <circle
                            className={`${scoreColor} transition-all duration-1000 ease-out`}
                            strokeWidth="12"
                            strokeLinecap="round"
                            cx="72"
                            cy="72"
                            r="50"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        ></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className={`text-4xl font-extrabold ${scoreColor.split(' ')[0]}`}>{matchScore}%</span>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Matched Skills */}
                <div className="glass rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/80">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Matched Skills</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {matchedSkills.map((skill, index) => (
                            <span key={index} className="px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-medium rounded-full border border-green-200 dark:border-green-500/20 shadow-sm">
                                {skill}
                            </span>
                        ))}
                        {matchedSkills.length === 0 && <span className="text-gray-500 dark:text-gray-400 italic">No exact skill matches found.</span>}
                    </div>
                </div>

                {/* Missing Skills */}
                <div className="glass rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/80">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Missing Skills</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {missingSkills.map((skill, index) => (
                            <span key={index} className="px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm font-medium rounded-full border border-red-200 dark:border-red-500/20 shadow-sm">
                                {skill}
                            </span>
                        ))}
                        {missingSkills.length === 0 && <span className="text-green-600 dark:text-green-400 font-medium">No missing key skills! Great job.</span>}
                    </div>
                </div>
            </div>

            {/* Additional Skills */}
            {additionalSkills.length > 0 && (
                <div className="glass rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/80">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                            <PlusCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Additional Skills (not required by this job)</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {additionalSkills.map((skill, index) => (
                            <span key={index} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-sm font-medium rounded-full border border-indigo-200 dark:border-indigo-500/20 shadow-sm">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ATS Breakdown */}
            <AtsBreakdown breakdown={atsBreakdown} atsScore={atsScore} />

            {/* Strengths & Weaknesses */}
            {(strengths.length > 0 || weaknesses.length > 0) && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="glass rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/80">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                                <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Technical Strengths</h3>
                        </div>
                        <ul className="space-y-2">
                            {strengths.map((s, i) => (
                                <li key={i} className="text-gray-700 dark:text-gray-300 text-sm">• {formatText(s)}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="glass rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/80">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Weak Areas</h3>
                        </div>
                        <ul className="space-y-2">
                            {weaknesses.map((s, i) => (
                                <li key={i} className="text-gray-700 dark:text-gray-300 text-sm">• {formatText(s)}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Recommended Learning Path */}
            {learningPath.length > 0 && (
                <div className="glass rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/80">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-lg">
                            <GraduationCap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recommended Learning Path</h3>
                    </div>
                    <ul className="space-y-3">
                        {learningPath.map((item, i) => (
                            <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-semibold text-teal-600 dark:text-teal-400">{item.skill}: </span>
                                {item.suggestion}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Suggestions */}
            <div className="glass rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/80">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recommendations</h3>
                </div>
                <ul className="space-y-4">
                    {suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start space-x-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-50 dark:border-blue-900/20 transition-all hover:shadow-md">
                            <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></span>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                {formatText(suggestion)}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Tailor Resume & Cover Letter */}
            <TailorAndCoverLetter candidateId={data.candidateId} jobDescription={data.jobDescription} />
        </div>
    );
};

export default AnalysisResult;
