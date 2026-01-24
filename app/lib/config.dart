import 'package:flutter/foundation.dart' show kIsWeb;
// Platform import guarded to avoid web build issues
// ignore: avoid_web_libraries_in_flutter
import 'dart:io' show Platform;

/// TODO: Update this IP address with your Mac's IP address
/// Run this command on Mac to get your IP: ipconfig getifaddr en0
const String BASE_IP = '172.16.28.199'; // Current Mac IP
const int PORT = 3001;

/// API base URL resolution:
String get API_BASE_URL {
  // Check for compile-time override first (useful for CI/CD or explicit command line overrides)
  const dartDefineUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  if (dartDefineUrl.isNotEmpty) return dartDefineUrl;

  if (kIsWeb) return 'http://localhost:$PORT';
  
  // Note: For physical Android devices, we MUST use the network IP ($BASE_IP), not 10.0.2.2.
  // 10.0.2.2 is ONLY for Android Emulator loopback.
  // Since we are likely testing on physical device (RZCTA...), defaulting to BASE_IP is safer.
  // If you are on Emulator, you might need to revert to 10.0.2.2 manually or add an isSimulator check.
  
  return 'http://$BASE_IP:$PORT';
}
