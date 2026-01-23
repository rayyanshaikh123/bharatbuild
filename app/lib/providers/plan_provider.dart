import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_providers.dart';
import 'current_project_provider.dart';

final planProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final project = ref.watch(currentProjectProvider);
  if (project == null) return {'plan': null, 'items': []};
  
  final projectId = (project['project_id'] ?? project['id']).toString();
  final auth = ref.read(authServiceProvider);
  
  return await auth.getProjectPlan(projectId);
});

final updatePlanItemProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, data) async {
  final auth = ref.read(authServiceProvider);
  final itemId = data['id'];
  final payload = Map<String, dynamic>.from(data)..remove('id');
  
  try {
    await auth.updatePlanItem(itemId.toString(), payload);
    // Invalidate plan provider to refresh the list
    ref.invalidate(planProvider);
    return true;
  } catch (e) {
    return false;
  }
});
