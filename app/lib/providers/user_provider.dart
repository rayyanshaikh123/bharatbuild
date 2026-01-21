import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_providers.dart';

/// Holds the currently authenticated user as a map (nullable).
/// Example: {"id": 1, "name": "Alice", "phone": "..."}
final currentUserProvider = StateProvider<Map<String, dynamic>?>((ref) => null);

/// Refresh user profile from backend
final refreshUserProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final auth = ref.read(authServiceProvider);
  final user = await auth.getLabourProfile();
  if (user != null) {
    ref.read(currentUserProvider.notifier).state = user;
  }
  return user;
});
