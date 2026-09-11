import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { generateResumeFeedback, tailorResumeToJob, generateCoverLetter } from '../services/aiService.js';
import Candidate from '../models/Candidate.js';

export const analyzeResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No resume file uploaded' });
        }

        const { jobDescription } = req.body || {};

        // Read and parse PDF
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        const rawText = pdfData.text;

        // Clean up file
        fs.unlinkSync(req.file.path);

        // Call AI to analyze resume text
        const aiAnalysis = await generateResumeFeedback(rawText, jobDescription);

        // Try extracting email from raw text via simple regex
        const emailMatch = rawText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        const candidateEmail = emailMatch ? emailMatch[1] : `user-${Date.now()}@example.com`;

        // Save to DB — stamp the uploader's userId and all AI metrics
        const newCandidate = new Candidate({
            name: req.file.originalname.split('.')[0] || 'Unknown',
            email: candidateEmail,
            atsScore: aiAnalysis.atsScore || 0,
            matchScore: aiAnalysis.overallScore ?? aiAnalysis.matchScore ?? 0,
            overallScore: aiAnalysis.overallScore ?? aiAnalysis.matchScore ?? 0,
            skillMatch: aiAnalysis.skillMatch || 0,
            experienceMatch: aiAnalysis.experienceMatch || 0,
            projectMatch: aiAnalysis.projectMatch || 0,
            semanticMatch: aiAnalysis.semanticMatch || 0,
            sectionAnalysis: aiAnalysis.sectionAnalysis || {},
            analysisCacheHash: aiAnalysis.analysisCacheHash || '',
            skills: [...(aiAnalysis.matchedSkills || []), ...(aiAnalysis.additionalSkills || [])],
            matchedSkills: aiAnalysis.matchedSkills || [],
            missingSkills: aiAnalysis.missingSkills || [],
            additionalSkills: aiAnalysis.additionalSkills || [],
            atsBreakdown: aiAnalysis.atsBreakdown || {},
            strengths: aiAnalysis.strengths || [],
            weaknesses: aiAnalysis.weaknesses || [],
            learningPath: aiAnalysis.learningPath || [],
            summary: aiAnalysis.summary || '',
            suggestions: aiAnalysis.suggestions || [],
            roles: aiAnalysis.roles || [],
            primaryRole: aiAnalysis.primaryRole || '',
            yearsOfExperience: aiAnalysis.yearsOfExperience ?? null,
            jobDescription: jobDescription,
            status: 'Analyzed',
            resumeText: rawText,
            userId: req.user?.id || null,
            uploadedBy: req.user?.role || 'org'
        });
        await newCandidate.save();

        res.json({
            success: true,
            data: {
                candidateId: newCandidate._id,
                extractedTextSnippet: rawText.substring(0, 150) + '...',
                analysis: aiAnalysis
            }
        });

    } catch (error) {
        console.error('Error analyzing resume:', error);
        res.status(500).json({ error: 'Failed to analyze resume', details: error.message, stack: error.stack });
    }
};

// POST /api/resume/tailor — rewrite resume wording to target a job description (Part 6)
export const tailorResume = async (req, res) => {
    try {
        const { candidateId, jobDescription } = req.body || {};
        if (!candidateId) {
            return res.status(400).json({ error: 'candidateId is required' });
        }
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

        const targetJd = jobDescription || candidate.jobDescription || '';

        const tailored = await tailorResumeToJob(candidate.resumeText, targetJd);
        res.json({ success: true, data: tailored });
    } catch (error) {
        console.error('Error tailoring resume:', error);
        res.status(500).json({ error: 'Failed to tailor resume', details: error.message });
    }
};

// POST /api/resume/cover-letter — generate a personalized cover letter (Part 7)
export const createCoverLetter = async (req, res) => {
    try {
        const { candidateId, jobDescription, companyName, roleTitle, hiringManager } = req.body || {};
        if (!candidateId) {
            return res.status(400).json({ error: 'candidateId is required' });
        }
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

        const targetJd = jobDescription || candidate.jobDescription || '';

        const letter = await generateCoverLetter({
            resumeText: candidate.resumeText,
            jobDescription: targetJd,
            companyName: companyName || '',
            roleTitle: roleTitle || candidate.primaryRole || '',
            hiringManager: hiringManager || 'Hiring Manager',
        });
        res.json({ success: true, data: { coverLetter: letter } });
    } catch (error) {
        console.error('Error generating cover letter:', error);
        res.status(500).json({ error: 'Failed to generate cover letter', details: error.message });
    }
};

// POST /api/resume/bulk-analyze — org-only: analyze up to 100 PDFs at once with controlled concurrency
export const bulkAnalyzeResumes = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No resume files uploaded' });
        }

        const { jobDescription } = req.body || {};
        const orgUserId = req.user?.id || null;

        // Controlled concurrency: process in batches of 4 files simultaneously to prevent rate-limit bursts
        const CONCURRENCY_LIMIT = 4;

        const processFile = async (file) => {
            try {
                const dataBuffer = fs.readFileSync(file.path);
                const pdfData = await pdfParse(dataBuffer);
                const rawText = pdfData.text;

                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

                const aiAnalysis = await generateResumeFeedback(rawText, jobDescription);

                const emailMatch = rawText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
                const candidateEmail = emailMatch ? emailMatch[1] : `user-${Date.now()}@example.com`;

                const newCandidate = new Candidate({
                    name: file.originalname.split('.')[0] || 'Unknown',
                    email: candidateEmail,
                    atsScore: aiAnalysis.atsScore || 0,
                    matchScore: aiAnalysis.overallScore ?? aiAnalysis.matchScore ?? 0,
                    overallScore: aiAnalysis.overallScore ?? aiAnalysis.matchScore ?? 0,
                    skillMatch: aiAnalysis.skillMatch || 0,
                    experienceMatch: aiAnalysis.experienceMatch || 0,
                    projectMatch: aiAnalysis.projectMatch || 0,
                    semanticMatch: aiAnalysis.semanticMatch || 0,
                    sectionAnalysis: aiAnalysis.sectionAnalysis || {},
                    analysisCacheHash: aiAnalysis.analysisCacheHash || '',
                    skills: [...(aiAnalysis.matchedSkills || []), ...(aiAnalysis.additionalSkills || [])],
                    matchedSkills: aiAnalysis.matchedSkills || [],
                    missingSkills: aiAnalysis.missingSkills || [],
                    additionalSkills: aiAnalysis.additionalSkills || [],
                    atsBreakdown: aiAnalysis.atsBreakdown || {},
                    strengths: aiAnalysis.strengths || [],
                    weaknesses: aiAnalysis.weaknesses || [],
                    learningPath: aiAnalysis.learningPath || [],
                    summary: aiAnalysis.summary || '',
                    suggestions: aiAnalysis.suggestions || [],
                    roles: aiAnalysis.roles || [],
                    primaryRole: aiAnalysis.primaryRole || '',
                    yearsOfExperience: aiAnalysis.yearsOfExperience ?? null,
                    jobDescription: jobDescription || '',
                    status: 'Analyzed',
                    resumeText: rawText,
                    userId: orgUserId,
                    uploadedBy: 'org'
                });
                await newCandidate.save();

                return {
                    success: true,
                    result: {
                        filename: file.originalname,
                        candidateId: newCandidate._id,
                        name: newCandidate.name,
                        email: newCandidate.email,
                        atsScore: newCandidate.atsScore,
                        matchScore: newCandidate.matchScore,
                        overallScore: newCandidate.overallScore,
                        primaryRole: newCandidate.primaryRole,
                        status: 'success'
                    }
                };
            } catch (fileError) {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                console.error(`Error processing file ${file.originalname}:`, fileError);
                return {
                    success: false,
                    error: { filename: file.originalname, error: fileError.message, status: 'failed' }
                };
            }
        };

        const results = [];
        const errors = [];

        // Batch worker loop
        for (let i = 0; i < req.files.length; i += CONCURRENCY_LIMIT) {
            const batch = req.files.slice(i, i + CONCURRENCY_LIMIT);
            const batchOutcomes = await Promise.all(batch.map(processFile));
            for (const outcome of batchOutcomes) {
                if (outcome.success) results.push(outcome.result);
                else errors.push(outcome.error);
            }
        }

        res.json({
            success: true,
            summary: {
                total: req.files.length,
                succeeded: results.length,
                failed: errors.length
            },
            results,
            errors
        });
    } catch (error) {
        console.error('Error in bulk analyze:', error);
        res.status(500).json({ error: 'Failed to process bulk resume analysis', details: error.message });
    }
};
