import 'dart:math';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';

class VoiceNLPService {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isAvailable = false;

  // Multilingual Stopwords (English, Hindi, Hinglish)
  static const Set<String> _stopWords = {
    'i', 'want', 'please', 'and', 'get', 'need', 'add', 'today', 'done', 'did',
    'chahiye', 'hai', 'tha', 'raha', 'kar', 'liya', 'dedo', 'karna', 'baaki',
    'total', 'lagi', 'hui', 'gya', 'karne', 'se'
  };

  Future<bool> init() async {
    final status = await Permission.microphone.request();
    if (status != PermissionStatus.granted) return false;

    _isAvailable = await _speech.initialize(
      onStatus: (status) => print('Speech Status: $status'),
      onError: (error) => print('Speech Error: $error'),
    );
    return _isAvailable;
  }

  Future<void> startListening(Function(String) onResult) async {
    if (!_isAvailable) return;
    await _speech.listen(
      onResult: (result) {
        if (result.finalResult) {
          onResult(result.recognizedWords);
        }
      },
      localeId: 'en_IN', // Handles English & Hindi in India context well
    );
  }

  Future<void> stopListening() async {
    await _speech.stop();
  }

  /// Local NLP Logic with Multilingual handling and Autocorrection (Fuzzy Match)
  Map<String, dynamic> parseSpeech(String text, Map<String, String> knownItems) {
    // 1. Normalize & Remove Stopwords
    String normalized = text.toLowerCase();
    
    // 2. Tokenize
    List<String> rawTokens = normalized.split(RegExp(r'\s+'));
    List<String> tokens = rawTokens.where((t) => !_stopWords.contains(t)).toList();

    Map<String, double> resultItems = {};
    List<Map<String, dynamic>> customItems = [];

    // 3. Extraction logic
    for (int i = 0; i < tokens.length; i++) {
      double? qty = double.tryParse(tokens[i]);
      
      if (qty != null && i + 1 < tokens.length) {
        String nextWord = tokens[i + 1];
        
        // Autocorrection: Check for best fuzzy match among known items
        String? bestMatchId;
        double highestSimilarity = 0.0;

        for (var itemName in knownItems.keys) {
          double similarity = _calculateSimilarity(nextWord, itemName);
          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatchId = knownItems[itemName];
          }
        }

        // 70% similarity threshold for "autocorrection"
        if (bestMatchId != null && highestSimilarity > 0.7) {
          resultItems[bestMatchId] = (resultItems[bestMatchId] ?? 0) + qty;
          i++; // Skip next word as it was matched
        } else {
          // Custom attribute or unknown item
          customItems.add({
            "item": nextWord,
            "quantity": qty
          });
          i++;
        }
      }
    }

    return {
      "items": resultItems,
      "custom": customItems,
    };
  }

  /// Levenshtein Distance based similarity score (0.0 to 1.0)
  double _calculateSimilarity(String s1, String s2) {
    if (s1 == s2) return 1.0;
    if (s1.isEmpty || s2.isEmpty) return 0.0;

    int distance = _levenshtein(s1, s2);
    int maxLength = max(s1.length, s2.length);
    
    return 1.0 - (distance / maxLength);
  }

  int _levenshtein(String s1, String s2) {
    List<List<int>> matrix = List.generate(
      s1.length + 1,
      (i) => List.filled(s2.length + 1, 0),
    );

    for (int i = 0; i <= s1.length; i++) matrix[i][0] = i;
    for (int j = 0; j <= s2.length; j++) matrix[0][j] = j;

    for (int i = 1; i <= s1.length; i++) {
      for (int j = 1; j <= s2.length; j++) {
        int cost = s1[i - 1] == s2[j - 1] ? 0 : 1;
        matrix[i][j] = [
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        ].reduce(min);
      }
    }
    return matrix[s1.length][s2.length];
  }
}
