import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:http/http.dart' as http;
import '../storage/sqlite_service.dart';
import '../providers/user_provider.dart';
import 'auth_providers.dart';
import 'current_project_provider.dart';

// Provider to fetch tools for the current project
final projectToolsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authRes = ref.watch(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  
  final projectId = (project['project_id'] ?? project['id']).toString();
  return await authRes.getProjectTools(projectId: projectId);
});

// Provider to create a new tool
final createToolProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, data) async {
  final authRes = ref.read(authServiceProvider);
  final user = ref.read(currentUserProvider);
  
  try {
    await authRes.createTool(data);
    ref.invalidate(projectToolsProvider);
    return true;
  } catch (e) {
    // Only store locally if it's a network error, not validation errors
    bool isNetworkError = e is SocketException || 
                         e is http.ClientException ||
                         e is TimeoutException ||
                         e is HandshakeException ||
                         (e.toString().contains('Failed host lookup')) ||
                         (e.toString().contains('Network is unreachable'));
    
    if (isNetworkError && user != null) {
      // Network error - store locally for later sync
      await SQLiteService.insertAction({
        'id': const Uuid().v4(),
        'user_role': 'SITE_ENGINEER',
        'user_id': user['id'].toString(),
        'action_type': 'CREATE_TOOL',
        'entity_type': 'TOOL',
        'project_id': data['projectId'].toString(),
        'payload': jsonEncode(data),
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'sync_status': 'PENDING',
      });
      return false; // Queued for sync
    } else {
      // Validation or other error - rethrow to show user
      rethrow;
    }
  }
});

// Provider to delete a tool
final deleteToolProvider = FutureProvider.family<bool, String>((ref, toolId) async {
  final authRes = ref.read(authServiceProvider);
  final user = ref.read(currentUserProvider);
  
  try {
    await authRes.deleteTool(toolId);
    ref.invalidate(projectToolsProvider);
    return true;
  } catch (e) {
    bool isNetworkError = e is SocketException || 
                         e is http.ClientException ||
                         e is TimeoutException ||
                         e is HandshakeException ||
                         (e.toString().contains('Failed host lookup')) ||
                         (e.toString().contains('Network is unreachable'));
    
    if (isNetworkError && user != null) {
      await SQLiteService.insertAction({
        'id': const Uuid().v4(),
        'user_role': 'SITE_ENGINEER',
        'user_id': user['id'].toString(),
        'action_type': 'DELETE_TOOL',
        'entity_type': 'TOOL',
        'project_id': '', // Will need to be extracted from context
        'payload': jsonEncode({'toolId': toolId}),
        'created_at': DateTime.now().millisecondsSinceEpoch,
        'sync_status': 'PENDING',
      });
      return false;
    } else {
      rethrow;
    }
  }
});

// Provider to generate QR code for a tool
final generateToolQRProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, toolId) async {
  final authRes = ref.read(authServiceProvider);
  return await authRes.generateToolQR(toolId);
});

// Provider to fetch tool transaction history
final toolHistoryProvider = FutureProvider.family<List<dynamic>, String>((ref, toolId) async {
  final authRes = ref.read(authServiceProvider);
  return await authRes.getToolHistory(toolId);
});
