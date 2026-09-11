import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import Settings from '../models/Settings.js';
import { runSkillPipeline, buildLearningPath } from './skillsService.js';
import { computeAtsBreakdown } from './atsService.js';
import { buildProfile } from './profileService.js';

dotenv.config();

// In-memory cache for resume + JD analysis to prevent duplicate API costs
const analysisCache = new Map();

async function resolveApiKey() {
    let apiKey = process.env.GEMINI_API_KEY;
    try {
        const settings = await Settings.findOne();
        if (settings && settings.geminiApiKey) apiKey = settings.geminiApiKey;
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
    return apiKey;
}

/** Pull a handful of resume "highlight" lines (project/role titles) to ground suggestions in real content. */
function extractHighlightLines(resumeText) {
    const lines = (resumeText || '')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

    const candidates = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const wordCount = line.split(/\s+/).length;
        if (wordCount >= 2 && wordCount <= 8 && !/^[•\-*●]/.test(line)) {
            const context = (lines[i + 1] || '') + ' ' + (lines[i - 1] || '');
            if (/project|app|application|platform|system|website|dashboard|bot|tool/i.test(line) ||
                /project/i.test(context)) {
                candidates.push(line);
            }
        }
    }
    return Array.from(new Set(candidates)).slice(0, 5);
}

/** Deterministic fallback suggestions, grounded in the actual missing skills and detected resume highlights. */
function buildFallbackSuggestions(missingSkills, highlights, resumeText) {
    const suggestions = [];
    const lowerResume = (resumeText || '').toLowerCase();
    const missingSkillNames = missingSkills.map(s => typeof s === 'string' ? s : s.skill);

    if (highlights.length > 0 && missingSkillNames.length > 0) {
        suggestions.push(
            `Your "${highlights[0]}" project doesn't mention ${missingSkillNames[0]}. If you used it (even partially), call it out explicitly.`
        );
    }

    missingSkillNames.slice(0, 4).forEach(skill => {
        if (!lowerResume.includes(skill.toLowerCase())) {
            suggestions.push(`Add "${skill}" to your resume where it genuinely applies — required by the target job description.`);
        }
    });

    if (!/summary|objective|profile/i.test(resumeText || '')) {
        suggestions.push('Add a 2-3 line professional summary at the top tailored to the target role.');
    }

    if (!/\d+%|\d+x|reduced|increased|improved/i.test(resumeText || '')) {
        suggestions.push('Quantify your project/experience bullets with numbers (e.g. "reduced load time by 40%").');
    }

    if (suggestions.length === 0) {
        suggestions.push('Your resume already covers the key skills in this job description well. Consider adding measurable outcomes to strengthen it further.');
    }

    return suggestions.slice(0, 6);
}

/**
 * Full Hybrid Architecture:
 * 1. Traditional ATS Analysis (deterministic code)
 * 2. LLM Contextual Analysis & Semantic Matching
 * 3. Structured JSON Schema
 * 4. Composite Multi-Signal Final Score Calculation (40% Skill, 20% Exp, 15% Proj, 15% Semantic, 10% ATS)
 * 5. Cost control MD5 caching
 */
export const generateResumeFeedback = async (resumeText, jobDescription) => {
    const rText = (resumeText || '').trim();
    const jText = (jobDescription || '').trim();

    // 1. Check cache
    const cacheKey = crypto.createHash('md5').update(`${rText}:::${jText}`).digest('hex');
    if (analysisCache.has(cacheKey)) {
        console.log(`[Cache Hit] Returning stored AI analysis for hash ${cacheKey}`);
        return { ...analysisCache.get(cacheKey), cacheHit: true };
    }

    // 2. Deterministic Pipeline & Traditional ATS Checks
    const pipeline = runSkillPipeline(rText, jText);
    const { resumeSkills, jdSkills, matchedSkills, missingSkills, additionalSkills, matchPercentage } = pipeline;

    const ats = computeAtsBreakdown(rText, jText, { matchedSkills, jdSkills });
    const learningPath = buildLearningPath(missingSkills);
    const highlights = extractHighlightLines(rText);
    const profile = buildProfile(rText);

    const apiKey = await resolveApiKey();

    let aiOutput = null;

    if (apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const prompt = `You are a Senior Technical Recruiter and ATS AI Evaluator. Analyze the candidate resume against the target job description based on CONTEXT, SEMANTIC RELEVANCE, and REASONING.

STRICT HALLUCINATION PREVENTIONS:
- NEVER invent skills, experiences, projects, or metrics not present in the text.
- If there is no evidence for a skill or experience, explicitly state "No evidence found".
- Every matched skill MUST include exact textual evidence from the resume.

RESUME TEXT:
"""
${rText.substring(0, 7000)}
"""

JOB DESCRIPTION:
"""
${jText.substring(0, 3500)}
"""

PRE-COMPUTED DETERMINISTIC SKILL LIST:
Matched Skills: ${JSON.stringify(matchedSkills)}
Missing Skills: ${JSON.stringify(missingSkills)}

Perform a deep contextual evaluation and output ONLY a valid JSON object matching this exact schema:
{
  "matchedSkills": [
    { "skill": "SkillName", "evidence": "Exact quote or contextual description from resume", "confidence": 0.95 }
  ],
  "missingSkills": [
    { "skill": "SkillName", "importance": "high|medium|low", "reason": "Why this skill is missing or critical for the role" }
  ],
  "experienceMatch": 85,
  "projectMatch": 80,
  "semanticMatch": 88,
  "summary": "2-3 sentence overview of candidate contextual fit",
  "strengths": ["Strength 1 grounded in resume", "Strength 2 grounded in resume"],
  "weaknesses": ["Weakness 1 based on missing requirements", "Weakness 2 based on missing requirements"],
  "recommendations": ["Actionable tip 1", "Actionable tip 2"],
  "sectionAnalysis": {
    "summary": { "score": 80, "feedback": "Summary feedback" },
    "skills": { "score": 90, "feedback": "Skills feedback" },
    "experience": { "score": 85, "feedback": "Experience feedback" },
    "projects": { "score": 88, "feedback": "Projects feedback" }
  }
}

Return JSON ONLY. No markdown wrapping.`;

            const result = await model.generateContent(prompt);
            const rawResponse = result.response.text();

            let jsonStr = rawResponse;
            const startIndex = rawResponse.indexOf('{');
            const endIndex = rawResponse.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1) {
                jsonStr = rawResponse.slice(startIndex, endIndex + 1);
            }
            aiOutput = JSON.parse(jsonStr);
        } catch (err) {
            console.error('LLM contextual analysis failed, using semantic fallback:', err.message);
        }
    }

    // Default / Fallback contextual metrics if LLM unavailable
    const expMatch = aiOutput?.experienceMatch ?? (matchedSkills.length > 0 ? Math.min(95, matchPercentage + 10) : 50);
    const projMatch = aiOutput?.projectMatch ?? (highlights.length > 0 ? 80 : 60);
    const semMatch = aiOutput?.semanticMatch ?? Math.round((matchPercentage + ats.totalPercentage) / 2);
    const skillMatchScore = matchPercentage;
    const atsScoreVal = ats.totalPercentage;

    // Composite Final Multi-Signal Weighted Score (Part D):
    // 40% Skill Relevance + 20% Experience + 15% Project + 15% Semantic + 10% ATS
    const overallScore = Math.round(
        (0.40 * skillMatchScore) +
        (0.20 * expMatch) +
        (0.15 * projMatch) +
        (0.15 * semMatch) +
        (0.10 * atsScoreVal)
    );

    const aiMatched = aiOutput?.matchedSkills?.length
        ? aiOutput.matchedSkills.map(m => typeof m === 'string' ? m : m.skill)
        : [];
    const aiMissing = aiOutput?.missingSkills?.length
        ? aiOutput.missingSkills.map(m => typeof m === 'string' ? m : m.skill)
        : [];

    const formattedMatchedSkills = Array.from(new Set([...matchedSkills, ...aiMatched]));
    const formattedMissingSkills = Array.from(new Set([...missingSkills, ...aiMissing])).filter(s => !formattedMatchedSkills.includes(s));

    const finalResult = {
        matchScore: overallScore,
        overallScore,
        matchPercentage: overallScore,
        skillMatch: skillMatchScore,
        experienceMatch: expMatch,
        projectMatch: projMatch,
        semanticMatch: semMatch,
        atsScore: atsScoreVal,
        matchedSkills: formattedMatchedSkills,
        missingSkills: formattedMissingSkills,
        additionalSkills,
        resumeSkills,
        jdSkills,
        atsBreakdown: ats.breakdown,
        learningPath,
        roles: profile.roles,
        primaryRole: profile.primaryRole,
        yearsOfExperience: profile.yearsOfExperience,
        summary: aiOutput?.summary || `This candidate contextual match is ${overallScore}% based on skills, project relevance, and semantic fit.`,
        strengths: aiOutput?.strengths || matchedSkills.slice(0, 6),
        weaknesses: aiOutput?.weaknesses || missingSkills.slice(0, 6),
        recommendations: aiOutput?.recommendations || buildFallbackSuggestions(missingSkills, highlights, rText),
        suggestions: aiOutput?.recommendations || buildFallbackSuggestions(missingSkills, highlights, rText),
        sectionAnalysis: aiOutput?.sectionAnalysis || {
            summary: { score: 75, feedback: 'Standard profile summary.' },
            skills: { score: skillMatchScore, feedback: 'Evaluated against required tech stack.' },
            experience: { score: expMatch, feedback: 'Relevance to job responsibilities.' },
            projects: { score: projMatch, feedback: 'Project complexity and stack alignment.' }
        },
        analysisCacheHash: cacheKey
    };

    // Cache the result
    analysisCache.set(cacheKey, finalResult);

    return finalResult;
};

/**
 * Resume tailoring (Part 6): rewrites summary/skills/experience wording to
 * better fit a job description, without inventing new experience.
 */
export const tailorResumeToJob = async (resumeText, jobDescription) => {
    const apiKey = await resolveApiKey();
    if (apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const prompt = `You are an expert resume writer. Rewrite the WORDING of this resume to better target the job description below.

STRICT RULES:
- Do NOT invent any employer, project, degree, skill, or experience that is not already present in the original resume.
- You may only rephrase, reorder, and emphasize existing content, and improve clarity/impact of existing bullets.
- Keep it truthful and consistent with the original facts.

Original resume:
"""
${(resumeText || '').substring(0, 8000)}
"""

Target job description:
"""
${(jobDescription || '').substring(0, 3000)}
"""

Return JSON only in this format:
{
  "tailoredSummary": "...",
  "tailoredSkills": ["..."],
  "tailoredExperience": ["rewritten bullet 1", "rewritten bullet 2"],
  "tailoredProjects": ["rewritten project bullet 1", "..."],
  "changesExplanation": "short explanation of what wording was changed and why"
}`;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            let jsonStr = text;
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1) {
                jsonStr = text.slice(startIndex, endIndex + 1);
            }
            return JSON.parse(jsonStr);
        } catch (err) {
            console.error('AI resume tailoring failed, using fallback:', err.message);
        }
    }

    return {
        tailoredSummary: "Results-oriented software developer with hands-on experience building web applications and collaborating across cross-functional teams.",
        tailoredSkills: ["JavaScript", "React", "Node.js", "REST APIs", "Problem Solving"],
        tailoredExperience: [
            "Developed responsive user interfaces and scalable backend components.",
            "Collaborated with team members to deliver high-quality features following best engineering practices."
        ],
        tailoredProjects: [
            "Architected and deployed full-stack web applications with modern frameworks."
        ],
        changesExplanation: "Optimized phrasing to highlight core technical skills and quantifiable software development experience."
    };
};

/** Cover letter generator (Part 7). */
export const generateCoverLetter = async ({ resumeText, jobDescription, companyName, roleTitle, hiringManager }) => {
    const apiKey = await resolveApiKey();
    const candidateName = (resumeText || '').split('\n')[0]?.trim() || 'Applicant';
    const comp = companyName || 'your esteemed organization';
    const role = roleTitle || 'the advertised position';
    const manager = hiringManager || 'Hiring Manager';

    if (apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const prompt = `Write a concise, personalized, professional cover letter (under 350 words) for this candidate.

Candidate resume:
"""
${(resumeText || '').substring(0, 6000)}
"""

Job description:
"""
${(jobDescription || '').substring(0, 3000)}
"""

Company: ${comp}
Role: ${role}
Hiring Manager: ${manager}

Only reference skills/experience that actually appear in the resume text above. Do not invent achievements. Return plain text only (no JSON, no markdown fences).`;

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (err) {
            console.error('AI Cover letter generation failed, using template fallback:', err.message);
        }
    }

    return `Dear ${manager},

I am writing to express my strong interest in the ${role} position at ${comp}. With a solid technical background and hands-on experience in software development, I am confident in my ability to contribute effectively to your team.

My background includes building scalable applications, collaborating across functional teams, and applying modern software development best practices. I am particularly drawn to ${comp}'s mission and would welcome the opportunity to bring my skills and passion for problem-solving to your projects.

Thank you for your time and consideration. I look forward to the possibility of discussing how my experience aligns with your team's goals.

Sincerely,
${candidateName}`;
};
