import 'package:flutter/foundation.dart' show kIsWeb;
// Platform import guarded to avoid web build issues
// ignore: avoid_web_libraries_in_flutter
import 'dart:io' show Platform;

/// API base URL resolution:
/// - Use compile-time `--dart-define=API_BASE_URL=...` if provided
/// - Else: Android emulator -> 10.0.2.2, others -> localhost
const String _envApiBase = String.fromEnvironment('API_BASE_URL', defaultValue: '');

String get API_BASE_URL {
  if (_envApiBase.isNotEmpty) return _envApiBase;
  if (kIsWeb) return 'http://localhost:3001';
  try {
    if (Platform.isAndroid) return 'http://10.0.2.2:3001';
  } catch (_) {
    // Platform may not be available in some contexts
  }
  return 'http://localhost:3001';
}
