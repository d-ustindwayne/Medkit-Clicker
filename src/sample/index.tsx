import { useState } from 'react';
import {
    // Feedback & Feedback Indicators
    ActivityIndicator,
    Alert,
    // Interactive Controls
    Button,
    // Platform & Layout Helpers
    Dimensions,
    // Lists (Rendered inside Modal to prevent list nesting errors)
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    SectionList,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableHighlight,
    TouchableOpacity,
    TouchableWithoutFeedback,
    // Basic Layout & Structures
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function AllComponentsApp() {
    // --- STATE MANAGEMENT ---
    const [textValue, setTextValue] = useState('');
    const [switchValue, setSwitchValue] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [clickCount, setClickCount] = useState(0);

    // --- REFRESH SIMULATION ---
    const onRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 2000);
    };

    // --- MOCK DATA ---
    const mockFlatListData = [
        { id: '1', title: 'FlatList Item One' },
        { id: '2', title: 'FlatList Item Two' },
    ];

    const mockSectionListData = [
        { title: 'Section A', data: ['Section Item A1', 'Section Item A2'] },
        { title: 'Section B', data: ['Section Item B1'] },
    ];

    return (
        <SafeAreaView style={styles.safeContainer}>
            {/* 1. STATUSBAR */}
            <StatusBar barStyle="dark-content" backgroundColor="#f0f0f0" />

            {/* 2. KEYBOARD AVOIDING VIEW */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flexContainer}
            >
                {/* 3. SCROLLVIEW with REFRESH CONTROL */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
                    }
                >
                    {/* Header Title */}
                    <Text style={styles.mainTitle}>React Native Engine Room</Text>
                    <Text style={styles.subtitle}>Platform detected: {Platform.OS.toUpperCase()}</Text>

                    {/* 4. VIEW COMPONENT (The layout structural block) */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>1. Basic Layout & Views (View, Text)</Text>
                        <Text style={styles.bodyText}>
                            This layout structure uses a <Text style={styles.boldText}>View</Text> element to box information and raw text inside <Text style={styles.boldText}>Text</Text> tags.
                        </Text>
                    </View>

                    {/* 5. IMAGE COMPONENT */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>2. Imagery (Image)</Text>
                        <Image
                            source={{ uri: 'https://reactnative.dev' }}
                            style={styles.imageSample}
                            resizeMode="contain"
                        />
                    </View>

                    {/* 6. TEXTINPUT COMPONENT */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>3. User Input (TextInput)</Text>
                        <TextInput
                            style={styles.inputField}
                            placeholder="Type anything here..."
                            value={textValue}
                            onChangeText={setTextValue}
                        />
                        <Text style={styles.liveEcho}>Live State Mirror: {textValue || '(empty)'}</Text>
                    </View>

                    {/* 7. SYSTEM BUTTON & ALERTS */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>4. Native Call-To-Action (Button & Alert)</Text>
                        <Button
                            title="Trigger System Alert"
                            color="#007AFF"
                            onPress={() => Alert.alert('Alert Title', 'You interacted with a native button module.')}
                        />
                    </View>

                    {/* 8. TOUCHABLES & PRESSABLE */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>5. Touch Systems (Pressable & Touchables)</Text>

                        <TouchableOpacity
                            style={[styles.touchButton, { backgroundColor: '#34C759' }]}
                            onPress={() => setClickCount(prev => prev + 1)}
                        >
                            <Text style={styles.touchText}>TouchableOpacity (Opacity Feedback)</Text>
                        </TouchableOpacity>

                        <TouchableHighlight
                            style={[styles.touchButton, { backgroundColor: '#FF9500', marginTop: 10 }]}
                            underlayColor="#E68500"
                            onPress={() => setClickCount(prev => prev + 1)}
                        >
                            <Text style={styles.touchText}>TouchableHighlight (Underlay Change)</Text>
                        </TouchableHighlight>

                        <Pressable
                            style={({ pressed }) => [
                                styles.touchButton,
                                { backgroundColor: pressed ? '#5856D6' : '#AF52DE', marginTop: 10 }
                            ]}
                            onPress={() => setClickCount(prev => prev + 1)}
                        >
                            <Text style={styles.touchText}>Pressable (Custom Dynamic State)</Text>
                        </Pressable>

                        <TouchableWithoutFeedback onPress={() => setClickCount(0)}>
                            <View style={styles.invisibleTouchFrame}>
                                <Text style={styles.resetLabel}>TouchableWithoutFeedback (Tap here to Reset Count: {clickCount})</Text>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>

                    {/* 9. SWITCH & ACTIVITY INDICATOR */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>6. Status Controls (Switch & ActivityIndicator)</Text>
                        <View style={styles.rowLayout}>
                            <Text style={styles.bodyText}>Toggle State Indicator:</Text>
                            <Switch
                                value={switchValue}
                                onValueChange={setSwitchValue}
                                trackColor={{ false: '#767577', true: '#34C759' }}
                            />
                        </View>
                        {switchValue && (
                            <View style={styles.loadingWrapper}>
                                <ActivityIndicator size="small" color="#007AFF" />
                                <Text style={styles.loadingText}>Simulating network operations...</Text>
                            </View>
                        )}
                    </View>

                    {/* 10. MODAL TRIGGER */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>7. Content Lists & Modals (FlatList, SectionList, Modal)</Text>
                        <Button
                            title="Launch Lists Overlay"
                            color="#FF3B30"
                            onPress={() => setModalVisible(true)}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* MODAL LAYER HOUSING THE PERFORMANCE LIST VIEWS */}
            {/* Nested lists directly inside a vertical ScrollView throw VirtualizedList performance exceptions. */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitleHeader}>List Processing Sandbox</Text>
                        <Button title="Close Layer" color="#FF3B30" onPress={() => setModalVisible(false)} />
                    </View>

                    {/* FLATLIST IMPLEMENTATION */}
                    <View style={styles.listSection}>
                        <Text style={styles.listSectionHeader}>Performance Array (FlatList)</Text>
                        <FlatList
                            data={mockFlatListData}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.listItem}>
                                    <Text style={styles.itemText}>{item.title}</Text>
                                </View>
                            )}
                        />
                    </View>

                    {/* SECTIONLIST IMPLEMENTATION */}
                    <View style={styles.listSection}>
                        <Text style={styles.listSectionHeader}>Grouped Category Matrix (SectionList)</Text>
                        <SectionList
                            sections={mockSectionListData}
                            keyExtractor={(item, index) => item + index}
                            renderSectionHeader={({ section: { title } }) => (
                                <Text style={styles.sectionGroupTitle}>{title}</Text>
                            )}
                            renderItem={({ item }) => (
                                <View style={styles.listItem}>
                                    <Text style={styles.itemText}>{item}</Text>
                                </View>
                            )}
                        />
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

// --- ARCHITECTURAL STYLING ENGINES ---
const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    flexContainer: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1C1C1E',
        textAlign: 'center',
        marginTop: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 12,
    },
    bodyText: {
        fontSize: 14,
        color: '#3A3A3C',
        lineHeight: 20,
    },
    boldText: {
        fontWeight: '700',
    },
    imageSample: {
        width: 60,
        height: 60,
        alignSelf: 'center',
        marginVertical: 10,
    },
    inputField: {
        borderWidth: 1,
        borderColor: '#D1D1D6',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#1C1C1E',
        backgroundColor: '#F2F2F7',
    },
    liveEcho: { marginTop: 8, fontSize: 12, color: '#8E8E93', fontStyle: 'italic', },
    touchButton: { borderRadius: 8, padding: 14, alignItems: 'center', justifyContent: 'center', }, touchText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14, },
    invisibleTouchFrame: { marginTop: 15, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderStyle: 'dashed', borderRadius: 8, },
    resetLabel: { fontSize: 12, color: '#8E8E93', },
    rowLayout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
    loadingWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'center', },
    loadingText: { fontSize: 13, color: '#8E8E93', marginLeft: 8, },
    modalContainer: { flex: 1, backgroundColor: '#FFFFFF', },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA', },
    modalTitleHeader: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', },
    listSection: { flex: 1, padding: 16, },
    listSectionHeader: { fontSize: 15, fontWeight: '700', color: '#8E8E93', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, },
    listItem: { backgroundColor: '#F2F2F7', padding: 16, borderRadius: 8, marginBottom: 8, },
    itemText: { fontSize: 14, color: '#1C1C1E', },
    sectionGroupTitle: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', backgroundColor: '#FFFFFF', paddingVertical: 4, }
});