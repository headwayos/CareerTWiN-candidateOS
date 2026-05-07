const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/v1/models' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [{ id: 'local-mock-model' }] }));
    return;
  }

  if (req.url === '/v1/chat/completions' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      const parsed = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      
      let mockResponse = {};
      
      // Determine what to mock based on system prompt or messages
      const systemPrompt = parsed.messages.find(m => m.role === 'system')?.content || '';
      const userContent = parsed.messages.find(m => m.role === 'user')?.content || '';
      
      if (systemPrompt.includes('expert resume parser')) {
        // CV Import
        mockResponse = {
          id: "123e4567-e89b-12d3-a456-426614174000",
          bio: {
            name: "Jane Doe (Local Mock)",
            email: "jane@mock.local",
            phone: "+1 555-0100",
            location: "Local City",
            summary: "A highly driven mock user parsing perfectly from the local provider.",
            links: { github: "https://github.com/mock" }
          },
          skills: ["mocking", "testing", "local-first", "typescript", "zod"],
          experience: [{
            company: "Mock Corp",
            role: "Senior Mock Engineer",
            startDate: "2022-01",
            endDate: "Present",
            current: true,
            highlights: ["Built a mock server", "Passed the tests"],
            stack: ["node", "express"]
          }],
          education: [{
            institution: "Mock University",
            degree: "BS",
            field: "Computer Science",
            startDate: "2018-09",
            endDate: "2022-05"
          }]
        };
      } else if (systemPrompt.includes('polishing') || systemPrompt.includes('professional career coach')) {
    mockResponse = {
      reflection: "Reflecting on this experience, the key learning was knowing when to prioritise depth over breadth. The tradeoff between speed and long-term quality was deliberate and paid off.",
      shortVersion: "Our legacy monolith was failing during traffic peaks. I led the migration to TypeScript microservices using canary deploys. We cut latency by 40% and handled Black Friday with zero downtime.",
      longVersion: "Our legacy monolithic e-commerce backend was struggling to scale during peak events, causing severe latency and occasional outages. I was tasked with architecting and leading the migration to a TypeScript microservices architecture with zero downtime. I designed service boundaries using domain-driven design, wrote the migration playbooks, coordinated with three frontend engineers, and deployed using a canary release strategy. We cut API latency by 40%, reduced deployment times from 45 minutes to 8 minutes, and handled Black Friday traffic with 100% uptime.",
      talkingPoints: ["Focus on the zero-downtime execution strategy", "Highlight cross-functional coordination with frontend teams"],
      pitfallsToAvoid: ["Avoid over-explaining the old monolith architecture", "Keep the focus on personal leadership and decisions made"],
      competencies: ["Technical Execution", "System Design", "Leadership"]
    };
  } else if (systemPrompt.includes('expert technical recruiter')) {
        // Evaluation — v2.0 6-block response
        const storyId = require('crypto').createHash('sha256')
          .update('led backend migration' + 'Led the migration of a monolithic e-commerce backe')
          .digest('hex').slice(0, 16);
        mockResponse = {
          schemaVersion: "v2.0",
          recommendationBand: "strong-apply",
          scores: { overall: 88, skills: 90, experience: 85, startupFit: 92 },
          senioritySignal: "senior",
          analysis: {
            matches: ["TypeScript", "Testing"],
            gaps: ["GraphQL"],
            risks: ["Mock environment"],
            recommendation: "Strong yes",
            actionableFixes: ["Add GraphQL project to portfolio"]
          },
          blockA_roleSummary: {
            title: "Senior Full-Stack Engineer",
            company: "Acme Corp",
            level: "Senior",
            workMode: "remote",
            location: "Remote – USA",
            compensationRange: "$140k–$180k",
            archetype: "IC-focused builder",
            domain: "Developer Tools",
            function: "Full-Stack Eng",
            tldr: "Build and own core product features across a TypeScript monorepo.",
            whyThisMatters: "Strong alignment with your TypeScript and startup ownership background."
          },
          blockB_cvMatch: {
            overallMatchPct: 88,
            requirements: [
              { requirement: "TypeScript expertise", evidence: "Built TypeScript systems at Mock Corp", strength: "strong" },
              { requirement: "React", evidence: "Dashboards built with React", strength: "strong" },
              { requirement: "GraphQL", evidence: "No GraphQL evidence found", strength: "missing" }
            ],
            topMatches: ["TypeScript", "Testing", "Node.js", "System Design"],
            gaps: [
              { gap: "GraphQL", severity: "major", mitigation: "Highlight REST API bridging or complete a short GraphQL course." }
            ],
            risks: ["No production GraphQL experience"]
          },
          blockC_levelStrategy: {
            jdLevel: "Senior",
            candidateLevel: "Senior",
            levelAlignment: "match",
            strategyName: "Leverage Breadth",
            talkingPoints: [
              "End-to-end architecture ownership across frontend and backend.",
              "Shipped production features solo from design to deployment.",
              "Mentored junior engineers in TypeScript best practices."
            ]
          },
          blockD_compensationDemand: {
            compScore: 80,
            benchmarkTable: [
              { level: "Senior", geography: "USA Remote", companyType: "startup-growth", p25: "$135k", p50: "$155k", p75: "$175k", source: "levels.fyi estimate" },
              { level: "Senior", geography: "SF Bay Area", companyType: "bigtech", p25: "$180k", p50: "$210k", p75: "$250k", source: "levels.fyi estimate" }
            ],
            demandContext: "Senior full-stack TypeScript demand remains strong in 2025.",
            attractivenessCommentary: "Comp range is fair for startup-growth stage. Equity upside worth evaluating."
          },
          blockE_personalizationPlan: {
            cvChanges: [
              { section: "Summary", change: "Add 'full-stack TypeScript systems' to summary.", rationale: "JD emphasizes TypeScript monorepo ownership.", priority: "high" },
              { section: "Experience > Mock Corp", change: "Quantify impact with users, latency, or revenue metrics.", rationale: "JD requires demonstrated impact.", priority: "high" }
            ],
            linkedInChanges: [
              { section: "Headline", change: "Add 'Full-Stack TypeScript Engineer' to headline.", rationale: "Improves keyword match.", priority: "high" },
              { section: "About", change: "Lead with startup ownership signal.", rationale: "Founder/startup readiness is a key JD signal.", priority: "medium" }
            ]
          },
          blockF_interviewPrep: {
            readinessScore: 78,
            stories: [
              {
                storyId: storyId,
                title: "Led backend migration to microservices",
                requirementMapped: "TypeScript expertise",
                situation: "Led the migration of a monolithic e-commerce backend to TypeScript microservices.",
                task: "Own architecture, coordinate with 3 FE engineers, ship with zero downtime.",
                action: "Designed service boundaries, wrote migration scripts, ran canary deploys.",
                result: "Cut API latency by 40%, reduced deploy time from 45min to 8min.",
                tags: ["typescript", "architecture", "migration", "backend"],
                confidenceLevel: "high"
              }
            ]
          }
        };

      } else if (systemPrompt.includes('expert resume writer')) {
        // Tailor
        mockResponse = {
          id: "123e4567-e89b-12d3-a456-426614174000",
          bio: {
            name: "Jane Doe (Local Mock)",
            email: "jane@mock.local",
            summary: "A highly driven mock user parsing perfectly from the local provider. [Tailored to emphasize Mocking and Testing]",
            links: { github: "https://github.com/mock" }
          },
          skills: ["mocking", "testing", "local-first", "typescript", "zod"],
          experience: [{
            company: "Mock Corp",
            role: "Senior Mock Engineer",
            startDate: "2022-01",
            endDate: "Present",
            current: true,
            highlights: ["Built a high-performance mock server", "Automated QA with comprehensive test suites"],
            stack: ["node", "express"]
          }],
          education: [{
            institution: "Mock University",
            degree: "BS",
            field: "Computer Science",
            startDate: "2018-09",
            endDate: "2022-05"
          }]
        };
      } else if (systemPrompt.includes('senior technical interviewer')) {
        mockResponse = {
          mappedStories: [
            {
              storyId: "0f5f01b6",
              requirement: "TypeScript expertise",
              storyTitle: "Led backend migration to microservices",
              confidence: 0.8
            }
          ],
          gaps: [
            { requirement: "React", priority: "high" },
            { requirement: "GraphQL", priority: "medium" }
          ]
        };
      } else if (systemPrompt.includes('expert career and compensation negotiation coach')) {
        if (userContent.includes('"compensation": null') || userContent.includes('"compensation": {}')) {
          mockResponse = {
            roleSnapshot: { role: "Mock Role" },
            compensationSummary: {
              targetBase: "TBD",
              minimumBase: "TBD",
              expectedRange: "TBD",
              marketRange: "TBD",
              currency: "USD",
              confidence: "low",
              sourceNotes: ["Fallback data: compensation demand missing"],
              manualReviewRequired: true
            },
            leverage: { strengths: ["General engineering background"], risks: ["No compensation data available"], proofPoints: [], alternatives: [] },
            risks: ["No compensation data to anchor negotiation"],
            strategy: { openingPosition: "Request market-rate conversation", safeAsk: "Discuss total compensation package", fallbackAsk: "Request comp band transparency", walkAwayLine: "TBD — requires manual input", nonCashLevers: ["Remote flexibility", "Learning budget"] }
          };
        } else {
          mockResponse = {
            roleSnapshot: { role: "Mock Role" },
            compensationSummary: {
              targetBase: "$180,000",
              minimumBase: "$150,000",
              expectedRange: "$150k - $190k",
              marketRange: "$160k - $200k",
              currency: "USD",
              confidence: "medium",
              sourceNotes: ["Based on evaluation blockD benchmark"],
              manualReviewRequired: true
            },
            leverage: {
              strengths: ["Strong Go background"],
              risks: ["No Kubernetes"],
              proofPoints: [],
              alternatives: []
            },
            risks: ["No explicit k8s experience"],
            strategy: {
              openingPosition: "Ask for $190k base",
              safeAsk: "$180k base",
              fallbackAsk: "$160k base with $20k sign-on",
              walkAwayLine: "$150k base",
              nonCashLevers: ["Remote flexibility", "Additional PTO"]
            }
          };
        }
      } else if (systemPrompt.includes('expert tech negotiation coach')) {
        mockResponse = {
          recruiter: "# Recruiter Script\n\n**Recruiter**: What are your compensation expectations?\n\n**Candidate**: Based on the responsibilities of the role and my understanding of the market, I'm looking for a base salary around $180,000. However, I'm flexible and look at the entire package, especially equity and remote flexibility.",
          founder: "# Founder Script\n\nI'm incredibly excited about the mission. While cash is important, I'm equally interested in the scope of ownership and equity upside. Let's find a structure that aligns us long-term.",
          downlevel: "# Downlevel Response\n\nI noticed the offer is for a Mid-Level role, but we've been discussing Senior responsibilities. Could you help me understand the gaps you saw, and what the path to Senior would look like here?"
        };
      } else {
        mockResponse = { default: true };
      }

      res.end(JSON.stringify({
        id: "chatcmpl-123",
        object: "chat.completion",
        created: Date.now(),
        model: "local-mock-model",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify(mockResponse)
          },
          finish_reason: "stop"
        }]
      }));
    });
    return;
  }
  
  res.writeHead(404);
  res.end();
});

server.listen(3000, () => {
  console.log('Mock OpenAI server running on port 3000');
});
