import 'package:flutter/material.dart';
import './mobile_pages.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../widgets/app_ui.dart';
import '../../widgets/offline_banner.dart';
import '../../providers/app_state.dart';
import '../../layouts/app_layout.dart';


class EngineerFlowScreen extends ConsumerWidget {
  static const routeName = '/engineer-dashboard';
  const EngineerFlowScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    // Note: AppState might be using different provider package, check imports
    // If using Riverpod, it should be ref.watch(...)
    
    return AppLayout(
      title: 'BharatBuild',
      mobilePages: const [
        EngineerDashboardContent(),
        EngineerJobsContent(),
        EngineerReportsContent(),
        EngineerProfileContent(),
      ],
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            Text(
              'welcome'.tr(),
              style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            const EngineerDashboardContent(),
          ],
        ),
      ),
    );
  }
}
