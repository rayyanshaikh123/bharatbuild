import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_providers.dart';
import 'current_project_provider.dart';
import '../offline_sync/offline_queue_service.dart';

final projectStockProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authRes = ref.watch(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  final projectId = project['id'] ?? project['project_id'];
  return await authRes.getProjectStock(projectId.toString());
});

final ledgerHistoryProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authRes = ref.watch(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  final projectId = project['id'] ?? project['project_id'];
  return await authRes.getLedgerHistory(projectId.toString());
});

final recordMovementProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, data) async {
  final authRes = ref.read(authServiceProvider);
  try {
    await authRes.recordMaterialMovement(data);
    ref.invalidate(projectStockProvider);
    ref.invalidate(ledgerHistoryProvider);
    return true;
  } catch (e) {
    // Background sync for movements
    await OfflineQueueService.push(
      type: 'MATERIAL_MOVEMENT',
      endpoint: '/engineer/ledger/movement',
      payload: data,
    );
    return false;
  }
});
