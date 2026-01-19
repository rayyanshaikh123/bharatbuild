import 'package:flutter/material.dart';
import 'engineer_auth_screen_clean.dart';

/// Thin compatibility wrapper kept for imports referencing
/// `screens/auth/engineer_auth_screen.dart` — delegates to the
/// cleaned `EngineerAuthScreenClean` implementation.
class EngineerAuthScreen extends StatelessWidget {
  const EngineerAuthScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const EngineerAuthScreenClean();
  }
}
