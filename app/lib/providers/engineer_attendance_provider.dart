import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../services/auth_service.dart';
import 'auth_providers.dart';
import 'current_project_provider.dart';
import 'user_provider.dart';
import '../offline_sync/offline_queue_service.dart';
import '../storage/sqlite_service.dart';

/// Provider for fetching today's attendance for the selected project
final engineerTodayAttendanceProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final auth = ref.read(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  return await auth.getProjectTodayAttendance((project['project_id'] ?? project['id']).toString());
});



/// Provider for marking attendance
final engineerMarkAttendanceProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, payload) async {
  final auth = ref.read(authServiceProvider);
  final user = ref.read(currentUserProvider);
  
  try {
    await auth.markAttendance(payload);
    ref.invalidate(engineerTodayAttendanceProvider);
    return true;
  } catch (e) {
    if (user == null) return false;
    
    await SQLiteService.insertAction({
      'id': const Uuid().v4(),
      'user_role': 'SITE_ENGINEER',
      'user_id': user['id'].toString(),
      'action_type': 'MANUAL_ATTENDANCE',
      'entity_type': 'ATTENDANCE',
      'project_id': payload['projectId'].toString(),
      'payload': jsonEncode(payload),
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'sync_status': 'PENDING',
    });
    return false;
  }
});

/// Provider for searching a labourer
final engineerSearchLabourProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, phone) async {
  final auth = ref.read(authServiceProvider);
  return await auth.searchLabourByPhone(phone);
});
