import express from 'express';
import Candidate from '../models/Candidate.js';
import { searchJobs, buildPlatformSearchLinks } from '../services/jobsService.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, requireRole('org'));


// GET /api/job-finder — returns REAL jobs from live sources, plus direct search
// links for platforms that don't expose a public search API.
router.get('/', async (req, res) => {
    try {
        // 1. Resolve candidate skills + primary role (query param wins, otherwise latest analyzed resume)
        let skills = [];
        let role = req.query.role || '';
        if (req.query.skills) {
            skills = req.query.skills.split(',').map(s => s.trim()).filter(Boolean);
        } else {
            const latestCandidate = await Candidate.findOne().sort({ uploadedAt: -1 });
            if (latestCandidate) {
                skills = [...(latestCandidate.matchedSkills || []), ...(latestCandidate.additionalSkills || []), ...(latestCandidate.skills || [])];
                skills = Array.from(new Set(skills));
                if (!role) role = latestCandidate.primaryRole || '';
            }
        }

        if (skills.length === 0) {
            return res.json({
                jobs: [], total: 0, page: 1, totalPages: 1,
                platformLinks: [], activeSources: [], unavailableViaApi: [],
                message: 'No skills found. Please analyze a resume first, or pass ?skills=React,Node.js',
            });
        }

        const filters = {
            location: req.query.location || '',
            role,
            remoteOnly: req.query.remote === 'true',
            employmentType: req.query.employmentType || 'all',
            postedWithin: req.query.postedWithin || 'any', // today | 3days | week | any
            minSalary: req.query.minSalary ? parseInt(req.query.minSalary, 10) : null,
            company: req.query.company || '',
            techStack: req.query.techStack ? req.query.techStack.split(',').map(s => s.trim()).filter(Boolean) : [],
            sortBy: req.query.sortBy || 'relevance', // relevance | newest | salary | remote
            page: req.query.page ? parseInt(req.query.page, 10) : 1,
            pageSize: req.query.pageSize ? parseInt(req.query.pageSize, 10) : 12,
        };

        const result = await searchJobs(skills, filters);
        const platformLinks = buildPlatformSearchLinks(skills, filters.location);

        return res.json({
            ...result,
            platformLinks,
            candidateSkills: skills,
            message: result.jobs.length === 0
                ? (result.activeSources.length === 0
                    ? 'No live job API keys are configured yet. RemoteOK works with zero setup — check server logs if it returned nothing. Add ADZUNA_APP_ID/ADZUNA_APP_KEY, JOOBLE_API_KEY, REMOTIVE_API_KEY, USAJOBS_API_KEY, or SERPAPI_KEY to your .env for more sources. Use the platform links below in the meantime.'
                    : 'No jobs matched your filters. Try widening your filters.')
                : undefined,
        });
    } catch (error) {
        console.error('Job Finder Error:', error);
        res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
    }
});

export default router;
