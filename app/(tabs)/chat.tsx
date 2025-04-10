import React, { useState, useRef } from 'react';
import {
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    Text,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedView } from '@/components/ThemedView';
import { BleManager, Device } from 'react-native-ble-plx';
import {apiEndpoint, basicAuth} from "@/app/api";

export default function ChatScreen() {
    const [messages, setMessages] = useState([
        { id: '1', text: 'Hello! How can I help you today?', sender: 'bot' },
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef(null);
    const [nearestNode, setNearestNode] = useState<any>(null);
    const [neighborNode, setNeighborNode] = useState<any>(null);
    const [nodes, setNodes] = useState<any[]>([]);
    const [scanning, setScanning] = useState(false);
    const manager = new BleManager();

    const fetchNodes = async () => {
        try {
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
        setScanning(true);
        const devicesMap = new Map<string, Device>(); // Map to ensure unique devices by ID

        manager.startDeviceScan(null, null, (error, scannedDevice) => {
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
            const scannedDevices = Array.from(devicesMap.values());
            compareDevicesToNodes(scannedDevices);
        }, 10000);
    };

    const compareDevicesToNodes = (scannedDevices: Device[]) => {
        if (scannedDevices.length === 0 || nodes.length === 0) {
            Alert.alert('No Data', 'No devices or nodes available for comparison.');
            return;
        }

        const matchingDevices = scannedDevices.filter((device) => {
            return nodes.some((node: { id: string }) => node.id.trim().toUpperCase() === device.id.trim().toUpperCase());
        });

        if (matchingDevices.length === 0) {
            Alert.alert('No Matches', 'No matching devices found in the node list.');
            return;
        }

        const sortedDevices = matchingDevices.sort((a, b) => (b.rssi || -Infinity) - (a.rssi || -Infinity));
        setNearestNode(sortedDevices[0]); // Nearest
        setNeighborNode(sortedDevices[1] || null); // Neighbor (if exists)
    };

    const handleSend = async () => {
        if (inputText.trim()) {
            const userMessage = { id: Date.now().toString(), text: inputText, sender: 'user' };
            setMessages((prevMessages) => [...prevMessages, userMessage]);
            setInputText('');

            try {
                setLoading(true);
                const response = await fetch(`${apiEndpoint}/chat/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: basicAuth,
                    },
                    body: JSON.stringify({
                        nearest: nearestNode?.id || 'N/A',
                        neighbour: neighborNode ? [neighborNode.id] : [],
                        name: nearestNode?.name || 'Unknown',
                        prompt: inputText,
                    }),
                });
                const data = await response.json();

                const botMessage = {
                    id: Date.now().toString(),
                    text: data.response || 'Sorry, something went wrong.',
                    sender: 'bot',
                };
                setMessages((prevMessages) => [...prevMessages, botMessage]);
            } catch (error) {
                const errorMessage = {
                    id: Date.now().toString(),
                    text: 'Failed to fetch response. Please try again later.',
                    sender: 'bot',
                };
                setMessages((prevMessages) => [...prevMessages, errorMessage]);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleClearChat = () => {
        Alert.alert(
            'Clear Chat',
            'Are you sure you want to clear the chat?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => setMessages([]) },
            ]
        );
    };

    const renderMessage = ({ item }) => {
        const isUser = item.sender === 'user';
        return (
            <View
                style={[
                    styles.messageContainer,
                    isUser ? styles.userMessage : styles.botMessage,
                    styles.shadow,
                ]}
            >
                <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
                    {item.text}
                </Text>
            </View>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClearChat} style={{ alignSelf: 'center' }}>
                    <MaterialIcons name="more-vert" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Chat Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatContainer}
                ListHeaderComponent={<View style={styles.spacer} />} // Add a spacer at the top
                onContentSizeChange={() =>
                    flatListRef.current?.scrollToEnd({ animated: true })
                }
            />

            {loading && <ActivityIndicator size="small" color="#4caf50" style={styles.loadingIndicator} />}

            {/* Input Section */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.inputContainer}
            >
                <TextInput
                    style={styles.textInput}
                    placeholder="Type a message..."
                    value={inputText}
                    onChangeText={setInputText}
                />
                <TouchableOpacity style={styles.voiceButton}>
                    <MaterialIcons name="mic" size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <MaterialIcons name="send" size={24} color="#ffffff" />
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        height: 70,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#cccccc',
    },
    chatContainer: {
        flexGrow: 1,
        justifyContent: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    spacer: {
        height: 20,
    },
    messageContainer: {
        marginVertical: 8,
        padding: 12,
        borderRadius: 10,
        maxWidth: '75%',
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#4caf50',
    },
    botMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#e0e0e0',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userText: {
        color: '#ffffff',
    },
    botText: {
        color: '#000000',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#cccccc',
        backgroundColor: '#ffffff',
    },
    textInput: {
        flex: 1,
        height: 40,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#cccccc',
        borderRadius: 20,
        backgroundColor: '#f9f9f9',
    },
    voiceButton: {
        marginLeft: 10,
        padding: 10,
        backgroundColor: '#4caf50',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        marginLeft: 10,
        padding: 10,
        backgroundColor: '#4caf50',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    loadingIndicator: {
        marginBottom: 10,
    },
});