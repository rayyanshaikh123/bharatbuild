import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import 'auth_providers.dart';

/// Provider for fetching engineer profile
final engineerProfileProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final auth = ref.read(authServiceProvider);
  return await auth.getEngineerProfile();
});

/// Provider for updating engineer profile
final updateEngineerProfileProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, data) async {
  final auth = ref.read(authServiceProvider);
  try {
    await auth.updateEngineerProfile(data);
    // Invalidate the profile provider to refresh data
    ref.invalidate(engineerProfileProvider);
    return true;
  } catch (e) {
    return false;
  }
});
