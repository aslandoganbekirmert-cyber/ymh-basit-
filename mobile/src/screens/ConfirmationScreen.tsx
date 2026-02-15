import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialType, Unit, DeliveryInput } from '../types';
import { DatabaseService } from '../services/Database';
import { SyncService } from '../services/SyncService';

// Custom Dropdown Component to avoid external dependencies
const CustomPicker = ({ label, value, options, onSelect }: any) => {
    const [modalVisible, setModalVisible] = useState(false);
    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity style={styles.pickerBox} onPress={() => setModalVisible(true)}>
                <Text style={styles.pickerText}>{value || 'Seçiniz'}</Text>
            </TouchableOpacity>
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{label} Seçin</Text>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => {
                                        onSelect(item);
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.modalItemText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeButtonText}>Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const API_BASE_URL = 'http://192.168.1.101:3000/api/v1';

export default function ConfirmationScreen() {
    const route = useRoute();
    const navigation = useNavigation<any>();
    const { photoUri, ocrData, location, project } = route.params as any;

    // Form State
    const [material, setMaterial] = useState<MaterialType>(ocrData?.material || MaterialType.KUM);
    const [quantity, setQuantity] = useState<string>(ocrData?.quantity?.toString() || '');
    const [unit, setUnit] = useState<Unit>(ocrData?.unit || Unit.TON);
    const [plate, setPlate] = useState<string>(ocrData?.plate || '');
    const [supplier, setSupplier] = useState<string>(ocrData?.supplier || '');
    const [receiptNo, setReceiptNo] = useState<string>(ocrData?.ticketNumber || '');
    const [note, setNote] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    // Project State
    const [selectedProject, setSelectedProject] = useState<{ id: string, name: string } | null>(project || null);
    const [projects, setProjects] = useState<any[]>([]);
    const [projectModalVisible, setProjectModalVisible] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isCreatingProject, setIsCreatingProject] = useState(false);

    useEffect(() => {
        // If no project passed, or user wants to verify, fetch projects used for selection
        if (!selectedProject) {
            fetchProjects();
            setProjectModalVisible(true);
        }
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/projects`);
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
            }
        } catch (e) {
            console.warn('Failed to fetch projects', e);
        }
    };

    const createNewProject = async () => {
        if (!newProjectName.trim()) {
            Alert.alert('Hata', 'Proje adı giriniz.');
            return;
        }
        setIsCreatingProject(true);
        try {
            const res = await fetch(`${API_BASE_URL}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProjectName,
                    gps_lat: location?.latitude || 0,
                    gps_lng: location?.longitude || 0
                })
            });

            if (res.ok) {
                const newProject = await res.json();
                setSelectedProject(newProject);
                setProjectModalVisible(false);
                setNewProjectName('');
            } else {
                Alert.alert('Hata', 'Proje oluşturulamadı.');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Hata', 'Bağlantı hatası.');
        } finally {
            setIsCreatingProject(false);
        }
    };

    const handleSave = async () => {
        if (!quantity || !plate) {
            Alert.alert('Eksik Bilgi', 'Lütfen miktar ve plaka giriniz.');
            return;
        }
        if (!selectedProject) {
            Alert.alert('Proje Seçilmedi', 'Lütfen bir proje seçiniz.');
            setProjectModalVisible(true);
            return;
        }

        setIsSaving(true);
        try {
            const delivery: DeliveryInput = {
                projectName: selectedProject.id,
                materialType: material,
                quantity: parseFloat(quantity.replace(',', '.')),
                unit,
                vehiclePlate: plate,
                supplier,
                receiptNo,
                note,
                photoLocalPath: photoUri,
                ocrRawText: ocrData?.rawText,
                ocrConfidence: ocrData?.confidence,
                latitude: location?.latitude,
                longitude: location?.longitude,
            };

            // 1. Fast duplicate check (lightweight GET, ~50ms)
            if (receiptNo && plate) {
                try {
                    const checkRes = await fetch(
                        `${API_BASE_URL}/transactions/check-duplicate?ticket=${encodeURIComponent(receiptNo)}&plate=${encodeURIComponent(plate)}`
                    );
                    if (checkRes.ok) {
                        const { exists } = await checkRes.json();
                        if (exists) {
                            Alert.alert('Tekrar Kayıt', `Bu irsaliye zaten kaydedilmiş!\n(Fiş: ${receiptNo}, Plaka: ${plate})`);
                            setIsSaving(false);
                            return;
                        }
                    }
                } catch (e) {
                    // Offline — skip check, save locally
                    console.log('[Save] Backend unreachable, skipping duplicate check');
                }
            }

            // 2. Save to Local DB
            await DatabaseService.addDelivery(delivery, selectedProject.id, 'USER_DEFAULT');

            // 3. Background Sync
            SyncService.syncBatch().catch(e => console.warn('Background sync failed', e));

            // 4. Feedback & Reset
            Alert.alert('Başarılı', `Kayıt ${selectedProject.name} projesine eklendi.`, [
                {
                    text: 'Tamam',
                    onPress: () => navigation.navigate('Camera', { lastSelectedProject: selectedProject })
                }
            ]);

        } catch (error: any) {
            const msg = error?.message || 'Kayıt sırasında hata oluştu.';
            Alert.alert('Hata', msg);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.title}>Malzeme Girişi</Text>

                    {/* Project Selection Button */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Proje</Text>
                        <TouchableOpacity
                            style={[styles.pickerBox, !selectedProject && { borderColor: '#FFD700' }]}
                            onPress={() => {
                                fetchProjects();
                                setProjectModalVisible(true);
                            }}
                        >
                            <Text style={[styles.pickerText, !selectedProject && { color: '#FFD700' }]}>
                                {selectedProject ? selectedProject.name : 'Seçiniz...'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Project Selection Modal */}
                    <Modal visible={projectModalVisible} transparent animationType="slide">
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.modalOverlay}
                        >
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Proje Seçin veya Oluşturun</Text>

                                {/* New Project Input */}
                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                        placeholder="Yeni Proje Adı"
                                        placeholderTextColor="#666"
                                        value={newProjectName}
                                        onChangeText={setNewProjectName}
                                    />
                                    <TouchableOpacity
                                        style={{ backgroundColor: '#FFD700', borderRadius: 8, padding: 10, justifyContent: 'center' }}
                                        onPress={createNewProject}
                                        disabled={isCreatingProject}
                                    >
                                        <Text style={{ color: '#000', fontWeight: 'bold' }}>
                                            {isCreatingProject ? '...' : 'EKLE'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={{ color: '#aaa', marginBottom: 10 }}>Mevcut Projeler:</Text>

                                <FlatList
                                    data={projects}
                                    keyExtractor={(item) => item.id.toString()}
                                    style={{ maxHeight: 300 }}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.modalItem}
                                            onPress={() => {
                                                setSelectedProject(item);
                                                setProjectModalVisible(false);
                                            }}
                                        >
                                            <Text style={styles.modalItemText}>{item.name}</Text>
                                            {item.distance && <Text style={{ color: '#666', fontSize: 12 }}>{Math.round(item.distance)}m</Text>}
                                        </TouchableOpacity>
                                    )}
                                />
                                <TouchableOpacity style={styles.closeButton} onPress={() => setProjectModalVisible(false)}>
                                    <Text style={styles.closeButtonText}>Kapat</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </Modal>

                    {/* Material Picker */}
                    <CustomPicker
                        label="Malzeme"
                        value={material}
                        options={Object.values(MaterialType)}
                        onSelect={setMaterial}
                    />

                    {/* Quantity Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Miktar</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={quantity}
                            onChangeText={setQuantity}
                            placeholder="0.00"
                            placeholderTextColor="#666"
                        />
                    </View>

                    {/* Unit Picker */}
                    <CustomPicker
                        label="Birim"
                        value={unit}
                        options={Object.values(Unit)}
                        onSelect={setUnit}
                    />

                    {/* Plate Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Plaka</Text>
                        <TextInput
                            style={styles.input}
                            value={plate}
                            onChangeText={setPlate}
                            placeholder="34 ABC 123"
                            placeholderTextColor="#666"
                            autoCapitalize="characters"
                        />
                    </View>

                    {/* New Fields: Supplier, Receipt, Note */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Tedarikçi (Opsiyonel)</Text>
                        <TextInput
                            style={styles.input}
                            value={supplier}
                            onChangeText={setSupplier}
                            placeholder="Firma Adı"
                            placeholderTextColor="#666"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>İrsaliye No (Opsiyonel)</Text>
                        <TextInput
                            style={styles.input}
                            value={receiptNo}
                            onChangeText={setReceiptNo}
                            placeholder="123456"
                            placeholderTextColor="#666"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Not (Opsiyonel)</Text>
                        <TextInput
                            style={styles.input}
                            value={note}
                            onChangeText={setNote}
                            placeholder="Ek açıklama..."
                            placeholderTextColor="#666"
                        />
                    </View>

                </ScrollView>

                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        <Text style={styles.saveButtonText}>
                            {isSaving ? 'KAYDEDİLİYOR...' : 'KAYDET'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#000',
    },
    container: {
        flexGrow: 1,
        backgroundColor: '#000',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },
    title: {
        fontSize: 22,
        color: '#FFD700',
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 12,
    },
    label: {
        color: '#CCC',
        marginBottom: 4,
        fontSize: 14,
    },
    input: {
        backgroundColor: '#222',
        color: '#FFF',
        fontSize: 16,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    pickerBox: {
        backgroundColor: '#222',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    pickerText: {
        color: '#FFF',
        fontSize: 16,
    },
    bottomBar: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        paddingTop: 8,
        backgroundColor: '#000',
    },
    saveButton: {
        backgroundColor: '#FFD700',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#111',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '50%',
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 20,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    modalItemText: {
        color: '#FFD700',
        fontSize: 18,
        textAlign: 'center',
    },
    closeButton: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#333',
        borderRadius: 10,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#FFF',
    },
});
