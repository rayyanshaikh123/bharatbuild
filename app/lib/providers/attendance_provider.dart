import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import 'auth_providers.dart';

final attendanceHistoryProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return await authService.getAttendanceHistory();
});

final todayAttendanceProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return await authService.getTodayAttendance();
});

final checkInProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, Map<String, dynamic>>((ref, params) async {
  final authService = ref.watch(authServiceProvider);
  final attendance = await authService.checkIn(
    params['projectId'].toString(),
    params['lat'] as double,
    params['lon'] as double,
  );
  ref.invalidate(todayAttendanceProvider);
  ref.invalidate(attendanceHistoryProvider);
  return attendance;
});

final checkOutProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final authService = ref.watch(authServiceProvider);
  final attendance = await authService.checkOut();
  ref.invalidate(todayAttendanceProvider);
  ref.invalidate(attendanceHistoryProvider);
  return attendance;
});
