// import { Square } from "../../types";

// const isWalkable = (square: Square): boolean =>
//     ["empty", "entrance", "exit", "cash_register"].includes(square.type);

// const isTargetable = (square: Square): boolean =>
//     ["empty", "products", "entrance", "exit", "cash_register"].includes(
//         square.type
//     );

// const toIndex = (row: number, col: number, cols: number) => row * cols + col;

// export const buildGraph = (layout: Square[][]): number[][] => {
//     const rows = layout.length;
//     const cols = layout[0].length;
//     const total = rows * cols;
//     const INF = Infinity;

//     const graph = Array.from({ length: total }, () =>
//         Array.from({ length: total }, () => INF)
//     );

//     for (let i = 0; i < total; i++) graph[i][i] = 0;

//     const dirs = [
//         [0, 1],
//         [0, -1],
//         [1, 0],
//         [-1, 0],
//         [1, 1],
//         [1, -1],
//         [-1, 1],
//         [-1, -1],
//     ];

//     for (let row = 0; row < rows; row++) {
//         for (let col = 0; col < cols; col++) {
//             const fromSquare = layout[row][col];
//             const from = toIndex(row, col, cols);

//             const isFromWalkable = isWalkable(fromSquare);
//             const isFromProduct = fromSquare.type === "products";

//             // Only move from walkable or product squares
//             if (!isFromWalkable && !isFromProduct) continue;

//             for (const [dx, dy] of dirs) {
//                 const r = row + dx;
//                 const c = col + dy;
//                 if (r < 0 || r >= rows || c < 0 || c >= cols) continue;

//                 const toSquare = layout[r][c];
//                 const to = toIndex(r, c, cols);
//                 const isToWalkable = isWalkable(toSquare);
//                 const isToProduct = toSquare.type === "products";

//                 // 🛑 Disallow product → product
//                 if (isFromProduct && isToProduct) continue;

//                 // ✅ Allow walkable → walkable or walkable → product
//                 // ✅ Allow product → walkable (stepping off)
//                 if (
//                     (isFromWalkable && (isToWalkable || isToProduct)) ||
//                     (isFromProduct && isToWalkable)
//                 ) {
//                     const isDiagonal = dx !== 0 && dy !== 0;
//                     const cost = isDiagonal ? Math.SQRT2 : 1;
//                     graph[from][to] = cost;
//                 }
//             }
//         }
//     }

//     return graph;
// };
import { Square } from "../../types";

// סוגי תאים שלא שייכים לחנות/לא מעברים
const NON_STORE_TYPES = new Set(["non_store", "void", "blocked", "wall", "outside"]);

const isNonStore = (square: Square): boolean =>
  (square as any)?.isStore === false || NON_STORE_TYPES.has(square.type);

const isWalkable = (square: Square): boolean =>
  !isNonStore(square) && ["empty", "entrance", "exit", "cash_register"].includes(square.type);

const isTargetable = (square: Square): boolean =>
  !isNonStore(square) &&
  ["empty", "products", "entrance", "exit", "cash_register"].includes(square.type);

const toIndex = (row: number, col: number, cols: number) => row * cols + col;

export const buildGraph = (layout: Square[][]): number[][] => {
  const rows = layout.length;
  const cols = layout[0].length;
  const total = rows * cols;
  const INF = Infinity;

  const graph = Array.from({ length: total }, () =>
    Array.from({ length: total }, () => INF)
  );

  for (let i = 0; i < total; i++) graph[i][i] = 0;

  // 8 כיוונים (כולל אלכסון)
  const dirs: Array<[number, number]> = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  const passableForStep = (sq: Square) => isWalkable(sq) || sq.type === "products";

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const fromSquare = layout[row][col];
      if (isNonStore(fromSquare)) continue; // מחוץ לחנות? דלג

      const from = toIndex(row, col, cols);

      const isFromWalkable = isWalkable(fromSquare);
      const isFromProduct = fromSquare.type === "products";

      // יוצאים רק מ־walkable או product
      if (!isFromWalkable && !isFromProduct) continue;

      for (const [dx, dy] of dirs) {
        const r = row + dx;
        const c = col + dy;
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;

        const toSquare = layout[r][c];
        if (isNonStore(toSquare)) continue; // לא נכנסים לתא מחוץ לחנות

        const to = toIndex(r, c, cols);
        const isToWalkable = isWalkable(toSquare);
        const isToProduct = toSquare.type === "products";

        // אסור product → product
        if (isFromProduct && isToProduct) continue;

        // מניעת "חתיכת פינה" באלכסון: דורשים ששני התאים האורתוגונליים יהיו עבירים
        const isDiagonal = dx !== 0 && dy !== 0;
        if (isDiagonal) {
          const adj1 = layout[row + dx]?.[col]; // צעד אנכי
          const adj2 = layout[row]?.[col + dy]; // צעד אופקי
          if (!adj1 || !adj2) continue;
          if (!passableForStep(adj1) || !passableForStep(adj2)) continue;
        }

        // מותר: walkable→walkable / walkable→product / product→walkable
        if ((isFromWalkable && (isToWalkable || isToProduct)) || (isFromProduct && isToWalkable)) {
          const cost = isDiagonal ? Math.SQRT2 : 1;
          graph[from][to] = cost;
        }
      }
    }
  }

  return graph;
};
