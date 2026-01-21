import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_providers.dart';
import 'current_project_provider.dart';
import '../offline_sync/offline_queue_service.dart';

final materialRequestsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authRes = ref.watch(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  return await authRes.getMaterialRequests(projectId: (project['id'] ?? project['project_id']).toString());
});

final materialBillsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authRes = ref.watch(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  return await authRes.getMaterialBills(projectId: (project['id'] ?? project['project_id']).toString());
});

final createMaterialRequestProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, data) async {
  final authRes = ref.read(authServiceProvider);
  try {
    await authRes.createMaterialRequest(data);
    ref.invalidate(materialRequestsProvider);
    return true;
  } catch (e) {
    await OfflineQueueService.push(
      type: 'MATERIAL_REQUEST',
      endpoint: '/engineer/material/request',
      payload: data,
    );
    return false;
  }
});

final uploadMaterialBillProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, data) async {
  final authRes = ref.read(authServiceProvider);
  try {
    await authRes.uploadMaterialBill(data);
    ref.invalidate(materialBillsProvider);
    return true;
  } catch (e) {
    await OfflineQueueService.push(
      type: 'MATERIAL_BILL',
      endpoint: '/engineer/material/upload-bill',
      payload: data,
    );
    return false;
  }
});
