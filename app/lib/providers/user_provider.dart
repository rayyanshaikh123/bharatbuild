import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Holds the currently authenticated user as a map (nullable).
/// Example: {"id": 1, "name": "Alice", "phone": "..."}
final currentUserProvider = StateProvider<Map<String, dynamic>?>((ref) => null);
