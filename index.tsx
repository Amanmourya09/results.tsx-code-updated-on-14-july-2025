import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import API from '../utils/api';

interface DictionaryEntry {
  _id: string;
  पद: string;
  लिंग?: string;
  व्याख्या?: string;
  सन्दर्भ?: string;
  मराठी_अर्थ?: string;
}

function debounce(func: (...args: any[]) => void, delay: number) {
  let timeout: NodeJS.Timeout;
  return function (...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

export default function HomeScreen() {
  const [word, setWord] = useState('');
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const stored = await AsyncStorage.getItem('searchHistory');
    if (stored) setHistory(JSON.parse(stored));
  };

  const saveToHistory = async (term: string) => {
    const updated = [term, ...history.filter(item => item !== term)].slice(0, 5);
    setHistory(updated);
    await AsyncStorage.setItem('searchHistory', JSON.stringify(updated));
  };

  const fetchSuggestions = async (input: string) => {
    if (!input) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await API.get('/word', {
        params: {
          word: input,
          filter: selectedFilter || undefined
        }
      });

      if (response.data.success) {
        setSuggestions(response.data.results || []);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedFetch = debounce(fetchSuggestions, 500);

  const handleSearch = () => {
    if (!word.trim()) return;
    saveToHistory(word.trim());
    router.push({
      pathname: '/results',
      params: {
        word: word.trim(),
        filter: selectedFilter || undefined
      }
    });
  };

  const handleSuggestionSelect = (item: DictionaryEntry) => {
    setWord(item.पद);
    saveToHistory(item.पद);
    router.push({
      pathname: '/results',
      params: {
        word: item.पद,
        filter: selectedFilter || undefined
      }
    });
  };

  const toggleFilter = (filterName: string) => {
    const newFilter = selectedFilter === filterName ? null : filterName;
    setSelectedFilter(newFilter);
    if (word) {
      fetchSuggestions(word);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>🌿 आयुर्वेद-शब्दार्थबोधिका</Text>
          
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Search Sanskrit words..."
              placeholderTextColor="#999"
              value={word}
              onChangeText={(text) => {
                setWord(text);
                debouncedFetch(text);
              }}
              onSubmitEditing={handleSearch}
            />
            {word ? (
              <TouchableOpacity onPress={() => setWord('')}>
                <Ionicons name="close-circle" size={24} color="#999" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity 
              style={styles.searchButton} 
              onPress={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            <Text style={styles.filterTitle}>Filters:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['पद', 'व्याख्या', 'सन्दर्भ'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    selectedFilter === filter && styles.activeFilter
                  ]}
                  onPress={() => toggleFilter(filter)}
                >
                  <Text style={styles.filterButtonText}>{filter}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Recent Searches */}
          {history.length > 0 && !word && (
            <View style={styles.historyContainer}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <View style={styles.historyList}>
                {history.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.historyItem}
                    onPress={() => {
                      setWord(item);
                      handleSearch();
                    }}
                  >
                    <Text style={styles.historyText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Search Results */}
          {suggestions.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.sectionTitle}>Search Results</Text>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => handleSuggestionSelect(item)}
                  >
                    <Text style={styles.resultText}>{item.पद}</Text>
                    {item.मराठी_अर्थ && (
                      <Text style={styles.subText}>{item.मराठी_अर्थ}</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
    textAlign: 'center',
    color: '#2d3436',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filtersContainer: {
    marginBottom: 15,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  filterButton: {
    backgroundColor: '#e0f7fa',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  activeFilter: {
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
    color: '#00796b',
    fontWeight: '500',
  },
  historyContainer: {
    marginTop: 15,
  },
  resultsContainer: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  historyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  historyItem: {
    backgroundColor: '#e0f7fa',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  historyText: {
    color: '#00796b',
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});