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

export default function ChatScreen() {
    const [messages, setMessages] = useState([
        { id: '1', text: 'Hello! How can I help you today?', sender: 'bot' },
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef(null);

    const basicAuth = `Basic ${btoa('admin:KHtj9wOh3WUtHDnM3thIzNDkmk3eDn5z')}`;

    const handleSend = async () => {
        if (inputText.trim()) {
            const userMessage = { id: Date.now().toString(), text: inputText, sender: 'user' };
            setMessages((prevMessages) => [...prevMessages, userMessage]);
            setInputText('');

            try {
                setLoading(true);
                const response = await fetch('https://major.waferclabs.com:16384/chat/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: basicAuth,
                    },
                    body: JSON.stringify({
                        nearest: 'demo_value',
                        neighbour: ['demo_value'],
                        name: 'demo_value',
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
                console.error('Error fetching API:', error);
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
            {/* Chat Header */}
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
        paddingHorizontal: 20, // Horizontal padding for spacing
        paddingVertical: 20, // Adjust vertical padding for better spacing
        height: 70, // Increase height for a WhatsApp-like header
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