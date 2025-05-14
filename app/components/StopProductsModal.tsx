// StopProductsModal.tsx
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { Product } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface StopProductsModalProps {
    visible: boolean;
    stopNumber: number | string;
    products: Product[];
    onClose: () => void;
}

// ProductPreviewItem component for displaying product info
const ProductPreviewItem = ({ product }: { product: Product }) => {
    return (
        <View style={styles.productContainer}>
            <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={1}>{product.title}</Text>
                <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                {product.category && (
                    <Text style={styles.productCategory}>{product.category}</Text>
                )}
            </View>
        </View>
    );
};

const StopProductsModal = ({ visible, stopNumber, products, onClose }: StopProductsModalProps) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View
                    style={styles.modalContainer}
                    onStartShouldSetResponder={() => true}
                    onResponderRelease={(evt) => {
                        // Prevent touches on the modal from closing it
                        evt.stopPropagation();
                        return true;
                    }}
                >
                    <View style={styles.header}>
                        <View style={[
                            styles.stopBadge,
                            typeof stopNumber === 'string' && stopNumber === 'Start' ? styles.startBadge :
                                typeof stopNumber === 'string' && stopNumber === 'Finish' ? styles.finishBadge :
                                    {}
                        ]}>
                            <Text style={styles.stopBadgeText}>{stopNumber}</Text>
                        </View>
                        <Text style={styles.headerTitle}>
                            {typeof stopNumber === 'string'
                                ? `${stopNumber} Location`
                                : `Stop ${stopNumber} Products`}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {products.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <Text style={styles.emptyStateText}>No products at this location</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.productCountText}>
                                {products.length} {products.length === 1 ? 'product' : 'products'} to collect:
                            </Text>
                            <FlatList
                                data={products}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => <ProductPreviewItem product={item} />}
                                contentContainerStyle={styles.listContent}
                            />
                        </>
                    )}
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#f9f9f9',
    },
    stopBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 87, 34, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    startBadge: {
        backgroundColor: 'rgba(33, 150, 243, 0.9)',
    },
    finishBadge: {
        backgroundColor: 'rgba(255, 193, 7, 0.9)',
    },
    stopBadgeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    productCountText: {
        fontSize: 14,
        color: '#666',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    listContent: {
        paddingBottom: 16,
    },
    emptyStateContainer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
    productContainer: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    productImage: {
        width: 50,
        height: 50,
        borderRadius: 4,
    },
    productInfo: {
        flex: 1,
        marginLeft: 12,
    },
    productTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    productPrice: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    productCategory: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
});

export default StopProductsModal;