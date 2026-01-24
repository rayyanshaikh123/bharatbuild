import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import 'current_project_provider.dart';
import 'auth_providers.dart';

final projectStockProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authRes = ref.watch(authServiceProvider);
  final project = ref.watch(currentProjectProvider);
  if (project == null) return [];
  
  final projectId = (project['project_id'] ?? project['id']).toString();
  return await authRes.getProjectStock(projectId);
});

final recordMovementProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, data) async {
  final authRes = ref.read(authServiceProvider);
  try {
    await authRes.recordMaterialMovement(data);
    ref.invalidate(projectStockProvider);
    return true;
  } catch (e) {
    // Offline queue handling could be added here in future
    return false;
  }
});
