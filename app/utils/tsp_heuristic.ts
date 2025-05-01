type SquareCoord = { row: number; col: number };

/**
 * Converts a grid coordinate to the corresponding index in the graph.
 */
const toIndex = (row: number, col: number, cols: number): number =>
    row * cols + col;

/**
 * Heuristic TSP using Nearest Neighbor.
 */
export function tspNearestNeighbor(
    productSquares: SquareCoord[],
    dist: number[][],
    cols: number,
    startSquare?: SquareCoord
): SquareCoord[] {
    const visited: boolean[] = Array(productSquares.length).fill(false);
    const result: SquareCoord[] = [];

    const graphIndices = productSquares.map((sq) =>
        toIndex(sq.row, sq.col, cols)
    );

    let currentIndex: number;
    let currentCoord: SquareCoord;

    if (startSquare) {
        currentCoord = startSquare;
        currentIndex = toIndex(startSquare.row, startSquare.col, cols);
    } else {
        currentCoord = productSquares[0];
        currentIndex = graphIndices[0];
        visited[0] = true;
        result.push(currentCoord);
    }

    for (let step = 0; step < productSquares.length; step++) {
        let minDist = Infinity;
        let nextIdx = -1;

        for (let i = 0; i < productSquares.length; i++) {
            if (visited[i]) continue;

            const d = dist[currentIndex][graphIndices[i]];
            if (d < minDist) {
                minDist = d;
                nextIdx = i;
            }
        }

        if (nextIdx === -1) break;

        visited[nextIdx] = true;
        result.push(productSquares[nextIdx]);
        currentIndex = graphIndices[nextIdx];
    }

    return result;
}
