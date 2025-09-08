// import React, { useMemo, useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   Dimensions,
//   Pressable,
//   StyleProp,
//   ViewStyle,
// } from "react-native";
// import { Square, Product } from "../../../types";
// import { Ionicons } from "@expo/vector-icons";
// import StopProductsModal from "../StopProductsModal";

// interface ProductStop {
//   position: [number, number];
//   stopNumber: number;
//   products: string[];
//   isSpecial?: boolean; // e.g. Start/Finish
//   label?: string;
// }

// interface StoreLayoutSectionProps {
//   layoutData: Square[][];
//   selectedProducts: string[];
//   optimizedPath?: number[][];
//   productStops?: ProductStop[];
//   products: Product[];
// }

// const { width } = Dimensions.get("window");
// const SQUARE_SIZE = Math.floor(width / 20);

// // centers (no padding added here)
// const centerX = (col: number) => col * SQUARE_SIZE + SQUARE_SIZE / 2;
// const centerY = (row: number) => row * SQUARE_SIZE + SQUARE_SIZE / 2;

// const HLine = ({
//   x1, x2, y, offset = 0,
// }: { x1: number; x2: number; y: number; offset?: number }) => {
//   const left = Math.min(x1, x2);
//   const w = Math.abs(x2 - x1);
//   return <View style={[styles.hLine, { left, top: y - 1 + offset, width: w }]} />;
// };

// const VLine = ({
//   y1, y2, x, offset = 0,
// }: { y1: number; y2: number; x: number; offset?: number }) => {
//   const top = Math.min(y1, y2);
//   const h = Math.abs(y2 - y1);
//   return <View style={[styles.vLine, { left: x - 1 + offset, top, height: h }]} />;
// };

// // --- helpers ---
// const NON_STORE_TYPES = new Set(["non_store", "void", "blocked", "wall", "outside"]);
// const isNonStore = (sq: Square) =>
//   (sq as any)?.isStore === false || NON_STORE_TYPES.has((sq as any)?.type);

// // normalize helper (למקרי קצה של מזהים)
// const normalizeId = (v: any) => String(v ?? "").trim().toLowerCase();

// const StoreLayoutSection = ({
//   layoutData,
//   selectedProducts,
//   optimizedPath,
//   productStops,
//   products,
// }: StoreLayoutSectionProps) => {
//   const [modalVisible, setModalVisible] = useState(false);
//   const [selectedStop, setSelectedStop] = useState<ProductStop | null>(null);
//   const [stopProducts, setStopProducts] = useState<Product[]>([]);
//   const [scrollEnabled, setScrollEnabled] = useState(true);

//   const rows = layoutData.length;
//   const cols = layoutData[0]?.length ?? 0;
//   const key = (r: number, c: number) => `${r},${c}`;
//   const inBounds = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;

//   const isChosenProductCell = (r: number, c: number): boolean => {
//     const sq: any = layoutData[r]?.[c];
//     if (!sq || isNonStore(sq)) return false;
//     if (sq.type !== "products") return false;
//     const ids: string[] = Array.isArray(sq.productIds) ? sq.productIds : [];
//     return ids.some((id) => selectedProducts.includes(id));
//   };

//   const getSquareColor = (square: Square) => {
//     if (isNonStore(square)) return "#F4F4F4";
//     switch (square.type) {
//       case "products":
//         return "#4CAF50";
//       case "cash_register":
//         return "#FFC107";
//       case "entrance":
//         return "#2196F3";
//       case "exit":
//         return "#F44336";
//       default:
//         return "#E0E0E0";
//     }
//   };

//   const getProductStop = (row: number, col: number): ProductStop | undefined =>
//     productStops?.find((s) => s.position[0] === row && s.position[1] === col);

//   // ===== אינדקס של מיקומי מוצרים לפי productId (על תאי מוצר שנבחרו בלבד) =====
//   const productIdToCells = useMemo(() => {
//     const map = new Map<string, Array<[number, number]>>();
//     for (let r = 0; r < rows; r++) {
//       for (let c = 0; c < cols; c++) {
//         const sq: any = layoutData[r]?.[c];
//         if (!sq || sq.type !== "products") continue;
//         const ids: string[] = Array.isArray(sq.productIds) ? sq.productIds : [];
//         const hasSelected = ids.some((id) => selectedProducts.includes(id));
//         if (!hasSelected) continue;
//         for (const id of ids) {
//           const k = normalizeId(id);
//           const arr = map.get(k) ?? [];
//           arr.push([r, c]);
//           map.set(k, arr);
//         }
//       }
//     }
//     return map;
//   }, [layoutData, selectedProducts]);

//   // ===== נציג יחיד לכל stopNumber על תא מוצר =====
//   const directMap = useMemo(() => {
//     const rep = new Map<string, number>(); // key(cell) -> stopNumber
//     if (!productStops?.length) return rep;

//     const stops = productStops
//       .filter((s) => !s.isSpecial)
//       .slice()
//       .sort((a, b) => a.stopNumber - b.stopNumber);

//     const used = new Set<string>();
//     const dirs4: Array<[number, number]> = [[-1,0],[1,0],[0,-1],[0,1]];
//     const diags: Array<[number, number]> = [[-1,-1],[-1,1],[1,-1],[1,1]];

//     for (const s of stops) {
//       const [sr, sc] = s.position;
//       const wantSet = new Set((s.products ?? []).map(normalizeId));

//       const matchesCellProducts = (r: number, c: number) => {
//         const sq: any = layoutData[r]?.[c];
//         if (!sq || sq.type !== "products") return false;
//         const ids: string[] = Array.isArray(sq.productIds) ? sq.productIds : [];
//         if (!ids.length) return false;
//         if (!wantSet.size) {
//           // אם לא התקבלו products ל-stop – כל תא מוצר נבחר נחשב מתאים
//           return ids.some((id) => selectedProducts.includes(id));
//         }
//         return ids.some((id) => wantSet.has(normalizeId(id)));
//       };

//       const candidates: Array<[number, number]> = [];

//       // 1) התא עצמו
//       if (inBounds(sr, sc) && isChosenProductCell(sr, sc) && matchesCellProducts(sr, sc)) {
//         candidates.push([sr, sc]);
//       }
//       // 2) שכנים 4 כיוונים
//       for (const [dr, dc] of dirs4) {
//         const r = sr + dr, c = sc + dc;
//         if (inBounds(r, c) && isChosenProductCell(r, c) && matchesCellProducts(r, c)) {
//           candidates.push([r, c]);
//         }
//       }
//       // 3) שכנים אלכסוניים
//       for (const [dr, dc] of diags) {
//         const r = sr + dr, c = sc + dc;
//         if (inBounds(r, c) && isChosenProductCell(r, c) && matchesCellProducts(r, c)) {
//           candidates.push([r, c]);
//         }
//       }
//       // 4) בכל הרשת לפי productIds
//       if (!candidates.length) {
//         if (wantSet.size) {
//           for (const pid of wantSet) {
//             const cells = productIdToCells.get(pid);
//             if (cells) candidates.push(...cells);
//           }
//         } else {
//           // fallback – כל תא מוצר נבחר
//           for (let r = 0; r < rows; r++) {
//             for (let c = 0; c < cols; c++) {
//               if (isChosenProductCell(r, c)) candidates.push([r, c]);
//             }
//           }
//         }
//       }

//       // מיון לפי מרחק, אח"כ לפי מיקום
//       candidates.sort((a, b) => {
//         const da = Math.abs(a[0] - sr) + Math.abs(a[1] - sc);
//         const db = Math.abs(b[0] - sr) + Math.abs(b[1] - sc);
//         if (da !== db) return da - db;
//         return a[0] === b[0] ? a[1] - b[1] : a[0] - b[0];
//       });

//       const pick = candidates.find(([r, c]) => !used.has(key(r, c)));
//       if (pick) {
//         const k = key(pick[0], pick[1]);
//         rep.set(k, s.stopNumber);
//         used.add(k);
//       }
//     }

//     return rep;
//   }, [layoutData, selectedProducts, productStops, productIdToCells]);

//   // ===== השלמת מספרים חסרים לפי סדר המסלול =====
//   const completedMap = useMemo(() => {
//     const final = new Map<string, number>(directMap);
//     if (!productStops?.length || !optimizedPath?.length) return final;

//     const allStops = productStops
//       .filter((s) => !s.isSpecial)
//       .map((s) => s.stopNumber)
//       .sort((a, b) => a - b);

//     const assigned = new Set<number>();
//     final.forEach((n) => assigned.add(n));
//     const missing = allStops.filter((n) => !assigned.has(n));
//     if (!missing.length) return final;

//     const stepCandidates = (r: number, c: number): Array<[number, number]> => {
//       const out: Array<[number, number]> = [];
//       if (inBounds(r, c) && isChosenProductCell(r, c)) out.push([r, c]);
//       const dirs4: Array<[number, number]> = [[-1,0],[1,0],[0,-1],[0,1]];
//       for (const [dr, dc] of dirs4) {
//         const rr = r + dr, cc = c + dc;
//         if (inBounds(rr, cc) && isChosenProductCell(rr, cc)) out.push([rr, cc]);
//       }
//       const seen = new Set<string>();
//       return out.filter(([rr, cc]) => {
//         const k = key(rr, cc);
//         if (seen.has(k)) return false;
//         seen.add(k);
//         return !final.has(k);
//       });
//     };

//     const expand = (path: number[][]): number[][] => {
//       const exp: number[][] = [];
//       for (let i = 0; i < path.length - 1; i++) {
//         let [r1, c1] = path[i];
//         const [r2, c2] = path[i + 1];
//         exp.push([r1, c1]);
//         while (r1 !== r2 || c1 !== c2) {
//           if (r1 < r2) r1++;
//           else if (r1 > r2) r1--;
//           else if (c1 < c2) c1++;
//           else if (c1 > c2) c1--;
//           exp.push([r1, c1]);
//         }
//       }
//       exp.push(path[path.length - 1]);
//       return exp;
//     };

//     const steps = expand(optimizedPath);
//     let mi = 0;
//     for (const [r, c] of steps) {
//       if (mi >= missing.length) break;
//       const cands = stepCandidates(r, c);
//       for (const [rr, cc] of cands) {
//         if (mi >= missing.length) break;
//         const k = key(rr, cc);
//         if (!final.has(k)) {
//           final.set(k, missing[mi++]);
//         }
//       }
//     }

//     return final;
//   }, [directMap, productStops, optimizedPath]);

//   const totalStops = (productStops?.filter((s) => !s.isSpecial).length) ?? 0;
//   const getStopNumberForCell = (r: number, c: number): number | undefined =>
//     completedMap.get(key(r, c));

//   // פתיחת מודאל עבור עצירה/תא מוצרים
//   const openStopAt = (row: number, col: number) => {
//     const stop = getProductStop(row, col);
//     if (stop?.isSpecial) return;

//     if (stop) {
//       const rawIds = Array.isArray(stop.products) ? stop.products : [];
//       const idSet = new Set(rawIds.map(normalizeId));
//       let productsToShow = products.filter((p: any) => idSet.has(normalizeId(p.id)));
//       if (productsToShow.length === 0 && rawIds.length > 0) {
//         productsToShow = products.filter((p: any) => rawIds.includes(p.id as any));
//       }
//       setSelectedStop(stop);
//       setStopProducts(productsToShow);
//       setModalVisible(true);
//       return;
//     }

//     // fallback: תא מוצר נבחר
//     const sq: any = layoutData[row]?.[col];
//     if (sq?.type === "products" && Array.isArray(sq.productIds) && sq.productIds.length) {
//       const chosen = sq.productIds.filter((id: string) => selectedProducts.includes(id));
//       if (chosen.length) {
//         const idSet = new Set(chosen.map(normalizeId));
//         const productsToShow = products.filter((p: any) => idSet.has(normalizeId(p.id)));
//         setSelectedStop({
//           position: [row, col],
//           stopNumber: getStopNumberForCell(row, col) ?? 0,
//           products: chosen,
//         });
//         setStopProducts(productsToShow);
//         setModalVisible(true);
//       }
//     }
//   };

//   // locate entrance / register
//   const findKeyLocations = () => {
//     let entrance: { row: number; col: number } | null = null;
//     let register: { row: number; col: number } | null = null;
//     for (let r = 0; r < layoutData.length; r++) {
//       for (let c = 0; c < layoutData[r].length; c++) {
//         const t = (layoutData[r][c] as any).type;
//         if (t === "entrance") entrance = { row: r, col: c };
//         else if (t === "cash_register") register = { row: r, col: c };
//       }
//     }
//     return { entrance, register };
//   };
//   const { entrance, register } = findKeyLocations();

//   const renderSquare = (square: Square, r: number, c: number) => {
//     // non-store: לא לחיץ
//     if (isNonStore(square)) {
//       return (
//         <View
//           key={`${r}-${c}`}
//           style={[
//             styles.square,
//             styles.nonStoreSquare,
//             { width: SQUARE_SIZE, height: SQUARE_SIZE },
//           ]}
//           pointerEvents="none"
//         />
//       );
//     }

//     const productIds: string[] = Array.isArray((square as any).productIds)
//       ? (square as any).productIds
//       : [];

//     const isSelected =
//       square.type === "products" && productIds.some((id) => selectedProducts.includes(id));

//     const isEntrance = square.type === "entrance";
//     const isCash = square.type === "cash_register";

//     // מספרים על תאי מוצר בלבד (בלי עיגול) + Start/Finish עם עיגול
//     const numberForCell = isSelected ? getStopNumberForCell(r, c) : undefined;
//     const showStartFinish = isEntrance || isCash;

//     let label: string | number = "";
//     let markerStyle: StyleProp<ViewStyle> = {};
//     if (isEntrance) {
//       label = "Start";
//       markerStyle = styles.startMarker;
//     } else if (isCash) {
//       label = "Finish";
//       markerStyle = styles.finishMarker;
//     }

//     // טאץ' ברמת התא (מונע קונפליקט עם הסקְרוֹל)
//     const capture = isSelected || isEntrance || isCash;
//     const onResponderGrant = () => setScrollEnabled(false);
//     const onResponderRelease = () => {
//       setScrollEnabled(true);
//       if (capture) openStopAt(r, c);
//     };
//     const onResponderTerminate = () => setScrollEnabled(true);

//     return (
//       <View
//         key={`${r}-${c}`}
//         collapsable={false}
//         style={[
//           styles.square,
//           {
//             backgroundColor: getSquareColor(square),
//             width: SQUARE_SIZE,
//             height: SQUARE_SIZE,
//             borderWidth: isSelected ? 2 : 0.5,
//             borderColor: isSelected ? "#FF6D00" : "#999",
//           },
//         ]}
//         onStartShouldSetResponder={() => capture}
//         onResponderGrant={onResponderGrant}
//         onResponderRelease={onResponderRelease}
//         onResponderTerminate={onResponderTerminate}
//       >
//         {/* מספר בתוך התא — בלי עיגול/רקע (שחור) */}
//         {numberForCell !== undefined && (
//           <View pointerEvents="none" style={styles.numberLabelWrap}>
//             <Text style={styles.numberLabelText}>{numberForCell}</Text>
//           </View>
//         )}

//         {/* Start/Finish בלבד עם עיגול */}
//         {showStartFinish && (
//           <Pressable
//             style={[styles.stopMarker, markerStyle, styles.onTop]}
//             hitSlop={12}
//             android_ripple={{ color: "rgba(0,0,0,0.12)", borderless: true }}
//             pointerEvents="none"
//           >
//             <Text
//               style={[
//                 styles.stopMarkerText,
//                 (isEntrance || isCash) ? styles.specialStopText : null,
//               ]}
//             >
//               {label}
//             </Text>
//           </Pressable>
//         )}
//       </View>
//     );
//   };

//   // expand anchors to 4-neighbour steps (no diagonals)
//   const expandPath = (path: number[][]): number[][] => {
//     const expanded: number[][] = [];
//     for (let i = 0; i < path.length - 1; i++) {
//       let [r1, c1] = path[i];
//       const [r2, c2] = path[i + 1];
//       expanded.push([r1, c1]);
//       while (r1 !== r2 || c1 !== c2) {
//         if (r1 < r2) r1++;
//         else if (r1 > r2) r1--;
//         else if (c1 < c2) c1++;
//         else if (c1 > c2) c1--;
//         expanded.push([r1, c1]);
//       }
//     }
//     expanded.push(path[path.length - 1]);
//     return expanded;
//   };

//   const renderPathLines = () => {
//     if (!optimizedPath || optimizedPath.length === 0) return null;

//     const anchors: [number, number][] = [];
//     if (entrance) anchors.push([entrance.row, entrance.col]);
//     anchors.push(...optimizedPath.map((p) => [p[0], p[1]] as [number, number]));
//     if (register) anchors.push([register.row, register.col]);

//     const steps = expandPath(anchors);

//     const LANE_GAP = Math.max(6, Math.round(SQUARE_SIZE * 0.28));
//     const edgeCounts = new Map<string, number>();
//     const pieces: JSX.Element[] = [];

//     for (let i = 0; i < steps.length - 1; i++) {
//       const [r1, c1] = steps[i];
//       const [r2, c2] = steps[i + 1];

//       const sq1 = layoutData[r1]?.[c1];
//       const sq2 = layoutData[r2]?.[c2];
//       if (!sq1 || !sq2 || isNonStore(sq1) || isNonStore(sq2)) continue;

//       const x1 = centerX(c1), y1 = centerY(r1);
//       const x2 = centerX(c2), y2 = centerY(r2);

//       let keyEdge: string;
//       if (r1 === r2) {
//         keyEdge = `H:${r1}:${Math.min(c1, c2)}-${Math.max(c1, c2)}`;
//       } else if (c1 === c2) {
//         keyEdge = `V:${c1}:${Math.min(r1, r2)}-${Math.max(r1, r2)}`;
//       } else {
//         continue;
//       }

//       const countSoFar = edgeCounts.get(keyEdge) ?? 0;
//       edgeCounts.set(keyEdge, countSoFar + 1);

//       let offset = 0;
//       if (countSoFar > 0) {
//         const k = Math.ceil(countSoFar / 2);
//         const sign = countSoFar % 2 === 1 ? +1 : -1;
//         offset = sign * k * LANE_GAP;
//       }

//       if (r1 === r2) {
//         pieces.push(<HLine key={`h-${i}-${countSoFar}`} y={y1} x1={x1} x2={x2} offset={offset} />);
//       } else {
//         pieces.push(<VLine key={`v-${i}-${countSoFar}`} x={x1} y1={y1} y2={y2} offset={offset} />);
//       }
//     }

//     return pieces;
//   };

//   const renderLayout = () => (
//     <View style={styles.gridOuter}>
//       <View style={styles.gridInner}>
//         {/* cells */}
//         {layoutData.map((row, r) => (
//           <View key={`row-${r}`} style={styles.row}>
//             {row.map((sq, c) => renderSquare(sq, r, c))}
//           </View>
//         ))}
//         {/* path overlay (לא תופס מגעים) */}
//         <View style={styles.pathLayer} pointerEvents="none">
//           {optimizedPath && optimizedPath.length > 0 && renderPathLines()}
//         </View>
//       </View>
//     </View>
//   );

//   return (
//     <View style={styles.layoutSection}>
//       <Text style={styles.sectionTitle}>Store Layout</Text>

//       {optimizedPath && (
//         <View style={styles.pathInfoContainer}>
//           <Ionicons name="map" size={20} color="#2E7D32" />
//           <Text style={styles.pathInfoText}>
//             Optimized path generated with {totalStops} product stops
//           </Text>
//         </View>
//       )}

//       <View style={styles.outerScrollContainer}>
//         <ScrollView
//           horizontal
//           keyboardShouldPersistTaps="always"
//           scrollEnabled={scrollEnabled}
//           removeClippedSubviews={false}
//         >
//           {renderLayout()}
//         </ScrollView>
//       </View>

//       <Legend productStops={productStops} />

//       <StopProductsModal
//         visible={modalVisible}
//         stopNumber={
//           selectedStop?.isSpecial ? selectedStop.label || "" : selectedStop?.stopNumber || 0
//         }
//         products={stopProducts}
//         onClose={() => setModalVisible(false)}
//       />
//     </View>
//   );
// };

// const Legend = ({ productStops }: { productStops?: ProductStop[] }) => (
//   <View style={styles.legendContainer}>
//     <Text style={styles.legendTitle}>Legend:</Text>
//     <View style={styles.legendContent}>
//       <LegendBox color="#4CAF50" label="Products" />
//       <LegendBox color="#E0E0E0" label="Empty" />
//       <LegendBox color="#F4F4F4" label="Outside store" />
//       <LegendBox color="#F44336" label="Exit" />
//       <LegendBox color="#2196F3" label="Entrance" />
//       <LegendBox color="#FFC107" label="Cash Register" />
//       {/* דוגמת "Product Stop" כטקסט בלבד בלי עיגול */}
//       <View style={styles.legendRow}>
//         <Text style={styles.legendNumber}>1</Text>
//         <Text style={styles.legendText}>Product Stop</Text>
//       </View>
//       <LegendDot label="Finish" styleOverride={styles.legendFinishMarker} text="F" />
//       <LegendDot label="Start" styleOverride={styles.legendStartMarker} text="S" />
//       <View style={styles.legendRow}>
//         <View style={styles.legendPathLine} />
//         <Text style={styles.legendText}>Path</Text>
//       </View>
//     </View>
//   </View>
// );

// const LegendBox = ({ color, label }: { color: string; label: string }) => (
//   <View style={styles.legendRow}>
//     <View style={[styles.legendSquare, { backgroundColor: color }]} />
//     <Text style={styles.legendText}>{label}</Text>
//   </View>
// );

// const LegendDot = ({
//   label,
//   text,
//   styleOverride,
// }: {
//   label: string;
//   text: string;
//   styleOverride?: any;
// }) => (
//   <View style={styles.legendRow}>
//     <View style={[styles.legendStopMarker, styleOverride]}>
//       <Text style={styles.legendStopMarkerText}>{text}</Text>
//     </View>
//     <Text style={styles.legendText}>{label}</Text>
//   </View>
// );

// const styles = StyleSheet.create({
//   layoutSection: {
//     backgroundColor: "white",
//     borderRadius: 8,
//     padding: 12,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   pathInfoContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#E8F5E9",
//     padding: 10,
//     borderRadius: 6,
//     marginBottom: 12,
//   },
//   pathInfoText: { marginLeft: 8, fontSize: 14, color: "#2E7D32", fontWeight: "500" },
//   sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#333" },
//   outerScrollContainer: { maxHeight: 300 },

//   // grid
//   gridOuter: {
//     backgroundColor: "white",
//     borderRadius: 8,
//     position: "relative",
//     padding: 8,
//   },
//   gridInner: {
//     position: "relative",
//   },
//   pathLayer: {
//     position: "absolute",
//     left: 0,
//     top: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },

//   row: { flexDirection: "row" },
//   square: {
//     position: "relative",
//     borderWidth: 0.5,
//     borderColor: "#999",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   nonStoreSquare: {
//     backgroundColor: "#F4F4F4",
//     borderColor: "#E6E6E6",
//   },

//   // text-only number in cell (black)
//   numberLabelWrap: {
//     position: "absolute",
//     left: 0,
//     right: 0,
//     top: 0,
//     bottom: 0,
//     justifyContent: "center",
//     alignItems: "center",
//     zIndex: 20,
//   },
//   numberLabelText: {
//     color: "#fff",
//     fontWeight: "bold",
//     fontSize: SQUARE_SIZE * 0.4,
//   },

//   // Start/Finish circular markers
//   stopMarker: {
//     width: SQUARE_SIZE * 0.65,
//     height: SQUARE_SIZE * 0.65,
//     borderRadius: SQUARE_SIZE * 0.325,
//     backgroundColor: "rgba(255, 87, 34, 0.9)",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   startMarker: { backgroundColor: "rgba(33, 150, 243, 0.9)" },
//   finishMarker: { backgroundColor: "rgba(255, 193, 7, 0.9)" },
//   stopMarkerText: { color: "white", fontSize: SQUARE_SIZE * 0.4, fontWeight: "bold" },
//   specialStopText: { fontSize: SQUARE_SIZE * 0.25 },

//   // path segments
//   hLine: { position: "absolute", height: 2, backgroundColor: "rgba(33,33,33,0.85)" },
//   vLine: { position: "absolute", width: 2, backgroundColor: "rgba(33,33,33,0.85)" },

//   onTop: { zIndex: 20, elevation: 6 },

//   // legend
//   legendContainer: {
//     marginTop: 12,
//     padding: 8,
//     backgroundColor: "#f9f9f9",
//     borderRadius: 8,
//   },
//   legendTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
//   legendContent: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
//   legendRow: { flexDirection: "row", alignItems: "center", marginVertical: 4, width: "33%" },
//   legendSquare: { width: 16, height: 16, borderWidth: 0.5, borderColor: "#999", marginRight: 8 },
//   legendStopMarker: {
//     width: 16,
//     height: 16,
//     borderRadius: 8,
//     backgroundColor: "rgba(255, 87, 34, 0.9)",
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 8,
//   },
//   legendStartMarker: { backgroundColor: "rgba(33,150,243,0.9)" },
//   legendFinishMarker: { backgroundColor: "rgba(255,193,7,0.9)" },
//   legendStopMarkerText: { color: "white", fontSize: 10, fontWeight: "bold" },
//   legendPathLine: { width: 16, height: 2, backgroundColor: "rgba(33,33,33,0.85)", marginRight: 8 },
//   legendText: { fontSize: 12, color: "#333" },
//   legendNumber: { fontSize: 12, fontWeight: "bold", color: "#000", marginRight: 8 },
// });

// export default StoreLayoutSection;
// StoreLayoutSection.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
} from "react-native";
import { Square, Product } from "../../../types";
import { Ionicons } from "@expo/vector-icons";
import StopProductsModal from "../StopProductsModal";

interface ProductStop {
    position: [number, number]; // Coordinates of the product square
    stopNumber: number;         // The stop number (1, 2, 3, etc.)
    products: string[];         // Product IDs in this square
    isSpecial?: boolean;        // Flag to indicate if this is a special stop
    label?: string;             // Label for special stops
}

interface StoreLayoutSectionProps {
    layoutData: Square[][];
    selectedProducts: string[];
    optimizedPath?: number[][];
    productStops?: ProductStop[];
    products: Product[];
}

// Create a responsive square size based on screen width
const { width } = Dimensions.get("window");
const SQUARE_SIZE = Math.floor(width / 20); // Adjust as needed

const StoreLayoutSection = ({
    layoutData,
    selectedProducts,
    optimizedPath,
    productStops,
    products,
}: StoreLayoutSectionProps) => {
    // State for product preview modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedStop, setSelectedStop] = useState<ProductStop | null>(null);
    const [stopProducts, setStopProducts] = useState<Product[]>([]);

    // Get the square color based on its type
    const getSquareColor = (square: Square) => {
        // Show the regular color based on type
        switch (square.type) {
            case "products":
                return "#4CAF50"; // green
            case "cash_register":
                return "#FFC107"; // yellow
            case "entrance":
                return "#2196F3"; // blue
            case "exit":
                return "#F44336"; // red
            default:
                return "#E0E0E0"; // light grey for empty
        }
    };

    // Check if a position is part of the path
    const isPartOfPath = (row: number, col: number): boolean => {
        if (!optimizedPath) return false;
        return optimizedPath.some(pos => pos[0] === row && pos[1] === col);
    };

    // Find if this position is a product stop
    const getProductStop = (row: number, col: number): ProductStop | undefined => {
        if (!productStops) return undefined;
        return productStops.find(stop => stop.position[0] === row && stop.position[1] === col);
    };

    // Function to handle tapping on a square
    const handleSquareTap = (square: Square, row: number, col: number) => {
        // Find if this is a product stop
        const productStop = getProductStop(row, col);

        if (productStop) {
            // Get the actual products for this stop
            const stopProductIds = productStop.products || [];
            const productsToShow = products.filter(product =>
                stopProductIds.includes(product.id)
            );

            setSelectedStop(productStop);
            setStopProducts(productsToShow);
            setModalVisible(true);
        }
    };

    // Find entrance and cash register coordinates
    const findKeyLocations = () => {
        let entranceCoord: { row: number; col: number } | null = null;
        let cashRegisterCoord: { row: number; col: number } | null = null;

        for (let i = 0; i < layoutData.length; i++) {
            for (let j = 0; j < layoutData[i].length; j++) {
                if (layoutData[i][j].type === "entrance") {
                    entranceCoord = { row: i, col: j };
                } else if (layoutData[i][j].type === "cash_register") {
                    cashRegisterCoord = { row: i, col: j };
                }
            }
        }

        return { entranceCoord, cashRegisterCoord };
    };

    const { entranceCoord, cashRegisterCoord } = findKeyLocations();

    // Render a square in the layout
    const renderSquare = (square: Square, rowIndex: number, colIndex: number) => {
        // Check if this square contains one of our selected products
        const isSelectedProductSquare =
            square.type === "products" &&
            square.productIds.some((id) => selectedProducts.includes(id));

        // Check if this is a product stop
        const productStop = getProductStop(rowIndex, colIndex);
        const isProductStop = !!productStop;

        // Determine if this is the entrance or cash register
        const isEntrance = square.type === "entrance";
        const isCashRegister = square.type === "cash_register";

        // Determine if we should show a stop marker
        const showStopMarker = isProductStop ||
            (isEntrance && productStops && productStops.length > 0) ||
            (isCashRegister && productStops && productStops.length > 0);

        // Determine the stop label and marker style
        let stopLabel: string | number = "";
        let markerStyle = {};

        if (isEntrance) {
            stopLabel = "Start";
            markerStyle = styles.startMarker;
        } else if (isCashRegister) {
            stopLabel = "Finish";
            markerStyle = styles.finishMarker;
        } else if (isProductStop) {
            if (productStop!.isSpecial && productStop!.label) {
                stopLabel = productStop!.label;
                if (productStop!.label === "Start") {
                    markerStyle = styles.startMarker;
                } else if (productStop!.label === "Finish") {
                    markerStyle = styles.finishMarker;
                }
            } else {
                stopLabel = productStop!.stopNumber;
            }
        }

        return (
            <TouchableOpacity
                key={`${rowIndex}-${colIndex}`}
                style={[
                    styles.square,
                    {
                        backgroundColor: getSquareColor(square),
                        width: SQUARE_SIZE,
                        height: SQUARE_SIZE,
                        // Add a border for selected product squares
                        borderWidth: isSelectedProductSquare ? 2 : 0.5,
                        borderColor: isSelectedProductSquare ? "#FF6D00" : "#999",
                    },
                ]}
                onPress={() => handleSquareTap(square, rowIndex, colIndex)}
                activeOpacity={showStopMarker ? 0.7 : 1}
            >
                {/* If we should show a stop marker */}
                {showStopMarker && (
                    <View style={[styles.stopMarker, markerStyle]}>
                        <Text style={[
                            styles.stopMarkerText,
                            (isEntrance || isCashRegister) ? styles.specialStopText : null
                        ]}>
                            {stopLabel}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Draw a line between consecutive path points
    const renderPathLines = () => {
        if (!optimizedPath || optimizedPath.length < 1) return null;

        const lines = [];

        // Draw line from entrance to first path point
        if (entranceCoord && optimizedPath.length > 0) {
            const start = [entranceCoord.row, entranceCoord.col];
            const end = optimizedPath[0];

            // Calculate line position and dimensions
            const startX = start[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const startY = start[0] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endX = end[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endY = end[0] * SQUARE_SIZE + SQUARE_SIZE / 2;

            // Calculate line length and angle
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

            lines.push(
                <View
                    key="line-entrance"
                    style={[
                        styles.pathLine,
                        {
                            width: length,
                            left: startX,
                            top: startY,
                            transform: [{ rotate: `${angle}deg` }, { translateY: -1 }],
                        },
                    ]}
                />
            );
        }

        // Draw lines between path points
        for (let index = 0; index < optimizedPath.length - 1; index++) {
            const start = optimizedPath[index];
            const end = optimizedPath[index + 1];

            // Calculate line position and dimensions
            const startX = start[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const startY = start[0] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endX = end[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endY = end[0] * SQUARE_SIZE + SQUARE_SIZE / 2;

            // Calculate line length and angle
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

            lines.push(
                <View
                    key={`line-${index}`}
                    style={[
                        styles.pathLine,
                        {
                            width: length,
                            left: startX,
                            top: startY,
                            transform: [{ rotate: `${angle}deg` }, { translateY: -1 }],
                        },
                    ]}
                />
            );
        }

        // Draw line from last path point to cash register
        if (cashRegisterCoord && optimizedPath.length > 0) {
            const start = optimizedPath[optimizedPath.length - 1];
            const end = [cashRegisterCoord.row, cashRegisterCoord.col];

            // Calculate line position and dimensions
            const startX = start[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const startY = start[0] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endX = end[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endY = end[0] * SQUARE_SIZE + SQUARE_SIZE / 2;

            // Calculate line length and angle
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

            lines.push(
                <View
                    key="line-cash-register"
                    style={[
                        styles.pathLine,
                        {
                            width: length,
                            left: startX,
                            top: startY,
                            transform: [{ rotate: `${angle}deg` }, { translateY: -1 }],
                        },
                    ]}
                />
            );
        }

        return lines;
    };

    // Render the layout
    const renderLayout = () => {
        return (
            <View style={styles.layoutContainer}>
                {layoutData.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.row}>
                        {row.map((square, colIndex) =>
                            renderSquare(square, rowIndex, colIndex)
                        )}
                    </View>
                ))}

                {/* Draw path lines between points */}
                {optimizedPath && optimizedPath.length > 0 && renderPathLines()}
            </View>
        );
    };

    return (
        <View style={styles.layoutSection}>
            <Text style={styles.sectionTitle}>Store Layout</Text>

            {optimizedPath && optimizedPath.length > 0 && (
                <View style={styles.pathInfoContainer}>
                    <Ionicons name="map" size={20} color="#2E7D32" />
                    <Text style={styles.pathInfoText}>
                        Optimized path generated with {productStops ? productStops.filter(stop => !stop.isSpecial).length : 0} product stops
                    </Text>
                </View>
            )}

            <View style={styles.outerScrollContainer}>
                <ScrollView horizontal>
                    {renderLayout()}
                </ScrollView>
            </View>

            <View style={styles.legendContainer}>
                <Text style={styles.legendTitle}>Legend:</Text>
                <View style={styles.legendContent}>
                    <View style={styles.legendRow}>
                        <View
                            style={[styles.legendSquare, { backgroundColor: "#E0E0E0" }]}
                        />
                        <Text style={styles.legendText}>Empty</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View
                            style={[styles.legendSquare, { backgroundColor: "#4CAF50" }]}
                        />
                        <Text style={styles.legendText}>Products</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View
                            style={[styles.legendSquare, { backgroundColor: "#FFC107" }]}
                        />
                        <Text style={styles.legendText}>Cash Register</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View
                            style={[styles.legendSquare, { backgroundColor: "#2196F3" }]}
                        />
                        <Text style={styles.legendText}>Entrance</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View
                            style={[styles.legendSquare, { backgroundColor: "#F44336" }]}
                        />
                        <Text style={styles.legendText}>Exit</Text>
                    </View>

                    {productStops && productStops.length > 0 && (
                        <>
                            <View style={styles.legendRow}>
                                <View style={[styles.legendStopMarker, styles.legendStartMarker]}>
                                    <Text style={styles.legendStopMarkerText}>S</Text>
                                </View>
                                <Text style={styles.legendText}>Start</Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View style={[styles.legendStopMarker, styles.legendFinishMarker]}>
                                    <Text style={styles.legendStopMarkerText}>F</Text>
                                </View>
                                <Text style={styles.legendText}>Finish</Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View style={styles.legendStopMarker}>
                                    <Text style={styles.legendStopMarkerText}>1</Text>
                                </View>
                                <Text style={styles.legendText}>Product Stop</Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View style={[styles.legendPathLine]} />
                                <Text style={styles.legendText}>Path</Text>
                            </View>
                        </>
                    )}
                </View>
            </View>

            {/* Products Modal */}
            <StopProductsModal
                visible={modalVisible}
                stopNumber={selectedStop?.isSpecial ? selectedStop.label || "" : selectedStop?.stopNumber || 0}
                products={stopProducts}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    layoutSection: {
        backgroundColor: "white",
        borderRadius: 8,
        padding: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    pathInfoContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F5E9",
        padding: 10,
        borderRadius: 6,
        marginBottom: 12,
    },
    pathInfoText: {
        marginLeft: 8,
        fontSize: 14,
        color: "#2E7D32",
        fontWeight: "500",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
        color: "#333",
    },
    outerScrollContainer: {
        maxHeight: 300, // Set a maximum height to prevent it from taking too much space
    },
    layoutScrollContainer: {
        padding: 8,
    },
    layoutContainer: {
        backgroundColor: "white",
        borderRadius: 8,
        position: "relative", // For positioning path lines
        padding: 8,
    },
    row: {
        flexDirection: "row",
    },
    square: {
        borderWidth: 0.5,
        borderColor: "#999",
        justifyContent: "center",
        alignItems: "center",
    },
    stopMarker: {
        width: SQUARE_SIZE * 0.65,
        height: SQUARE_SIZE * 0.65,
        borderRadius: SQUARE_SIZE * 0.325,
        backgroundColor: "rgba(255, 87, 34, 0.9)", // Orange marker for stops
        justifyContent: "center",
        alignItems: "center",
    },
    startMarker: {
        backgroundColor: "rgba(33, 150, 243, 0.9)",  // Blue for start
    },
    finishMarker: {
        backgroundColor: "rgba(255, 193, 7, 0.9)",   // Yellow for finish
    },
    stopMarkerText: {
        color: "white",
        fontSize: SQUARE_SIZE * 0.4,
        fontWeight: "bold",
    },
    specialStopText: {
        fontSize: SQUARE_SIZE * 0.25,  // Smaller font for "Start" and "Finish"
    },
    pathLine: {
        height: 2,
        backgroundColor: "rgba(33, 33, 33, 0.8)",
        position: "absolute",
        transformOrigin: "left",
    },
    legendContainer: {
        marginTop: 12,
        padding: 8,
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
    },
    legendTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
    },
    legendContent: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    legendRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 4,
        width: "33%",
    },
    legendSquare: {
        width: 16,
        height: 16,
        borderWidth: 0.5,
        borderColor: "#999",
        marginRight: 8,
    },
    legendStopMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "rgba(255, 87, 34, 0.9)", // Orange marker for stops
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    legendStartMarker: {
        backgroundColor: "rgba(33, 150, 243, 0.9)",  // Blue for start
    },
    legendFinishMarker: {
        backgroundColor: "rgba(255, 193, 7, 0.9)",   // Yellow for finish
    },
    legendStopMarkerText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
    legendPathLine: {
        width: 16,
        height: 2,
        backgroundColor: "rgba(33, 33, 33, 0.8)",
        marginRight: 8,
    },
    legendText: {
        fontSize: 12,
        color: "#333",
    },
});

export default StoreLayoutSection;