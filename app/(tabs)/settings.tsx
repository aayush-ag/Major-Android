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
import { ThemedView } from '@/components/ThemedView';

export default function SettingsScreen() {
    const [settings, setSettings] = useState({
        name: '', // Device/User name
        apiEndpoint: 'https://example.com', // Default API endpoint
        bluetoothId: '', // Default Bluetooth ID
        timeout: '30', // Default timeout in seconds
        maxRetries: '3', // Default number of retries
    });

    const [showAdvanced, setShowAdvanced] = useState(false); // Toggle for advanced settings

    const handleSave = () => {
        // Validate basic settings
        if (!settings.name.trim() || !settings.apiEndpoint.trim() || !settings.bluetoothId.trim()) {
            Alert.alert('Error', 'Name, API Endpoint, and Bluetooth ID are required.');
            return;
        }

        // Save settings (you can integrate AsyncStorage or any state management library here)
        console.log('Settings saved:', settings);
        Alert.alert('Success', 'Settings have been saved successfully!');
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
                <View style={styles.header}>
                </View>

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

                {/* Advanced Settings Toggle */}
                <TouchableOpacity
                    style={styles.advancedToggle}
                    onPress={() => setShowAdvanced(!showAdvanced)}
                >
                    <Text style={styles.advancedToggleText}>
                        {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                    </Text>
                </TouchableOpacity>

                {/* Advanced Settings */}
                {showAdvanced && (
                    <>
                        {/* Timeout */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Timeout (seconds)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter Timeout"
                                value={settings.timeout}
                                keyboardType="numeric"
                                onChangeText={(text) => handleInputChange('timeout', text)}
                            />
                        </View>

                        {/* Max Retries */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Max Retries</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter Max Retries"
                                value={settings.maxRetries}
                                keyboardType="numeric"
                                onChangeText={(text) => handleInputChange('maxRetries', text)}
                            />
                        </View>
                    </>
                )}

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
    advancedToggle: {
        marginBottom: 20,
        alignItems: 'center',
    },
    advancedToggleText: {
        fontSize: 16,
        color: '#4caf50',
        fontWeight: 'bold',
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