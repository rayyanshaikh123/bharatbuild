import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/user_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../theme/app_colors.dart';

/// Content-only engineer dashboard used in mobile IndexedStack.
class EngineerDashboardContent extends StatelessWidget {
  const EngineerDashboardContent({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          Text(
            'projects_overview'.tr(),
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          // Summary cards
          Row(
            children: [
              _statCard(context, 'active_projects'.tr(), '4', Colors.blue, Icons.construction),
              const SizedBox(width: 12),
              _statCard(context, 'tasks_pending'.tr(), '12', Colors.orange, Icons.assignment_late_outlined),
            ],
          ),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'recent_activity'.tr(),
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              TextButton(
                onPressed: () {},
                child: Text('view_all'.tr()),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _activityItem(
            context,
            'dpr_submission'.tr(),
            'Site Alpha - Block A',
            '10:30 AM',
            Icons.description_outlined,
            Colors.green,
          ),
          _activityItem(
            context,
            'site_inspection'.tr(),
            'Site Beta - Foundation',
            'Yesterday',
            Icons.visibility_outlined,
            Colors.blue,
          ),
          _activityItem(
            context,
            'plan_check'.tr(),
            'Site Alpha - Plumbing',
            '2 days ago',
            Icons.map_outlined,
            Colors.purple,
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _statCard(BuildContext context, String title, String value, Color color, IconData icon) {
    final theme = Theme.of(context);
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 16),
            Text(
              value,
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.6),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _activityItem(
    BuildContext context,
    String title,
    String subtitle,
    String time,
    IconData icon,
    Color color,
  ) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                Text(
                  subtitle,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withOpacity(0.6),
                  ),
                ),
              ],
            ),
          ),
          Text(
            time,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.4),
            ),
          ),
        ],
      ),
    );
  }
}

class EngineerJobsContent extends StatelessWidget {
  const EngineerJobsContent({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final projects = [
      {'name': 'Site Alpha', 'location': 'Mumbai, MH', 'progress': 0.65, 'status': 'ONGOING'},
      {'name': 'Site Beta', 'location': 'Pune, MH', 'progress': 0.32, 'status': 'ONGOING'},
      {'name': 'Metro Link', 'location': 'Nagpur, MH', 'progress': 0.90, 'status': 'CRITICAL'},
      {'name': 'Bridge 04', 'location': 'Thane, MH', 'progress': 0.15, 'status': 'PENDING'},
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'my_projects'.tr(),
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          ...projects.map((p) => _projectCard(context, p)).toList(),
        ],
      ),
    );
  }

  Widget _projectCard(BuildContext context, Map<String, dynamic> p) {
    final theme = Theme.of(context);
    final progress = p['progress'] as double;
    final status = p['status'] as String;
    
    Color statusColor = Colors.blue;
    if (status == 'CRITICAL') statusColor = Colors.red;
    if (status == 'PENDING') statusColor = Colors.orange;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p['name'] as String,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    p['location'] as String,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.5),
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                  valueColor: AlwaysStoppedAnimation<Color>(theme.colorScheme.primary),
                  borderRadius: BorderRadius.circular(4),
                  minHeight: 6,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                '${(progress * 100).toInt()}%',
                style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class EngineerReportsContent extends StatelessWidget {
  const EngineerReportsContent({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'reports'.tr(),
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          _reportCard(
            context,
            'project_progress'.tr(),
            'Site Alpha',
            'Updated 2h ago',
            Icons.trending_up,
            Colors.blue,
          ),
          _reportCard(
            context,
            'resource_utilisation'.tr(),
            'Site Beta',
            'Weekly insight',
            Icons.pie_chart_outline,
            Colors.orange,
          ),
          _reportCard(
            context,
            'attendance_history'.tr(),
            'All Sites',
            'Monthly report',
            Icons.people_outline,
            Colors.green,
          ),
        ],
      ),
    );
  }

  Widget _reportCard(
    BuildContext context,
    String title,
    String subtitle,
    String meta,
    IconData icon,
    Color color,
  ) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                Text(
                  subtitle,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withOpacity(0.6),
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
              const SizedBox(height: 4),
              Text(
                meta,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.4),
                  fontSize: 8,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class EngineerProfileContent extends ConsumerWidget {
  const EngineerProfileContent({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final displayName = user?['name'] ?? 'Engineer';
    final email = user?['email'] ?? '';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const SizedBox(height: 10),
          Center(
            child: Stack(
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                  child: Text(
                    displayName[0].toUpperCase(),
                    style: theme.textTheme.headlineLarge?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: theme.colorScheme.surface, width: 2),
                    ),
                    child: const Icon(Icons.edit, color: Colors.white, size: 16),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            displayName,
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
          Text(
            email,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.6),
            ),
          ),
          const SizedBox(height: 32),
          _profileOption(context, 'edit_profile'.tr(), Icons.person_outline),
          _profileOption(context, 'my_projects'.tr(), Icons.construction),
          _profileOption(context, 'account_settings'.tr(), Icons.settings_outlined),
          _profileOption(context, 'notifications'.tr(), Icons.notifications_none),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () {
              ref.read(currentUserProvider.notifier).state = null;
              ref.read(bottomNavIndexProvider.notifier).state = 0;
              Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.withOpacity(0.1),
              foregroundColor: Colors.red,
              elevation: 0,
              minimumSize: const Size(double.infinity, 56),
              shape: RoundedRectanglePlatform.isAndroid || RoundedRectanglePlatform.isIOS
                    ? RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))
                    : const StadiumBorder(),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.logout),
                const SizedBox(width: 8),
                Text('logout'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _profileOption(BuildContext context, String title, IconData icon) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: () {},
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: theme.colorScheme.onSurface.withOpacity(0.05),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 20),
        ),
        title: Text(title, style: theme.textTheme.bodyLarge),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        tileColor: theme.colorScheme.onSurface.withOpacity(0.02),
      ),
    );
  }
}

// Helper to check platform if needed, but for now just use standard BorderRadius

class RoundedRectanglePlatform {
  static bool get isAndroid => true; // Simulating
  static bool get isIOS => false;
}
