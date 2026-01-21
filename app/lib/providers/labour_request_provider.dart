import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import 'auth_providers.dart';

/// Provider for fetching all labour requests created by the engineer
final labourRequestsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final auth = ref.read(authServiceProvider);
  return await auth.getLabourRequests();
});

/// Provider for creating a new labour request
final createLabourRequestProvider = FutureProvider.family<bool, Map<String, dynamic>>((ref, payload) async {
  final auth = ref.read(authServiceProvider);
  try {
    await auth.createLabourRequest(payload);
    // Invalidate the list to refresh
    ref.invalidate(labourRequestsProvider);
    return true;
  } catch (e) {
    rethrow;
  }
});

/// Provider for fetching applicants for a specific labour request
final labourRequestApplicantsProvider = FutureProvider.family<List<dynamic>, String>((ref, requestId) async {
  final auth = ref.read(authServiceProvider);
  return await auth.getLabourRequestApplicants(requestId);
});

/// Provider for approving a labourer
final approveLabourerProvider = FutureProvider.family<bool, Map<String, String>>((ref, params) async {
  final auth = ref.read(authServiceProvider);
  try {
    await auth.approveLabourer(params['requestId']!, params['labourId']!);
    // Invalidate applicants list to refresh
    ref.invalidate(labourRequestApplicantsProvider(params['requestId']!));
    return true;
  } catch (e) {
    rethrow;
  }
});

/// Provider for rejecting a labourer
final rejectLabourerProvider = FutureProvider.family<bool, Map<String, String>>((ref, params) async {
  final auth = ref.read(authServiceProvider);
  try {
    await auth.rejectLabourer(params['requestId']!, params['labourId']!);
    // Invalidate applicants list to refresh
    ref.invalidate(labourRequestApplicantsProvider(params['requestId']!));
    return true;
  } catch (e) {
    rethrow;
  }
});
