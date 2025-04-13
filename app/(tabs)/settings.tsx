import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedView } from '@/components/ThemedView';

export default function SettingsScreen() {
    const [settings, setSettings] = useState({
        name: 'Aayush', // User name
        apiEndpoint: 'https://major.waferclabs.com:16384', // Default API endpoint
    });

    // Key for AsyncStorage
    const STORAGE_KEY = 'app_settings';

    useEffect(() => {
        // Load settings from AsyncStorage when the component mounts
        const loadSettings = async () => {
            try {
                const savedSettings = await AsyncStorage.getItem(STORAGE_KEY);
                if (savedSettings) {
                    setSettings(JSON.parse(savedSettings));
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        // Validate basic settings
        if (!settings.name.trim() || !settings.apiEndpoint.trim()) {
            Alert.alert('Error', 'Name and API Endpoint are required.');
            return;
        }

        try {
            // Save settings to AsyncStorage
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            Alert.alert('Success', 'Settings have been saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            Alert.alert('Error', 'Failed to save settings. Please try again.');
        }
    };

    const handleInputChange = (name, value) => {
        setSettings((prevSettings) => ({
            ...prevSettings,
            [name]: value,
        }));
    };

    return (
        <ThemedView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* Header Section */}
                <View style={styles.header}></View>

                {/* Title */}
                <Text style={styles.title}>Settings</Text>

                {/* Name */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter Name"
                        value={settings.name}
                        onChangeText={(text) => handleInputChange('name', text)}
                    />
                </View>

                {/* API Endpoint */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>API Endpoint</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter API Endpoint"
                        value={settings.apiEndpoint}
                        onChangeText={(text) => handleInputChange('apiEndpoint', text)}
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Settings</Text>
                </TouchableOpacity>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        padding: 20,
    },
    header: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        height: 50,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: '#333333',
    },
    input: {
        height: 40,
        borderWidth: 1,
        borderColor: '#cccccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: '#ffffff',
    },
    saveButton: {
        backgroundColor: '#4caf50',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});