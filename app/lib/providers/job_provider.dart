import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_providers.dart';

final availableJobsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return await authService.getAvailableJobs();
});

final applyForJobProvider = FutureProvider.family<void, String>((ref, jobId) async {
  final authService = ref.read(authServiceProvider);
  await authService.applyForJob(jobId);
  // Refresh the available jobs list after applying
  ref.invalidate(availableJobsProvider);
  ref.invalidate(myApplicationsProvider);
});

final myApplicationsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return await authService.getMyApplications();
});

final jobDetailsProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, id) async {
  final authService = ref.watch(authServiceProvider);
  return await authService.getJobDetails(id);
});

final allProjectsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authService = ref.watch(authServiceProvider);
  final response = await authService.getAllProjects();
  return (response['projects'] as List? ?? []);
});
