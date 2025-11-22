import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList, ApiSettings, DataMode} from '../types';
import {DEFAULT_API_SETTINGS} from '../types';
import {
  getApiSettings,
  saveApiSettings,
  testApiConnection,
} from '../services/apiService';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({navigation}: Props): React.JSX.Element {
  const [settings, setSettings] = useState<ApiSettings>(DEFAULT_API_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await getApiSettings();
      setSettings(loaded);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveApiSettings(settings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.apiUrl) {
      Alert.alert('Error', 'Please enter an API URL first');
      return;
    }

    setTesting(true);
    setConnectionStatus(null);

    try {
      // Save current settings first so the test uses them
      await saveApiSettings(settings);
      const result = await testApiConnection();
      setConnectionStatus({
        tested: true,
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: 'Test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleModeChange = (mode: DataMode) => {
    setSettings(prev => ({...prev, mode}));
    setConnectionStatus(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Data Mode Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Mode</Text>
        <Text style={styles.sectionDescription}>
          Choose where tournament data is stored
        </Text>

        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              settings.mode === 'local' && styles.modeButtonActive,
            ]}
            onPress={() => handleModeChange('local')}>
            <Text
              style={[
                styles.modeButtonText,
                settings.mode === 'local' && styles.modeButtonTextActive,
              ]}>
              Local Only
            </Text>
            <Text style={styles.modeButtonDescription}>
              Store all data on device
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              settings.mode === 'api' && styles.modeButtonActive,
            ]}
            onPress={() => handleModeChange('api')}>
            <Text
              style={[
                styles.modeButtonText,
                settings.mode === 'api' && styles.modeButtonTextActive,
              ]}>
              Tournament API
            </Text>
            <Text style={styles.modeButtonDescription}>
              Sync with external app
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* API Configuration */}
      {settings.mode === 'api' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Configuration</Text>

          {/* API URL */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>API URL</Text>
            <TextInput
              style={styles.input}
              value={settings.apiUrl}
              onChangeText={text =>
                setSettings(prev => ({...prev, apiUrl: text}))
              }
              placeholder="http://192.168.1.100:3000"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.inputHint}>
              Enter the base URL of your tournament app
            </Text>
          </View>

          {/* API Key (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>API Key (Optional)</Text>
            <TextInput
              style={styles.input}
              value={settings.apiKey || ''}
              onChangeText={text =>
                setSettings(prev => ({...prev, apiKey: text || undefined}))
              }
              placeholder="Enter API key if required"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>

          {/* Test Connection */}
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestConnection}
            disabled={testing || !settings.apiUrl}>
            {testing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.testButtonText}>Test Connection</Text>
            )}
          </TouchableOpacity>

          {/* Connection Status */}
          {connectionStatus && (
            <View
              style={[
                styles.statusBanner,
                connectionStatus.success
                  ? styles.statusSuccess
                  : styles.statusError,
              ]}>
              <Text style={styles.statusText}>
                {connectionStatus.success ? '✓ ' : '✗ '}
                {connectionStatus.message}
              </Text>
            </View>
          )}

          {/* Sync Options */}
          <View style={styles.switchGroup}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Auto-sync Results</Text>
                <Text style={styles.switchDescription}>
                  Automatically send race results to API
                </Text>
              </View>
              <Switch
                value={settings.autoSync}
                onValueChange={value =>
                  setSettings(prev => ({...prev, autoSync: value}))
                }
                trackColor={{false: '#333', true: '#ff6b35'}}
                thumbColor={settings.autoSync ? '#fff' : '#888'}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Sync Videos</Text>
                <Text style={styles.switchDescription}>
                  Upload race videos (uses more data)
                </Text>
              </View>
              <Switch
                value={settings.syncVideos}
                onValueChange={value =>
                  setSettings(prev => ({...prev, syncVideos: value}))
                }
                trackColor={{false: '#333', true: '#ff6b35'}}
                thumbColor={settings.syncVideos ? '#fff' : '#888'}
              />
            </View>
          </View>

          {/* Last Sync Info */}
          {settings.lastSyncAt && (
            <Text style={styles.lastSync}>
              Last synced: {new Date(settings.lastSyncAt).toLocaleString()}
            </Text>
          )}
        </View>
      )}

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>App Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Hot Wheels Scale</Text>
          <Text style={styles.aboutValue}>1:64</Text>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Settings</Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    marginBottom: 15,
  },
  backButtonText: {
    color: '#4ecdc4',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 15,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#2a2a4e',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2a2a4e',
  },
  modeButtonActive: {
    borderColor: '#ff6b35',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 5,
  },
  modeButtonTextActive: {
    color: '#ff6b35',
  },
  modeButtonDescription: {
    fontSize: 12,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  testButton: {
    backgroundColor: '#4ecdc4',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  testButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBanner: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusSuccess: {
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  statusError: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  switchGroup: {
    marginTop: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  switchInfo: {
    flex: 1,
    marginRight: 15,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  switchDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  lastSync: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  aboutLabel: {
    fontSize: 14,
    color: '#888',
  },
  aboutValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#ff6b35',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 40,
  },
});
