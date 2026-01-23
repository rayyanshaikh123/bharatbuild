import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_providers.dart';

final engineerActivitiesProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authService = ref.watch(authServiceProvider);
  final result = await authService.getEngineerActivities();
  return result['audits'] as List<dynamic>;
});
