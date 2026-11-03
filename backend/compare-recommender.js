require('dotenv').config();
const { recommendFreelancers } = require('./src/services/recommend');

const projectId = Number(process.argv[2]);
if (!projectId) {
  console.log('Usage: node compare-recommender.js <projectId>');
  process.exit(1);
}

(async () => {
  const list = await recommendFreelancers(projectId, 50);
  const byRule = [...list].sort((a, b) => b.ruleScore - a.ruleScore);
  const rows = list.map((f, i) => ({
    freelancer: f.name,
    skills_pct: f.matchPercent,
    text_pct: f.textPercent,
    rule_score: f.ruleScore,
    rule_rank: byRule.findIndex((x) => x.id === f.id) + 1,
    new_score: f.score,
    new_rank: i + 1
  }));
  console.table(rows);
  process.exit(0);
})();