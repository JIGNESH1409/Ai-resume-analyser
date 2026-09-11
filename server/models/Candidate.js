import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
    name: {
        type: String,
        default: 'Unknown Candidate'
    },
    email: {
        type: String,
        default: 'unknown@example.com'
    },
    atsScore: {
        type: Number,
        default: 0
    },
    matchScore: {
        type: Number,
        default: 0
    },
    overallScore: {
        type: Number,
        default: 0
    },
    skillMatch: {
        type: Number,
        default: 0
    },
    experienceMatch: {
        type: Number,
        default: 0
    },
    projectMatch: {
        type: Number,
        default: 0
    },
    semanticMatch: {
        type: Number,
        default: 0
    },
    sectionAnalysis: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    analysisCacheHash: {
        type: String,
        default: ''
    },
    skills: {
        type: [String],
        default: []
    },
    matchedSkills: {
        type: [String],
        default: []
    },
    missingSkills: {
        type: [String],
        default: []
    },
    suggestions: {
        type: [String],
        default: []
    },
    additionalSkills: {
        type: [String],
        default: []
    },
    atsBreakdown: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    strengths: {
        type: [String],
        default: []
    },
    weaknesses: {
        type: [String],
        default: []
    },
    learningPath: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    summary: {
        type: String,
        default: ''
    },
    roles: {
        type: [String],
        default: []
    },
    primaryRole: {
        type: String,
        default: ''
    },
    yearsOfExperience: {
        type: Number,
        default: null
    },
    jobDescription: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        default: 'Analyzed'
    },
    resumeText: {
        type: String,
        default: ''
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    uploadedBy: {
        type: String,
        enum: ['user', 'org'],
        default: 'org'
    }
});

export default mongoose.model('Candidate', candidateSchema);
