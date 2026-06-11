import FamilyWelfareProfile from '../models/FamilyWelfareProfile.js';
import FamilyGroup from '../models/FamilyGroup.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Static Welfare Schemes Registry with Local Fallback Content
const welfareSchemesRegistry = [
    {
        id: 'pm-kisan',
        name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
        category: 'Farmers',
        benefits: '₹6,000 per year direct benefit transfer (DBT) in 3 equal installments of ₹2,000.',
        estimatedFinancialImpact: 6000,
        officialLink: 'https://pmkisan.gov.in/',
        applyLink: 'https://pmkisan.gov.in/RegistrationFormNew.aspx',
        deadline: 'Ongoing / No fixed deadline',
        defaultDocs: ['Aadhaar Card', 'Landholding Ownership Papers/Khatauni', 'Bank Passbook', 'Mobile Number'],
        defaultWhy: 'Recommended because you have declared farming as your active livelihood status.',
        checkEligibility: (profile) => {
            if (profile.isFarmer) {
                return { eligible: true, score: 100, reason: "Recommended for active farming households." };
            }
            return { eligible: false, score: 0, reason: "Requires farmer status." };
        }
    },
    {
        id: 'pmay',
        name: 'Pradhan Mantri Awas Yojana (PMAY)',
        category: 'Housing',
        benefits: 'Up to ₹2.67 Lakh interest subsidy on housing credit loans for home purchase or construction.',
        estimatedFinancialImpact: 250000,
        officialLink: 'https://pmaymis.gov.in/',
        applyLink: 'https://pmaymis.gov.in/Open/CitizenAssessment.aspx',
        deadline: 'December 31, 2026',
        defaultDocs: ['Aadhaar Card', 'Income Certificate', 'Affidavit stating no pucca house is owned anywhere in India', 'Residential Proof', 'Bank Passbook'],
        defaultWhy: 'You qualify because your family does not currently own a permanent (pucca) house and income is within EWS/LIG brackets.',
        checkEligibility: (profile) => {
            if (profile.ownsHome) {
                return { eligible: false, score: 0, reason: "Requires that the family does not own a permanent house." };
            }
            if (profile.annualFamilyIncome > 1800000) {
                return { eligible: false, score: 30, reason: "Income exceeds PMAY eligibility threshold of ₹18 Lakhs." };
            }
            const score = profile.annualFamilyIncome <= 600000 ? 100 : (profile.annualFamilyIncome <= 1200000 ? 80 : 60);
            return { eligible: true, score, reason: "Recommended because your family has no permanent house ownership and falls under the income criteria." };
        }
    },
    {
        id: 'ayushman-bharat',
        name: 'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)',
        category: 'Healthcare',
        benefits: 'Cashless healthcare coverage of up to ₹5,00,000 per family per year for secondary/tertiary hospitalizations.',
        estimatedFinancialImpact: 500000,
        officialLink: 'https://www.pmjay.gov.in/',
        applyLink: 'https://setu.pmjay.gov.in/setu/',
        deadline: 'Ongoing / No deadline',
        defaultDocs: ['Aadhaar Card', 'Ration Card (NFSA coverage)', 'Income Proof', 'Pehchan Patra / Family ID Card'],
        defaultWhy: 'You qualify for public health cover because your annual family income is ₹2.5 Lakhs or less.',
        checkEligibility: (profile) => {
            if (profile.annualFamilyIncome > 250000) {
                return { eligible: false, score: 20, reason: "Income exceeds the typical eligibility bracket for PM-JAY (usually low-income/deprived families)." };
            }
            return { eligible: true, score: 100, reason: "Recommended based on family income under ₹2.5 Lakhs per annum." };
        }
    },
    {
        id: 'pm-sym',
        name: 'Pradhan Mantri Shram Yogi Maan-dhan (PM-SYM)',
        category: 'Pension',
        benefits: 'Assured monthly old-age pension of ₹3,000 after attaining the age of 60.',
        estimatedFinancialImpact: 36000,
        officialLink: 'https://maandhan.in/',
        applyLink: 'https://maandhan.in/shramyogi',
        deadline: 'Ongoing / Open registration',
        defaultDocs: ['Aadhaar Card', 'Savings Bank Account Passbook with IFSC', 'Consent Form for auto-debit'],
        defaultWhy: 'Recommended for unorganized workers aged 18-40 with family income under ₹1.8 Lakhs/year.',
        checkEligibility: (profile) => {
            if (profile.annualFamilyIncome > 180000) {
                return { eligible: false, score: 10, reason: "Requires monthly income of ₹15,000 or less (₹1.8L annual)." };
            }
            const hasEligibleAge = profile.memberAges.some(age => age >= 18 && age <= 40);
            if (!hasEligibleAge) {
                return { eligible: false, score: 20, reason: "Requires at least one member in the entry age group of 18-40 years." };
            }
            return { eligible: true, score: 95, reason: "Recommended for unorganized workers under age 40 with monthly income below ₹15,000." };
        }
    },
    {
        id: 'pmsby',
        name: 'Pradhan Mantri Suraksha Bima Yojana (PMSBY)',
        category: 'Insurance',
        benefits: 'Accidental death and total disability cover of ₹2 Lakh (partial disability cover of ₹1 Lakh) for ₹20/year premium.',
        estimatedFinancialImpact: 200000,
        officialLink: 'https://www.jansuraksha.gov.in/',
        applyLink: 'https://www.jansuraksha.gov.in/Forms.aspx',
        deadline: 'May 31 annually',
        defaultDocs: ['Aadhaar Card', 'Bank Account auto-debit form', 'Nominee details'],
        defaultWhy: 'Recommended for family members aged 18-70 to secure affordable accident coverage.',
        checkEligibility: (profile) => {
            const hasEligibleAge = profile.memberAges.some(age => age >= 18 && age <= 70);
            if (!hasEligibleAge) {
                return { eligible: false, score: 30, reason: "Requires members in the age group of 18-70 years." };
            }
            return { eligible: true, score: 100, reason: "Recommended for members aged 18-70 to secure affordable accidental insurance cover." };
        }
    },
    {
        id: 'pmjjby',
        name: 'Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)',
        category: 'Insurance',
        benefits: 'Life insurance cover of ₹2 Lakh for death due to any cause at an annual premium of ₹436.',
        estimatedFinancialImpact: 200000,
        officialLink: 'https://www.jansuraksha.gov.in/',
        applyLink: 'https://www.jansuraksha.gov.in/Forms.aspx',
        deadline: 'May 31 annually',
        defaultDocs: ['Aadhaar Card', 'Bank Account auto-debit form', 'Nominee details', 'Good health declaration'],
        defaultWhy: 'Recommended for family members aged 18-50 to secure term life protection.',
        checkEligibility: (profile) => {
            const hasEligibleAge = profile.memberAges.some(age => age >= 18 && age <= 50);
            if (!hasEligibleAge) {
                return { eligible: false, score: 30, reason: "Requires members in the age group of 18-50 years." };
            }
            return { eligible: true, score: 100, reason: "Recommended for members aged 18-50 to secure affordable term life cover." };
        }
    },
    {
        id: 'pmmy',
        name: 'Pradhan Mantri MUDRA Yojana (PMMY)',
        category: 'Business Loans',
        benefits: 'Collateral-free business development loans up to ₹10 Lakhs (Shishu, Kishor, and Tarun categories).',
        estimatedFinancialImpact: 1000000,
        officialLink: 'https://www.mudra.org.in/',
        applyLink: 'https://www.udyamimitra.in/',
        deadline: 'Ongoing',
        defaultDocs: ['Aadhaar Card / Voter ID', 'Business Address Proof', 'Quotation for business equipment to purchase', 'Passport photos', 'Business Registration details'],
        defaultWhy: 'Highly recommended for self-employed/entrepreneurial members to secure collateral-free business funds.',
        checkEligibility: (profile) => {
            const isEntrepreneur = profile.occupation.toLowerCase().includes('business') || 
                                   profile.occupation.toLowerCase().includes('self') || 
                                   profile.occupation.toLowerCase().includes('entrepreneur');
            if (isEntrepreneur) {
                return { eligible: true, score: 100, reason: "Recommended for self-employed individuals or business owners looking for growth capital." };
            }
            return { eligible: true, score: 60, reason: "Available to any individual proposing to set up a new micro/small enterprise." };
        }
    },
    {
        id: 'post-matric-scholarship',
        name: 'Post Matric Scholarship Scheme',
        category: 'Scholarships',
        benefits: 'Complete tuition fee reimbursement and maintenance allowance for post-secondary education.',
        estimatedFinancialImpact: 50000,
        officialLink: 'https://scholarships.gov.in/',
        applyLink: 'https://scholarships.gov.in/freshRegistration',
        deadline: 'November 30 annually',
        defaultDocs: ['Aadhaar Card', 'Student ID Card', 'Fee Receipt of current college year', 'Income Certificate', 'Community / Caste Certificate (if applicable)', 'Previous Marksheet'],
        defaultWhy: 'Recommended because you have active student members and family income fits within scholarship criteria.',
        checkEligibility: (profile) => {
            if (!profile.isStudent) {
                return { eligible: false, score: 0, reason: "Requires at least one student in the family." };
            }
            if (profile.annualFamilyIncome > 250000) {
                return { eligible: false, score: 40, reason: "Requires annual family income below ₹2.5 Lakhs." };
            }
            return { eligible: true, score: 100, reason: "Recommended for student members with family income below ₹2.5 Lakhs per year." };
        }
    },
    {
        id: 'gruha-lakshmi',
        name: 'Gruha Lakshmi Scheme (Karnataka State)',
        category: 'Women Welfare',
        benefits: 'Monthly financial assistance of ₹2,000 (₹24,000/year) directly to female heads of household.',
        estimatedFinancialImpact: 24000,
        officialLink: 'https://sevasindhu.karnataka.gov.in/',
        applyLink: 'https://sevasindhugs.karnataka.gov.in/',
        deadline: 'Ongoing',
        defaultDocs: ['Aadhaar Card of Female Head', 'Aadhaar Card of Husband', 'Mobile number linked to Aadhaar', 'Bank Passbook'],
        defaultWhy: 'State scheme recommended for families residing in Karnataka with female members.',
        checkEligibility: (profile) => {
            if (profile.state.toLowerCase() !== 'karnataka') {
                return { eligible: false, score: 0, reason: "State-specific scheme for Karnataka residents only." };
            }
            if (profile.gender.toLowerCase() !== 'female' && profile.gender.toLowerCase() !== 'mixed') {
                return { eligible: false, score: 10, reason: "Requires a female head of family." };
            }
            return { eligible: true, score: 100, reason: "Recommended for Karnataka families with female members." };
        }
    },
    {
        id: 'kanya-sumangala',
        name: 'Mukhya Mantri Kanya Sumangala Yojana (Uttar Pradesh State)',
        category: 'Women Welfare',
        benefits: '₹15,000 cash incentive in 6 stages for girl child health and education milestones.',
        estimatedFinancialImpact: 15000,
        officialLink: 'https://mksy.up.gov.in/',
        applyLink: 'https://mksy.up.gov.in/women_welfare/index.php',
        deadline: 'Ongoing',
        defaultDocs: ['Aadhaar Card of Parents & Girl Child', 'Joint photo of child with mother', 'Income Certificate', 'UP Residential Proof', 'Bank Passbook'],
        defaultWhy: 'State scheme recommended for Uttar Pradesh residents with girl children and income under ₹3 Lakhs.',
        checkEligibility: (profile) => {
            if (profile.state.toLowerCase() !== 'uttar pradesh' && profile.state.toLowerCase() !== 'up') {
                return { eligible: false, score: 0, reason: "State-specific scheme for Uttar Pradesh residents only." };
            }
            if (profile.gender.toLowerCase() !== 'female' && profile.gender.toLowerCase() !== 'mixed') {
                return { eligible: false, score: 10, reason: "Requires girl children in the family." };
            }
            if (profile.annualFamilyIncome > 300000) {
                return { eligible: false, score: 30, reason: "Requires annual family income below ₹3 Lakhs." };
            }
            return { eligible: true, score: 100, reason: "Recommended for Uttar Pradesh residents with girl children and income under ₹3 Lakhs." };
        }
    }
];

export const getWelfareProfile = async (req, res) => {
    try {
        const { familyId } = req.params;
        let profile = await FamilyWelfareProfile.findOne({ familyId });
        
        if (!profile) {
            // Return empty profile with default list of schemes
            return res.status(200).json({
                success: true,
                message: "No profile found. Please fill out details.",
                data: null,
                allSchemes: welfareSchemesRegistry.map(s => ({
                    id: s.id,
                    name: s.name,
                    category: s.category,
                    benefits: s.benefits,
                    estimatedFinancialImpact: s.estimatedFinancialImpact,
                    officialLink: s.officialLink,
                    applyLink: s.applyLink,
                    deadline: s.deadline
                }))
            });
        }

        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateWelfareProfile = async (req, res) => {
    try {
        const { familyId } = req.params;
        const {
            annualFamilyIncome,
            familySize,
            state,
            memberAges = [],
            gender = 'mixed',
            occupation = 'salaried',
            isStudent = false,
            isFarmer = false,
            isDisabled = false,
            isSeniorCitizen = false,
            ownsHome = true
        } = req.body;

        if (!state) {
            return res.status(400).json({ success: false, message: "State is required." });
        }

        // 1. Run Rules-Based Eligibility Matching Engine
        const matchedRecommendations = [];
        const profileData = {
            annualFamilyIncome: Number(annualFamilyIncome),
            familySize: Number(familySize),
            state,
            memberAges: memberAges.map(Number),
            gender,
            occupation,
            isStudent,
            isFarmer,
            isDisabled,
            isSeniorCitizen,
            ownsHome
        };

        for (const scheme of welfareSchemesRegistry) {
            const eligibility = scheme.checkEligibility(profileData);
            if (eligibility.eligible) {
                matchedRecommendations.push({
                    id: scheme.id,
                    name: scheme.name,
                    category: scheme.category,
                    benefits: scheme.benefits,
                    estimatedFinancialImpact: scheme.estimatedFinancialImpact,
                    officialLink: scheme.officialLink,
                    applyLink: scheme.applyLink,
                    deadline: scheme.deadline,
                    eligibilityScore: eligibility.score,
                    eligibilityReason: eligibility.reason,
                    // Default values in case Gemini fails
                    aiExplanation: scheme.defaultWhy,
                    requiredDocuments: scheme.defaultDocs
                });
            }
        }

        // 2. Fetch Personalized AI Explanations via Gemini if schemes are matched
        if (matchedRecommendations.length > 0) {
            const aiResult = await runWelfareAIExplanations(profileData, matchedRecommendations);
            if (aiResult.success && aiResult.data) {
                // Merge AI responses into matched recommendations
                matchedRecommendations.forEach(rec => {
                    const aiData = aiResult.data[rec.id];
                    if (aiData) {
                        if (aiData.whyRecommended) rec.aiExplanation = aiData.whyRecommended;
                        if (aiData.requiredDocuments && Array.isArray(aiData.requiredDocuments)) {
                            rec.requiredDocuments = aiData.requiredDocuments.map(String);
                        }
                    }
                });
            }
        }

        // 3. Save to database
        let profile = await FamilyWelfareProfile.findOne({ familyId });
        if (!profile) {
            profile = new FamilyWelfareProfile({
                familyId,
                ...profileData,
                recommendations: matchedRecommendations
            });
        } else {
            // Update demographics
            Object.assign(profile, profileData);
            profile.recommendations = matchedRecommendations;
        }

        await profile.save();

        res.status(200).json({
            success: true,
            message: "Demographics updated and eligibility calculated successfully.",
            data: profile
        });

    } catch (error) {
        console.error("Welfare profile update error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleSchemeStatus = async (req, res) => {
    try {
        const { familyId, schemeId } = req.params;
        const { status } = req.body; // 'Eligible' | 'Applied' | 'Approved' | 'Rejected'

        const profile = await FamilyWelfareProfile.findOne({ familyId });
        if (!profile) {
            return res.status(404).json({ success: false, message: "Profile not found. Set up demographics first." });
        }

        const idx = profile.appliedSchemes.findIndex(s => s.schemeId === schemeId);
        if (idx >= 0) {
            if (status === 'Eligible') {
                // Remove from applied logs
                profile.appliedSchemes.splice(idx, 1);
            } else {
                // Update status
                profile.appliedSchemes[idx].status = status;
                profile.appliedSchemes[idx].appliedDate = Date.now();
            }
        } else if (status !== 'Eligible') {
            profile.appliedSchemes.push({
                schemeId,
                status,
                appliedDate: Date.now()
            });
        }

        await profile.save();
        res.status(200).json({ success: true, message: `Status updated to ${status}`, data: profile });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Single-Batch Gemini Request for Welfare Explanations & Documents Checklist
const runWelfareAIExplanations = async (profile, recommendations) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    const isApiKeyMissing = !API_KEY || API_KEY.includes('your_gemini') || API_KEY === '';
    
    if (isApiKeyMissing) {
        return { success: false, error: "API Key missing." };
    }

    const schemesList = recommendations.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        benefits: r.benefits
    }));

    const prompt = `
        You are a government welfare advisor. Given the following family demographic profile:
        - Annual Family Income: ₹${profile.annualFamilyIncome}
        - Family Size: ${profile.familySize}
        - Residing State: ${profile.state}
        - Member Ages: [${profile.memberAges.join(', ')}]
        - Primary Occupations: ${profile.occupation}
        - Student present: ${profile.isStudent ? 'Yes' : 'No'}
        - Farmer present: ${profile.isFarmer ? 'Yes' : 'No'}
        - Disabled members present: ${profile.isDisabled ? 'Yes' : 'No'}
        - Senior Citizens present: ${profile.isSeniorCitizen ? 'Yes' : 'No'}
        - Owns a home: ${profile.ownsHome ? 'Yes' : 'No'}
        
        The rules engine determined they match the following schemes:
        ${JSON.stringify(schemesList, null, 2)}
        
        Instructions:
        Provide a customized AI advisory explanation for each scheme in JSON format. The top-level keys must match the scheme IDs exactly.
        Each scheme entry should contain:
        - whyRecommended: A 1-2 sentence explanation of why they qualify and why it benefits them.
        - requiredDocuments: A list of 4-6 specific official documents they should prepare to apply.
        
        Example Output Format:
        {
           "pm-kisan": {
              "whyRecommended": "Recommended as your family is involved in active farming. The direct cash transfers will support seasonal agricultural costs.",
              "requiredDocuments": ["Aadhaar Card", "Land Possession Certificate", "Active Bank Account Passbook", "Mobile number linked to Aadhaar"]
           }
        }
        
        Make sure the output is strictly valid JSON and do not include any other markdown formats.
    `;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-2.0-flash"];

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();
            
            if (text.includes('```')) {
                text = text.replace(/```json|```/g, '').trim();
            }

            const jsonResult = JSON.parse(text);
            return { success: true, data: jsonResult };
        } catch (err) {
            console.warn(`[Welfare AI] Model ${modelName} failed:`, err.message);
        }
    }

    return { success: false, error: "All AI models failed." };
};
