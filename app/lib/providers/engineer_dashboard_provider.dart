import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import 'auth_providers.dart';

/// Provider for fetching engineer dashboard data
final engineerDashboardProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final auth = ref.read(authServiceProvider);
  return await auth.getEngineerDashboard();
});

/// Provider for dashboard summary (extracted from dashboard data)
final engineerDashboardSummaryProvider = Provider.autoDispose<Map<String, dynamic>>((ref) {
  final dashboardAsync = ref.watch(engineerDashboardProvider);
  return dashboardAsync.maybeWhen(
    data: (data) => data['summary'] as Map<String, dynamic>? ?? {},
    orElse: () => {
      'total_projects_assigned': 0,
      'total_projects_pending': 0,
      'total_projects_rejected': 0,
    },
  );
});
