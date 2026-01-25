import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../layouts/app_layout.dart';
import 'qa_mobile_pages.dart';
import 'qa_profile_screen.dart';

class QAFlowScreen extends ConsumerWidget {
  static const routeName = '/qa-flow';
  const QAFlowScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    
    return AppLayout(
      title: 'BharatBuild QA',
      mobilePages: const [
        QADashboardContent(),
        QAProfileContent(),
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
            const QADashboardContent(),
          ],
        ),
      ),
    );
  }
}
