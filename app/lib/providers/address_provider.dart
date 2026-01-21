import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_providers.dart';

final addressesProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return await authService.getAddresses();
});

final addAddressProvider = FutureProvider.family<void, Map<String, dynamic>>((ref, payload) async {
  final authService = ref.read(authServiceProvider);
  await authService.addAddress(payload);
  ref.invalidate(addressesProvider);
});

final deleteAddressProvider = FutureProvider.family<void, String>((ref, id) async {
  final authService = ref.read(authServiceProvider);
  await authService.deleteAddress(id);
  ref.invalidate(addressesProvider);
});

final updateAddressProvider = FutureProvider.family<void, Map<String, dynamic>>((ref, args) async {
  final authService = ref.read(authServiceProvider);
  final id = args['id'] as String;
  final payload = args['payload'] as Map<String, dynamic>;
  await authService.updateAddress(id, payload);
  ref.invalidate(addressesProvider);
});
