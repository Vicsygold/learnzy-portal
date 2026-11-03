export type ResultWeights = { ca1: number; ca2: number; exam: number };

export function calculateTotal(scores: { ca1: number; ca2: number; exam: number }, weights: ResultWeights) {
  const totalWeight = weights.ca1 + weights.ca2 + weights.exam;
  if (totalWeight <= 0) throw new Error("INVALID_WEIGHTS");
  return Number(((scores.ca1 * weights.ca1 + scores.ca2 * weights.ca2 + scores.exam * weights.exam) / totalWeight).toFixed(2));
}

export function gradeForTotal(total: number) {
  if (total >= 75) return { grade: "A1", remark: "Excellent" };
  if (total >= 70) return { grade: "B2", remark: "Very good" };
  if (total >= 65) return { grade: "B3", remark: "Good" };
  if (total >= 60) return { grade: "C4", remark: "Credit" };
  if (total >= 55) return { grade: "C5", remark: "Credit" };
  if (total >= 50) return { grade: "C6", remark: "Credit" };
  if (total >= 45) return { grade: "D7", remark: "Pass" };
  if (total >= 40) return { grade: "E8", remark: "Pass" };
  return { grade: "F9", remark: "Fail" };
}

export function rankScores(scores: number[]) {
  const sorted = [...scores].sort((a, b) => b - a);
  return scores.map((score) => sorted.indexOf(score) + 1);
}
