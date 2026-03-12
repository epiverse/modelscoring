/**
 * bootstrap.js
 * Bootstrap resampling for applicability score confidence intervals
 * and pairwise model comparison, as described in the paper.
 *
 * All inference is performed at the QUERY level to respect the
 * natural independence structure of retrieval evaluation (§2).
 */

/**
 * Draw one bootstrap sample mean from an array of per-query scores.
 *
 * @param {Array<number>} scores  Per-query metric scores
 * @returns {number}              Mean of one bootstrap replicate
 */
function bootstrapReplicateMean(scores) {
  const n = scores.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += scores[Math.floor(Math.random() * n)];
  }
  return sum / n;
}

/**
 * Compute a bootstrap confidence interval for a single model's
 * applicability score S(f, T) — Equations (1)–(2) and (6)–(7).
 *
 * @param {Array<number>} perQueryScores  Per-query metric scores m(qi; f)
 * @param {number} B                      Number of bootstrap replicates
 * @param {number} alpha                  Significance level (default 0.05 → 95% CI)
 * @returns {{ mean: number, lo: number, hi: number, replicates: number[] }}
 */
function bootstrapCI(perQueryScores, B = 1000, alpha = 0.05) {
  const n = perQueryScores.length;
  const mean = perQueryScores.reduce((s, v) => s + v, 0) / n;

  const replicates = [];
  for (let b = 0; b < B; b++) {
    replicates.push(bootstrapReplicateMean(perQueryScores));
  }
  replicates.sort((a, b) => a - b);

  const lo = replicates[Math.floor((alpha / 2) * B)];
  const hi = replicates[Math.floor((1 - alpha / 2) * B)];

  return { mean, lo, hi, replicates };
}

/**
 * Paired bootstrap comparison between two models — Equations (3)–(8).
 *
 * Both models are evaluated on the same queries so we bootstrap the
 * per-query *differences* directly. This controls for query difficulty
 * and yields tighter intervals than an unpaired approach (Eq. 8).
 *
 * @param {Array<number>} scoresA  Per-query scores for model A
 * @param {Array<number>} scoresB  Per-query scores for model B
 * @param {number} B               Number of bootstrap replicates
 * @param {number} alpha           Significance level (default 0.05)
 * @returns {{
 *   meanDiff: number,
 *   lo: number,
 *   hi: number,
 *   significant: boolean,
 *   winner: 'A' | 'B' | 'tie',
 *   replicates: number[]
 * }}
 */
function pairedBootstrapComparison(scoresA, scoresB, B = 1000, alpha = 0.05) {
  if (scoresA.length !== scoresB.length) {
    throw new Error('Score arrays must be the same length (same query set).');
  }

  // Per-query differences Δ(qi) = ma(qi) − mb(qi)  [Eq. 3]
  const diffs = scoresA.map((a, i) => a - scoresB[i]);
  const n = diffs.length;

  // Estimated mean difference  [Eq. 5]
  const meanDiff = diffs.reduce((s, v) => s + v, 0) / n;

  // Bootstrap replicates of Δ̂*  [Eq. 6]
  const replicates = [];
  for (let b = 0; b < B; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += diffs[Math.floor(Math.random() * n)];
    replicates.push(sum / n);
  }
  replicates.sort((a, b) => a - b);

  // 95% CI  [Eq. 7]
  const lo = replicates[Math.floor((alpha / 2) * B)];
  const hi = replicates[Math.floor((1 - alpha / 2) * B)];

  // CI excludes zero → one model is significantly better
  const significant = lo > 0 || hi < 0;
  let winner = 'tie';
  if (significant) winner = meanDiff > 0 ? 'A' : 'B';

  return { meanDiff, lo, hi, significant, winner, replicates };
}