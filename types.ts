// Updated types.ts with PathData interface
export interface PathData {
    // Distance matrix - dist[i][j] is the shortest distance from node i to node j
    dist: number[][];
    // Next hop matrix - next[i][j] is the next node on the shortest path from i to j
    next: number[][];
    // Metadata about when and how the path data was created
    metadata: {
        timestamp: string;
        rowCount: number;
        colCount: number;
    };
}

export interface Square {
    type: "empty" | "products" | "cash_register" | "entrance" | "exit";
    productIds: string[];
    row: number;
    col: number;
}

export interface Supermarket {
    id: string;
    name: string;
    address?: string;
    owner: string;
    layout: string; // JSON string of Square[][]
    pathData?: string; // Added: JSON string of PathData
    createdAt?: string;
    updatedAt?: string;
}

export interface Product {
    id: string;
    title: string;
    price: number;
    category: string;
    description: string;
    image: string;
    supermarketID: string;
    supermarket?: Supermarket;
    createdAt?: string;
    updatedAt?: string;
}

export type ShoppingListStatus = 'draft' | 'active' | 'completed';

export interface ShoppingList {
    id: string;
    name: string;
    owner: string;
    productIDs: string; // JSON string of product IDs
    supermarketID: string;
    supermarket?: Supermarket;
    createdAt?: string;
    updatedAt?: string;
    completedAt?: string;
}

export interface ShoppingListProps {
    supermarketId?: string;
}

// Client type definition focused on the API we actually use
export interface AmplifyModels {
    Supermarket: {
        get: (args: { id: string }) => Promise<{ data: Supermarket | null }>;
        list: (args?: any) => Promise<{ data: Supermarket[] }>;
    };
    Product: {
        list: (args?: any) => Promise<{ data: Product[] }>;
    };
    ShoppingList: {
        create: (args: { input: Omit<ShoppingList, 'id' | 'createdAt' | 'updatedAt'> }) => Promise<{ data: ShoppingList }>;
        update: (args: { input: Partial<ShoppingList> & { id: string } }) => Promise<{ data: ShoppingList }>;
        delete: (args: { id: string }) => Promise<{ data: ShoppingList }>;
        get: (args: { id: string }) => Promise<{ data: ShoppingList | null }>;
        list: (args?: any) => Promise<{ data: ShoppingList[] }>;
    };
}

export interface AmplifyClient {
    models: AmplifyModels;
}