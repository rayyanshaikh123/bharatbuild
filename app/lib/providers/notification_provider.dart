import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_providers.dart';

final engineerNotificationsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authService = ref.watch(authServiceProvider);
  final result = await authService.getEngineerNotifications();
  return result['notifications'] as List<dynamic>;
});

final labourNotificationsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authService = ref.watch(authServiceProvider);
  final result = await authService.getLabourNotifications();
  return result['notifications'] as List<dynamic>;
});
