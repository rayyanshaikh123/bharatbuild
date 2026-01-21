import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'project_provider.dart';

final currentProjectProvider = StateNotifierProvider<CurrentProjectNotifier, Map<String, dynamic>?>((ref) {
  return CurrentProjectNotifier(ref);
});

class CurrentProjectNotifier extends StateNotifier<Map<String, dynamic>?> {
  final Ref _ref;
  static const String _storageKey = 'selected_project';

  CurrentProjectNotifier(this._ref) : super(null) {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_storageKey);
    
    if (stored != null) {
      state = jsonDecode(stored) as Map<String, dynamic>;
    } else {
      // If nothing in storage, fall back to first project from initializer
      _initializeFromList();
    }
  }

  Future<void> _initializeFromList() async {
    final projects = await _ref.read(engineerProjectsProvider.future);
    if (projects.isNotEmpty && state == null) {
      setProject(projects.first);
    }
  }

  Future<void> setProject(Map<String, dynamic> project) async {
    state = project;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(project));
  }

  Future<void> clear() async {
    state = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }
}
