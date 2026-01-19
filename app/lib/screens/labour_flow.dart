import 'package:flutter/material.dart';
import '../layouts/app_layout.dart';

class LabourFlowScreen extends StatefulWidget {
  static const routeName = '/labour-flow';
  const LabourFlowScreen({super.key});

  @override
  State<LabourFlowScreen> createState() => _LabourFlowScreenState();
}

class _LabourFlowScreenState extends State<LabourFlowScreen> {
  bool _redirected = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_redirected) {
      _redirected = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/labour-dashboard');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Simple placeholder while redirecting to the dashboard.
    return const AppLayout(
      title: 'Labour Flow',
      child: Center(child: CircularProgressIndicator()),
    );
  }
}
