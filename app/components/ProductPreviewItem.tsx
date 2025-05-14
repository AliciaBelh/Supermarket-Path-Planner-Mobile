// ProductPreviewItem.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Product } from '../../types';

interface ProductPreviewItemProps {
    product: Product;
}

const ProductPreviewItem = ({ product }: ProductPreviewItemProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.infoContainer}>
                <Text style={styles.title} numberOfLines={1}>{product.title}</Text>
                <Text style={styles.price}>${product.price.toFixed(2)}</Text>
                {product.category && (
                    <Text style={styles.category}>{product.category}</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    image: {
        width: 40,
        height: 40,
        borderRadius: 4,
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    price: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    category: {
        fontSize: 10,
        color: '#888',
        marginTop: 2,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
});

export default ProductPreviewItem;