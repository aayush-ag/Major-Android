import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import {apiEndpoint, basicAuth} from "@/app/api";

export default function NodeInsertScreen() {
    const [id, setId] = useState('');
    const [location, setLocation] = useState('');
    const [devices, setDevices] = useState<Device[]>([]);
    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const manager = useRef(new BleManager()).current; // Persistent BLE manager instance
    const intervalRef = useRef<any>(null); // To store the interval reference

    useEffect(() => {
        return () => {
            // Cleanup BLE manager and interval on component unmount
            manager.destroy();
            clearInterval(intervalRef.current);
        };
    }, [manager]);

    const sendNodeData = async () => {
        if (!id.trim() || !location.trim()) {
            Alert.alert('Error', 'Please enter both ID and location.');
            return;
        }

        const nodeData = { id, location };
        console.log('Sending node data:', nodeData);

        try {
            const response = await fetch('${apiEndpoint}/nodes/insert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: basicAuth,
                },
                body: JSON.stringify(nodeData),
            });

            console.log('Node Data Response Status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error inserting node data:', errorText);
                throw new Error(`Failed to insert node data. Status Code: ${response.status}`);
            }

            console.log('Node data inserted successfully.');
        } catch (error) {
            console.error('Error inserting node data:', error.message);
        }
    };

    const startScan = () => {
        setScanning(true);
        const devicesMap = new Map<string, Device>();

        console.log('Starting BLE scan...');
        manager.startDeviceScan(null, null, (error, scannedDevice) => {
            if (error) {
                console.error('BLE Scan Error:', error);
                setScanning(false);
                return;
            }

            if (scannedDevice) {
                devicesMap.set(scannedDevice.id, scannedDevice); // Ensure unique devices by ID
            }
        });

        setTimeout(() => {
            manager.stopDeviceScan();
            setScanning(false);
            setDevices(Array.from(devicesMap.values()));
            console.log('BLE scan complete. Devices found:', Array.from(devicesMap.values()));
        }, 10000); // Stop scan after 10 seconds
    };

    const sendNeighbourCount = async () => {
        const uniqueDeviceCount = devices.length;
        const neighbourData = {
            node_id: id,
            neighbours: uniqueDeviceCount,
        };

        console.log('Sending neighbour count data:', neighbourData);

        try {
            const response = await fetch('${apiEndpoint}/neighbours/insert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: basicAuth,
                },
                body: JSON.stringify(neighbourData),
            });

            console.log('Neighbour Count Response Status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error sending neighbours data:', errorText);
                throw new Error(`Failed to insert neighbours data. Status Code: ${response.status}`);
            }

            console.log('Neighbours data inserted successfully.');
        } catch (error) {
            console.error('Error sending neighbours data:', error.message);
        }
    };

    const startProcess = () => {
        if (!id.trim() || !location.trim()) {
            Alert.alert('Error', 'Please enter both ID and location before starting.');
            return;
        }

        setRunning(true);

        // Run tasks in a 20-second interval
        intervalRef.current = setInterval(async () => {
            console.log('--- Cycle Start ---');

            console.log('Starting BLE scan...');
            startScan();

            // Wait for BLE scan to complete (10 seconds)
            await new Promise((resolve) => setTimeout(resolve, 10000));

            console.log('Inserting node data...');
            await sendNodeData();

            console.log('Sending neighbour count...');
            await sendNeighbourCount();

            console.log('--- Cycle End. Waiting 20 seconds before next run. ---');
        }, 20000); // Run every 20 seconds
    };

    const stopProcess = () => {
        setRunning(false);
        clearInterval(intervalRef.current);
        console.log('Process stopped.');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Node Insert and Neighbour Monitor</Text>

            <TextInput
                style={styles.input}
                placeholder="Enter ID"
                value={id}
                onChangeText={setId}
            />
            <TextInput
                style={styles.input}
                placeholder="Enter Location"
                value={location}
                onChangeText={setLocation}
            />

            <TouchableOpacity
                style={[styles.button, running && styles.buttonDisabled]}
                onPress={startProcess}
                disabled={running}
            >
                <Text style={styles.buttonText}>{running ? 'Running...' : 'Start Process'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, !running && styles.buttonDisabled]}
                onPress={stopProcess}
                disabled={!running}
            >
                <Text style={styles.buttonText}>Stop Process</Text>
            </TouchableOpacity>

            {loading && <ActivityIndicator size="large" color="#4caf50" />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: '#4caf50',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonDisabled: {
        backgroundColor: '#9e9e9e',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
});