import 'package:flutter/material.dart';
import '../../login_screen.dart';

/// Compatibility wrapper for older imports referencing
/// `auth/labour_auth_screen.dart`. Delegates to the unified
/// `LoginScreen` with an initial role of 'labour'.
class LabourAuthScreen extends StatelessWidget {
  const LabourAuthScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LoginScreen(initialRole: 'labour');
  }
}
