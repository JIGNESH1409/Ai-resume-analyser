import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileText, X, CheckCircle2, XCircle,
    Loader2, AlertCircle, BarChart3, Users, Download
} from 'lucide-react';
import { bulkAnalyzeResumes } from '../services/api';
import { designSystem } from '../utils/designSystem';

const STATUS = { IDLE: 'idle', UPLOADING: 'uploading', DONE: 'done', ERROR: 'error' };

const BulkUpload = () => {
    const [files, setFiles] = useState([]);
    const [jobDescription, setJobDescription] = useState('');
    const [status, setStatus] = useState(STATUS.IDLE);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [results, setResults] = useState([]);
    const [errors, setErrors] = useState([]);
    const [summary, setSummary] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const addFiles = (newFiles) => {
        const pdfs = Array.from(newFiles).filter(f => f.type === 'application/pdf');
        setFiles(prev => {
            const existing = new Set(prev.map(f => f.name));
            const unique = pdfs.filter(f => !existing.has(f.name));
            return [...prev, ...unique].slice(0, 100);
        });
    };

    const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    }, []);

    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);

    const handleAnalyse = async () => {
        if (files.length === 0) { setErrorMsg('Please add at least one PDF resume.'); return; }
        setStatus(STATUS.UPLOADING);
        setErrorMsg('');
        setResults([]);
        setErrors([]);
        setSummary(null);
        setUploadProgress(0);

        try {
            const data = await bulkAnalyzeResumes(files, jobDescription, setUploadProgress);
            setResults(data.results || []);
            setErrors(data.errors || []);
            setSummary(data.summary);
            setStatus(STATUS.DONE);
        } catch (err) {
            setErrorMsg(err.message || 'Something went wrong during bulk analysis.');
            setStatus(STATUS.ERROR);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setJobDescription('');
        setStatus(STATUS.IDLE);
        setResults([]);
        setErrors([]);
        setSummary(null);
        setErrorMsg('');
        setUploadProgress(0);
    };

    const exportCSV = () => {
        const rows = [['Name', 'Email', 'ATS Score', 'Match Score', 'Primary Role', 'Status']];
        results.forEach(r => rows.push([r.name, r.email, r.atsScore, r.matchScore, r.primaryRole, r.status]));
        errors.forEach(e => rows.push([e.filename, '', '', '', '', 'Failed - ' + e.error]));
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'bulk_analysis_results.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const scoreColor = (score) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400';
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const scoreBadge = (score) => {
        if (score >= 80) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
        if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className={designSystem.typography.pageTitle}>Bulk Resume Upload</h1>
                <p className={`${designSystem.typography.body} mt-1`}>
                    Upload up to 100 PDF resumes at once. All will be scored against your job description.
                </p>
            </div>

            {status !== STATUS.DONE && (
                <>
                    {/* Drop zone */}
                    <div
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-6
                            ${isDragging
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                                : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20'}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            multiple
                            className="hidden"
                            onChange={(e) => addFiles(e.target.files)}
                        />
                        <div className="flex flex-col items-center gap-3">
                            <div className="bg-violet-100 dark:bg-violet-900 p-4 rounded-2xl">
                                <Upload className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                            </div>
                            <p className="text-base font-semibold text-gray-800 dark:text-white">
                                Drag & drop PDF resumes here, or click to browse
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Up to 100 PDFs · 5 MB each · PDF only
                            </p>
                        </div>
                    </div>

                    {/* Selected files list */}
                    {files.length > 0 && (
                        <div className={`${designSystem.card.base} mb-6`}>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {files.length} file{files.length > 1 ? 's' : ''} selected
                                </p>
                                <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:underline">Remove all</button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                {files.map(f => (
                                    <div key={f.name} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileText className="w-4 h-4 text-violet-500 flex-shrink-0" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{f.name}</span>
                                            <span className="text-xs text-gray-400 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); removeFile(f.name); }} className="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Job description */}
                    <div className={`${designSystem.card.base} mb-6`}>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Job Description <span className="text-gray-400 font-normal">(optional but recommended)</span>
                        </label>
                        <textarea
                            rows={5}
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Paste the job description here. All resumes will be scored against it..."
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm p-4 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-gray-400 resize-none"
                        />
                    </div>

                    {errorMsg && (
                        <div className="mb-4 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Analyse button */}
                    <button
                        onClick={handleAnalyse}
                        disabled={status === STATUS.UPLOADING || files.length === 0}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-violet-200 dark:shadow-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {status === STATUS.UPLOADING ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Analysing {files.length} resume{files.length > 1 ? 's' : ''}...</>
                        ) : (
                            <><BarChart3 className="w-4 h-4" /> Analyse {files.length} Resume{files.length > 1 ? 's' : ''}</>
                        )}
                    </button>

                    {/* Upload progress bar */}
                    {status === STATUS.UPLOADING && (
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                <span>Uploading & processing...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                                AI is analyzing each resume — this may take a few minutes for large batches.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Results section */}
            {status === STATUS.DONE && summary && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { label: 'Total Uploaded', value: summary.total, icon: Upload, color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' },
                            { label: 'Successfully Analyzed', value: summary.succeeded, icon: CheckCircle2, color: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' },
                            { label: 'Failed', value: summary.failed, icon: XCircle, color: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' },
                        ].map(card => (
                            <div key={card.label} className={`${designSystem.card.base} flex items-center gap-3`}>
                                <div className={`p-2.5 rounded-xl ${card.color}`}>
                                    <card.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action bar */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-violet-500" /> Candidate Results
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={exportCSV} className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                            <button onClick={handleReset} className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-colors">
                                <Upload className="w-4 h-4" /> New Batch
                            </button>
                        </div>
                    </div>

                    {/* Results table */}
                    <div className={`${designSystem.card.base} overflow-hidden p-0`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Candidate</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Role</th>
                                        <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">ATS Score</th>
                                        <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Match Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {results
                                        .sort((a, b) => (b.atsScore + b.matchScore) - (a.atsScore + a.matchScore))
                                        .map((r, i) => (
                                            <tr key={r.candidateId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{r.name}</p>
                                                            <p className="text-xs text-gray-400">{r.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">{r.primaryRole || '—'}</span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${scoreBadge(r.atsScore)}`}>
                                                        {r.atsScore}%
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${scoreBadge(r.matchScore)}`}>
                                                        {r.matchScore}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    {errors.map((e) => (
                                        <tr key={e.filename} className="bg-red-50/50 dark:bg-red-950/20">
                                            <td className="px-5 py-3.5" colSpan={2}>
                                                <div className="flex items-center gap-2">
                                                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{e.filename}</span>
                                                    <span className="text-xs text-red-500">{e.error}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-center" colSpan={2}>
                                                <span className="text-xs text-red-500 font-medium">Failed</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default BulkUpload;
