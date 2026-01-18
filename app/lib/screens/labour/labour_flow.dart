import 'package:flutter/material.dart';
import '../../layouts/app_layout.dart';

class LabourFlowScreen extends StatelessWidget {
  static const routeName = '/labour-flow';
  const LabourFlowScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppLayout(
      title: 'Labour Flow',
      child: const Center(child: Text('Labour flow content')),
    );
  }
}
