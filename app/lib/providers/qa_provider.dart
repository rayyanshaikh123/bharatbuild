import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/qa_service.dart';

final qaServiceProvider = Provider<QAService>((ref) => QAService());

final qaProjectsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final service = ref.read(qaServiceProvider);
  return await service.getAssignedProjects();
});

final qaProjectTasksProvider = FutureProvider.family.autoDispose<List<dynamic>, String>((ref, projectId) async {
  final service = ref.read(qaServiceProvider);
  return await service.getProjectTasks(projectId);
});

final qaProfileProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final service = ref.read(qaServiceProvider);
  return await service.getMyProfile();
});
