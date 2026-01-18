import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';

final authServiceProvider = Provider<AuthService>((ref) => AuthService());

/// Request OTP for labour. Returns void on success.
final labourOtpRequestProvider = FutureProvider.family<void, String>((
  ref,
  phone,
) async {
  final svc = ref.read(authServiceProvider);
  await svc.requestLabourOtp(phone);
});

/// Verify OTP for labour. Returns backend response (user/session info).
final labourOtpVerifyProvider =
    FutureProvider.family<Map<String, dynamic>, Map<String, String>>((
      ref,
      args,
    ) async {
      final svc = ref.read(authServiceProvider);
      final phone = args['phone']!;
      final otp = args['otp']!;
      return await svc.verifyLabourOtp(phone, otp);
    });

/// Engineer login
final engineerLoginProvider =
    FutureProvider.family<Map<String, dynamic>, Map<String, String>>((
      ref,
      args,
    ) async {
      final svc = ref.read(authServiceProvider);
      return await svc.engineerLogin(args['email']!, args['password']!);
    });

/// Engineer register
final engineerRegisterProvider =
    FutureProvider.family<Map<String, dynamic>, Map<String, String>>((
      ref,
      args,
    ) async {
      final svc = ref.read(authServiceProvider);
      return await svc.engineerRegister(
        args['name']!,
        args['email']!,
        args['phone']!,
        args['password']!,
      );
    });

/// Labour register
final labourRegisterProvider =
    FutureProvider.family<Map<String, dynamic>, Map<String, String>>((
      ref,
      args,
    ) async {
      final svc = ref.read(authServiceProvider);
      return await svc.labourRegister(args['name']!, args['phone']!);
    });
// Note: manager role removed — keep labour and engineer providers only.
