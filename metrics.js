/**
 * metrics.js
 * Retrieval evaluation metrics: nDCG@k, MRR, Recall@k
 *
 * Each function receives a `ranked` array — candidates sorted by
 * descending similarity score — where each element is:
 *   { rel: number, sim: number }
 *   rel  — relevance label (binary 0/1, or graded ≥ 0)
 *   sim  — similarity score used for ranking (higher = more relevant)
 *
 * The caller is responsible for sorting by sim before calling these.
 */

/**
 * Compute nDCG@k for a single query.
 *
 * @param {Array<{rel: number, sim: number}>} ranked  Candidates sorted by sim desc
 * @param {number} k  Cut-off depth
 * @returns {number}  nDCG@k in [0, 1]
 */
function ndcgAtK(ranked, k) {
  const topK = ranked.slice(0, k);

  // Discounted Cumulative Gain of the model's ranking
  let dcg = 0;
  for (let i = 0; i < topK.length; i++) {
    dcg += topK[i].rel / Math.log2(i + 2); // log2(rank + 1), rank is 1-indexed
  }

  // Ideal DCG: sort all candidates by relevance descending
  const ideal = [...ranked].sort((a, b) => b.rel - a.rel).slice(0, k);
  let idcg = 0;
  for (let i = 0; i < ideal.length; i++) {
    idcg += ideal[i].rel / Math.log2(i + 2);
  }

  return idcg === 0 ? 0 : dcg / idcg;
}

/**
 * Compute Mean Reciprocal Rank for a single query.
 * Returns 1/rank of the first relevant item, or 0 if none found.
 *
 * @param {Array<{rel: number, sim: number}>} ranked  Candidates sorted by sim desc
 * @returns {number}  Reciprocal rank in [0, 1]
 */
function mrr(ranked) {
  for (let i = 0; i < ranked.length; i++) {
    if (ranked[i].rel > 0) return 1 / (i + 1);
  }
  return 0;
}

/**
 * Compute Recall@k for a single query.
 * Fraction of all relevant items that appear in the top-k positions.
 *
 * @param {Array<{rel: number, sim: number}>} ranked  Candidates sorted by sim desc
 * @param {number} k  Cut-off depth
 * @returns {number}  Recall@k in [0, 1]
 */
function recallAtK(ranked, k) {
  const totalRelevant = ranked.filter(c => c.rel > 0).length;
  if (totalRelevant === 0) return 0;
  const foundInTopK = ranked.slice(0, k).filter(c => c.rel > 0).length;
  return foundInTopK / totalRelevant;
}

/**
 * Evaluate a single query under a given model index.
 *
 * @param {Object} query         Query object from the data file
 * @param {number} modelIndex    Index into candidate.sim array
 * @param {number} k             Cut-off depth
 * @param {string} metric        'ndcg' | 'mrr' | 'recall'
 * @returns {number}             Metric score for this query
 */
function evaluateQuery(query, modelIndex, k, metric) {
  // Build candidate list and sort by similarity score for this model
  const ranked = query.candidates
    .map(c => ({ rel: c.rel, sim: c.sim[modelIndex] }))
    .sort((a, b) => b.sim - a.sim);

  switch (metric) {
    case 'ndcg':   return ndcgAtK(ranked, k);
    case 'mrr':    return mrr(ranked);
    case 'recall': return recallAtK(ranked, k);
    default:       throw new Error(`Unknown metric: ${metric}`);
  }
}

/**
 * Compute per-query scores for a model across all queries.
 *
 * @param {Array} queries     Array of query objects
 * @param {number} modelIndex Index into candidate.sim array
 * @param {number} k          Cut-off depth
 * @param {string} metric     'ndcg' | 'mrr' | 'recall'
 * @returns {Array<number>}   Per-query scores
 */
function computePerQueryScores(queries, modelIndex, k, metric) {
  return queries.map(q => evaluateQuery(q, modelIndex, k, metric));
}