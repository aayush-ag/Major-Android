import React, {useEffect, useState} from 'react';
import {Alert, FlatList, PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import {BleManager, Device} from 'react-native-ble-plx';
import {ThemedView} from '@/components/ThemedView';
import {basicAuth, getApiEndpoint} from '@/app/api';

export default function TabTwoScreen() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [nodes, setNodes] = useState<any[]>([]);
    const [nearestNode, setNearestNode] = useState<any>(null);
    const [neighborNode, setNeighborNode] = useState<any>(null);
    interface Node {
        id: string;
        location: string;
    }
    const [nearestNodeLocation, setNearestNodeLocation] = useState<string | null>(null);
    const [neighborNodeLocation, setNeighborNodeLocation] = useState<Node[]>([]);
    const [scanning, setScanning] = useState(false);
    const manager = new BleManager();

    useEffect(() => {
        // Cleanup the BLE Manager when the component unmounts
        return () => {
            manager.destroy();
        };
    }, []);

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            ]);

            const allGranted = Object.values(granted).every(
                (permission) => permission === PermissionsAndroid.RESULTS.GRANTED
            );

            if (!allGranted) {
                Alert.alert('Permissions required', 'Please grant all permissions to use Bluetooth.');
                return false;
            }
        }
        return true;
    };

    const fetchNodes = async () => {
        try {
            const apiEndpoint = await getApiEndpoint();
            const response = await fetch(`${apiEndpoint}/nodes/`, {
                method: 'GET',
                headers: {
                    Authorization: basicAuth,
                },
            });
            const data = await response.json();
            setNodes(data.devices || []); // Update to match the new structure
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch nodes from the server.');
        }
    };

    const startScan = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        setScanning(true);
        const devicesMap = new Map<string, Device>(); // Map to ensure unique devices by ID

        await manager.startDeviceScan(null, null, (error, scannedDevice) => {
            if (error) {
                setScanning(false);
                return;
            }

            if (scannedDevice) {
                // Update or add the device in the Map
                devicesMap.set(scannedDevice.id, {
                    ...scannedDevice,
                    rssi: scannedDevice.rssi, // Update RSSI value if already exists
                });
            }
        });

        // Stop scanning after 10 seconds
        setTimeout(() => {
            manager.stopDeviceScan();
            setScanning(false);
            setDevices(Array.from(devicesMap.values())); // Update state with unique devices
            compareDevicesToNodes(Array.from(devicesMap.values()));
        }, 10000);
    };

    const compareDevicesToNodes = (scannedDevices: Device[]) => {
        if (scannedDevices.length === 0 || nodes.length === 0) {
            Alert.alert('No Data', 'No devices or nodes available for comparison.');
            return;
        }

        // Filter devices that match nodes
        const matchingDevices = scannedDevices.filter((device) => {
            return nodes.some((node: { id: string }) => {
                return node.id === device.id;
            });
        });

        if (matchingDevices.length === 0) {
            Alert.alert('No Matches', 'No matching devices found in the node list.');
            return;
        }

        // Sort by RSSI to find the nearest device and its neighbor
        const sortedDevices = matchingDevices.sort((a, b) => (b.rssi || -Infinity) - (a.rssi || -Infinity));
        setNearestNode(sortedDevices[0]); // Nearest
        setNeighborNode(sortedDevices[1] || null); // Neighbor (if exists)

        // Find the nearest node (the device with the highest RSSI)
        const nearestNode = nodes.find(
            (node: { id: string }) => node.id.trim().toUpperCase() === sortedDevices[0]?.id.trim().toUpperCase()
        );

        // Find all other nodes matching the remaining sorted devices
        const neighborNodes = sortedDevices.slice(1).map((device) => {
            return nodes.find(
                (node: { id: string }) => node.id.trim().toUpperCase() === device.id.trim().toUpperCase()
            );
        }).filter((node) => node !== undefined); // Filter out undefined values

        // Update state
        setNearestNodeLocation(nearestNode?.location || null); // Store only the location of the nearest node
        setNeighborNodeLocation(neighborNodes.map(node => node?.location)); // Store locations of all neighbor nodes

        console.log('Nearest Node:', sortedDevices[0]);
        if (sortedDevices[1]) {
            console.log('Neighbor Node:', sortedDevices[1]);
        } else {
            console.log('No Neighbor Node found.');
        }
    };

    const renderDevice = ({ item }: { item: Device }) => (
        <View style={styles.deviceContainer}>
            <Text style={styles.deviceName}>{item.name || 'Unnamed Device'}</Text>
            <Text style={styles.deviceId}>ID: {item.id}</Text>
            <Text style={styles.deviceRssi}>RSSI: {item.rssi || 'N/A'}</Text>
        </View>
    );

    return (
        <ThemedView style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
            </View>

            {/* Title */}
            <Text style={styles.title}>Explore Bluetooth Devices</Text>

            {/* Scan Button */}
            <TouchableOpacity
                style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
                onPress={() => {
                    fetchNodes();
                    startScan();
                }}
                disabled={scanning}
            >
                <Text style={styles.scanButtonText}>{scanning ? 'Scanning...' : 'Start Scan'}</Text>
            </TouchableOpacity>

            {/* Device List */}
            <FlatList
                data={devices}
                keyExtractor={(item) => item.id}
                renderItem={renderDevice}
                ListEmptyComponent={<Text style={styles.emptyListText}>No devices found.</Text>}
            />

            {/* Result Section */}
            {nearestNode && (
                <View style={styles.resultContainer}>
                    <Text style={styles.resultText}>Nearest Node: {nearestNode.name || nearestNode.id}</Text>
                    {nearestNodeLocation && <Text style={styles.resultText}>Nearest Node Location: {nearestNodeLocation || ''}</Text>}
                    {neighborNode && <Text style={styles.resultText}>Neighbor: {neighborNode.name || neighborNode.id}</Text>}
                </View>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    header: {
        width: '100%', // Extend header to full width
        justifyContent: 'center',
        alignItems: 'center',
        height: 50,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000000',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    scanButton: {
        backgroundColor: '#4caf50',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    scanButtonDisabled: {
        backgroundColor: '#9e9e9e',
    },
    scanButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    deviceContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#cccccc',
    },
    deviceName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    deviceId: {
        fontSize: 14,
        color: '#666666',
    },
    deviceRssi: {
        fontSize: 14,
        color: '#999999',
    },
    emptyListText: {
        textAlign: 'center',
        marginTop: 16,
        color: '#999999',
    },
    resultContainer: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
    },
    resultText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});