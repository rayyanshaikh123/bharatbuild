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
    final msg = e.toString().toLowerCase();
    // Do not queue 4xx client errors (validation, config missing, etc)
    if (msg.contains('wage rate not configured') || 
        msg.contains('missing required fields') ||
        msg.contains('approved attendance not found') ||
        msg.contains('400') || 
        msg.contains('403') || 
        msg.contains('404')) {
      throw e; // Rethrow to UI to show actual error
    }

    // Only queue for network/server 500 issues
    await OfflineQueueService.push(
      type: 'WAGE',
      endpoint: '/engineer/wages/submit',
      payload: payload,
    );
    return false;
  }
});

final unpaidWagesProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final auth = ref.read(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  return await auth.getUnpaidWages((project['project_id'] ?? project['id']).toString());
});

final markWagePaidProvider = FutureProvider.family<bool, String>((ref, wageId) async {
  final auth = ref.read(authServiceProvider);
  try {
    await auth.markWagePaid(wageId);
    ref.invalidate(unpaidWagesProvider);
    return true;
  } catch (e) {
    // Optionally queue offline if needed
    await OfflineQueueService.push(
      type: 'WAGE_PAY',
      endpoint: '/engineer/wages/$wageId/mark-paid',
      method: 'PATCH',
    );
    return false;
  }
});

final myWagesProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final auth = ref.watch(authServiceProvider);
  return await auth.getLabourWages();
});
