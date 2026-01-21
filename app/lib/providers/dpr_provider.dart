import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import 'auth_providers.dart';
import 'current_project_provider.dart';
import '../offline_sync/offline_queue_service.dart';

/// Provider for fetching plan items for the selected project
final projectPlanItemsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final auth = ref.read(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  return await auth.getProjectPlanItems((project['project_id'] ?? project['id']).toString());
});

/// Provider for fetching engineer's own DPRs for the selected project
final myDPRsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final auth = ref.read(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  return await auth.getMyDPRs((project['project_id'] ?? project['id']).toString());
});

/// Provider for creating a new DPR
final createDPRProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, payload) async {
  final auth = ref.read(authServiceProvider);
  final project = ref.read(currentProjectProvider);
  if (project == null) throw Exception('No project selected');
  
  final projectId = (project['project_id'] ?? project['id']).toString();
  
  try {
    await auth.createDPR(projectId, payload);
    ref.invalidate(myDPRsProvider);
    return true;
  } catch (e) {
    // If it's a network error or server down, queue it offline
    await OfflineQueueService.push(
      type: 'DPR',
      endpoint: '/engineer/dpr/projects/$projectId/dprs',
      payload: payload,
    );
    return false; // Return false to indicate it was queued offline
  }
});
