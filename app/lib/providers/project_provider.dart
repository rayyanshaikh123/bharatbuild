import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import 'auth_providers.dart';

/// Provider for fetching all projects assigned to the engineer
final engineerProjectsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final auth = ref.read(authServiceProvider);
  return await auth.getMyProjects();
});
