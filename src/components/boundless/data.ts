/* ══════════════════════════════════════════════════════════════════
   BOUNDLESS · Demo data
   This build is a UI/UX prototype: every number and string below is
   realistic sample data. No resume is parsed and no AI is called.
   Keeping the data here separate from UI logic means the prototype
   can be explained (and later swapped for a real engine) cleanly.

   Persona: a student with full-stack coursework and projects,
   targeting a Full Stack Developer role.
   ══════════════════════════════════════════════════════════════════ */

export type Priority = "high" | "medium" | "low";

export interface ResumeFile {
  name: string;
  sizeLabel: string;
}

export interface MissingSkill {
  name: string;
  priority: Priority;
  /** One-line reason shown in the results list */
  why: string;
  /** Full detail shown in the drawer */
  detail: {
    why: string;
    detected: string;
    suggestion: string;
  };
}

export interface Recommendation {
  title: string;
  body: string;
}

export const DEMO = {
  candidate: "Student",
  role: "Full Stack Developer",
  overall: 78,
  verdict: "Strong match",
  verdictNote:
    "You meet most of the core requirements, with a few notable skill gaps.",

  breakdown: [
    { label: "Skills", score: 85 },
    { label: "Experience", score: 76 },
    { label: "Keywords", score: 71 },
    { label: "Education", score: 100 },
  ],

  matchedSkills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "REST APIs",
    "SQL",
    "Git",
    "Responsive Design",
  ],

  missingSkills: [
    {
      name: "Kubernetes",
      priority: "high",
      why: "Mentioned repeatedly in the role requirements but not found in your resume.",
      detail: {
        why: "Appears several times in the role's infrastructure and deployment requirements, which suggests it is part of the day-to-day work.",
        detected: "Job requirements",
        suggestion:
          "If you have this experience, consider adding it to your project or skills section. For example, note any clusters you have configured or applications you have deployed.",
      },
    },
    {
      name: "Terraform",
      priority: "medium",
      why: "Listed as a preferred infrastructure skill.",
      detail: {
        why: "The role lists Terraform as a preferred skill for provisioning and managing environments.",
        detected: "Preferred qualifications",
        suggestion:
          "If you have used Terraform or similar infrastructure-as-code tools, name them explicitly along with the environments you managed.",
      },
    },
    {
      name: "CI/CD",
      priority: "medium",
      why: "Your projects imply deployment experience but never name CI/CD tools.",
      detail: {
        why: "The posting asks for CI/CD familiarity, and your project work hints at deployment without naming any tools.",
        detected: "Inferred from your projects",
        suggestion:
          "If you have set up pipelines, name the tools you used (for example GitHub Actions) in the relevant project bullets.",
      },
    },
  ] as MissingSkill[],

  keywords: {
    found: [
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "REST APIs",
      "SQL",
      "Git",
      "responsive design",
      "unit tests",
      "code review",
    ],
    missing: [
      "GraphQL",
      "WebSockets",
      "Redis",
      "Docker",
      "AWS",
      "microservices",
      "system design",
    ],
  },

  recommendations: [
    {
      title: "Name your infrastructure experience",
      body: "Your projects hint at deployment work. If you have used Kubernetes or Terraform, list the tools by name in your skills section.",
    },
    {
      title: "Call out CI/CD in project work",
      body: "The role asks for pipeline familiarity. If you have shipped through CI/CD, mention the tools in the relevant project bullets.",
    },
    {
      title: "Add measurable outcomes to projects",
      body: "Pair each project with a result, such as 'cut page load time by 40%'. Numbers make engineering impact legible.",
    },
  ] as Recommendation[],

  demoResume: {
    name: "student_resume.pdf",
    sizeLabel: "2.4 MB",
  } as ResumeFile,

  loadingSteps: [
    "Resume parsed",
    "Job requirements identified",
    "Comparing skills",
    "Preparing insights",
  ],

  analyzeMessages: [
    "Reading resume…",
    "Comparing experience…",
    "Checking skill alignment…",
    "Preparing your match…",
  ],

  sampleJobDescription: `Full Stack Developer, Product Engineering

We are looking for a full stack developer to build the product features our customers use every day. You will own work end to end, from database schema to interface, and partner cross-functionally with product and design on the platform that powers it all.

What you'll do
- Build and ship features across our React and TypeScript front end
- Design REST APIs and model data in SQL
- Write unit tests and take part in code review
- Craft responsive design that stays fast on every device

What we're looking for
- Strong foundation in JavaScript, TypeScript, and modern React
- Experience building APIs with Node.js and querying SQL databases
- Comfort with Git workflows and collaborative code review
- Projects or coursework that show end-to-end ownership

Nice to have
- Familiarity with GraphQL and real-time features (WebSockets, Redis)
- Experience with CI/CD workflows for automated deployment
- Comfort with the Kubernetes and Terraform environments our platform teams use
- Exposure to AWS, Docker, microservices, or system design fundamentals`,
} as const;

export const MIN_JD_CHARS = 200;
export const MAX_RESUME_MB = 10;
