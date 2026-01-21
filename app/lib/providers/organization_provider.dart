import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_providers.dart';

final allOrganizationsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final auth = ref.read(authServiceProvider);
  final res = await auth.getOrganizations();
  return res['organizations'] ?? [];
});

final myOrgRequestsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final auth = ref.read(authServiceProvider);
  final res = await auth.getMyOrgRequests();
  return res['requests'] ?? [];
});

final currentOrgProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final auth = ref.read(authServiceProvider);
  try {
    final res = await auth.getCurrentOrganization();
    if (res['organizations'] != null && res['organizations'].isNotEmpty) {
      return res['organizations'][0];
    }
    return null;
  } catch (e) {
    return null;
  }
});

final joinOrganizationProvider = FutureProvider.family<void, String>((ref, orgId) async {
  final auth = ref.read(authServiceProvider);
  await auth.joinOrganization(orgId);
  ref.invalidate(myOrgRequestsProvider);
});
