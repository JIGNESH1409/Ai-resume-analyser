import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5001/api';

// Attach the auth token (if present) to every outgoing request
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token && config.url && config.url.startsWith(API_BASE_URL)) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// If the token is invalid/expired, clear it out and send the user back to login
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const registerUser = async (name, email, password, role = 'org', companyName = '') => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, { name, email, password, role, companyName });
    return response.data;
};

export const loginUser = async (email, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
    return response.data;
};

export const getCurrentUser = async () => {
    const response = await axios.get(`${API_BASE_URL}/auth/me`);
    return response.data;
};

export const analyzeResume = async (file, jobDescription) => {
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobDescription', jobDescription);

    // Let the browser set the Content-Type (including boundary) for multipart/form-data
    const response = await axios.post(`${API_BASE_URL}/resume/analyze`, formData);

    return response.data;
};

export const getCandidates = async () => {
    const response = await axios.get(`${API_BASE_URL}/candidates`);
    return response.data;
};

export const getCandidateById = async (id) => {
    const response = await axios.get(`${API_BASE_URL}/candidates/${id}`);
    return response.data;
};

export const deleteCandidate = async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/candidates/${id}`);
    return response.data;
};

export const getJobs = async () => {
    const response = await axios.get(`${API_BASE_URL}/jobs`);
    return response.data;
};

export const createJob = async (jobData) => {
    const response = await axios.post(`${API_BASE_URL}/jobs`, jobData);
    return response.data;
};

export const deleteJob = async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/jobs/${id}`);
    return response.data;
};

export const getJobRecommendations = async (skillsArray) => {
    const skillsParam = skillsArray.join(',');
    const response = await axios.get(`${API_BASE_URL}/jobs/recommended?skills=${encodeURIComponent(skillsParam)}`);
    return response.data;
};

export const findJobs = async (params = {}) => {
    const response = await axios.get(`${API_BASE_URL}/job-finder`, { params });
    return response.data;
};

export const tailorResume = async (candidateId, jobDescription) => {
    const response = await axios.post(`${API_BASE_URL}/resume/tailor`, { candidateId, jobDescription });
    return response.data;
};

export const generateCoverLetter = async ({ candidateId, jobDescription, companyName, roleTitle, hiringManager }) => {
    const response = await axios.post(`${API_BASE_URL}/resume/cover-letter`, { candidateId, jobDescription, companyName, roleTitle, hiringManager });
    return response.data;
};

export const getAnalytics = async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics`);
    return response.data;
};

export const getSettings = async () => {
    const response = await axios.get(`${API_BASE_URL}/settings`);
    return response.data;
};

export const updateSettings = async (settingsData) => {
    const response = await axios.post(`${API_BASE_URL}/settings`, settingsData);
    return response.data;
};

/**
 * Upload multiple resume PDFs for bulk analysis (org-only).
 * Uses XMLHttpRequest so we can report upload progress via onProgress(percent).
 */
export const bulkAnalyzeResumes = (files, jobDescription, onProgress) => {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        files.forEach((file) => formData.append('resumes', file));
        if (jobDescription) formData.append('jobDescription', jobDescription);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/resume/bulk-analyze`);

        const token = localStorage.getItem('authToken');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });

        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(data);
                } else {
                    reject(new Error(data.error || 'Bulk analysis failed'));
                }
            } catch {
                reject(new Error('Invalid server response'));
            }
        };

        xhr.onerror = () => reject(new Error('Network error during bulk upload'));
        xhr.send(formData);
    });
};
