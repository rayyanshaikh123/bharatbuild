import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../location/location_service.dart';
import '../../storage/secure_storage_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_text_theme.dart';

class LabourLoginScreen extends ConsumerStatefulWidget {
  const LabourLoginScreen({super.key});

  @override
  ConsumerState<LabourLoginScreen> createState() => _LabourLoginScreenState();
}

class _LabourLoginScreenState extends ConsumerState<LabourLoginScreen> {
  final _phoneController = TextEditingController();
  bool _requesting = false;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) return;
    setState(() => _requesting = true);
    // TODO: call Firebase OTP flow; for now navigate to OTP verify screen
    await Future.delayed(const Duration(milliseconds: 600));
    Navigator.pushNamed(context, '/otp-verify', arguments: {'phone': phone});
    setState(() => _requesting = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Labour Login',
          style: Theme.of(context).textTheme.headingMedium,
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(hintText: 'Enter phone number'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
              ),
              onPressed: _requesting ? null : _requestOtp,
              child: _requesting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Text('Request OTP'),
            ),
          ],
        ),
      ),
    );
  }
}
