/**
 * jobsService.js
 * --------------
 * Fetches REAL jobs from live, legitimately-accessible APIs. No hardcoded
 * or templated fake job listings are generated anywhere in this file.
 *
 * Platforms with genuine public/partner search APIs are queried directly:
 *   - Adzuna        (requires ADZUNA_APP_ID + ADZUNA_APP_KEY)
 *   - Jooble         (requires JOOBLE_API_KEY)
 *   - RemoteOK       (no key required, public JSON feed)
 *   - Remotive       (requires a free key — sign up at https://remotive.io/api-key)
 *   - Arbeitnow      (no key required, public JSON feed, EU/remote-focused)
 *   - JSearch        (requires RAPIDAPI_KEY — aggregates Google for Jobs,
 *                      which itself aggregates LinkedIn/Indeed/Glassdoor
 *                      listings through a licensed third-party API, not by
 *                      us scraping those sites directly)
 *   - USAJobs        (requires USAJOBS_API_KEY + USAJOBS_USER_AGENT/email)
 *   - Google Jobs via SerpAPI (requires SERPAPI_KEY) — optional aggregator
 *
 * LinkedIn, Indeed, Naukri, Wellfound, and Glassdoor do NOT offer public
 * job-search APIs for third-party apps (LinkedIn's official API does not
 * include public job search; the others require enterprise/partner deals
 * or explicitly disallow scraping in their Terms of Service). For those,
 * this service only builds a direct, clearly-labeled "search on <platform>"
 * link — it never fabricates listings that pretend to come from them.
 */

import { extractSkills, compareSkillSets } from './skillsService.js';

const PLATFORMS_WITHOUT_PUBLIC_API = ['LinkedIn', 'Indeed', 'Naukri', 'Wellfound', 'Glassdoor'];

/** Direct "search on platform" links — clearly not scraped/fake job data, just a search URL. */
export function buildPlatformSearchLinks(skills, location) {
    const query = encodeURIComponent(skills.slice(0, 6).join(' '));
    const loc = encodeURIComponent(location || '');
    const skillsSlug = skills.slice(0, 3).map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '-')).join('-');

    return [
        { name: 'LinkedIn', url: `https://www.linkedin.com/jobs/search/?keywords=${query}${loc ? `&location=${loc}` : ''}`, note: 'No public search API — opens LinkedIn directly' },
        { name: 'Indeed', url: `https://www.indeed.com/jobs?q=${query}${loc ? `&l=${loc}` : ''}`, note: 'No public search API — opens Indeed directly' },
        { name: 'Naukri', url: `https://www.naukri.com/${skillsSlug || 'jobs'}-jobs${loc ? `-in-${loc}` : ''}`, note: 'No public search API — opens Naukri directly' },
        { name: 'Wellfound', url: `https://wellfound.com/jobs?q=${query}`, note: 'No public search API — opens Wellfound directly' },
        { name: 'Glassdoor', url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${query}`, note: 'No public search API — opens Glassdoor directly' },
    ];
}

function computeJobMatch(skills, jobText) {
    const jobSkills = extractSkills(jobText);
    const { matchedSkills, missingSkills, matchPercentage } = compareSkillSets(skills, jobSkills);
    // For job matching we care about what the JOB requires vs what the candidate HAS,
    // so treat the job's extracted skills as the "requirement" set.
    const required = jobSkills;
    const matched = required.filter(s => skills.includes(s));
    const missing = required.filter(s => !skills.includes(s));
    const score = required.length > 0 ? Math.round((matched.length / required.length) * 100) : 0;
    return { matchedSkills: matched, missingSkills: missing, matchScore: score };
}

function withinPostedWindow(dateStr, postedFilter) {
    if (!postedFilter || postedFilter === 'any' || !dateStr) return true;
    const posted = new Date(dateStr).getTime();
    if (Number.isNaN(posted)) return true;
    const now = Date.now();
    const days = { today: 1, '3days': 3, week: 7 }[postedFilter];
    if (!days) return true;
    return (now - posted) <= days * 24 * 60 * 60 * 1000;
}

async function safeFetchJson(url, options) {
    const resp = await fetch(url, options);
    if (!resp.ok) throw new Error(`Request failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
}

// ---------- Adzuna ----------
async function fetchAdzuna(skills, { location, role, page = 1 } = {}) {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    const country = process.env.ADZUNA_COUNTRY || 'us';
    if (!appId || !appKey) return [];

    const query = encodeURIComponent([role, ...skills.slice(0, 4)].filter(Boolean).join(' '));
    const where = location ? `&where=${encodeURIComponent(location)}` : '';
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${query}${where}`;

    const data = await safeFetchJson(url);
    return (data.results || []).map(r => {
        const description = r.description || '';
        const { matchedSkills, missingSkills, matchScore } = computeJobMatch(skills, `${r.title} ${description}`);
        return {
            id: `adzuna-${r.id}`,
            title: r.title,
            company: r.company?.display_name || 'Unknown',
            location: r.location?.display_name || '',
            salary: r.salary_min && r.salary_max ? `${Math.round(r.salary_min)} - ${Math.round(r.salary_max)} ${r.salary_is_predicted === '1' ? '(est.)' : ''}`.trim() : null,
            employmentType: r.contract_time || r.contract_type || null,
            remote: /remote/i.test(r.title + ' ' + description),
            postedDate: r.created || null,
            platform: 'Adzuna',
            applyUrl: r.redirect_url,
            description: description.slice(0, 500),
            matchedSkills,
            missingSkills,
            matchScore,
        };
    });
}

// ---------- Jooble ----------
async function fetchJooble(skills, { location, role, page = 1 } = {}) {
    const apiKey = process.env.JOOBLE_API_KEY;
    if (!apiKey) return [];

    const url = `https://jooble.org/api/${apiKey}`;
    const data = await safeFetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: [role, ...skills.slice(0, 4)].filter(Boolean).join(' '), location: location || '', page: String(page) }),
    });

    return (data.jobs || []).map((r, idx) => {
        const description = r.snippet || '';
        const { matchedSkills, missingSkills, matchScore } = computeJobMatch(skills, `${r.title} ${description}`);
        return {
            id: `jooble-${r.id || idx}`,
            title: r.title,
            company: r.company || 'Unknown',
            location: r.location || '',
            salary: r.salary || null,
            employmentType: r.type || null,
            remote: /remote/i.test((r.title || '') + ' ' + description),
            postedDate: r.updated || null,
            platform: 'Jooble',
            applyUrl: r.link,
            description: description.slice(0, 500),
            matchedSkills,
            missingSkills,
            matchScore,
        };
    });
}

// ---------- RemoteOK (no key required) ----------
async function fetchRemoteOk(skills) {
    try {
        const data = await safeFetchJson('https://remoteok.com/api', {
            headers: { 'User-Agent': 'ai-resume-analyzer (contact via project README)' },
        });
        const listings = Array.isArray(data) ? data.filter(r => r && r.id && r.position) : [];
        return listings.map(r => {
            const description = r.description || '';
            const { matchedSkills, missingSkills, matchScore } = computeJobMatch(skills, `${r.position} ${r.tags?.join(' ') || ''} ${description}`);
            return {
                id: `remoteok-${r.id}`,
                title: r.position,
                company: r.company || 'Unknown',
                location: r.location || 'Remote',
                salary: r.salary_min && r.salary_max ? `$${r.salary_min} - $${r.salary_max}` : null,
                employmentType: null,
                remote: true,
                postedDate: r.date || null,
                platform: 'RemoteOK',
                applyUrl: r.url ? `https://remoteok.com${r.url}` : r.apply_url,
                description: description.slice(0, 500),
                matchedSkills,
                missingSkills,
                matchScore,
            };
        });
    } catch (e) {
        console.error('RemoteOK fetch error:', e.message);
        return [];
    }
}

// ---------- Remotive (requires a free API key — sign up at https://remotive.io/api-key) ----------
async function fetchRemotive(skills) {
    const apiKey = process.env.REMOTIVE_API_KEY;
    if (!apiKey) return [];
    try {
        const query = encodeURIComponent(skills[0] || '');
        const url = `https://remotive.com/api/remote-jobs${query ? `?search=${query}` : ''}`;
        const data = await safeFetchJson(url, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        return (data.jobs || []).slice(0, 40).map(r => {
            const description = (r.description || '').replace(/<[^>]+>/g, ' ');
            const { matchedSkills, missingSkills, matchScore } = computeJobMatch(skills, `${r.title} ${r.tags?.join(' ') || ''} ${description}`);
            return {
                id: `remotive-${r.id}`,
                title: r.title,
                company: r.company_name || 'Unknown',
                location: r.candidate_required_location || 'Remote',
                salary: r.salary || null,
                employmentType: r.job_type || null,
                remote: true,
                postedDate: r.publication_date || null,
                platform: 'Remotive',
                applyUrl: r.url,
                description: description.slice(0, 500),
                matchedSkills,
                missingSkills,
                matchScore,
            };
        });
    } catch (e) {
        console.error('Remotive fetch error:', e.message);
        return [];
    }
}

// ---------- USAJobs (US federal government jobs) ----------
async function fetchUsaJobs(skills, { location, role } = {}) {
    const apiKey = process.env.USAJOBS_API_KEY;
    const userAgentEmail = process.env.USAJOBS_USER_AGENT_EMAIL;
    if (!apiKey || !userAgentEmail) return [];

    const query = encodeURIComponent([role, ...skills.slice(0, 4)].filter(Boolean).join(' '));
    const locParam = location ? `&LocationName=${encodeURIComponent(location)}` : '';
    const url = `https://data.usajobs.gov/api/search?Keyword=${query}${locParam}&ResultsPerPage=25`;

    const data = await safeFetchJson(url, {
        headers: {
            'Host': 'data.usajobs.gov',
            'User-Agent': userAgentEmail,
            'Authorization-Key': apiKey,
        },
    });

    const items = data?.SearchResult?.SearchResultItems || [];
    return items.map(item => {
        const d = item.MatchedObjectDescriptor || {};
        const description = d.UserArea?.Details?.JobSummary || d.QualificationSummary || '';
        const { matchedSkills, missingSkills, matchScore } = computeJobMatch(skills, `${d.PositionTitle} ${description}`);
        const remuneration = d.PositionRemuneration?.[0];
        return {
            id: `usajobs-${d.PositionID}`,
            title: d.PositionTitle,
            company: d.OrganizationName || 'U.S. Government',
            location: d.PositionLocationDisplay || '',
            salary: remuneration ? `${remuneration.MinimumRange} - ${remuneration.MaximumRange} ${remuneration.RateIntervalCode || ''}`.trim() : null,
            employmentType: d.PositionSchedule?.[0]?.Name || null,
            remote: /remote|telework/i.test(d.PositionLocationDisplay || ''),
            postedDate: d.PublicationStartDate || null,
            platform: 'USAJobs',
            applyUrl: d.ApplyURI?.[0] || d.PositionURI,
            description: description.slice(0, 500),
            matchedSkills,
            missingSkills,
            matchScore,
        };
    });
}

// ---------- Google Jobs via SerpAPI (optional aggregator) ----------
async function fetchGoogleJobsViaSerpApi(skills, { location, role } = {}) {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) return [];

    const query = encodeURIComponent([role, ...skills.slice(0, 4)].filter(Boolean).join(' '));
    const loc = location ? `&location=${encodeURIComponent(location)}` : '';
    const url = `https://serpapi.com/search.json?engine=google_jobs&q=${query}${loc}&api_key=${apiKey}`;

    const data = await safeFetchJson(url);
    return (data.jobs_results || []).map((r, idx) => {
        const description = r.description || '';
        const { matchedSkills, missingSkills, matchScore } = computeJobMatch(skills, `${r.title} ${description}`);
        return {
            id: `googlejobs-${idx}-${(r.title || '').slice(0, 10)}`,
            title: r.title,
            company: r.company_name || 'Unknown',
            location: r.location || '',
            salary: r.detected_extensions?.salary || null,
            employmentType: r.detected_extensions?.schedule_type || null,
            remote: /remote/i.test((r.title || '') + ' ' + description),
            postedDate: r.detected_extensions?.posted_at || null,
            platform: 'Google Jobs',
            applyUrl: r.related_links?.[0]?.link || r.share_link,
            description: description.slice(0, 500),
            matchedSkills,
            missingSkills,
            matchScore,
        };
    });
}

// ---------- Arbeitnow (no key required, EU/remote-focused) ----------
async function fetchArbeitnow(skills, { role } = {}) {
    try {
        const data = await safeFetchJson('https://arbeitnow.com/api/job-board-api');
        const listings = data?.data || [];
        const queryTerms = [role, ...skills.slice(0, 3)].filter(Boolean).map(s => s.toLowerCase());

        return listings
            .filter(job => {
                if (queryTerms.length === 0) return true;
                const hay = `${job.title} ${job.description || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
                return queryTerms.some(term => hay.includes(term));
            })
            .slice(0, 40)
            .map(job => {
                const description = (job.description || '').replace(/<[^>]+>/g, ' ');
                const { matchedSkills, missingSkills, matchScore } = computeJobMatch(skills, `${job.title} ${(job.tags || []).join(' ')} ${description}`);
                return {
                    id: `arbeitnow-${job.slug || job.title}`,
                    title: job.title,
                    company: job.company_name || 'Unknown',
                    location: job.location || (job.remote ? 'Remote' : ''),
                    salary: null,
                    employmentType: (job.job_types || [])[0] || null,
                    remote: !!job.remote,
                    postedDate: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
                    platform: 'Arbeitnow',
                    applyUrl: job.url,
                    description: description.slice(0, 500),
                    matchedSkills,
                    missingSkills,
                    matchScore,
                };
            });
    } catch (e) {
        console.error('Arbeitnow fetch error:', e.message);
        return [];
    }
}

// ---------- JSearch via RapidAPI (aggregates Google for Jobs -> LinkedIn/Indeed/Glassdoor via a licensed API, not direct scraping) ----------
async function fetchJSearch(skills, { location, role, page = 1 } = {}) {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) return [];

    const queryText = [role, ...skills.slice(0, 4)].filter(Boolean).join(' ') + (location ? ` in ${location}` : '');
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(queryText)}&page=${page}&num_pages=1`;

    const data = await safeFetchJson(url, {
        headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
    });

    return (data.data || []).map(r => {
        const description = r.job_description || '';
        const { matchedSkills, missingSkills, matchScore } = computeJobMatch(skills, `${r.job_title} ${description}`);
        const salary = r.job_min_salary && r.job_max_salary ? `${r.job_min_salary} - ${r.job_max_salary} ${r.job_salary_currency || ''}`.trim() : null;
        return {
            id: `jsearch-${r.job_id}`,
            title: r.job_title,
            company: r.employer_name || 'Unknown',
            location: [r.job_city, r.job_country].filter(Boolean).join(', '),
            salary,
            employmentType: r.job_employment_type || null,
            remote: !!r.job_is_remote,
            postedDate: r.job_posted_at_datetime_utc || null,
            platform: 'JSearch (Google Jobs)',
            applyUrl: r.job_apply_link,
            description: description.slice(0, 500),
            matchedSkills,
            missingSkills,
            matchScore,
        };
    });
}

const SOURCE_FETCHERS = {
    adzuna: fetchAdzuna,
    jooble: fetchJooble,
    remoteok: (skills) => fetchRemoteOk(skills),
    remotive: (skills) => fetchRemotive(skills),
    arbeitnow: fetchArbeitnow,
    jsearch: fetchJSearch,
    usajobs: fetchUsaJobs,
    googleJobs: fetchGoogleJobsViaSerpApi,
};

/**
 * Search all configured live job sources in parallel, merge, dedupe, filter, sort, paginate.
 */
export async function searchJobs(skills, filters = {}) {
    const {
        location = '',
        role = '',
        remoteOnly = false,
        employmentType = 'all', // full-time, part-time, contract, internship
        postedWithin = 'any', // today, 3days, week, any
        minSalary = null,
        company = '',
        techStack = [],
        sortBy = 'relevance', // relevance, newest, salary, remote
        page = 1,
        pageSize = 12,
    } = filters;

    const fetchers = Object.values(SOURCE_FETCHERS);
    const settled = await Promise.allSettled(fetchers.map(fn => fn(skills, { location, role, page: 1 })));

    const activeSources = [];
    let jobs = [];
    settled.forEach((result, idx) => {
        const sourceName = Object.keys(SOURCE_FETCHERS)[idx];
        if (result.status === 'fulfilled') {
            if (result.value.length > 0) activeSources.push(sourceName);
            jobs.push(...result.value);
        } else {
            console.error(`Job source "${sourceName}" failed:`, result.reason?.message);
        }
    });

    // Dedupe by title+company (case-insensitive)
    const seen = new Set();
    jobs = jobs.filter(j => {
        const key = `${(j.title || '').toLowerCase()}|${(j.company || '').toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Filters
    if (remoteOnly) jobs = jobs.filter(j => j.remote);
    if (employmentType && employmentType !== 'all') {
        jobs = jobs.filter(j => (j.employmentType || '').toLowerCase().includes(employmentType.toLowerCase()));
    }
    if (postedWithin !== 'any') jobs = jobs.filter(j => withinPostedWindow(j.postedDate, postedWithin));
    if (company) jobs = jobs.filter(j => (j.company || '').toLowerCase().includes(company.toLowerCase()));
    if (techStack.length > 0) {
        const wanted = techStack.map(t => t.toLowerCase());
        jobs = jobs.filter(j => {
            const hay = `${j.title} ${j.description}`.toLowerCase();
            return wanted.some(t => hay.includes(t));
        });
    }
    if (minSalary) {
        jobs = jobs.filter(j => {
            const num = parseInt((j.salary || '').replace(/[^0-9]/g, ''), 10);
            return !Number.isNaN(num) ? num >= minSalary : true; // don't drop jobs with unparsable salary
        });
    }
    if (location) {
        const loc = location.toLowerCase();
        jobs = jobs.filter(j => j.remote || (j.location || '').toLowerCase().includes(loc));
    }

    // Sorting
    switch (sortBy) {
        case 'newest':
            jobs.sort((a, b) => new Date(b.postedDate || 0) - new Date(a.postedDate || 0));
            break;
        case 'salary':
            jobs.sort((a, b) => {
                const sa = parseInt((a.salary || '').replace(/[^0-9]/g, ''), 10) || 0;
                const sb = parseInt((b.salary || '').replace(/[^0-9]/g, ''), 10) || 0;
                return sb - sa;
            });
            break;
        case 'remote':
            jobs.sort((a, b) => (b.remote === a.remote ? b.matchScore - a.matchScore : b.remote - a.remote));
            break;
        case 'relevance':
        default:
            jobs.sort((a, b) => b.matchScore - a.matchScore);
    }

    const total = jobs.length;
    const start = (page - 1) * pageSize;
    const paginated = jobs.slice(start, start + pageSize);

    return {
        jobs: paginated,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        activeSources,
        unavailableViaApi: PLATFORMS_WITHOUT_PUBLIC_API,
    };
}
