const fs = require('fs');
const content = fs.readFileSync('server/index.js', 'utf-8');

// Use precise string replacement to avoid line number mismatch issues.
const startMarker = `app.post('/api/pipeline/run', (req, res, next) => {`;
const endMarker = `queries.insertAudit.run(runId, 'pipeline_failed', JSON.stringify({ error: err.message }));\n    res.status(500).json({ error: err.message });\n  }\n});`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex) + endMarker.length;

if (startIndex === -1 || endIndex < startMarker.length) {
  console.error("Could not find the target block in server/index.js");
  process.exit(1);
}

const newEndpoints = `// 1. Initialize Run
app.post('/api/pipeline/init', (req, res) => {
  try {
    const jdId = req.body.jdId;
    const configStr = JSON.stringify(req.body.config || {});
    const runId = uuidv4();

    const jdRow = queries.getJD.get(jdId);
    if (!jdRow) return res.status(400).json({ error: 'Invalid JD ID. Create a JD first.' });

    queries.insertRun.run(runId, jdId, 'processing', configStr);
    queries.insertAudit.run(runId, 'pipeline_started', JSON.stringify({ jdId }));

    res.json({ runId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Process Chunk
app.post('/api/pipeline/chunk/:runId', upload.array('resumes', 10), async (req, res) => {
  const runId = req.params.runId;
  const run = queries.getRun.get(runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  
  const jdId = run.jd_id;
  const config = JSON.parse(run.config || '{}');
  const weights = config.weights || null;

  try {
    const jdRow = queries.getJD.get(jdId);
    if (!jdRow) return res.status(400).json({ error: 'JD not found' });

    const jdProfile = {
      title: jdRow.title,
      rawText: jdRow.raw_text,
      requiredSkills: JSON.parse(jdRow.required_skills),
      preferredSkills: JSON.parse(jdRow.preferred_skills),
      minExperience: jdRow.min_experience,
      educationRequirement: jdRow.education_requirement,
      featureWeights: JSON.parse(jdRow.feature_weights),
      confidence: jdRow.confidence,
    };

    if (!req.files || req.files.length === 0) {
      return res.json({ success: true, processed: 0, errors: [] });
    }

    // Process resumes in parallel
    const processingPromises = req.files.map(async (file) => {
      try {
        queries.insertAudit.run(runId, 'resume_processing', JSON.stringify({ filename: file.originalname, size: file.size }));
        const resumeDoc = await parseResume(file.path, file.originalname);

        if (resumeDoc.error || !resumeDoc.rawText) {
          queries.insertAudit.run(runId, 'parse_failed', JSON.stringify({ filename: file.originalname, error: resumeDoc.error || 'No text extracted' }));
          return { error: resumeDoc.error || 'No text extracted', filename: file.originalname };
        }

        const candidateProfile = extractSkillsFromResume(resumeDoc, jdProfile);
        const scored = scoreCandidate(candidateProfile, jdProfile, weights);

        return {
          ...candidateProfile,
          ...scored,
          filename: file.originalname,
          filePath: \`/uploads/\${runId}/\${file.filename}\`,
          rawText: resumeDoc.rawText,
          sections: resumeDoc.sections,
          parseMethod: resumeDoc.parseMethod,
          parseConfidence: resumeDoc.parseConfidence,
        };
      } catch (err) {
        console.error(\`Error processing \${file.originalname}:\`, err);
        queries.insertAudit.run(runId, 'processing_error', JSON.stringify({ filename: file.originalname, error: err.message }));
        return { error: err.message, filename: file.originalname };
      }
    });

    const results = await Promise.all(processingPromises);
    const processedCandidates = results.filter(r => !r.error);
    const errors = results.filter(r => r.error);

    if (processedCandidates.length > 0) {
      const insertMany = db.transaction((candidates) => {
        for (const c of candidates) {
          const candidateId = uuidv4();
          queries.insertCandidate.run(
            candidateId, runId, jdId,
            c.filename, c.name, c.email, c.phone || '',
            c.rawText, JSON.stringify(c.sections || {}),
            c.parseMethod, c.parseConfidence,
            JSON.stringify(c.matchedSkills || []),
            JSON.stringify(c.missingSkills || []),
            JSON.stringify(c.preferredMatched || []),
            c.totalYOE || 0,
            JSON.stringify(c.yoePerRole || []),
            JSON.stringify(c.education || {}),
            JSON.stringify(c.employmentGaps || []),
            c.compositeScore, JSON.stringify(c.subScores || {}),
            JSON.stringify(c.penalties || []),
            JSON.stringify(c.bonuses || []),
            c.explanation || '',
            0, '',
            JSON.stringify(c.keyHighlights || [])
          );
        }
      });
      insertMany(processedCandidates);
    }

    const currentStats = JSON.parse(run.stats || '{"totalProcessed":0,"successfullyParsed":0,"parseErrors":0}');
    currentStats.totalProcessed += req.files.length;
    currentStats.successfullyParsed += processedCandidates.length;
    currentStats.parseErrors += errors.length;
    queries.updateRunStatus.run('processing', JSON.stringify(currentStats), runId);

    res.json({ success: true, processed: processedCandidates.length, errors });
  } catch (err) {
    console.error('Chunk error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Finalize Run
app.post('/api/pipeline/finalize/:runId', (req, res) => {
  const runId = req.params.runId;
  const run = queries.getRun.get(runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  const config = JSON.parse(run.config || '{}');
  
  try {
    const rawCandidates = queries.getCandidatesByRun.all(runId);
    
    // Convert DB rows back to objects for ranking
    const candidatesForRanking = rawCandidates.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      compositeScore: c.composite_score,
      subScores: JSON.parse(c.sub_scores || '{}'),
      explanation: c.explanation,
      matchedSkills: JSON.parse(c.matched_skills || '[]'),
      missingSkills: JSON.parse(c.missing_skills || '[]'),
      education: JSON.parse(c.education || '{}'),
      totalYOE: c.total_yoe,
    }));

    const rankingConfig = {
      mode: config.shortlistMode || 'top_n',
      value: config.shortlistValue || 50,
      minCandidates: 3,
    };

    // Run standard ranking agent
    const rankResult = rankCandidates(candidatesForRanking, rankingConfig);
    
    // Sort all raw candidates according to rank
    const updateRanks = db.transaction((ranked) => {
      for (const info of ranked) {
        queries.updateCandidateScores.run(
          info.compositeScore,
          JSON.stringify(info.subScores),
          info.explanation,
          info.rank,
          info.recommendation,
          info.id
        );
      }
    });
    updateRanks(rankResult.allRanked);

    const stats = JSON.parse(run.stats || '{}');
    stats.shortlistSize = rankResult.shortlistSize;
    stats.cutoffMode = rankResult.cutoffApplied;
    stats.cutoffValue = rankResult.cutoffValue;
    stats.duplicatesMerged = rankResult.duplicatesMerged;
    stats.diversityFlag = rankResult.diversityFlag;

    queries.updateRunStatus.run('completed', JSON.stringify(stats), runId);
    queries.insertAudit.run(runId, 'pipeline_completed', JSON.stringify(stats));

    res.json({
      runId,
      jdId: run.jd_id,
      stats,
      diversityNote: rankResult.diversityNote,
    });
  } catch (err) {
    console.error('Finalize error:', err);
    queries.updateRunStatus.run('failed', JSON.stringify({ error: err.message }), runId);
    queries.insertAudit.run(runId, 'pipeline_failed', JSON.stringify({ error: err.message }));
    res.status(500).json({ error: err.message });
  }
});`;

const newContent = content.substring(0, startIndex) + newEndpoints + content.substring(endIndex);
fs.writeFileSync('server/index.js', newContent, 'utf-8');
console.log("File updated properly.");
