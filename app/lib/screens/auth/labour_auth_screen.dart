import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_providers.dart';
import '../../providers/user_provider.dart';
import '../common/signin_template.dart';

class LabourAuthScreen extends ConsumerStatefulWidget {
  const LabourAuthScreen({super.key});

  @override
  ConsumerState<LabourAuthScreen> createState() => _LabourAuthScreenState();
}

class _LabourAuthScreenState extends ConsumerState<LabourAuthScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _otpSent = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Phone is required')));
      return;
    }

    final future = ref.read(labourOtpRequestProvider(phone).future);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Requesting OTP...')));
    try {
      await future;
      setState(() => _otpSent = true);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('OTP requested')));
      Navigator.pushNamed(
        context,
        '/verification',
        arguments: {'phone': phone},
      );
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('OTP request failed: $e')));
    }
  }

  Future<void> _verifyOtp() async {
    final phone = _phoneController.text.trim();
    final otp = _otpController.text.trim();
    if (otp.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('OTP is required')));
      return;
    }
    try {
      final res = await ref.read(
        labourOtpVerifyProvider({'phone': phone, 'otp': otp}).future,
      );
      // populate current user in Riverpod (if backend returns user key)
      final user = (res is Map && res.containsKey('user')) ? res['user'] : res;
      ref.read(currentUserProvider).state = user as Map<String, dynamic>?;
      Navigator.pushReplacementNamed(context, '/labour-flow');
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('OTP verify failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return SignInTemplate(
      title: 'Labour Sign In',
      child: Column(
        children: [
          TextFormField(
            controller: _phoneController,
            decoration: const InputDecoration(
              hintText: 'Phone',
              filled: true,
              fillColor: Color(0xFFF5FCF9),
              contentPadding: EdgeInsets.symmetric(
                horizontal: 24.0,
                vertical: 16.0,
              ),
              border: OutlineInputBorder(
                borderSide: BorderSide.none,
                borderRadius: BorderRadius.all(Radius.circular(50)),
              ),
            ),
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 12.0),
          if (!_otpSent)
            ElevatedButton(
              onPressed: _requestOtp,
              style: ElevatedButton.styleFrom(
                elevation: 0,
                backgroundColor: const Color(0xFF00BF6D),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: const StadiumBorder(),
              ),
              child: const Text('Request OTP'),
            )
          else ...[
            TextFormField(
              controller: _otpController,
              decoration: const InputDecoration(
                hintText: 'OTP',
                filled: true,
                fillColor: Color(0xFFF5FCF9),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 24.0,
                  vertical: 16.0,
                ),
                border: OutlineInputBorder(
                  borderSide: BorderSide.none,
                  borderRadius: BorderRadius.all(Radius.circular(50)),
                ),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12.0),
            ElevatedButton(
              onPressed: _verifyOtp,
              style: ElevatedButton.styleFrom(
                elevation: 0,
                backgroundColor: const Color(0xFF00BF6D),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: const StadiumBorder(),
              ),
              child: const Text('Verify OTP'),
            ),
          ],
          const SizedBox(height: 16.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text("Don't have an account? "),
              TextButton(
                onPressed: () {
                  Navigator.pushNamed(
                    context,
                    '/signup',
                    arguments: {'role': 'labour'},
                  );
                },
                child: const Text('Sign up'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
