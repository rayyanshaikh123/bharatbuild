import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/user_provider.dart';
import '../../providers/navigation_provider.dart';
import 'package:latlong2/latlong.dart';
import 'dpr_form.dart';
import '../../widgets/site_map_widget.dart';
import '../../providers/organization_provider.dart';
import 'organization_list_screen.dart';
import '../../theme/app_colors.dart';
import '../../providers/project_provider.dart';
import '../../providers/current_project_provider.dart';
import '../../providers/dpr_provider.dart';
import 'dpr_form.dart';
import 'package:intl/intl.dart';
import '../../providers/labour_request_provider.dart';
import '../../providers/plan_provider.dart';
import '../../widgets/project_gate.dart';

/// Content-only engineer dashboard used in mobile IndexedStack.
class EngineerDashboardContent extends ConsumerWidget {
  const EngineerDashboardContent({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    
    // Initialize projects and current selection
    final projectsAsync = ref.watch(engineerProjectsProvider);
    final selectedProject = ref.watch(currentProjectProvider);

    // Sync if null and projects available
    projectsAsync.whenData((projects) {
      if (selectedProject == null && projects.isNotEmpty) {
        Future.microtask(() => ref.read(currentProjectProvider.notifier).setProject(projects.first));
      }
    });

    final currentOrgAsync = ref.watch(currentOrgProvider);
    final planAsync = ref.watch(planProvider);
    final pendingTasks = planAsync.maybeWhen(
      data: (data) => (data['items'] as List).where((i) => i['status'] == 'PENDING' || i['status'] == 'IN_PROGRESS').length.toString(),
      orElse: () => '0',
    );

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(engineerProjectsProvider);
        ref.invalidate(currentProjectProvider);
        ref.invalidate(currentOrgProvider);
        ref.invalidate(planProvider);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            
            // Organization Status (if not in one)
            currentOrgAsync.when(
              data: (org) => org == null 
                ? Container(
                    padding: const EdgeInsets.all(16),
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.orange.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: Colors.orange),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('not_in_org'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
                              Text('join_one_to_start'.tr(), style: theme.textTheme.bodySmall),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pushNamed(context, '/engineer-organization'),
                          child: Text('CONTINUE'.tr()),
                        ),
                      ],
                    ),
                  )
                : const SizedBox.shrink(),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),

            // Project Switcher
            Text(
              'active_project'.tr(),
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primary.withOpacity(0.1)),
              ),
              child: projectsAsync.when(
                data: (projects) {
                  // Ensure value exists in items
                  final currentItem = projects.any((p) => p['project_id'] == selectedProject?['project_id']) 
                      ? projects.firstWhere((p) => p['project_id'] == selectedProject?['project_id'])
                      : null;
                  
                  return Column(
                    children: [
                      DropdownButtonHideUnderline(
                        child: DropdownButton<Map<String, dynamic>>(
                          value: currentItem,
                          isExpanded: true,
                          icon: const Icon(Icons.keyboard_arrow_down),
                          hint: Text('select_project'.tr()),
                          items: projects.map((project) {
                            return DropdownMenuItem<Map<String, dynamic>>(
                              value: project,
                              child: Text(
                                project['name'] ?? 'Untitled Project',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            );
                          }).toList(),
                          onChanged: (value) {
                            if (value != null) {
                              ref.read(currentProjectProvider.notifier).setProject(value);
                            }
                          },
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => Navigator.pushNamed(context, '/engineer-join-project'),
                              icon: const Icon(Icons.add, size: 16),
                              label: Text('join_project'.tr()),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 0),
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => Navigator.pushNamed(context, '/engineer-my-requests'),
                              icon: const Icon(Icons.pending_actions, size: 16),
                              label: Text('my_requests'.tr()),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 0),
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  );
                },
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16.0),
                  child: Center(child: LinearProgressIndicator()),
                ),
                error: (err, _) => Column(
                  children: [
                     Text('Error loading projects'),
                     const SizedBox(height: 8),
                     OutlinedButton(
                       onPressed: () => ref.refresh(engineerProjectsProvider),
                       child: const Text('Retry'),
                     ),
                  ],
                ),
              ),
            ),
            
            ProjectGate(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Site Geo-fence Map
                  Text(
                    'site_geofence'.tr(),
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
            SiteMapWidget(
              orgData: currentOrgAsync.maybeWhen(
                data: (org) => org,
                orElse: () => null,
              ),
              projectsData: projectsAsync.maybeWhen(
                data: (projects) => projects.map((p) => p as Map<String, dynamic>).toList(),
                orElse: () => <Map<String, dynamic>>[],
              ),
              geofences: projectsAsync.maybeWhen(
                data: (projects) {
                  return projects.map((project) {
                    try {
                      final gf = project['geofence'];
                      if (gf != null && gf is List) {
                        return gf.map((p) {
                          try {
                            if (p is List && p.length >= 2) {
                              return LatLng(
                                double.parse(p[0].toString()),
                                double.parse(p[1].toString()),
                              );
                            } else if (p is Map) {
                              final lat = p['lat'] ?? p['latitude'];
                              final lng = p['lng'] ?? p['longitude'];
                              if (lat != null && lng != null) {
                                return LatLng(
                                  double.parse(lat.toString()),
                                  double.parse(lng.toString()),
                                );
                              }
                            }
                          } catch (_) {}
                          return null;
                        }).whereType<LatLng>().toList();
                      }
                    } catch (e) {
                      debugPrint('Error parsing geofence: $e');
                    }
                    return <LatLng>[];
                  }).where((list) => list.isNotEmpty).toList();
                },
                orElse: () => <List<LatLng>>[],
              ),
            ),

            const SizedBox(height: 32),
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
                _statCard(context, 'active_projects'.tr(), projectsAsync.maybeWhen(data: (p) => p.length.toString(), orElse: () => '0'), Colors.blue, Icons.construction),
                const SizedBox(width: 12),
                _statCard(context, 'tasks_pending'.tr(), pendingTasks, Colors.orange, Icons.assignment_late_outlined),
              ],
            ),
            
            const SizedBox(height: 32),
            Text(
              'Quick Actions',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 2.6,
              children: [
                _quickActionItem(context, Icons.assignment_outlined, 'project_plan'.tr(), () => Navigator.pushNamed(context, '/engineer-tasks')),
                _quickActionItem(context, Icons.people_outline, 'labour_requests'.tr(), () => Navigator.pushNamed(context, '/engineer-labour-requests')),
                _quickActionItem(context, Icons.how_to_reg_outlined, 'manual_attendance'.tr(), () => Navigator.pushNamed(context, '/engineer-attendance')),
                _quickActionItem(context, Icons.payments_outlined, 'daily_wages'.tr(), () => Navigator.pushNamed(context, '/engineer-wages')),
                _quickActionItem(context, Icons.inventory_2_outlined, 'material_management'.tr(), () => Navigator.pushNamed(context, '/engineer-materials')),
                _quickActionItem(context, Icons.business_outlined, 'organization'.tr(), () => Navigator.pushNamed(context, '/engineer-organization')),
                _quickActionItem(context, Icons.description_outlined, 'submit_report'.tr(), () => Navigator.push(context, MaterialPageRoute(builder: (context) => const DPRFormScreen()))),
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
              selectedProject != null ? (selectedProject['name'] + ' - Block A') : 'No Project Selected',
              '10:30 AM',
              Icons.description_outlined,
              Colors.green,
            ),
            _activityItem(
              context,
              'site_inspection'.tr(),
              'Foundation Check',
              'Yesterday',
              Icons.visibility_outlined,
              Colors.blue,
            ),
            _activityItem(
              context,
              'plan_check'.tr(),
              'Plumbing Review',
              '2 days ago',
              Icons.map_outlined,
              Colors.purple,
            ),
            const SizedBox(height: 20),
                ],
              ),
            ),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _quickActionItem(BuildContext context, IconData icon, String label, VoidCallback onTap) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: theme.dividerColor.withOpacity(0.1)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary, size: 24),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
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

class EngineerJobsContent extends ConsumerWidget {
  const EngineerJobsContent({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return ProjectGate(
      child: RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(labourRequestsProvider);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'labour_requests'.tr(),
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                TextButton.icon(
                  onPressed: () {
                    Navigator.pushNamed(context, '/engineer-labour-requests');
                  },
                  icon: const Icon(Icons.arrow_forward),
                  label: Text('view_all'.tr()),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _infoCard(
              context,
              icon: Icons.people,
              title: 'manage_labour_requests'.tr(),
              subtitle: 'create_and_manage_requests'.tr(),
              color: Colors.blue,
              onTap: () {
                Navigator.pushNamed(context, '/engineer-labour-requests');
              },
            ),
            const SizedBox(height: 16),
            _infoCard(
              context,
              icon: Icons.assignment,
              title: 'view_applicants'.tr(),
              subtitle: 'review_and_approve_labourers'.tr(),
              color: Colors.green,
              onTap: () {
                Navigator.pushNamed(context, '/engineer-labour-requests');
              },
            ),
            const SizedBox(height: 16),
            _infoCard(
              context,
              icon: Icons.how_to_reg_outlined,
              title: 'manual_attendance'.tr(),
              subtitle: 'mark_labour_presence'.tr(),
              color: Colors.purple,
              onTap: () {
                Navigator.pushNamed(context, '/engineer-attendance');
              },
            ),
            const SizedBox(height: 16),
            _infoCard(
              context,
              icon: Icons.construction,
              title: 'my_projects'.tr(),
              subtitle: 'manage_ongoing_projects'.tr(),
              color: Colors.orange,
              onTap: () {
                // TODO: Navigate to projects list
              },
            ),
          ],
        ),
      ),
    ),
    );
  }

  Widget _infoCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    
    return Container(
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
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 28),
        ),
        title: Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          subtitle,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.6),
          ),
        ),
        trailing: Icon(
          Icons.arrow_forward_ios,
          size: 16,
          color: theme.colorScheme.onSurface.withOpacity(0.3),
        ),
      ),
    );
  }
}

class EngineerReportsContent extends ConsumerWidget {
  const EngineerReportsContent({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final dprsAsync = ref.watch(myDPRsProvider);

    return ProjectGate(
      child: Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DPRFormScreen())),
        label: Text('submit_dpr'.tr()),
        icon: const Icon(Icons.add),
        backgroundColor: AppColors.primary,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(myDPRsProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'daily_progress_reports'.tr(),
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              dprsAsync.when(
                data: (dprs) {
                  if (dprs.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 100),
                        child: Column(
                          children: [
                            Icon(Icons.description_outlined, size: 64, color: Colors.grey.withOpacity(0.5)),
                            const SizedBox(height: 16),
                            Text('no_reports_yet'.tr(), style: theme.textTheme.titleMedium),
                          ],
                        ),
                      ),
                    );
                  }
                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: dprs.length,
                    itemBuilder: (context, index) {
                      final dpr = dprs[index];
                      final date = DateTime.parse(dpr['report_date']);
                      final status = dpr['status'] ?? 'PENDING';
                      
                      Color statusColor = Colors.orange;
                      if (status == 'APPROVED') statusColor = Colors.green;
                      if (status == 'REJECTED') statusColor = Colors.red;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
                        ),
                        child: ListTile(
                          title: Text(dpr['title'] ?? 'Untitled Report', style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text(DateFormat('dd MMM yyyy').format(date)),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(status, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      );
                    },
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Text('Error: $err'),
              ),
            ],
          ),
        ),
      ),
    ),
    );
  }
}

class EngineerProfileContent extends ConsumerStatefulWidget {
  const EngineerProfileContent({super.key});

  @override
  ConsumerState<EngineerProfileContent> createState() => _EngineerProfileContentState();
}

class _EngineerProfileContentState extends ConsumerState<EngineerProfileContent> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final displayName = user?['name'] ?? 'Engineer';
    final email = user?['email'] ?? '';

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(profileProvider.future),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
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
            _profileOption(
              context,
              'edit_profile'.tr(),
              Icons.person_outline,
              onTap: () => Navigator.pushNamed(context, '/engineer-edit-profile'),
            ),
            _profileOption(
              context,
              'my_projects'.tr(),
              Icons.construction,
              onTap: () {
                // TODO: Navigate to projects list
              },
            ),
            _profileOption(
              context,
              'account_settings'.tr(),
              Icons.settings_outlined,
              onTap: () => Navigator.pushNamed(context, '/engineer-settings'),
            ),
            _profileOption(
              context,
              'notifications'.tr(),
              Icons.notifications_none,
              onTap: () => Navigator.pushNamed(context, '/engineer-notifications'),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                ref.read(currentUserProvider.notifier).setUser(null);
                ref.read(bottomNavIndexProvider.notifier).state = 0;
                Navigator.pushNamedAndRemoveUntil(context, '/onboarding', (route) => false);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.withOpacity(0.1),
                foregroundColor: Colors.red,
                elevation: 0,
                minimumSize: const Size(double.infinity, 56),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
      ),
    );
  }

  Widget _profileOption(BuildContext context, String title, IconData icon, {VoidCallback? onTap}) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: onTap,
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
