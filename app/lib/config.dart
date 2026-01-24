import 'package:flutter/foundation.dart' show kIsWeb;
// Platform import guarded to avoid web build issues
// ignore: avoid_web_libraries_in_flutter
import 'dart:io' show Platform;

/// TODO: Update this IP address with your Mac's IP address
/// Run this command on Mac to get your IP: ipconfig getifaddr en0
const String BASE_IP = '172.16.7.241'; // Change this to your Mac's IP address
const int PORT = 3001;

/// API base URL resolution:
/// - Android emulator uses 10.0.2.2 (special emulator localhost)
/// - iOS simulator and physical devices use your Mac's network IP
String get API_BASE_URL {
  if (kIsWeb) return 'http://localhost:$PORT';
  
  try {
    // Android emulator needs special IP to access host machine
    if (Platform.isAndroid) return 'http://10.0.2.2:$PORT';
  } catch (_) {
    // Platform may not be available in some contexts
  }
  
  // iOS simulator and physical devices use network IP
  return 'http://$BASE_IP:$PORT';
}
