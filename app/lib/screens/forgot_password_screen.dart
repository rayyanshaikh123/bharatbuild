import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'signin_template.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  _ForgotPasswordScreenState createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return SignInTemplate(
      title: 'forgot_password_q'.tr(),
      child: Column(
        children: [
          TextField(
            controller: _emailController,
            decoration: InputDecoration(hintText: 'email'.tr()),
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () {
              // Handle forgot password logic
            },
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 56),
            ),
            child: Text('send_reset_link'.tr()),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('back_to_login'.tr()),
          ),
        ],
      ),
    );
  }
}
