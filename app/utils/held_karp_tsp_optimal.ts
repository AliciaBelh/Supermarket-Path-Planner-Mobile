type SquareCoord = { row: number; col: number };

const toIndex = (row: number, col: number, cols: number): number =>
    row * cols + col;

/**
 * Optimal TSP using Held-Karp dynamic programming.
 * Returns the best visiting order of product squares (optionally starting at a given square).
 */
export function tspHeldKarp(
    productSquares: SquareCoord[],
    dist: number[][],
    cols: number,
    startSquare?: SquareCoord
): SquareCoord[] {
    const allPoints = startSquare
        ? [startSquare, ...productSquares]
        : productSquares;
    const n = allPoints.length;
    const graphIndices = allPoints.map((p) => toIndex(p.row, p.col, cols));

    // dp[mask][i]: shortest path to visit 'mask' ending at point i
    const dp: number[][] = Array(1 << n)
        .fill(null)
        .map(() => Array(n).fill(Infinity));
    const parent: number[][] = Array(1 << n)
        .fill(null)
        .map(() => Array(n).fill(-1));

    dp[1][0] = 0; // Start at node 0 (startSquare or first product)

    for (let mask = 1; mask < 1 << n; mask++) {
        for (let u = 0; u < n; u++) {
            if (!(mask & (1 << u))) continue; // u not in mask

            for (let v = 0; v < n; v++) {
                if (u === v || !(mask & (1 << v))) continue;

                const prevMask = mask ^ (1 << u);
                const cost = dp[prevMask][v] + dist[graphIndices[v]][graphIndices[u]];
                if (cost < dp[mask][u]) {
                    dp[mask][u] = cost;
                    parent[mask][u] = v;
                }
            }
        }
    }

    // Find the end node with the shortest total cost
    const fullMask = (1 << n) - 1;
    let minCost = Infinity;
    let endNode = -1;

    for (let i = 1; i < n; i++) {
        if (dp[fullMask][i] < minCost) {
            minCost = dp[fullMask][i];
            endNode = i;
        }
    }

    // Reconstruct path
    const path: number[] = [];
    let mask = fullMask;
    let curr = endNode;

    while (curr !== -1) {
        path.push(curr);
        const prev = parent[mask][curr];
        mask ^= 1 << curr;
        curr = prev;
    }

    path.reverse(); // Now in correct visiting order (start → ... → end)

    return path.map((i) => allPoints[i]);
}
