import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import 'auth_providers.dart';
import 'current_project_provider.dart';
import '../offline_sync/offline_queue_service.dart';

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
  
  try {
    await auth.markAttendance(payload);
    ref.invalidate(engineerTodayAttendanceProvider);
    return true;
  } catch (e) {
    await OfflineQueueService.push(
      type: 'ATTENDANCE',
      endpoint: '/engineer/attendance/mark',
      payload: payload,
    );
    return false;
  }
});

/// Provider for searching a labourer
final engineerSearchLabourProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, phone) async {
  final auth = ref.read(authServiceProvider);
  return await auth.searchLabourByPhone(phone);
});
