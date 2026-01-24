import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'auth_providers.dart';

/// Holds the currently authenticated user as a map.
/// Persisted locally to survive app restarts and show immediate UI.
final currentUserProvider = StateNotifierProvider<UserNotifier, Map<String, dynamic>?>((ref) {
  return UserNotifier();
});

class UserNotifier extends StateNotifier<Map<String, dynamic>?> {
  static const _storageKey = 'cached_user';

  UserNotifier() : super(null) {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_storageKey);
    if (stored != null) {
      state = jsonDecode(stored) as Map<String, dynamic>;
    }
  }

  void setUser(Map<String, dynamic>? user) async {
    state = user;
    final prefs = await SharedPreferences.getInstance();
    if (user != null) {
      await prefs.setString(_storageKey, jsonEncode(user));
    } else {
      await prefs.remove(_storageKey);
    }
  }
}

/// Role-aware profile fetcher that updates currentUserProvider
final profileProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final current = ref.watch(currentUserProvider);
  if (current == null) return null;
  
  final role = current['role']?.toString().toUpperCase() ?? 'LABOUR';
  final auth = ref.read(authServiceProvider);
  
  try {
    Map<String, dynamic>? updated;
    if (role == 'SITE_ENGINEER' || role == 'ENGINEER') {
      updated = await auth.getEngineerProfile();
    } else {
      updated = await auth.getLabourProfile();
    }
    
    if (updated != null) {
      // Ensure role is preserved if backend doesn't send it back in profile call
      if (updated['role'] == null) updated['role'] = role;
      
      // Update global user state (this also persists to storage)
      // Future.microtask prevents state update during build
      Future.microtask(() => ref.read(currentUserProvider.notifier).setUser(updated));
      
      return updated;
    }
  } catch (e) {
    // Return current state if refresh fails (offline or server error)
  }
  return current;
});
