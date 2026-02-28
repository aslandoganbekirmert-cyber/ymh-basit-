// Trigger Fast Refresh
import React, { useState, useRef, useEffect } from 'react';
import * as Location from 'expo-location';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Platform, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { OCRService } from '../services/OCRService';
import { API_BASE_URL } from '../config';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import { useRoute } from '@react-navigation/native';

const PRESETS = ['0.5x', '1x', '2x'];

// Helper: fetch with timeout + retry
async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = 2,
    timeoutMs = 10000
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timer);
            return response;
        } catch (err: any) {
            lastError = err;
            console.warn(`[Network] Attempt ${attempt}/${retries} failed for ${url}: ${err?.message}`);
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    throw lastError || new Error('Network request failed after retries');
}

export default function CameraScreen({ navigation }: any) {
    const [permission, requestPermission] = useCameraPermissions();
    const [photo, setPhoto] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [zoom, setZoom] = useState(0);
    const [baseZoom, setBaseZoom] = useState(0);
    const [activePreset, setActivePreset] = useState<string>('1x');
    const [activeLensName, setActiveLensName] = useState<string | undefined>(undefined);
    const [availableLenses, setAvailableLenses] = useState<string[]>([]);
    const [currentProject, setCurrentProject] = useState<{ id: string, name: string } | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const cameraRef = useRef<any>(null);
    const route = useRoute<any>();

    useEffect(() => {
        if (route.params?.lastSelectedProject) {
            setCurrentProject(route.params.lastSelectedProject);
        }
    }, [route.params?.lastSelectedProject]);

    const getLocationAndProject = async () => {
        console.log('[DEBUG] getLocationAndProject called');
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            console.log('[DEBUG] Location permission:', status);
            if (status !== 'granted') return;

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            setUserLocation({ latitude, longitude });
            console.log('[DEBUG] GPS:', latitude, longitude);

            // 1. Try nearest project (within threshold)
            try {
                const url = `${API_BASE_URL}/projects/nearest?lat=${latitude}&lng=${longitude}`;
                console.log('[DEBUG] Fetching nearest from:', url);
                const response = await fetchWithRetry(url);
                console.log('[DEBUG] Nearest response status:', response.status);
                if (response.ok) {
                    const project = await response.json();
                    console.log('[DEBUG] Nearest project:', JSON.stringify(project));
                    if (project && project.name && project.name !== 'UNKNOWN') {
                        setCurrentProject(project);
                        console.log('[DEBUG] Set nearest project:', project.name);
                        return;
                    }
                }
            } catch (e) {
                console.warn('[DEBUG] Failed to fetch nearest project', e);
            }

            // 2. Fallback: fetch all projects and pick first one
            try {
                console.log('[DEBUG] Fetching all projects...');
                const response = await fetchWithRetry(`${API_BASE_URL}/projects`);
                console.log('[DEBUG] All projects response status:', response.status);
                if (response.ok) {
                    const allProjects = await response.json();
                    console.log('[DEBUG] Total projects:', allProjects.length);
                    if (allProjects && allProjects.length > 0) {
                        setCurrentProject(allProjects[0]);
                        console.log('[DEBUG] Set fallback project:', allProjects[0].name);
                    }
                }
            } catch (e) {
                console.warn('[DEBUG] Failed to fetch projects', e);
            }
        } catch (e) {
            console.warn('[DEBUG] Location error', e);
        }
    };

    useEffect(() => {
        if (permission && !permission.granted && permission.canAskAgain) {
            requestPermission();
        }
        getLocationAndProject();
    }, [permission]);

    // Helper: check if a lens name is a VIRTUAL composite camera (not a physical single lens)
    const isVirtualCamera = (name: string): boolean => {
        const lower = name.toLowerCase();
        return lower.includes('dual') || lower.includes('triple') || lower.includes('çift') || lower.includes('üçlü');
    };

    const handleCameraReady = async () => {
        if (cameraRef.current && Platform.OS === 'ios') {
            try {
                const lenses = await cameraRef.current.getAvailableLensesAsync();
                console.log('[DEBUG] ALL Available Lenses:', JSON.stringify(lenses));

                // Filter to only physical single-lens cameras
                const physicalLenses = lenses.filter((l: string) => !isVirtualCamera(l));
                console.log('[DEBUG] Physical Lenses Only:', JSON.stringify(physicalLenses));
                setAvailableLenses(physicalLenses);

                // Auto-select 1x physical wide lens on startup
                const wideLens = physicalLenses.find((l: string) => {
                    const lower = l.toLowerCase();
                    return (lower.includes('wide') || lower.includes('geniş') || lower === 'back camera') && !lower.includes('ultra');
                });
                if (wideLens && !activeLensName) {
                    console.log('[DEBUG] Auto-selected 1x PHYSICAL lens:', wideLens);
                    setActiveLensName(wideLens);
                }
            } catch (error) {
                console.error('[DEBUG] Failed to get available lenses:', error);
            }
        }
    };

    const handlePresetChange = (preset: string) => {
        setActivePreset(preset);

        if (Platform.OS === 'ios') {
            let desiredLens: string | undefined;

            if (preset === '0.5x') {
                // Find the physical ultra-wide lens
                desiredLens = availableLenses.find((l: string) => l.toLowerCase().includes('ultra'));
            } else if (preset === '1x') {
                // Find the physical wide-angle lens (NOT ultra, NOT virtual dual/triple)
                desiredLens = availableLenses.find((l: string) => {
                    const lower = l.toLowerCase();
                    return (lower.includes('wide') || lower.includes('geniş') || lower === 'back camera') && !lower.includes('ultra');
                });
            } else if (preset === '2x') {
                // Try telephoto first, then fall back to wide + digital zoom
                desiredLens = availableLenses.find((l: string) => l.toLowerCase().includes('tele'));
                if (!desiredLens) {
                    desiredLens = availableLenses.find((l: string) => {
                        const lower = l.toLowerCase();
                        return (lower.includes('wide') || lower.includes('geniş') || lower === 'back camera') && !lower.includes('ultra');
                    });
                }
            }

            if (desiredLens) {
                console.log('[DEBUG] Switching to PHYSICAL lens:', desiredLens, 'for preset:', preset);
                setActiveLensName(desiredLens);
                setZoom(preset === '2x' && !desiredLens.toLowerCase().includes('tele') ? 0.05 : 0);
                setBaseZoom(preset === '2x' && !desiredLens.toLowerCase().includes('tele') ? 0.05 : 0);
            } else {
                console.log('[DEBUG] No matching physical lens found, using digital zoom for:', preset);
                let z = 0;
                if (preset === '1x') z = 0.02;
                if (preset === '2x') z = 0.05;
                setZoom(z);
                setBaseZoom(z);
            }
        } else {
            let z = 0;
            if (preset === '1x') z = 0.02;
            if (preset === '2x') z = 0.05;
            setZoom(z);
            setBaseZoom(z);
        }
    };

    const onPinchEvent = (event: any) => {
        const scale = event.nativeEvent.scale;
        let newZoom = baseZoom + (scale - 1) * 0.1;
        newZoom = Math.min(Math.max(newZoom, 0), 1);
        setZoom(newZoom);
    };

    const onPinchStateChange = (event: any) => {
        if (event.nativeEvent.oldState === State.ACTIVE) {
            setBaseZoom(zoom);
        }
    };

    const pickFromGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets[0]) {
                setPhoto(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Gallery pick failed:', error);
            Alert.alert('Hata', 'Galeriden fotoğraf seçilemedi.');
        }
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const result = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    skipProcessing: Platform.OS === 'android',
                });
                if (result?.uri) setPhoto(result.uri);
            } catch (error) {
                console.error("Take picture failed:", error);
                Alert.alert("Hata", "Fotoğraf çekilemedi.");
            }
        }
    };

    const retakePicture = () => {
        setPhoto(null);
        setIsProcessing(false);
    };

    const confirmPhoto = async () => {
        if (!photo) return;
        setIsProcessing(true);

        try {
            // Optimize image
            const manipResult = await ImageManipulator.manipulateAsync(
                photo,
                [{ resize: { width: 1280 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            // Server-side OCR - gracefully degrade if unavailable
            let ocrResult = { rawText: '', confidence: 0 };
            try {
                ocrResult = await OCRService.analyzeImage(manipResult.uri);
            } catch (e) {
                console.warn('OCR skipped:', e);
            }

            navigation.navigate('Confirmation', {
                ocrData: ocrResult,
                photoUri: manipResult.uri,
                project: currentProject,
                location: userLocation
            });

            setIsProcessing(false);
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Fotoğraf işlenirken hata oluştu.');
            setIsProcessing(false);
        }
    };

    if (!permission) return <View style={styles.container} />;

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <View style={styles.permissionBox}>
                    <Ionicons name="camera-outline" size={48} color="#FFD700" />
                    <Text style={styles.permissionText}>Kamera izni gerekiyor</Text>
                    <TouchableOpacity onPress={requestPermission} style={styles.permissionBtn}>
                        <Text style={styles.permissionBtnText}>İzin Ver</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {photo ? (
                // ---- PREVIEW MODE ----
                <View style={styles.previewContainer}>
                    <Image source={{ uri: photo }} style={styles.previewImage} />
                    <View style={styles.actionBar}>
                        <TouchableOpacity style={styles.retakeBtn} onPress={retakePicture} disabled={isProcessing}>
                            <Ionicons name="close-circle" size={28} color="white" />
                            <Text style={styles.btnText}>Tekrar Çek</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.confirmBtn, isProcessing && { opacity: 0.6 }]}
                            onPress={confirmPhoto}
                            disabled={isProcessing}
                        >
                            <Ionicons name="checkmark-circle" size={28} color="white" />
                            <Text style={styles.btnText}>{isProcessing ? 'İşleniyor...' : 'Devam Et'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                // ---- CAMERA MODE ----
                <PinchGestureHandler
                    onGestureEvent={onPinchEvent}
                    onHandlerStateChange={onPinchStateChange}
                >
                    <View style={{ flex: 1 }}>
                        <CameraView
                            style={styles.camera}
                            facing="back"
                            ref={cameraRef}
                            zoom={zoom}
                            selectedLens={activeLensName}
                            onCameraReady={handleCameraReady}
                        />

                        {/* Project Name Overlay */}
                        {currentProject && (
                            <View style={styles.projectOverlay}>
                                <Ionicons name="location" size={20} color="#FFD700" />
                                <Text style={styles.projectText}>{currentProject.name}</Text>
                            </View>
                        )}

                        {/* Bottom Controls */}
                        <View style={styles.bottomBar}>
                            {/* Zoom Controls */}
                            <View style={styles.zoomControls}>
                                {PRESETS.map((preset) => (
                                    <TouchableOpacity
                                        key={preset}
                                        style={[styles.zoomBtn, activePreset === preset && styles.zoomBtnActive]}
                                        onPress={() => handlePresetChange(preset)}
                                    >
                                        <Text style={[styles.zoomBtnText, activePreset === preset && styles.zoomBtnTextActive]}>
                                            {preset}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Capture Row: Gallery + Shutter */}
                            <View style={styles.captureRow}>
                                {/* Gallery Button */}
                                <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
                                    <Ionicons name="images-outline" size={28} color="#FFD700" />
                                    <Text style={styles.galleryBtnText}>Galeri</Text>
                                </TouchableOpacity>

                                {/* Capture Button */}
                                <TouchableOpacity style={styles.captureBtn} onPress={takePicture} activeOpacity={0.7}>
                                    <View style={styles.captureBtnOuter}>
                                        <View style={styles.captureBtnInner} />
                                    </View>
                                </TouchableOpacity>

                                {/* Spacer for centering */}
                                <View style={{ width: 60 }} />
                            </View>
                        </View>
                    </View>
                </PinchGestureHandler>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    // Permission
    permissionBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    permissionText: {
        color: '#fff',
        fontSize: 16,
    },
    permissionBtn: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    permissionBtnText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Zoom Controls
    zoomControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
        marginBottom: 20,
    },
    zoomBtn: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    zoomBtnActive: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
    },
    zoomBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    zoomBtnTextActive: {
        color: '#000',
    },

    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        alignItems: 'center',
    },
    // Capture Row
    captureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '80%',
    },
    // Gallery Button
    galleryBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
    },
    galleryBtnText: {
        color: '#FFD700',
        fontSize: 10,
        marginTop: 4,
        fontWeight: '600',
    },
    // Capture Button
    captureBtn: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureBtnOuter: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureBtnInner: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#fff',
    },
    // Preview
    previewContainer: {
        flex: 1,
    },
    previewImage: {
        flex: 1,
        resizeMode: 'contain',
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 20,
        paddingBottom: Platform.OS === 'ios' ? 50 : 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    retakeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#cc3333',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 6,
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#22aa22',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 6,
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    // Project Overlay
    projectOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 10,
    },
    projectText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
