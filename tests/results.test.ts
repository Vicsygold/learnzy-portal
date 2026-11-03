import { describe, expect, it } from "vitest";
import { calculateTotal, gradeForTotal, rankScores } from "@/lib/results";

describe("result calculations", () => {
  it("calculates weighted totals and rounds to two decimals", () => {
    expect(calculateTotal({ ca1: 80, ca2: 70, exam: 90 }, { ca1: 20, ca2: 20, exam: 60 })).toBe(84);
    expect(calculateTotal({ ca1: 83, ca2: 77, exam: 91 }, { ca1: 20, ca2: 20, exam: 60 })).toBe(86.6);
  });

  it("rejects weights that have no positive total", () => {
    expect(() => calculateTotal({ ca1: 1, ca2: 1, exam: 1 }, { ca1: 0, ca2: 0, exam: 0 })).toThrow("INVALID_WEIGHTS");
  });

  it("maps boundary scores to the Nigerian grade scale", () => {
    expect(gradeForTotal(75).grade).toBe("A1");
    expect(gradeForTotal(70).grade).toBe("B2");
    expect(gradeForTotal(40).grade).toBe("E8");
    expect(gradeForTotal(39.99).grade).toBe("F9");
  });

  it("assigns competition ranks for tied scores", () => {
    expect(rankScores([90, 75, 90, 60])).toEqual([1, 3, 1, 4]);
  });
});
