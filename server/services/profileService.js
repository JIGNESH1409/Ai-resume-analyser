/**
 * profileService.js
 * -----------------
 * Deterministic extraction of role/title and years-of-experience signals
 * from resume text, used to (a) enrich the analysis output and (b) bias
 * job search queries toward the candidate's actual target role — not just
 * their raw skill list.
 */

const KNOWN_ROLES = [
    'Software Engineer', 'Software Developer', 'Full Stack Developer', 'Frontend Developer',
    'Front End Developer', 'Backend Developer', 'Back End Developer', 'Web Developer',
    'Mobile Developer', 'iOS Developer', 'Android Developer', 'React Developer', 'React Native Developer',
    'Node.js Developer', 'Python Developer', 'Java Developer', 'DevOps Engineer', 'Site Reliability Engineer',
    'Cloud Engineer', 'Data Engineer', 'Data Scientist', 'Data Analyst', 'Machine Learning Engineer',
    'AI Engineer', 'ML Engineer', 'QA Engineer', 'Test Engineer', 'Automation Engineer',
    'Product Manager', 'Project Manager', 'Business Analyst', 'UI/UX Designer', 'UX Designer',
    'UI Designer', 'Product Designer', 'Graphic Designer', 'Systems Administrator', 'Network Engineer',
    'Security Engineer', 'Cybersecurity Analyst', 'Database Administrator', 'Solutions Architect',
    'Technical Lead', 'Engineering Manager', 'Intern', 'Software Intern', 'Research Assistant',
];

function normalize(str) {
    return (str || '').toLowerCase().trim();
}

/** Finds which known role titles are literally mentioned in the resume text. */
export function extractRoles(text) {
    const lower = normalize(text);
    const found = KNOWN_ROLES.filter(role => lower.includes(role.toLowerCase()));
    // longest/most-specific match first (e.g. "Full Stack Developer" over "Developer")
    return Array.from(new Set(found)).sort((a, b) => b.length - a.length);
}

export function getPrimaryRole(text) {
    const roles = extractRoles(text);
    return roles[0] || null;
}

/**
 * Estimates total years of professional experience from explicit phrases
 * ("3 years of experience", "5+ years") and, as a fallback, from date
 * ranges in an Experience section (e.g. "Jan 2021 - Present").
 */
export function extractYearsOfExperience(text) {
    const t = text || '';

    // 1. Explicit statement: "3 years of experience", "5+ years experience"
    const explicitMatch = t.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/i);
    if (explicitMatch) {
        return parseInt(explicitMatch[1], 10);
    }

    // 2. Sum up date ranges like "Jan 2021 - Present" / "2019 - 2022" / "06/2020 - 08/2022"
    const rangePattern = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\d{4})\s*[-–—to]{1,3}\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(present|current|\d{4})/gi;
    let totalMonths = 0;
    let match;
    const now = new Date();
    while ((match = rangePattern.exec(t)) !== null) {
        const startYear = parseInt(match[2], 10);
        const endRaw = match[4].toLowerCase();
        const endYear = (endRaw === 'present' || endRaw === 'current') ? now.getFullYear() : parseInt(endRaw, 10);
        if (!Number.isNaN(startYear) && !Number.isNaN(endYear) && endYear >= startYear && (endYear - startYear) <= 40) {
            totalMonths += (endYear - startYear) * 12;
        }
    }
    if (totalMonths > 0) {
        return Math.round(totalMonths / 12);
    }

    return null; // unknown — don't guess
}

export function buildProfile(resumeText) {
    return {
        roles: extractRoles(resumeText),
        primaryRole: getPrimaryRole(resumeText),
        yearsOfExperience: extractYearsOfExperience(resumeText),
    };
}
