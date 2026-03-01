import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function ProjectsScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Projeler</Text>
            <Text style={styles.subtitle}>Şantiye Listesi & Tonaj Durumu</Text>
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
        color: colors.text,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
        marginTop: 8,
    },
});
