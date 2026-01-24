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
import '../offline_sync/offline_queue_service.dart';

final materialRequestsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authRes = ref.watch(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  return await authRes.getMaterialRequests(projectId: (project['project_id'] ?? project['id']).toString());
});

final materialBillsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authRes = ref.watch(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  return await authRes.getMaterialBills(projectId: (project['project_id'] ?? project['id']).toString());
});

final createMaterialRequestProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, data) async {
  final authRes = ref.read(authServiceProvider);
  final user = ref.read(currentUserProvider);
  
  try {
    await authRes.createMaterialRequest(data);
    ref.invalidate(materialRequestsProvider);
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
        'action_type': 'CREATE_MATERIAL_REQUEST',
        'entity_type': 'MATERIAL_REQUEST',
        'project_id': data['project_id'].toString(),
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

final uploadMaterialBillProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, data) async {
  final authRes = ref.read(authServiceProvider);
  final user = ref.read(currentUserProvider);
  
  try {
    await authRes.uploadMaterialBill(data);
    ref.invalidate(materialBillsProvider);
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
        'action_type': 'UPLOAD_MATERIAL_BILL',
        'entity_type': 'MATERIAL_BILL',
        'project_id': data['project_id'].toString(),
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

final ocrRequestProvider = FutureProvider.family<Map<String, dynamic>, Map<String, dynamic>>((ref, data) async {
  final authRes = ref.read(authServiceProvider);
  return await authRes.ocrBill(data);
});
