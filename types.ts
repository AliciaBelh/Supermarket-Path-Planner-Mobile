// types.ts
// Domain types for your application
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
}

export interface AmplifyClient {
    models: AmplifyModels;
}