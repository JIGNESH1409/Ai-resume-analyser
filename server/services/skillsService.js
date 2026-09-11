/**
 * skillsService.js
 * -----------------
 * Deterministic skill extraction, normalization, and comparison.
 * This replaces "ask the LLM to guess matched/missing skills" with a
 * rule-based pipeline so results are reproducible and never hallucinated:
 *
 *   extractSkills(text) -> normalize(text) -> compareSkillSets(resume, jd)
 */

// Canonical skill -> list of raw aliases/synonyms that should map to it.
// Keys are the "display" form returned to the client.
const SKILL_ALIASES = {
    'JavaScript': ['javascript', 'js', 'es6', 'es2015', 'ecmascript'],
    'TypeScript': ['typescript', 'ts'],
    'React': ['react', 'react.js', 'reactjs'],
    'Redux': ['redux', 'redux toolkit', 'rtk'],
    'Next.js': ['next.js', 'nextjs', 'next js'],
    'Node.js': ['node.js', 'nodejs', 'node'],
    'Express.js': ['express.js', 'expressjs', 'express'],
    'Vue.js': ['vue.js', 'vuejs', 'vue'],
    'Angular': ['angular', 'angularjs', 'angular.js'],
    'Svelte': ['svelte', 'sveltekit'],
    'HTML': ['html', 'html5'],
    'CSS': ['css', 'css3'],
    'Sass': ['sass', 'scss'],
    'Tailwind CSS': ['tailwind css', 'tailwind', 'tailwindcss'],
    'Bootstrap': ['bootstrap'],
    'MongoDB': ['mongodb', 'mongo', 'mongo db'],
    'MySQL': ['mysql'],
    'PostgreSQL': ['postgresql', 'postgres', 'psql'],
    'SQLite': ['sqlite', 'sqlite3'],
    'SQL': ['sql', 'structured query language'],
    'NoSQL': ['nosql'],
    'Redis': ['redis'],
    'GraphQL': ['graphql'],
    'REST API': ['rest api', 'restful api', 'rest', 'restful', 'api development'],
    'Docker': ['docker', 'containerization'],
    'Kubernetes': ['kubernetes', 'k8s'],
    'AWS': ['aws', 'amazon web services'],
    'Azure': ['azure', 'microsoft azure'],
    'GCP': ['gcp', 'google cloud platform', 'google cloud'],
    'CI/CD': ['ci/cd', 'ci cd', 'continuous integration', 'continuous deployment', 'continuous delivery'],
    'Git': ['git'],
    'GitHub': ['github'],
    'GitLab': ['gitlab'],
    'Linux': ['linux', 'unix'],
    'Nginx': ['nginx'],
    'Firebase': ['firebase'],
    'Python': ['python', 'python3'],
    'Java': ['java'],
    'C++': ['c++', 'cpp'],
    'C#': ['c#', 'csharp', 'c sharp'],
    'C': ['c programming', ' c '],
    'Go': ['golang', 'go lang'],
    'Rust': ['rust'],
    'PHP': ['php'],
    'Ruby': ['ruby', 'ruby on rails', 'rails'],
    'Django': ['django'],
    'Flask': ['flask'],
    'Spring Boot': ['spring boot', 'springboot', 'spring'],
    '.NET': ['.net', 'dotnet', 'asp.net'],
    'Machine Learning': ['machine learning', 'ml'],
    'Deep Learning': ['deep learning', 'dl'],
    'Artificial Intelligence': ['artificial intelligence', 'ai'],
    'Natural Language Processing': ['natural language processing', 'nlp'],
    'Computer Vision': ['computer vision', 'cv'],
    'TensorFlow': ['tensorflow', 'tf'],
    'PyTorch': ['pytorch', 'torch'],
    'Pandas': ['pandas'],
    'NumPy': ['numpy'],
    'Scikit-learn': ['scikit-learn', 'sklearn', 'scikit learn'],
    'Data Structures & Algorithms': ['data structures', 'algorithms', 'dsa', 'data structures and algorithms'],
    'React Native': ['react native', 'reactnative'],
    'Flutter': ['flutter'],
    'Kotlin': ['kotlin'],
    'Swift': ['swift'],
    'Jira': ['jira'],
    'Agile': ['agile', 'scrum'],
    'Figma': ['figma'],
    'Webpack': ['webpack'],
    'Vite': ['vite'],
    'Jest': ['jest'],
    'Cypress': ['cypress'],
    'JWT Authentication': ['jwt', 'json web token', 'jwt authentication'],
    'OAuth': ['oauth', 'oauth2'],
    'Microservices': ['microservices', 'micro services'],
    'GraphQL API': ['graphql api'],
    'Socket.IO': ['socket.io', 'socketio', 'websockets', 'web sockets'],
};

// Build a fast lookup: normalized alias string -> canonical skill name.
const ALIAS_TO_CANONICAL = new Map();
for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    // canonical itself is also a valid alias
    const all = [canonical, ...aliases];
    for (const alias of all) {
        const key = normalizeToken(alias);
        if (key) ALIAS_TO_CANONICAL.set(key, canonical);
    }
}

/** Lowercase, strip punctuation (but keep +, #, ., which matter for C++/C#/.NET), collapse whitespace. */
function normalizeToken(raw) {
    if (!raw) return '';
    return raw
        .toLowerCase()
        .trim()
        .replace(/[`'"“”‘’]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Sort aliases longest-first so multi-word skills (e.g. "react native") are
// matched before their shorter substrings (e.g. "react").
const SORTED_ALIASES = Array.from(ALIAS_TO_CANONICAL.keys()).sort((a, b) => b.length - a.length);

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Stack / Acronym expansions so "MERN stack", "MEAN stack", etc. expand into constituent technologies
const STACK_EXPANSIONS = {
    'mern': ['MongoDB', 'Express.js', 'React', 'Node.js', 'JavaScript'],
    'mern stack': ['MongoDB', 'Express.js', 'React', 'Node.js', 'JavaScript'],
    'mean': ['MongoDB', 'Express.js', 'Angular', 'Node.js', 'JavaScript'],
    'mean stack': ['MongoDB', 'Express.js', 'Angular', 'Node.js', 'JavaScript'],
    'pern': ['PostgreSQL', 'Express.js', 'React', 'Node.js', 'JavaScript'],
    'pern stack': ['PostgreSQL', 'Express.js', 'React', 'Node.js', 'JavaScript'],
    'lamp': ['Linux', 'Apache', 'MySQL', 'PHP'],
    'lamp stack': ['Linux', 'Apache', 'MySQL', 'PHP'],
    'mevn': ['MongoDB', 'Express.js', 'Vue.js', 'Node.js', 'JavaScript'],
    'mevn stack': ['MongoDB', 'Express.js', 'Vue.js', 'Node.js', 'JavaScript'],
    'full stack': ['HTML', 'CSS', 'JavaScript', 'REST API'],
    'fullstack': ['HTML', 'CSS', 'JavaScript', 'REST API'],
};

/**
 * Extract the set of canonical skills mentioned in free text (resume or JD).
 * Deterministic: same input always yields same output. No LLM involved.
 */
export function extractSkills(text) {
    const rawLower = (text || '').toLowerCase();
    const normalizedText = ' ' + normalizeToken(text || '').replace(/[,/|;]/g, ' ') + ' ';
    const found = new Set();

    // Check for stack expansions (e.g. MERN stack -> MongoDB, Express.js, React, Node.js)
    for (const [stackKey, canonicalList] of Object.entries(STACK_EXPANSIONS)) {
        if (rawLower.includes(stackKey)) {
            canonicalList.forEach(s => found.add(s));
        }
    }

    for (const alias of SORTED_ALIASES) {
        // word-boundary-ish match; alias may contain '.', '+', '#' so we can't rely on \b alone
        const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(alias)}(?:$|[^a-z0-9])`, 'i');
        if (pattern.test(normalizedText)) {
            found.add(ALIAS_TO_CANONICAL.get(alias));
        }
    }

    return Array.from(found).sort();
}

/**
 * Compare resume skills vs job-description skills.
 * Deduplicated, case/punctuation/order-insensitive (handled during extraction).
 */
export function compareSkillSets(resumeSkills, jdSkills) {
    const resumeSet = new Set(resumeSkills);
    const jdSet = new Set(jdSkills);

    const matchedSkills = jdSkills.filter(s => resumeSet.has(s));
    const missingSkills = jdSkills.filter(s => !resumeSet.has(s));
    const additionalSkills = resumeSkills.filter(s => !jdSet.has(s));

    const matchPercentage = jdSkills.length > 0
        ? Math.round((matchedSkills.length / jdSkills.length) * 100)
        : (resumeSkills.length > 0 ? 100 : 0);

    return { matchedSkills, missingSkills, additionalSkills, matchPercentage };
}

/**
 * Full deterministic pipeline described in the spec:
 * Step 1: extract resume skills
 * Step 2: extract JD skills
 * Step 3: normalize (built into extraction above)
 * Step 4: compare
 * Step 5: return structured result
 */
export function runSkillPipeline(resumeText, jobDescription) {
    const resumeSkills = extractSkills(resumeText);
    const jdSkills = extractSkills(jobDescription);
    const comparison = compareSkillSets(resumeSkills, jdSkills);
    return { resumeSkills, jdSkills, ...comparison };
}

/** Suggests a short learning path for the missing skills, ordered by how they were required. */
export function buildLearningPath(missingSkills) {
    return missingSkills.slice(0, 6).map(skill => ({
        skill,
        suggestion: `Learn ${skill} through an official guide or a small hands-on project, then add it to your resume once you've used it in something real.`,
    }));
}

export function getAllCanonicalSkills() {
    return Object.keys(SKILL_ALIASES);
}
