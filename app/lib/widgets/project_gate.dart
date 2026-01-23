import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../providers/current_project_provider.dart';
import '../theme/app_colors.dart';

class ProjectGate extends ConsumerWidget {
  final Widget child;
  final bool allowJoinProject;

  const ProjectGate({
    super.key,
    required this.child,
    this.allowJoinProject = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedProject = ref.watch(currentProjectProvider);

    if (selectedProject != null) {
      return child;
    }

    final theme = Theme.of(context);
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.business_center_outlined,
              size: 64,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'join_project_first'.tr(),
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            'join_project_desc'.tr(),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.6),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          if (allowJoinProject)
            ElevatedButton.icon(
              onPressed: () => Navigator.pushNamed(context, '/engineer-join-project'),
              icon: const Icon(Icons.add),
              label: Text('join_project'.tr()),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(200, 56),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => ref.refresh(currentProjectProvider),
            child: Text('retry'.tr()),
          ),
        ],
      ),
    );
  }
}
