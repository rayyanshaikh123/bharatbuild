import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_providers.dart';
import 'current_project_provider.dart';
import '../offline_sync/offline_queue_service.dart';

final wageQueueProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final auth = ref.read(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  return await auth.getWageQueue((project['project_id'] ?? project['id']).toString());
});

final submitWageProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, payload) async {
  final auth = ref.read(authServiceProvider);
  
  try {
    await auth.submitWage(payload);
    ref.invalidate(wageQueueProvider);
    return true;
  } catch (e) {
    await OfflineQueueService.push(
      type: 'WAGE',
      endpoint: '/engineer/wages/submit',
      payload: payload,
    );
    return false;
  }
});
