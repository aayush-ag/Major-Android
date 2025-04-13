import React, { useState, useRef, useEffect } from 'react';
import {
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    Text,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Animated,
    Modal,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedView } from '@/components/ThemedView';
import { BleManager, Device } from 'react-native-ble-plx';
import { Audio } from 'expo-av';
import { apiEndpoint, basicAuth } from "@/app/api";
import uuid from 'react-native-uuid';

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
    const [recordingModalVisible, setRecordingModalVisible] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);


    const fetchNodes = async () => {
        try {
            const response = await fetch(`${apiEndpoint}/nodes/`, {
                method: 'GET',
                headers: {
                    Authorization: basicAuth,
                },
            });
            const data = await response.json();
            setNodes(data.devices || []);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch nodes from the server.');
        }
    };

    const startScan = async () => {
        setScanning(true);
        const devicesMap = new Map<string, Device>();

        manager.startDeviceScan(null, null, (error, scannedDevice) => {
            if (error) {
                setScanning(false);
                return;
            }

            if (scannedDevice) {
                devicesMap.set(scannedDevice.id, {
                    ...scannedDevice,
                    rssi: scannedDevice.rssi,
                });
            }
        });

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
        setNearestNode(sortedDevices[0]);
        setNeighborNode(sortedDevices[1] || null);
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

    const TypingIndicator = () => {
        const dot1 = useRef(new Animated.Value(0)).current;
        const dot2 = useRef(new Animated.Value(0)).current;
        const dot3 = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            const animateDot = (dot, delay) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(dot, {
                            toValue: 1,
                            duration: 300,
                            useNativeDriver: true,
                            delay,
                        }),
                        Animated.timing(dot, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            };

            animateDot(dot1, 0);
            animateDot(dot2, 300);
            animateDot(dot3, 600);
        }, [dot1, dot2, dot3]);

        return (
            <View style={styles.typingContainer}>
                <Animated.View style={[styles.dot, { opacity: dot1 }]} />
                <Animated.View style={[styles.dot, { opacity: dot2 }]} />
                <Animated.View style={[styles.dot, { opacity: dot3 }]} />
            </View>
        );
    };

    const startRecording = async () => {
        if (recording) {
            Alert.alert('Recording Active', 'A recording is already in progress.');
            return;
        }

        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission Denied', 'Microphone permission is required to record audio.');
                return;
            }

            const recordingInstance = new Audio.Recording();
            await recordingInstance.prepareToRecordAsync({
                android: {
                    extension: '.m4a',
                    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
                    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
                    sampleRate: 44100,
                    numberOfChannels: 2,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.m4a',
                    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
                    sampleRate: 44100,
                    numberOfChannels: 2,
                    bitRate: 128000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
            });

            await recordingInstance.startAsync();
            setRecording(recordingInstance);
            setRecordingDuration(0);

            // Start the timer
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);

            console.log('Recording started');
        } catch (error) {
            console.error('Error starting recording:', error);
            Alert.alert('Error', 'Unable to start recording. Please try again.');
        }
    };

    const stopRecording = async () => {
        if (!recording) {
            Alert.alert('No Recording Active', 'There is no active recording to stop.');
            return;
        }

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null); // Reset the recording state

            // Stop the timer
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }

            // Reset the timer
            setRecordingDuration(0);

            if (uri) {
                console.log('Recording saved to:', uri);
                sendVoiceMessage(uri);
            }
        } catch (error) {
            console.error('Error stopping recording:', error);
            Alert.alert('Error', 'Unable to stop recording. Please try again.');
        } finally {
            setRecordingModalVisible(false); // Close the modal
        }
    };

    const sendVoiceMessage = async (audioUri: string) => {
        const formData = new FormData();
        formData.append('nearest', 'aa');
        formData.append('name', 'Aayush');
        formData.append('audio', {
            uri: audioUri,
            type: 'audio/mpeg',
            name: 'audio.m4a',
        });

        try {
            setLoading(true);
            const response = await fetch(`${apiEndpoint}/voicechat/`, {
                method: 'POST',
                headers: {
                    Authorization: basicAuth,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            const transcriptionMessage = {
                id: uuid.v4(),
                text: data.transcription || 'Transcription not available.',
                sender: 'user',
            };

            const botMessage = {
                id: uuid.v4(),
                text: data.response || 'Sorry, something went wrong.',
                sender: 'bot',
            };

            setMessages((prevMessages) => [...prevMessages, transcriptionMessage, botMessage]);
        } catch (error) {
            console.error('Error sending voice message:', error);
            Alert.alert('Error', 'Failed to send voice message. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClearChat} style={{ alignSelf: 'center' }}>
                    <MaterialIcons name="more-vert" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatContainer}
                ListFooterComponent={loading ? <TypingIndicator /> : null}
                onContentSizeChange={() =>
                    flatListRef.current?.scrollToEnd({ animated: true })
                }
            />

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
                <TouchableOpacity style={styles.voiceButton} onPress={() => setRecordingModalVisible(true)}>
                    <MaterialIcons name="mic" size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <MaterialIcons name="send" size={24} color="#ffffff" />
                </TouchableOpacity>
            </KeyboardAvoidingView>
            {/* Recording Modal */}
            <Modal
                visible={recordingModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setRecordingModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Recording</Text>
                        <Text style={styles.recordingTimer}>
                            {`Duration: ${Math.floor(recordingDuration / 60)
                                .toString()
                                .padStart(2, '0')}:${(recordingDuration % 60)
                                .toString()
                                .padStart(2, '0')}`}
                        </Text>
                        <TouchableOpacity
                            style={[styles.voiceButton, { backgroundColor: recording ? '#f44336' : '#4caf50' }]}
                            onPress={recording ? stopRecording : startRecording}
                        >
                            <MaterialIcons name={recording ? 'stop' : 'mic'} size={24} color="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.closeModalButton}
                            onPress={() => setRecordingModalVisible(false)}
                        >
                            <Text style={styles.closeModalText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: '#e0e0e0',
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    dot: {
        width: 6,
        height: 6,
        marginHorizontal: 2,
        borderRadius: 3,
        backgroundColor: '#000',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#ffffff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    recordingTimer: {
        marginVertical: 10,
        fontSize: 16,
        color: '#000',
    },
    closeModalButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#f44336',
        borderRadius: 5,
    },
    closeModalText: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
});