/**
 * NVIDIA NIM AI Service
 * 
 * Centralized service for all AI-powered features using NVIDIA NIM's
 * OpenAI-compatible chat completions API with meta/llama-3.1-8b-instruct.
 */

const NVIDIA_API_URL = '/api/nvidia/v1/chat/completions';
const NVIDIA_MODEL = '+';

function getApiKey(): string {
  const key = (import.meta as any).env.VITE_NVIDIA_API_KEY;
  if (!key) {
    throw new Error('NVIDIA API key not configured. Please set VITE_NVIDIA_API_KEY in your .env file.');
  }
  return key;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NvidiaResponse {
  id: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Send a chat completion request to NVIDIA NIM.
 */
async function chatCompletion(
  messages: ChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  } = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 1024, topP = 0.9 } = options;

  const response = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('NVIDIA NIM API Error:', response.status, errorBody);
    throw new Error(`AI request failed (${response.status}): ${errorBody}`);
  }

  const data: NvidiaResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

// ============================================================================
// FEATURE 1: Career Assistant (Student Chatbot)
// ============================================================================

const CAREER_ASSISTANT_SYSTEM = `You are PlaceMate AI, a friendly and knowledgeable career assistant for college students on a placement portal. Your role:

1. **Career Guidance**: Help students explore career paths, understand industry roles, and make informed decisions.
2. **Interview Prep**: Provide interview tips, common questions for specific roles, and mock interview help.
3. **Resume Advice**: Suggest improvements for resumes, cover letters, and LinkedIn profiles.
4. **Skill Development**: Recommend skills, courses, and projects relevant to their target roles.
5. **Placement Tips**: Share strategies for campus placements, off-campus hiring, and competitive coding.

Rules:
- Be encouraging and positive, but honest.
- Give concise, actionable advice. Use bullet points when listing items.
- If asked something outside career/placement scope, politely redirect.
- Never make up specific company salary data — say "this varies by company and location."
- Use examples relevant to Indian engineering colleges when possible.`;

export async function careerAssistantChat(
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: CAREER_ASSISTANT_SYSTEM },
    ...conversationHistory.slice(-10), // Keep last 10 messages for context window
    { role: 'user', content: userMessage },
  ];

  return chatCompletion(messages, { temperature: 0.7, maxTokens: 800 });
}

// ============================================================================
// FEATURE 2: Job Description Generator (Admin/Recruiter)
// ============================================================================

const JD_GENERATOR_SYSTEM = `You are an expert HR job description writer. Generate a professional, well-structured job description based on the provided details.

Output format (use this EXACT structure):
**About the Role**
[2-3 sentence overview of the position]

**Key Responsibilities**
• [responsibility 1]
• [responsibility 2]
• [responsibility 3]
• [responsibility 4]
• [responsibility 5]

**Requirements**
• [requirement 1]
• [requirement 2]
• [requirement 3]
• [requirement 4]

**Nice to Have**
• [optional skill 1]
• [optional skill 2]

**What We Offer**
• [benefit 1]
• [benefit 2]
• [benefit 3]

Rules:
- Be professional but engaging.
- Tailor the description to the specific role and company.
- Include technical and soft skills in requirements.
- Keep it concise — no more than 300 words total.
- Do NOT include salary information in the description.`;

export async function generateJobDescription(params: {
  title: string;
  company: string;
  type: string;
  location: string;
  branches?: string;
}): Promise<string> {
  const prompt = `Generate a job description for:
- Position: ${params.title}
- Company: ${params.company}
- Type: ${params.type}
- Location: ${params.location}
${params.branches ? `- Target Candidates: ${params.branches}` : ''}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: JD_GENERATOR_SYSTEM },
    { role: 'user', content: prompt },
  ];

  return chatCompletion(messages, { temperature: 0.6, maxTokens: 600 });
}

// ============================================================================
// FEATURE 3: Candidate Match Scoring (Recruiter)
// ============================================================================

const MATCH_SCORER_SYSTEM = `You are an AI recruitment analyst. Evaluate how well a candidate's profile matches a job position.

You MUST respond with ONLY a valid JSON object in this exact format (no markdown fences, no extra text):
{
  "score": <number 0-100>,
  "summary": "<one sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "recommendation": "<Strongly Recommended | Recommended | Consider | Not a Match>"
}

Scoring guide:
- 85-100: Excellent match, strongly recommended
- 70-84: Good match, recommended
- 50-69: Partial match, worth considering
- 0-49: Poor match, not recommended

Be objective and fair. Focus on skills and qualifications, not personal attributes.`;

export interface MatchScore {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
}

export async function scoreCandidate(params: {
  candidateName: string;
  candidateSkills: string[];
  candidateAbout?: string;
  jobTitle: string;
  jobDescription?: string;
  jobRequirements?: string[];
}): Promise<MatchScore> {
  const prompt = `Evaluate this candidate for the job:

**Job:**
- Title: ${params.jobTitle}
${params.jobDescription ? `- Description: ${params.jobDescription}` : ''}
${params.jobRequirements?.length ? `- Requirements: ${params.jobRequirements.join(', ')}` : ''}

**Candidate:**
- Name: ${params.candidateName}
- Skills: ${params.candidateSkills.join(', ') || 'Not specified'}
${params.candidateAbout ? `- About: ${params.candidateAbout}` : ''}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: MATCH_SCORER_SYSTEM },
    { role: 'user', content: prompt },
  ];

  const response = await chatCompletion(messages, { temperature: 0.3, maxTokens: 400 });

  try {
    // Try to parse JSON from the response (handle potential markdown fences)
    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    // Fallback if parsing fails
    return {
      score: 50,
      summary: 'Unable to fully analyze — please review manually.',
      strengths: ['Profile submitted successfully'],
      gaps: ['AI analysis needs more data to be accurate'],
      recommendation: 'Consider',
    };
  }
}

// ============================================================================
// FEATURE 4: Resume Tips (Student Profile)
// ============================================================================

const RESUME_TIPS_SYSTEM = `You are a career coach specializing in resumes for Indian engineering students seeking placements. Based on the student's profile information, provide 5 specific, actionable tips to improve their profile and stand out to recruiters.

Format your response as a numbered list. Be specific to THEIR profile — reference their actual skills/info. Keep each tip to 1-2 sentences.`;

export async function getResumeTips(params: {
  name: string;
  department?: string;
  skills: string[];
  about?: string;
  hasResume: boolean;
  hasGithub: boolean;
  hasLinkedIn: boolean;
}): Promise<string> {
  const prompt = `Student Profile:
- Name: ${params.name}
- Department: ${params.department || 'Not specified'}
- Skills: ${params.skills.join(', ') || 'None added yet'}
- About: ${params.about || 'Not written yet'}
- Resume uploaded: ${params.hasResume ? 'Yes' : 'No'}
- GitHub linked: ${params.hasGithub ? 'Yes' : 'No'}
- LinkedIn linked: ${params.hasLinkedIn ? 'Yes' : 'No'}

Please provide 5 personalized tips to improve this profile for campus placements.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: RESUME_TIPS_SYSTEM },
    { role: 'user', content: prompt },
  ];

  return chatCompletion(messages, { temperature: 0.7, maxTokens: 500 });
}

// ============================================================================
// FEATURE 5: Resume Parsing (Student Profile)
// ============================================================================

export interface ParsedResume {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  about?: string;
  links?: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
  };
}

const RESUME_PARSER_SYSTEM = `You are an expert ATS (Applicant Tracking System) parser. Your task is to extract key information from the provided resume text and format it into a structured JSON object.

Extract as much of the following information as possible:
- name: Full name
- email: Email address
- phone: Phone number
- location: City and state, if available
- skills: An array of strings representing technical and professional skills
- about: A short professional summary (2-3 sentences based on their experience and education)
- links: An object containing URLs for github, linkedin, and portfolio (if found)

Respond with ONLY valid JSON inside a \`\`\`json block. Do not include any other text or explanation. Use null for fields you cannot find.

Expected JSON Structure:
{
  "name": "string | null",
  "email": "string | null",
  "phone": "string | null",
  "location": "string | null",
  "skills": ["skill1", "skill2"] | [],
  "about": "string | null",
  "links": {
    "github": "string | null",
    "linkedin": "string | null",
    "portfolio": "string | null"
  }
}`;

export async function parseResume(resumeText: string): Promise<ParsedResume> {
  const prompt = `Please parse the following resume text:\n\n${resumeText.substring(0, 15000)}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: RESUME_PARSER_SYSTEM },
    { role: 'user', content: prompt },
  ];

  const response = await chatCompletion(messages, { temperature: 0.2, maxTokens: 1000 });

  try {
    const jsonStr = response.replace(/```json\n?/ig, '').replace(/```\n?/ig, '').trim();
    return JSON.parse(jsonStr) as ParsedResume;
  } catch (error) {
    console.error('Error parsing JSON from NVIDIA:', error);
    throw new Error('Failed to parse resume data.');
  }
}
