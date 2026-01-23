import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../layouts/app_layout.dart';
import 'mobile_pages.dart';

class LabourDashboardScreen extends ConsumerWidget {
  const LabourDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const AppLayout(
      title: 'BharatBuild',
      mobilePages: [
        const LabourDashboardContent(),
        const ApplicationsContent(),
        const EarningsContent(),
        const ProfileContent(),
      ],
      child: const LabourDashboardContent(),
    );
  }
}
