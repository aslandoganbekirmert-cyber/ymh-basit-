import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function DashboardScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Canlı Özet</Text>
            <Text style={styles.subtitle}>İrsaliye verileri yükleniyor...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
        marginTop: 8,
    },
});
