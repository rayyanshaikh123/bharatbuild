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

// Organization Providers
final qaAllOrganizationsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final service = ref.read(qaServiceProvider);
  final res = await service.getAllOrganizations();
  return res['organizations'] ?? [];
});

final qaMyOrgRequestsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final service = ref.read(qaServiceProvider);
  final res = await service.getMyOrgRequests();
  return res['requests'] ?? [];
});

final qaCurrentOrgProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final service = ref.read(qaServiceProvider);
  try {
    final res = await service.getCurrentOrganization();
    if (res['organizations'] != null && res['organizations'].isNotEmpty) {
      return res['organizations'][0];
    }
    return null;
  } catch (e) {
    return null;
  }
});

// Project Join Providers
final qaMyProjectRequestsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final service = ref.read(qaServiceProvider);
  return await service.getMyProjectRequests();
});
