// Test script to run the pipeline via API
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3000/api';

async function test() {
  console.log('=== Testing AI Resume Screening Pipeline ===\n');
  
  // 1. Create JD
  console.log('1. Processing Job Description...');
  const jdRes = await fetch(`${BASE}/jd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `Senior Full-Stack Engineer

We are looking for a Senior Full-Stack Engineer.

Requirements:
- 5+ years of experience in software engineering
- Strong proficiency in React, Node.js, and TypeScript
- Experience with AWS cloud services
- Proficiency in PostgreSQL
- Experience with Docker
- Understanding of CI/CD pipelines
- Strong REST API design skills

Preferred:
- Experience with Kubernetes
- GraphQL experience
- Go programming language
- Microservices architecture

Education: Bachelor's degree in Computer Science`,
      title: 'Senior Full-Stack Engineer'
    }),
  });
  const jd = await jdRes.json();
  console.log(`   JD ID: ${jd.id}`);
  console.log(`   Required Skills: ${jd.requiredSkills?.length}`);
  console.log(`   Preferred Skills: ${jd.preferredSkills?.length}`);
  console.log(`   Min Experience: ${jd.minExperience} years`);
  console.log(`   Confidence: ${jd.confidence}`);
  console.log();

  // 2. Run Pipeline
  console.log('2. Running pipeline with test resumes...');
  const formData = new FormData();
  formData.append('jdId', jd.id);
  formData.append('config', JSON.stringify({ shortlistMode: 'top_n', shortlistValue: 10 }));

  const resumeDir = path.join(process.cwd(), 'test-resumes');
  const files = fs.readdirSync(resumeDir).filter(f => f.endsWith('.txt'));
  
  for (const file of files) {
    const filePath = path.join(resumeDir, file);
    const blob = new Blob([fs.readFileSync(filePath)], { type: 'text/plain' });
    formData.append('resumes', blob, file);
  }

  const pipelineRes = await fetch(`${BASE}/pipeline/run`, {
    method: 'POST',
    body: formData,
  });
  const pipeline = await pipelineRes.json();
  console.log(`   Run ID: ${pipeline.runId}`);
  console.log(`   Stats:`, JSON.stringify(pipeline.stats, null, 2));
  console.log();

  // 3. Get Candidates
  console.log('3. Fetching ranked candidates...');
  const candRes = await fetch(`${BASE}/candidates/${pipeline.runId}`);
  const candidates = await candRes.json();
  
  console.log(`\n   Rank | Score | Name               | Recommendation`);
  console.log(`   -----|-------|--------------------|-----------------`);
  for (const c of candidates) {
    console.log(`   #${c.rank.toString().padStart(3)}  | ${c.composite_score.toString().padStart(4)}  | ${c.name.padEnd(18)} | ${c.recommendation}`);
  }
  
  console.log(`\n   Run ID for dashboard: ${pipeline.runId}`);
  console.log(`   JD ID: ${jd.id}`);
  console.log('\n=== Pipeline test complete! ===');
}

test().catch(console.error);
