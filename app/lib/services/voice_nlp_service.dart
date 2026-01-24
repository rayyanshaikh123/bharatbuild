import 'dart:math';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';

class VoiceNLPService {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isAvailable = false;

  // Common Unit Words to Skip
  static const Set<String> _units = {
    'bag', 'bags', 'kattan', 'bora', 'kg', 'ltr', 'liter', 'litre',
    'meter', 'metre', 'sqm', 'sqft', 'feet', 'foot', 'cft', 'nos', 
    'number', 'piece', 'pcs'
  };

  // Multilingual Stopwords (English, Hindi, Hinglish)
  static const Set<String> _stopWords = {
    'i', 'want', 'please', 'and', 'get', 'need', 'add', 'today', 'done', 'did',
    'chahiye', 'hai', 'tha', 'raha', 'kar', 'liya', 'dedo', 'karna', 'baaki',
    'total', 'lagi', 'hui', 'gya', 'karne', 'se',
    'aur', 'ka', 'ki', 'ke', 'mai', 'me', 'h', 'use', 'lagaya', 'complete'
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

  // Hindi to English Construction Terms Dictionary
  static final Map<String, String> _hindiToEnglish = {
    'ret': 'sand',
    'reti': 'sand',
    'balu': 'sand',
    'eent': 'brick',
    'int': 'brick',
    'pathar': 'stone',
    'gitti': 'aggregate',
    'sariya': 'steel',
    'loha': 'steel',
    'cement': 'cement',
    'pani': 'water',
    'mitti': 'soil',
    'khudai': 'excavation',
    'plaster': 'plastering',
    'paint': 'painting',
    'diwar': 'wall',
    'chhat': 'slab',
    'beam': 'beam',
    'column': 'column',
    'fash': 'flooring',
    'tiles': 'tiling',
    'darwaza': 'door',
    'khidki': 'window',
    'bijli': 'electrical',
    'taar': 'wire',
    'pipe': 'plumbing',
    'nal': 'tap',
  };

  /// Local NLP Logic with Multilingual handling and Autocorrection (Fuzzy Match)
  // knownItems: Map<TaskName, PlanItemID> for Work Tasks
  Map<String, dynamic> parseSpeech(String text, Map<String, String> knownItems) {
    // 1. Normalize & Remove Stopwords
    String normalized = text.toLowerCase();
    
    // 2. Tokenize
    List<String> rawTokens = normalized.split(RegExp(r'\s+'));
    List<String> tokens = rawTokens.where((t) => !_stopWords.contains(t)).toList();

    Map<String, double> workTasks = {};
    List<Map<String, dynamic>> materialsUsed = [];
    List<Map<String, dynamic>> customItems = []; // Unrecognized

    // Known materials set (from dictionary values)
    final Set<String> knownMaterials = _hindiToEnglish.values.toSet();
    // Add common English materials just in case
    knownMaterials.addAll(['cement', 'sand', 'brick', 'steel', 'aggregate', 'water', 'paint']);

    // 3. Extraction logic
    for (int i = 0; i < tokens.length; i++) {
      double? qty = double.tryParse(tokens[i]);
      
      if (qty != null && i + 1 < tokens.length) {
        String nextWord = tokens[i + 1];
        int skipCount = 1;

        // Skip unit word if present (e.g. "10 [bag] cement")
        if (_units.contains(nextWord) && i + 2 < tokens.length) {
          nextWord = tokens[i + 2];
          skipCount = 2; // Skip both unit and item
        }
        
        // Dictionary Lookup (Hindi -> English)
        String englishWord = _hindiToEnglish[nextWord] ?? nextWord;

        // A. Check if it's a Material
        // Simple logic: direct match with material dictionary
        if (knownMaterials.contains(englishWord) || knownMaterials.contains(nextWord)) {
           materialsUsed.add({
             "material": englishWord,
             "quantity": qty
           });
           i += skipCount;
           continue; 
        }

        // B. Check if it's a Work Task (Plan Item)
        String? bestMatchId;
        double highestSimilarity = 0.0;

        for (var itemName in knownItems.keys) {
          final itemLower = itemName.toLowerCase();
          
          // 1. Exact or Substring Match (Strongest)
          // e.g. "Excavation" in "Excavation of Foundation"
          if (itemLower.contains(englishWord) || englishWord.contains(itemLower)) {
             bestMatchId = knownItems[itemName];
             highestSimilarity = 1.0;
             break; // Strong match found, stop searching for this word
          }

          // 2. Fuzzy Match (Levenstein)
          double similarityRaw = _calculateSimilarity(nextWord, itemName);
          double similarityTrans = _calculateSimilarity(englishWord, itemName);
          double similarity = max(similarityRaw, similarityTrans);

          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatchId = knownItems[itemName];
          }
        }

        // Thresholds: 1.0 for substring, 0.6 for fuzzy
        if (bestMatchId != null && highestSimilarity > 0.6) {
          workTasks[bestMatchId] = (workTasks[bestMatchId] ?? 0) + qty;
          i += skipCount; 
        } else {
          // C. Unknown
          customItems.add({
            "item": englishWord,
            "quantity": qty
          });
          i += skipCount;
        }
      }
    }

    return {
      "items": workTasks,      // Work Tasks (linked to Plan Items)
      "materials": materialsUsed, // Consumed Materials (to update Ledger)
      "custom": customItems,   // Unknown
      "full_text": text,       // Original text for description
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
