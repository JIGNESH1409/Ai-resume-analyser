/**
 * atsService.js
 * -------------
 * Deterministic, rule-based ATS (Applicant Tracking System) score breakdown.
 * Every sub-score is computed from measurable signals in the resume text so
 * the total is reproducible, not an LLM guess.
 */

const SECTION_KEYWORDS = {
    projects: ['project', 'projects', 'built', 'developed a', 'personal project'],
    experience: ['experience', 'internship', 'intern', 'worked at', 'employment'],
    education: ['education', 'university', 'college', 'bachelor', 'b.tech', 'b.e.', 'm.tech', 'degree', 'gpa', 'cgpa'],
    achievements: ['award', 'achievement', 'winner', 'hackathon', 'certified', 'certification', 'published', 'patent', 'rank'],
};

const SOFT_SKILLS = [
    'communication', 'leadership', 'teamwork', 'team player', 'problem solving',
    'problem-solving', 'collaboration', 'adaptability', 'time management',
    'critical thinking', 'creativity', 'ownership', 'mentoring', 'presentation',
];

const ACTION_VERBS = [
    'led', 'built', 'developed', 'designed', 'implemented', 'created', 'optimized',
    'improved', 'launched', 'automated', 'reduced', 'increased', 'architected',
    'managed', 'deployed', 'refactored', 'migrated', 'mentored', 'delivered',
];

function scoreOutOf20(ratio) {
    return Math.max(0, Math.min(20, Math.round(ratio * 20)));
}

function countMatches(text, terms) {
    const lower = text.toLowerCase();
    return terms.filter(t => lower.includes(t)).length;
}

function hasSection(text, keywords) {
    return countMatches(text, keywords) > 0;
}

/** Very rough grammar heuristic: penalizes repeated words, sentence run-ons, missing capitalization. Not a full grammar checker. */
function estimateGrammarScore(text) {
    const sentences = text.split(/[.\n]/).map(s => s.trim()).filter(Boolean);
    if (sentences.length === 0) return 10;

    let issues = 0;
    for (const s of sentences) {
        const words = s.split(/\s+/).filter(Boolean);
        // extremely long "sentence" (likely a run-on bullet with no punctuation)
        if (words.length > 40) issues += 1;
        // doubled words e.g. "the the"
        for (let i = 1; i < words.length; i++) {
            if (words[i].toLowerCase() === words[i - 1].toLowerCase()) issues += 1;
        }
    }
    const issueRatio = issues / sentences.length;
    return scoreOutOf20(Math.max(0, 1 - issueRatio));
}

function estimateFormattingScore(text) {
    let score = 20;
    const lines = text.split('\n').filter(l => l.trim().length > 0);

    if (lines.length < 10) score -= 6; // likely too sparse / parsing issue
    if (text.length > 12000) score -= 4; // likely too long / multi-column noise
    const bulletLikeLines = lines.filter(l => /^[•\-*●▪]/.test(l.trim())).length;
    if (bulletLikeLines === 0) score -= 4; // no bullet structure detected
    const hasEmail = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/.test(text);
    if (!hasEmail) score -= 4;
    const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(text);
    if (!hasPhone) score -= 2;

    return Math.max(0, Math.min(20, score));
}

function estimateLengthScore(text) {
    const words = text.split(/\s+/).filter(Boolean).length;
    // Ideal resume: roughly 350-900 words (1-2 pages)
    if (words < 150) return scoreOutOf20(words / 300);
    if (words <= 900) return 20;
    if (words <= 1300) return 16;
    return 10;
}

/**
 * Compute the full ATS breakdown.
 * @param {string} resumeText
 * @param {string} jobDescription
 * @param {{matchedSkills:string[], missingSkills:string[], jdSkills:string[]}} skillComparison
 */
export function computeAtsBreakdown(resumeText, jobDescription, skillComparison) {
    const text = resumeText || '';
    const jd = jobDescription || '';
    const { matchedSkills = [], jdSkills = [] } = skillComparison || {};

    // Skills (0-20): proportion of JD skills present in resume
    const skillsScore = jdSkills.length > 0
        ? scoreOutOf20(matchedSkills.length / jdSkills.length)
        : scoreOutOf20(matchedSkills.length > 0 ? 1 : 0.5);

    // Projects (0-20)
    const projectMentions = countMatches(text, SECTION_KEYWORDS.projects);
    const projectsScore = scoreOutOf20(Math.min(1, projectMentions / 3));

    // Experience (0-20)
    const experienceScore = hasSection(text, SECTION_KEYWORDS.experience) ? scoreOutOf20(Math.min(1, countMatches(text, SECTION_KEYWORDS.experience) / 2)) : 6;

    // Education (0-20)
    const educationScore = hasSection(text, SECTION_KEYWORDS.education) ? 18 : 6;

    // Keywords (0-20): overlap between resume text tokens and JD keyword tokens beyond formal skills list
    const jdWords = Array.from(new Set(jd.toLowerCase().match(/[a-z][a-z0-9+.#]{2,}/g) || []));
    const resumeWordsSet = new Set(text.toLowerCase().match(/[a-z][a-z0-9+.#]{2,}/g) || []);
    const overlap = jdWords.filter(w => resumeWordsSet.has(w));
    const keywordsScore = jdWords.length > 0 ? scoreOutOf20(overlap.length / jdWords.length) : 12;

    // Formatting (0-20)
    const formattingScore = estimateFormattingScore(text);

    // Achievements (0-20)
    const achievementMentions = countMatches(text, SECTION_KEYWORDS.achievements) + countMatches(text, ACTION_VERBS);
    const achievementsScore = scoreOutOf20(Math.min(1, achievementMentions / 8));

    // Soft skills (0-20)
    const softSkillMentions = countMatches(text, SOFT_SKILLS);
    const softSkillsScore = scoreOutOf20(Math.min(1, softSkillMentions / 3));

    // Missing keywords (0-20): inverse of missing JD skills ratio
    const missingKeywordsScore = jdSkills.length > 0
        ? scoreOutOf20(matchedSkills.length / jdSkills.length)
        : 15;

    // Grammar (0-20)
    const grammarScore = estimateGrammarScore(text);

    // Resume length (0-20)
    const lengthScore = estimateLengthScore(text);

    const breakdown = {
        skills: skillsScore,
        projects: projectsScore,
        experience: experienceScore,
        education: educationScore,
        keywords: keywordsScore,
        formatting: formattingScore,
        achievements: achievementsScore,
        softSkills: softSkillsScore,
        missingKeywords: missingKeywordsScore,
        grammar: grammarScore,
        resumeLength: lengthScore,
    };

    const values = Object.values(breakdown);
    const totalPercentage = Math.round(
        (values.reduce((sum, v) => sum + v, 0) / (values.length * 20)) * 100
    );

    return {
        breakdown, // each field is X / 20
        maxPerCategory: 20,
        totalPercentage,
    };
}
